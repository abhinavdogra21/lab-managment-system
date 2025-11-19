/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rows = await dbOperations.getLabsWithInventoryCounts()
  return NextResponse.json({ labs: rows })
}
