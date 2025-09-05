import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["lab_staff", "admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json({ ok: true, message: "lab-staff API root" })
}
