import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await req.json()
    const type = String(body?.type || "")
    const from = body?.from || null
    const to = body?.to || null
    const filters = body?.filters || {}

    switch (type) {
      case "security_audit":
      case "activity_summary":
      case "system_overview": {
        const logs = await dbOperations.getSystemLogs({
          from: from || undefined,
          to: to || undefined,
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          userId: filters.userId ? Number(filters.userId) : undefined,
          limit: 10000,
        })
        return NextResponse.json({ type, rows: logs })
      }
      default: {
        return NextResponse.json({ type, rows: [] })
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e || "Internal Server Error") }, { status: 500 })
  }
}
