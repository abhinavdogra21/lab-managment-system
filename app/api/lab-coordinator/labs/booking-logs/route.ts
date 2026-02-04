/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_coordinator", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // For non-admin Lab Coordinators, get their department(s) by lab_coordinator_id or checking highest_approval_authority
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
        [Number(user.userId)]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ logs: [] })
      }
    }

    // Build search condition
    const searchCondition = search 
      ? `AND (l.name LIKE ? OR lbal.actor_name LIKE ? OR JSON_EXTRACT(lbal.booking_snapshot, '$.purpose') LIKE ? OR lbal.actor_email LIKE ?)`
      : ''
    const searchValue = `%${search}%`
    
    // Build date filter condition
    const dateConditions: string[] = []
    const dateParams: string[] = []
    if (startDate) {
      dateConditions.push('lbal.created_at >= ?')
      dateParams.push(startDate)
    }
    if (endDate) {
      dateConditions.push('lbal.created_at <= ?')
      dateParams.push(`${endDate} 23:59:59`)
    }
    const dateCondition = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : ''

    // Get approved booking logs from activity logs (deletion-proof)
    // Show logs where action = 'approved_by_lab_coordinator' (final approval by Lab Coordinator)
    // OR action = 'approved_by_hod' (for departments where HOD is still the approver)
    let logsRes
    if (user.role === 'admin') {
      const params = [...(search ? [searchValue, searchValue, searchValue, searchValue] : []), ...dateParams]
      logsRes = await db.query(
        `SELECT 
          lbal.id as log_id,
          lbal.booking_id,
          lbal.lab_id,
          lbal.actor_user_id,
          lbal.actor_name,
          lbal.actor_email,
          lbal.actor_role,
          lbal.action,
          lbal.action_description,
          lbal.booking_snapshot,
          lbal.created_at,
          l.name as lab_name,
          l.department_id,
          d.lab_coordinator_id,
          lc_user.name as current_lab_coordinator_name,
          lc_user.email as current_lab_coordinator_email
         FROM lab_booking_activity_logs lbal
         LEFT JOIN labs l ON lbal.lab_id = l.id
         LEFT JOIN departments d ON l.department_id = d.id
         LEFT JOIN users lc_user ON d.lab_coordinator_id = lc_user.id
         LEFT JOIN multi_lab_approvals mla ON mla.booking_request_id = lbal.booking_id AND mla.lab_id = lbal.lab_id
         WHERE lbal.action IN ('approved_by_lab_coordinator', 'approved_by_hod')
           AND (mla.status IS NULL OR mla.status NOT IN ('rejected', 'withdrawn'))
           ${searchCondition} ${dateCondition}
         ORDER BY lbal.created_at DESC
         LIMIT 100`,
        params
      )
    } else {
      const placeholders = departmentIds.map(() => '?').join(',')
      const params = [
        ...departmentIds, 
        ...(search ? [searchValue, searchValue, searchValue, searchValue] : []),
        ...dateParams
      ]
      logsRes = await db.query(
        `SELECT 
          lbal.id as log_id,
          lbal.booking_id,
          lbal.lab_id,
          lbal.actor_user_id,
          lbal.actor_name,
          lbal.actor_email,
          lbal.actor_role,
          lbal.action,
          lbal.action_description,
          lbal.booking_snapshot,
          lbal.created_at,
          l.name as lab_name,
          l.department_id,
          d.lab_coordinator_id,
          lc_user.name as current_lab_coordinator_name,
          lc_user.email as current_lab_coordinator_email
         FROM lab_booking_activity_logs lbal
         LEFT JOIN labs l ON lbal.lab_id = l.id
         LEFT JOIN departments d ON l.department_id = d.id
         LEFT JOIN users lc_user ON d.lab_coordinator_id = lc_user.id
         LEFT JOIN multi_lab_approvals mla ON mla.booking_request_id = lbal.booking_id AND mla.lab_id = lbal.lab_id
         WHERE lbal.action IN ('approved_by_lab_coordinator', 'approved_by_hod')
           AND l.department_id IN (${placeholders})
           AND (mla.status IS NULL OR mla.status NOT IN ('rejected', 'withdrawn'))
           ${searchCondition} ${dateCondition}
         ORDER BY lbal.created_at DESC
         LIMIT 100`,
        params
      )
    }

    // Parse booking_snapshot JSON for each log
    // For multi-lab bookings, check individual lab status
    const logs = await Promise.all(logsRes.rows.map(async (row: any) => {
      const snapshot = typeof row.booking_snapshot === 'string' 
        ? JSON.parse(row.booking_snapshot) 
        : row.booking_snapshot
      
      // For multi-lab bookings, get the specific lab's status
      let individualLabStatus = snapshot?.status || 'approved'
      if (snapshot?.is_multi_lab) {
        const multiLabStatus = await db.query(
          `SELECT status FROM multi_lab_approvals 
           WHERE booking_request_id = ? AND lab_id = ?`,
          [row.booking_id, row.lab_id]
        )
        if (multiLabStatus.rows.length > 0) {
          individualLabStatus = multiLabStatus.rows[0].status
        }
      }
      
      return {
        id: row.booking_id,
        log_id: row.log_id,
        lab_id: row.lab_id,
        lab_name: row.lab_name,
        department_id: row.department_id,
        purpose: snapshot?.purpose || '',
        booking_date: snapshot?.booking_date || null,
        start_time: snapshot?.start_time || null,
        end_time: snapshot?.end_time || null,
        status: individualLabStatus, // Use individual lab status for multi-lab bookings
        is_multi_lab: snapshot?.is_multi_lab || false,
        created_at: snapshot?.created_at || row.created_at,
        lab_coordinator_approved_at: snapshot?.lab_coordinator_approved_at || (row.action === 'approved_by_lab_coordinator' ? row.created_at : null),
        hod_approved_at: snapshot?.hod_approved_at || (row.action === 'approved_by_hod' ? row.created_at : null),
        requester_name: snapshot?.requester_name || 'Unknown',
        requester_salutation: snapshot?.requester_salutation || null,
        requester_email: snapshot?.requester_email || '',
        requester_role: snapshot?.requester_role || 'student',
        faculty_name: snapshot?.faculty_name || null,
        faculty_salutation: snapshot?.faculty_salutation || null,
        faculty_approved_at: snapshot?.faculty_approved_at || null,
        lab_staff_name: snapshot?.lab_staff_name || null,
        lab_staff_salutation: snapshot?.lab_staff_salutation || null,
        lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
        lab_coordinator_name: snapshot?.lab_coordinator_name || null,
        lab_coordinator_salutation: snapshot?.lab_coordinator_salutation || null,
        hod_name: snapshot?.hod_name || null,
        hod_salutation: snapshot?.hod_salutation || null,
        hod_email: snapshot?.hod_email || null,
        responsible_person_name: snapshot?.responsible_person_name || null,
        current_lab_coordinator_name: row.current_lab_coordinator_name,
        current_lab_coordinator_email: row.current_lab_coordinator_email,
        action_description: row.action_description,
      }
    }))

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error fetching booking logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking logs' },
      { status: 500 }
    )
  }
}
