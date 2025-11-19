/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

// Admin-only endpoint to archive and purge ALL student users immediately
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const result = await dbOperations.archiveAndPurgeAllStudents()
    await dbOperations.createLog({
      userId: user.userId,
      action: "PURGE_STUDENTS",
      entityType: "user",
      entityId: null,
      details: result,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error("purge-students error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "internal" }, { status: 500 })
  }
}
