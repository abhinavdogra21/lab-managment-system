import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyToken(request)
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const deptId = Number.parseInt(id, 10)
  const body = await request.json().catch(() => ({}))
  const hodIdRaw = body?.hodId
  const hodId = hodIdRaw === null ? null : Number.parseInt(String(hodIdRaw), 10)
  if (!Number.isFinite(deptId)) return NextResponse.json({ error: "Invalid department id" }, { status: 400 })
  const updated = await dbOperations.setDepartmentHod(deptId, hodId)
  return NextResponse.json({ department: updated })
}
