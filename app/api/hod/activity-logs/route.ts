/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { getLabBookingActivityLogs, getComponentActivityLogs } from "@/lib/activity-logger"

/**
 * GET - HoD: View activity logs with date filters
 * Query params:
 * - type: 'booking' | 'component' | 'all' (default: 'all')
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - labId: number (optional)
 * - action: string (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "all" // 'booking', 'component', or 'all'
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const labId = searchParams.get("labId") ? Number(searchParams.get("labId")) : undefined
    const action = searchParams.get("action") || undefined
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0

    const results: any = {
      type,
      filters: {
        startDate,
        endDate,
        labId,
        action,
      },
      bookingLogs: [],
      componentLogs: [],
      totalCount: 0,
    }

    // Fetch booking logs
    if (type === "booking" || type === "all") {
      const bookingLogs = await getLabBookingActivityLogs({
        labId,
        action,
        startDate,
        endDate,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      })
      results.bookingLogs = bookingLogs
    }

    // Fetch component logs
    if (type === "component" || type === "all") {
      const componentLogs = await getComponentActivityLogs({
        labId,
        action,
        startDate,
        endDate,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      })
      results.componentLogs = componentLogs
    }

    results.totalCount = results.bookingLogs.length + results.componentLogs.length

    // Sort combined logs by date if returning both types
    if (type === "all") {
      const allLogs = [
        ...results.bookingLogs.map((log: any) => ({ ...log, logType: "booking" })),
        ...results.componentLogs.map((log: any) => ({ ...log, logType: "component" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      results.allLogs = allLogs.slice(0, limit)
      results.totalCount = allLogs.length
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    )
  }
}
