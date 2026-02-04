/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

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
          filters: { startDate, endDate, labId: requestedLabId },
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
      },
      bookingLogs: [],
      componentLogs: [],
      totalCount: 0,
    }

    // Fetch booking logs with proper snapshot extraction
    // Only fetch final approval logs (approved_by_hod or approved_by_lab_coordinator)
    if (type === "booking" || type === "all") {
      let sql = `
        SELECT 
          lbal.id,
          lbal.booking_id,
          lbal.lab_id,
          lbal.action,
          lbal.booking_snapshot,
          lbal.created_at,
          labs.name as lab_name,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_name')),
            requester.name,
            'Unknown'
          ) as requester_name,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_salutation')),
            requester.salutation,
            'none'
          ) as requester_salutation,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_email')),
            requester.email,
            ''
          ) as requester_email,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_role')),
            requester.role,
            'student'
          ) as requester_role
        FROM lab_booking_activity_logs lbal
        LEFT JOIN users requester ON requester.id = JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by')
        LEFT JOIN labs ON labs.id = lbal.lab_id
        WHERE lbal.action IN ('approved_by_hod', 'approved_by_lab_coordinator')
      `
      
      const params: any[] = []

      // Filter by assigned labs if not admin
      if (user.role !== "admin") {
        if (requestedLabId) {
          sql += ` AND lbal.lab_id = ?`
          params.push(requestedLabId)
        } else if (assignedLabIds.length > 0) {
          sql += ` AND lbal.lab_id IN (${assignedLabIds.join(',')})`
        }
      } else if (requestedLabId) {
        sql += ` AND lbal.lab_id = ?`
        params.push(requestedLabId)
      }

      // Date filters
      if (startDate) {
        sql += ` AND DATE(lbal.created_at) >= ?`
        params.push(startDate)
      }
      if (endDate) {
        sql += ` AND DATE(lbal.created_at) <= ?`
        params.push(endDate)
      }

      sql += ` ORDER BY lbal.created_at DESC LIMIT ? OFFSET ?`
      params.push(type === "all" ? Math.ceil(limit / 2) : limit, type === "all" ? Math.floor(offset / 2) : offset)

      const bookingResult = await db.query(sql, params)
      
      // Process logs to extract booking details from snapshot
      // For multi-lab bookings, fetch individual lab approval status and filter out rejected labs
      const bookingLogsWithStatus = (await Promise.all(bookingResult.rows.map(async (log: any) => {
        const snapshot = typeof log.booking_snapshot === 'string'
          ? JSON.parse(log.booking_snapshot)
          : log.booking_snapshot
        
        // For multi-lab bookings, get the specific lab's status
        let individualLabStatus = snapshot?.status || 'approved'
        if (snapshot?.is_multi_lab) {
          const multiLabStatus = await db.query(
            `SELECT status FROM multi_lab_approvals 
             WHERE booking_request_id = ? AND lab_id = ?`,
            [log.booking_id, log.lab_id]
          )
          if (multiLabStatus.rows.length > 0) {
            individualLabStatus = multiLabStatus.rows[0].status
          }
        }
        
        // Skip rejected labs in multi-lab bookings
        if (snapshot?.is_multi_lab && individualLabStatus === 'rejected') {
          return null
        }

        return {
          id: log.id,
          booking_id: log.booking_id,
          lab_id: log.lab_id,
          lab_name: log.lab_name || snapshot?.lab_name || 'Unknown Lab',
          requester_name: log.requester_name || snapshot?.requester_name || 'Unknown',
          requester_salutation: log.requester_salutation || snapshot?.requester_salutation || 'none',
          requester_email: log.requester_email || snapshot?.requester_email || '',
          requester_role: log.requester_role || snapshot?.requester_role || 'student',
          purpose: snapshot?.purpose || '',
          booking_date: snapshot?.booking_date || null,
          start_time: snapshot?.start_time || null,
          end_time: snapshot?.end_time || null,
          status: individualLabStatus, // Use individual lab status for multi-lab bookings
          is_multi_lab: snapshot?.is_multi_lab || false,
          faculty_supervisor_name: snapshot?.faculty_name || null,
          faculty_supervisor_salutation: snapshot?.faculty_salutation || 'none',
          faculty_approved_at: snapshot?.faculty_approved_at || null,
          lab_staff_name: snapshot?.lab_staff_name || null,
          lab_staff_salutation: snapshot?.lab_staff_salutation || 'none',
          lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
          lab_coordinator_name: snapshot?.lab_coordinator_name || null,
          lab_coordinator_salutation: snapshot?.lab_coordinator_salutation || 'none',
          lab_coordinator_approved_at: snapshot?.lab_coordinator_approved_at || null,
          hod_name: snapshot?.hod_name || null,
          hod_salutation: snapshot?.hod_salutation || 'none',
          hod_approved_at: snapshot?.hod_approved_at || null,
          highest_approval_authority: snapshot?.highest_approval_authority || 'hod',
          final_approver_role: snapshot?.final_approver_role || null,
          created_at: log.created_at,
        }
      }))).filter(log => log !== null) // Remove null entries (rejected labs)
      
      results.bookingLogs = bookingLogsWithStatus
    }

    // Fetch component logs with proper snapshot extraction
    // Only fetch final approval logs (approved_by_hod or approved_by_lab_coordinator)
    if (type === "component" || type === "all") {
      let sql = `
        SELECT 
          cal.id,
          cal.entity_type,
          cal.entity_id,
          cal.lab_id,
          cal.action,
          cal.entity_snapshot,
          cal.created_at,
          labs.name as lab_name,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_name')),
            requester.name,
            'Unknown'
          ) as requester_name,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_salutation')),
            requester.salutation,
            'none'
          ) as requester_salutation,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_email')),
            requester.email,
            ''
          ) as requester_email,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_role')),
            requester.role,
            'student'
          ) as requester_role
        FROM component_activity_logs cal
        LEFT JOIN users requester ON requester.id = JSON_EXTRACT(cal.entity_snapshot, '$.requested_by')
        LEFT JOIN labs ON labs.id = cal.lab_id
        WHERE cal.action IN ('approved_by_hod', 'approved_by_lab_coordinator', 'component_issued', 'component_returned')
      `
      
      const params: any[] = []

      // Filter by assigned labs if not admin
      if (user.role !== "admin") {
        if (requestedLabId) {
          sql += ` AND cal.lab_id = ?`
          params.push(requestedLabId)
        } else if (assignedLabIds.length > 0) {
          sql += ` AND cal.lab_id IN (${assignedLabIds.join(',')})`
        }
      } else if (requestedLabId) {
        sql += ` AND cal.lab_id = ?`
        params.push(requestedLabId)
      }

      // Date filters
      if (startDate) {
        sql += ` AND DATE(cal.created_at) >= ?`
        params.push(startDate)
      }
      if (endDate) {
        sql += ` AND DATE(cal.created_at) <= ?`
        params.push(endDate)
      }

      sql += ` ORDER BY cal.created_at DESC LIMIT ? OFFSET ?`
      params.push(type === "all" ? Math.ceil(limit / 2) : limit, type === "all" ? Math.floor(offset / 2) : offset)

      const componentResult = await db.query(sql, params)
      
      // Process logs to extract component details from snapshot
      results.componentLogs = componentResult.rows.map((log: any) => {
        const snapshot = typeof log.entity_snapshot === 'string'
          ? JSON.parse(log.entity_snapshot)
          : log.entity_snapshot
        
        return {
          id: log.id,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          lab_id: log.lab_id,
          lab_name: log.lab_name || snapshot?.lab_name || 'Unknown Lab',
          requester_name: log.requester_name || snapshot?.requester_name || 'Unknown',
          requester_salutation: log.requester_salutation || snapshot?.requester_salutation || 'none',
          requester_email: log.requester_email || snapshot?.requester_email || '',
          requester_role: log.requester_role || snapshot?.requester_role || 'student',
          purpose: snapshot?.purpose || '',
          issued_at: snapshot?.issued_at || log.created_at,
          return_date: snapshot?.return_date || null,
          returned_at: snapshot?.returned_at || null,
          actual_return_date: snapshot?.actual_return_date || null,
          faculty_name: snapshot?.faculty_name || null,
          faculty_salutation: snapshot?.faculty_salutation || 'none',
          faculty_approved_at: snapshot?.faculty_approved_at || null,
          lab_staff_name: snapshot?.lab_staff_name || null,
          lab_staff_salutation: snapshot?.lab_staff_salutation || 'none',
          lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
          lab_coordinator_name: snapshot?.lab_coordinator_name || null,
          lab_coordinator_salutation: snapshot?.lab_coordinator_salutation || 'none',
          lab_coordinator_approved_at: snapshot?.lab_coordinator_approved_at || null,
          hod_name: snapshot?.hod_name || null,
          hod_salutation: snapshot?.hod_salutation || 'none',
          hod_approved_at: snapshot?.hod_approved_at || null,
          items: snapshot?.items || [],
          components_list: snapshot?.components_list || '',
          highest_approval_authority: snapshot?.highest_approval_authority || 'hod',
          final_approver_role: snapshot?.final_approver_role || null,
          created_at: log.created_at,
        }
      })
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
