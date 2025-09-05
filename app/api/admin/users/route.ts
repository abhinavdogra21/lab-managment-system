import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const url = new URL(req.url)
	const role = url.searchParams.get("role")
	const department = url.searchParams.get("department")
	const sort = url.searchParams.get("sort") || "created_at_desc"
	let rows = await dbOperations.listUsers({ role: role || undefined, department: department || undefined, activeOnly: true })
	// Hide 'hod' entries from Users list by default; HOD is a department assignment
	if (!role) {
		rows = rows.filter((r: any) => String(r.role) !== 'hod')
	}
	const sorted = [...rows].sort((a: any, b: any) => {
		switch (sort) {
			case "name_asc": return String(a.name).localeCompare(String(b.name))
			case "name_desc": return String(b.name).localeCompare(String(a.name))
			case "email_asc": return String(a.email).localeCompare(String(b.email))
			case "email_desc": return String(b.email).localeCompare(String(a.email))
			case "role_asc": return String(a.role).localeCompare(String(b.role))
			case "role_desc": return String(b.role).localeCompare(String(a.role))
			case "created_at_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			case "created_at_desc":
			default:
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		}
	})
	return NextResponse.json({ users: sorted })
}

export async function POST(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const body = await req.json()
	const required = ["email", "role", "name"]
	for (const k of required) if (!body[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 })
	// Validate salutation if provided
	if (body.salutation && !['prof','dr','mr','mrs','none'].includes(String(body.salutation))) {
		return NextResponse.json({ error: "Invalid salutation" }, { status: 400 })
	}
	// Policy: Admin cannot create users with role 'admin'; all other roles allowed
	if (String(body.role) === 'admin') {
		return NextResponse.json({ error: "Creating Admin users via this endpoint is not allowed" }, { status: 400 })
	}
	try {
		const created = await dbOperations.createUser({
			email: body.email,
			passwordHash: body.passwordHash || null,
			name: body.name,
			role: body.role,
			department: body.department || null,
			phone: body.phone || null,
			studentId: body.studentId || null,
			employeeId: body.employeeId || null,
			salutation: body.salutation || 'none',
		})
		return NextResponse.json({ user: created }, { status: 201 })
	} catch (e: any) {
		if (e?.code === "ER_DUP_ENTRY") {
			return NextResponse.json({ error: "Email already exists" }, { status: 409 })
		}
		throw e
	}
}
