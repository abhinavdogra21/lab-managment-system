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
  const rows = await dbOperations.listUsers({ role: role || undefined, department: department || undefined, activeOnly: true })
  // simple in-memory sort for now
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
    })
    return NextResponse.json({ user: created }, { status: 201 })
  } catch (e: any) {
    // MySQL duplicate email error code
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }
    throw e
  }
}
