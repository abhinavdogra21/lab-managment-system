import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail } from "@/lib/notifications"

export async function GET(request: NextRequest) {
	try {
		const user = await verifyToken(request)
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}
		const departments = await dbOperations.listDepartments()
		return NextResponse.json({ departments })
	} catch (error) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await verifyToken(request)
		if (!user || !hasRole(user, ["admin", "hod"])) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
		const body = await request.json()
		await dbOperations.runLightMigrations().catch(() => {})
		if (!body?.name || !body?.code) {
			return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
		}
		if (body?.hodEmail && !/^[^@\s]+@lnmiit\.ac\.in$/i.test(String(body.hodEmail))) {
			return NextResponse.json({ error: "HOD email must be an lnmiit.ac.in address" }, { status: 400 })
		}
		const dept = await dbOperations.createDepartment({ name: body.name, code: body.code, hodEmail: body.hodEmail || null })
		const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
		await dbOperations.createLog({
			userId: user.userId,
			action: "CREATE_DEPARTMENT",
			entityType: "department",
			entityId: dept.id,
			details: { name: body.name, code: body.code },
			ipAddress: ip,
			userAgent: request.headers.get("user-agent") || "unknown",
		})
		return NextResponse.json({ department: dept }, { status: 201 })
	} catch (error) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const user = await verifyToken(request)
		if (!user || !hasRole(user, ["admin"])) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
		const body = await request.json()
		const departmentId = Number.parseInt(String(body?.departmentId || ""), 10)
		
		if (!departmentId || Number.isNaN(departmentId)) {
			return NextResponse.json({ error: "departmentId is required" }, { status: 400 })
		}
		
		// Handle HOD assignment
		if (body.hodId !== undefined) {
			const hodIdRaw = body?.hodId
			const hodId = hodIdRaw === null ? null : Number.parseInt(String(hodIdRaw), 10)
			const updated = await dbOperations.setDepartmentHod(departmentId, hodId)
			const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
			await dbOperations.createLog({
				userId: user.userId,
				action: "SET_DEPARTMENT_HOD",
				entityType: "department",
				entityId: departmentId,
				details: { hodId },
				ipAddress: ip,
				userAgent: request.headers.get("user-agent") || "unknown",
			})
			return NextResponse.json({ department: updated })
		}
		
		// Handle highest approval authority and lab coordinator assignment
		if (body.highestApprovalAuthority !== undefined || body.labCoordinatorId !== undefined) {
			const updated = await dbOperations.setDepartmentApprovalAuthority(
				departmentId,
				body.highestApprovalAuthority,
				body.labCoordinatorId
			)
			const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
			await dbOperations.createLog({
				userId: user.userId,
				action: "SET_DEPARTMENT_APPROVAL_AUTHORITY",
				entityType: "department",
				entityId: departmentId,
				details: { 
					highestApprovalAuthority: body.highestApprovalAuthority,
					labCoordinatorId: body.labCoordinatorId 
				},
				ipAddress: ip,
				userAgent: request.headers.get("user-agent") || "unknown",
			})
			
			// Send email notification if a new lab coordinator was assigned
			if (updated.coordinatorInfo && body.labCoordinatorId) {
				const { name, email, salutation, departmentName, departmentCode } = updated.coordinatorInfo
				const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}`
				
				// Format salutation properly
				const salutationMap: { [key: string]: string } = {
					'prof': 'Prof.',
					'dr': 'Dr.',
					'mr': 'Mr.',
					'mrs': 'Mrs.',
					'ms': 'Ms.'
				}
				const formattedSalutation = salutation ? salutationMap[salutation.toLowerCase()] || salutation : ''
				const fullName = formattedSalutation ? `${formattedSalutation} ${name}` : name
				
				try {
					await sendEmail({
						to: email,
						subject: `Lab Coordinator Assignment - ${departmentName}`,
						text: `Dear ${fullName},

You have been assigned as the Lab Coordinator for the ${departmentName} (${departmentCode}) department.

As Lab Coordinator, you now have the authority to:
- Approve lab booking requests
- Manage lab resources and equipment
- Oversee lab operations for your department

You can now login to the system using the "Lab Coordinator" role option.

Login here: ${loginUrl}

Use your existing email (${email}) and password to login, and select "Lab Coordinator" as your role.

If you have any questions or need assistance, please contact the system administrator.

Best regards,
LNMIIT Lab Management System`,
						html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-box { background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
    ul { margin: 15px 0; padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lab Management System</h1>
      <h2 style="margin: 10px 0 0 0; font-weight: normal;">Lab Coordinator Assignment</h2>
    </div>
    <div class="content">
      <p>Dear <strong>${fullName}</strong>,</p>
      
      <p>Congratulations! You have been assigned as the <strong>Lab Coordinator</strong> for the <strong>${departmentName} (${departmentCode})</strong> department.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">Your New Responsibilities:</h3>
        <ul>
          <li>Approve lab booking requests for your department</li>
          <li>Manage lab resources and equipment</li>
          <li>Oversee lab operations and maintenance</li>
          <li>Coordinate with lab staff and faculty</li>
        </ul>
      </div>
      
      <p><strong>How to Access Your Lab Coordinator Dashboard:</strong></p>
      <ol>
        <li>Visit the login page</li>
        <li>Enter your email: <strong>${email}</strong></li>
        <li>Enter your password</li>
        <li>Select <strong>"Lab Coordinator"</strong> as your role</li>
        <li>Click Login</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="button">Login to System</a>
      </div>
      
      <p style="margin-top: 30px;">If you have any questions or need assistance, please contact the system administrator.</p>
      
      <p>Best regards,<br><strong>LNMIIT Lab Management System</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`
					})
				} catch (emailError) {
					console.error('Failed to send lab coordinator assignment email:', emailError)
					// Don't fail the request if email fails
				}
			}
			
			return NextResponse.json({ department: updated })
		}
		
		return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 })
	} catch (error: any) {
		const message = String(error?.message || "Internal server error")
		const isAssigned = message.toLowerCase().includes('already assigned')
		return NextResponse.json({ error: message }, { status: isAssigned ? 409 : 500 })
	}
}

