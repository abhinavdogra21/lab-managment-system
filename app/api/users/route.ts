import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const role = new URL(req.url).searchParams.get("role")
  const rows = await dbOperations.listUsers({ role: role || undefined, activeOnly: true })
  return NextResponse.json({ users: rows })
}

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const required = ["email", "role", "name"]
  for (const k of required) if (!body[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 })
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
}
