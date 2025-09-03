import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { dbOperations } from "@/lib/database"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const limit = Number.parseInt(searchParams.get("limit") || "200", 10)
  const action = searchParams.get("action")
  const entityType = searchParams.get("entityType")
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined
  const userId = searchParams.get("userId") ? Number.parseInt(String(searchParams.get("userId")), 10) : undefined
  const logs = await dbOperations.getSystemLogs({ from, to, action: action || null, entityType: entityType || null, userId: userId || null, limit })
  // Mark which are undoable heuristically
  const undoableActions = new Set(["CREATE_LAB", "SET_LAB_STAFF", "SET_DEPARTMENT_HOD", "CREATE_DEPARTMENT", "DELETE_USER"]) // includes user deletes
  const idsTop10 = (await dbOperations.getRecentLogs(10)).map((l: any) => l.id)
  const enriched = logs.map((l: any) => ({ ...l, undoable: undoableActions.has(l.action), withinTop10: idsTop10.includes(l.id) }))
  return NextResponse.json({ logs: enriched })
}