export async function PUT(request: NextRequest) {
	try {
		const user = await verifyToken(request)
		if (!user || !hasRole(user, ["admin", "hod"])) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
		const body = await request.json()
		await dbOperations.runLightMigrations().catch(() => {})
		const departmentId = Number.parseInt(String(body?.id || ""), 10)
		if (!departmentId || Number.isNaN(departmentId)) {
			return NextResponse.json({ error: "id is required" }, { status: 400 })
		}
		if (body?.hodEmail && !/^[^@\s]+@lnmiit\.ac\.in$/i.test(String(body.hodEmail))) {
			return NextResponse.json({ error: "HOD email must be an lnmiit.ac.in address" }, { status: 400 })
		}
		const updated = await dbOperations.updateDepartment(departmentId, {
			name: body?.name,
			code: body?.code,
			hodEmail: body?.hodEmail,
		})
		const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
		await dbOperations.createLog({
			userId: user.userId,
			action: "UPDATE_DEPARTMENT",
			entityType: "department",
			entityId: departmentId,
			details: { name: body?.name, code: body?.code },
			ipAddress: ip,
			userAgent: request.headers.get("user-agent") || "unknown",
		})
		return NextResponse.json({ department: updated })
	} catch (error: any) {
		const message = String(error?.message || "Internal server error")
		const isDup = message.toLowerCase().includes("duplicate")
		return NextResponse.json({ error: isDup ? "Department code already exists" : message }, { status: isDup ? 409 : 500 })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const user = await verifyToken(request)
		if (!user || !hasRole(user, ["admin", "hod"])) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
		const { searchParams } = new URL(request.url)
		const idParam = searchParams.get("id")
		const departmentId = idParam ? Number.parseInt(idParam) : NaN
		if (!departmentId || Number.isNaN(departmentId)) {
			return NextResponse.json({ error: "id is required" }, { status: 400 })
		}
		const result = await dbOperations.deleteDepartmentCascade(departmentId)
		const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
		await dbOperations.createLog({
			userId: user.userId,
			action: "DELETE_DEPARTMENT",
			entityType: "department",
			entityId: departmentId,
			details: { cascade: true },
			ipAddress: ip,
			userAgent: request.headers.get("user-agent") || "unknown",
		})
		return NextResponse.json({ success: true, ...result })
	} catch (error) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
