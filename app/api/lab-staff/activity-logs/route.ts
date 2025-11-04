import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { getLabBookingActivityLogs, getComponentActivityLogs } from "@/lib/activity-logger"

/**
 * GET - Lab Staff: View activity logs for their assigned labs with date filters
 * Query params:
 * - type: 'booking' | 'component' | 'all' (default: 'all')
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - labId: number (optional, must be one of their assigned labs)
 * - action: string (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "all"
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const requestedLabId = searchParams.get("labId") ? Number(searchParams.get("labId")) : undefined
    const action = searchParams.get("action") || undefined
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0

    // Get labs assigned to this staff member
    let assignedLabIds: number[] = []
    if (user.role !== "admin") {
      const assignedLabs = await db.query(
        `SELECT DISTINCT lab_id FROM lab_staff_assignments WHERE staff_id = ?
         UNION
         SELECT id as lab_id FROM labs WHERE staff_id = ?`,
        [user.userId, user.userId]
      )
      assignedLabIds = assignedLabs.rows.map((row: any) => Number(row.lab_id))

      if (assignedLabIds.length === 0) {
        return NextResponse.json({
          type,
          filters: { startDate, endDate, labId: requestedLabId, action },
          bookingLogs: [],
          componentLogs: [],
          totalCount: 0,
          message: "No labs assigned to this staff member",
        })
      }

      // If a specific lab is requested, verify it's in their assigned labs
      if (requestedLabId && !assignedLabIds.includes(requestedLabId)) {
        return NextResponse.json({ error: "Not authorized for this lab" }, { status: 403 })
      }
    }

    const results: any = {
      type,
      filters: {
        startDate,
        endDate,
        labId: requestedLabId,
        action,
      },
      bookingLogs: [],
      componentLogs: [],
      totalCount: 0,
    }

    // Fetch booking logs
    if (type === "booking" || type === "all") {
      const bookingLogs = await getLabBookingActivityLogs({
        labId: requestedLabId,
        action,
        startDate,
        endDate,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      })

      // Filter by assigned labs if not admin
      if (user.role !== "admin" && !requestedLabId) {
        results.bookingLogs = bookingLogs.filter((log: any) => 
          assignedLabIds.includes(log.lab_id)
        )
      } else {
        results.bookingLogs = bookingLogs
      }
    }

    // Fetch component logs
    if (type === "component" || type === "all") {
      const componentLogs = await getComponentActivityLogs({
        labId: requestedLabId,
        action,
        startDate,
        endDate,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      })

      // Filter by assigned labs if not admin
      if (user.role !== "admin" && !requestedLabId) {
        results.componentLogs = componentLogs.filter((log: any) =>
          assignedLabIds.includes(log.lab_id)
        )
      } else {
        results.componentLogs = componentLogs
      }
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
