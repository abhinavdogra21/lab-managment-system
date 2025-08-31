import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const id = Number.parseInt(params.id, 10)
  const row = await dbOperations.deleteUserSoft(id)
  return NextResponse.json({ user: row })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const id = Number.parseInt(params.id, 10)
  const history = await dbOperations.getUserHistory(id)
  return NextResponse.json(history)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const id = Number.parseInt(params.id, 10)
  const body = await req.json()
  const updated = await dbOperations.updateUser(id, {
    department: body?.department ?? undefined,
    role: body?.role ?? undefined,
    name: body?.name ?? undefined,
    email: body?.email ?? undefined,
  })
  return NextResponse.json({ user: updated })
}
