import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { dbOperations } from "@/lib/database"

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const logId = Number.parseInt(String(body?.logId || ""), 10)
  if (!logId || Number.isNaN(logId)) return NextResponse.json({ error: "logId is required" }, { status: 400 })
  const recent = await dbOperations.getRecentLogs(10)
  if (!recent.find((l: any) => l.id === logId)) return NextResponse.json({ error: "Only last 10 changes are undoable" }, { status: 400 })
  const log = await dbOperations.getLogById(logId)
  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 })
  const result = await dbOperations.undoLogAction(log, user.userId)
  return NextResponse.json({ success: true, result })
}
