import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"

// Secured endpoint for scheduled archival & purge of old student users
// Require header: X-CRON-SECRET=<CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || ""
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await dbOperations.archiveAndPurgeStudentsOlderThanSixMonths()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error("archive-students error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "internal" }, { status: 500 })
  }
}
