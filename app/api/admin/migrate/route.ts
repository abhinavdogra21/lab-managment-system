/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const res = await dbOperations.runLightMigrations()
    return NextResponse.json({ ok: true, result: res })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Migration failed" }, { status: 500 })
  }
}
