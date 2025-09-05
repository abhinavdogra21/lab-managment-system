import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

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
		const hodIdRaw = body?.hodId
		const hodId = hodIdRaw === null ? null : Number.parseInt(String(hodIdRaw), 10)
		if (!departmentId || Number.isNaN(departmentId)) {
			return NextResponse.json({ error: "departmentId is required" }, { status: 400 })
		}
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
	} catch (error: any) {
		const message = String(error?.message || "Internal server error")
		const isAssigned = message.toLowerCase().includes('already assigned as hod')
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
