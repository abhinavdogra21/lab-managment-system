import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["non_teaching", "admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json({ ok: true, message: "non-teaching API root" })
}
