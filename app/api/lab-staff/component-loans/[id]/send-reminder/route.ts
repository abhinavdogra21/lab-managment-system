import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail } from "@/lib/notifications"

const db = Database.getInstance()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const loanId = parseInt(params.id)
    if (isNaN(loanId)) {
      return NextResponse.json({ error: "Invalid loan ID" }, { status: 400 })
    }

    // Get remarks from request body (optional)
    const body = await req.json().catch(() => ({}))
    const remarks = body.remarks || ''

    // Get loan details with user info including salutation
    const loanRes = await db.query(
      `SELECT l.*, 
              lb.name AS lab_name,
              u.name AS requester_name,
              u.email AS requester_email,
              u.salutation AS requester_salutation,
              staff.name AS staff_name,
              staff.salutation AS staff_salutation
       FROM component_loans l
       JOIN labs lb ON lb.id = l.lab_id
       JOIN users u ON u.id = l.requester_id
       LEFT JOIN users staff ON staff.id = ?
       WHERE l.id = ?`,
      [Number(user.userId), loanId]
    )

    if (loanRes.rows.length === 0) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    const loan = loanRes.rows[0]

    // Format salutation for requester
    const getSalutation = (salutation?: string) => {
      if (!salutation || salutation === 'none') return ''
      const salutationMap: Record<string, string> = {
        'prof': 'Prof.',
        'dr': 'Dr.',
        'mr': 'Mr.',
        'mrs': 'Mrs.'
      }
      return salutationMap[salutation.toLowerCase()] || ''
    }

    const requesterSalutation = getSalutation(loan.requester_salutation)
    const requesterFullName = requesterSalutation ? `${requesterSalutation} ${loan.requester_name}` : loan.requester_name
    
    const staffSalutation = getSalutation(loan.staff_salutation)
    const staffFullName = staffSalutation ? `${staffSalutation} ${loan.staff_name}` : (loan.staff_name || 'Lab Staff')

    // Check if loan is in issued status
    if (loan.status !== 'issued') {
      return NextResponse.json({ error: "Can only send reminders for issued components" }, { status: 400 })
    }

    // Get loan items
    const itemsRes = await db.query(
      `SELECT i.*, c.name AS component_name, c.model, c.category
       FROM component_loan_items i
       JOIN components c ON c.id = i.component_id
       WHERE i.loan_id = ?`,
      [loanId]
    )

    const components = itemsRes.rows.map((item: any) => {
      const modelInfo = item.model ? ` (${item.model})` : ''
      return `${item.component_name}${modelInfo} - Quantity: ${item.quantity}`
    }).join('\n')

    // Calculate days overdue or days remaining
    const dueDate = new Date(loan.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    let dueDateInfo = ''
    if (diffDays < 0) {
      dueDateInfo = `OVERDUE by ${Math.abs(diffDays)} day(s)`
    } else if (diffDays === 0) {
      dueDateInfo = 'DUE TODAY'
    } else {
      dueDateInfo = `Due in ${diffDays} day(s)`
    }

    // Send reminder email
    const emailSubject = `Reminder: Return Lab Components - ${loan.lab_name}`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #034da2; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lab Component Return Reminder</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${requesterFullName},</p>
          
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder from <strong>${staffFullName}</strong> to return the lab components you have borrowed.
          </p>

          <div style="background-color: white; padding: 20px; border-left: 4px solid #034da2; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #034da2;">Component Details</h3>
            <p style="margin: 5px 0;"><strong>Lab:</strong> ${loan.lab_name}</p>
            <p style="margin: 5px 0;"><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</p>
            <p style="margin: 5px 0;"><strong>Issued Date:</strong> ${new Date(loan.issued_at).toLocaleDateString('en-IN')}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-IN')}</p>
            <p style="margin: 5px 0; ${diffDays < 0 ? 'color: #dc2626; font-weight: bold;' : ''}">
              <strong>Status:</strong> ${dueDateInfo}
            </p>
          </div>

          <div style="background-color: white; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #034da2;">Components to Return:</h3>
            <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 13px; white-space: pre-wrap; word-wrap: break-word;">${components}</pre>
          </div>

          ${diffDays < 0 ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p style="color: #991b1b; margin: 0; font-weight: bold;">⚠️ This item is OVERDUE. Please return it as soon as possible to avoid further delays.</p>
          </div>
          ` : ''}

          ${remarks ? `
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">📝 Note from Lab Staff:</p>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${remarks}</p>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
            Please return the components at your earliest convenience. If you need an extension, please contact the lab staff.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/dashboard/component-requests" 
               style="display: inline-block; background-color: #034da2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View My Requests
            </a>
          </div>
        </div>

        <div style="padding: 20px; background-color: #f0f0f0; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This is an automated reminder from the Lab Management System.<br>
            The LNM Institute of Information Technology, Jaipur
          </p>
        </div>
      </div>
    `

    await sendEmail({
      to: [loan.requester_email],
      subject: emailSubject,
      html: emailBody
    })

    // Log the reminder
    try {
      await db.query(
        `INSERT INTO component_loan_reminders (loan_id, sent_by_id, sent_at)
         VALUES (?, ?, NOW())`,
        [loanId, Number(user.userId)]
      )
    } catch (e) {
      console.log('Reminder logging skipped (table may not exist)')
    }

    return NextResponse.json({ 
      success: true,
      message: `Reminder sent to ${requesterFullName}` 
    })
  } catch (error) {
    console.error("Send reminder error:", error)
    return NextResponse.json({ 
      error: "Failed to send reminder",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
