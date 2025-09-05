import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
	try {
		const user = await verifyToken(req)
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		const { searchParams } = new URL(req.url)
		const departmentId = searchParams.get("department")
		const labs = departmentId ? await dbOperations.getLabsByDepartment(Number.parseInt(departmentId)) : await dbOperations.getAllLabs()
		return NextResponse.json({ labs })
	} catch (e) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const body = await req.json()
	const created = await dbOperations.createLab({
		name: body?.name,
		code: body?.code,
		departmentId: Number.parseInt(String(body?.departmentId || 0), 10) || null,
		location: body?.location || null,
		capacity: body?.capacity != null ? Number.parseInt(String(body.capacity), 10) : null,
		equipment: body?.equipment || null,
	})
	return NextResponse.json({ lab: created }, { status: 201 })
}

export async function PUT(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		const body = await req.json()
		const labId = Number.parseInt(String(body?.id || ""), 10)
		if (!labId || Number.isNaN(labId)) {
			return NextResponse.json({ error: "id is required" }, { status: 400 })
		}
		const updated = await dbOperations.updateLab(labId, {
			name: body?.name,
			code: body?.code,
			capacity: body?.capacity,
			location: body?.location,
			staffId: body?.staffId === undefined ? undefined : (body.staffId === null ? null : Number.parseInt(String(body.staffId), 10)),
		})
		return NextResponse.json({ lab: updated })
}

export async function PATCH(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const body = await req.json()
	// replaceLabStaff
	if (Array.isArray(body?.staffIds) && body?.labId != null) {
		const labId = Number.parseInt(String(body.labId), 10)
		const staffIds = (body.staffIds as any[]).map((x) => Number.parseInt(String(x), 10)).filter((n) => Number.isFinite(n))
		const list = await dbOperations.replaceLabStaff(labId, staffIds)
		return NextResponse.json({ staff: list })
	}
	return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const { searchParams } = new URL(req.url)
	const id = Number.parseInt(String(searchParams.get("id") || ""), 10)
	if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
	const deleted = await dbOperations.deleteLabCascade(id)
	return NextResponse.json({ success: true, ...deleted })
}
