/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { type NextRequest, NextResponse } from "next/server"
import { dbOperations, Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "lab_coordinator", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const db = Database.getInstance()

    // For non-admin users, get their department(s)
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      if (user.role === 'lab_coordinator') {
        const depRes = await db.query(
          `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
          [Number(user.userId)]
        )
        departmentIds = depRes.rows.map((d: any) => Number(d.id))
      } else {
        const depRes = await db.query(
          `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
          [Number(user.userId), String(user.email || '')]
        )
        departmentIds = depRes.rows.map((d: any) => Number(d.id))
      }
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ requests: [], total: 0 })
      }
    }

    // Build main query
    let query = `
      SELECT DISTINCT
        br.id,
        br.booking_date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.created_at,
        br.requested_by,
        br.faculty_supervisor_id,
        br.faculty_remarks,
        br.lab_staff_remarks,
        br.hod_remarks,
        br.faculty_approved_at,
        br.lab_staff_approved_at,
        br.lab_staff_approved_by,
        br.hod_approved_at,
        br.is_multi_lab,
        br.lab_id,
        br.lab_ids,
        br.responsible_person_name,
        br.responsible_person_email,
        s.name as student_name,
        s.email as student_email,
        s.salutation as student_salutation,
        COALESCE(f.name, 'N/A') as faculty_name,
        l.name as lab_name,
        ls.name as lab_staff_name,
        d.highest_approval_authority,
        d.lab_coordinator_id,
        d.id as department_id
      FROM booking_requests br
      JOIN users s ON br.requested_by = s.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users ls ON br.lab_staff_approved_by = ls.id
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
    `

    const params: any[] = []

    if (user.role !== 'admin') {
      query += ` WHERE d.id IN (${departmentIds.map(() => '?').join(',')})`
      params.push(...departmentIds)
      
      if (user.role === 'lab_coordinator') {
        query += ` AND d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL`
      } else {
        query += ` AND (d.highest_approval_authority = 'hod' OR d.highest_approval_authority IS NULL)`
      }
    } else {
      query += ` WHERE 1=1`
    }

    if (status && status !== 'all') {
      if (status === 'rejected') {
        query += ` AND br.status = 'rejected' AND br.hod_approved_by IS NOT NULL`
      } else {
        query += ` AND br.status = ?`
        params.push(status)
      }
    } else if (status === 'all') {
      query += ` AND (br.status = 'pending_hod' OR br.status = 'approved' OR (br.status = 'rejected' AND br.hod_approved_by IS NOT NULL))`
    } else {
      query += ` AND br.status = 'pending_hod'`
    }

    query += ` ORDER BY br.created_at DESC LIMIT 50`

    const result = await db.query(query, params)

    // ── BATCH: Fetch all multi-lab data in bulk instead of per-booking ──
    const multiLabBookingIds = result.rows
      .filter((b: any) => b.is_multi_lab)
      .map((b: any) => b.id)

    let allApprovals: any[] = []
    let allResponsiblePersons: any[] = []

    if (multiLabBookingIds.length > 0) {
      const ph = multiLabBookingIds.map(() => '?').join(',')

      const [approvalsRes, rpRes] = await Promise.all([
        db.query(`
          SELECT 
            mla.id,
            mla.booking_request_id,
            mla.lab_id,
            mla.status,
            mla.lab_staff_approved_by,
            mla.lab_staff_approved_at,
            mla.lab_staff_remarks,
            mla.hod_approved_by,
            mla.hod_approved_at,
            l.name as lab_name,
            ls.name as lab_staff_name
          FROM multi_lab_approvals mla
          JOIN labs l ON mla.lab_id = l.id
          LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
          WHERE mla.booking_request_id IN (${ph})
          ORDER BY l.name
        `, multiLabBookingIds),
        db.query(`
          SELECT booking_request_id, lab_id, name, email
          FROM multi_lab_responsible_persons
          WHERE booking_request_id IN (${ph})
        `, multiLabBookingIds)
      ])
      allApprovals = approvalsRes.rows
      allResponsiblePersons = rpRes.rows
    }

    // ── Assemble results in memory (no more DB queries) ──
    const requests = result.rows.map((booking: any) => {
      if (booking.is_multi_lab) {
        let labIds: number[] = []
        try {
          if (Array.isArray(booking.lab_ids)) labIds = booking.lab_ids
          else if (Buffer.isBuffer(booking.lab_ids)) labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
          else if (typeof booking.lab_ids === 'string') labIds = JSON.parse(booking.lab_ids)
        } catch {}

        // Filter approvals and RPs for this booking from batched data
        const bookingApprovals = allApprovals.filter((a: any) => a.booking_request_id === booking.id)
        const bookingRPs = allResponsiblePersons.filter((rp: any) => rp.booking_request_id === booking.id)

        const multiLabApprovals = bookingApprovals.map((approval: any) => {
          const responsible = bookingRPs.find((rp: any) => rp.lab_id === approval.lab_id)
          return {
            ...approval,
            responsible_person_name: responsible?.name,
            responsible_person_email: responsible?.email
          }
        })

        return {
          ...booking,
          lab_ids: labIds,
          multi_lab_approvals: multiLabApprovals
        }
      }
      return booking
    })
    
    return NextResponse.json({ 
      requests,
      total: requests.length
    })
  } catch (error) {
    console.error("Error fetching HOD requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
