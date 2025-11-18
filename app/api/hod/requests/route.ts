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
        // Lab Coordinator: get departments where they are assigned
        const depRes = await db.query(
          `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
          [Number(user.userId)]
        )
        departmentIds = depRes.rows.map((d: any) => Number(d.id))
      } else {
        // HOD: get departments by hod_id or hod_email
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

    // Get requests that need HOD approval from the user's department
    // Only show requests where HOD is the actual approver (not Lab Coordinator)
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

    // Add department filter for non-admin users
    if (user.role !== 'admin') {
      query += ` WHERE d.id IN (${departmentIds.map(() => '?').join(',')})`
      params.push(...departmentIds)
      
      if (user.role === 'lab_coordinator') {
        // Lab Coordinator: Only show requests where they are the highest approval authority
        query += ` AND d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL`
      } else {
        // HOD: Only show requests where HOD is the highest approval authority
        // (Either highest_approval_authority = 'hod' OR NULL/lab_coordinator not assigned)
        query += ` AND (d.highest_approval_authority = 'hod' OR d.highest_approval_authority IS NULL)`
      }
    } else {
      query += ` WHERE 1=1`
    }

    if (status && status !== 'all') {
      if (status === 'rejected') {
        // For rejected status, only show requests rejected BY HOD (not by faculty or lab staff)
        query += ` AND br.status = 'rejected' AND br.hod_approved_by IS NOT NULL`
      } else {
        // specific status requested
        query += ` AND br.status = ?`
        params.push(status)
      }
    } else if (status === 'all') {
      // For 'all' status, only show requests that reached HOD level
      // This includes: pending_hod, approved, and requests rejected BY HOD
      query += ` AND (br.status = 'pending_hod' OR br.status = 'approved' OR (br.status = 'rejected' AND br.hod_approved_by IS NOT NULL))`
    } else {
      // Default: show requests waiting for HOD approval when no status provided
      query += ` AND br.status = 'pending_hod'`
    }

    query += ` ORDER BY br.created_at DESC LIMIT 50`

    const result = await db.query(query, params)
    
    // For multi-lab bookings, fetch additional details
    const requests = await Promise.all(result.rows.map(async (booking: any) => {
      // Parse lab_ids if it's a multi-lab booking
      let labIds: number[] = []
      if (booking.is_multi_lab) {
        if (Array.isArray(booking.lab_ids)) {
          labIds = booking.lab_ids
        } else if (Buffer.isBuffer(booking.lab_ids)) {
          labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
        } else if (typeof booking.lab_ids === 'string') {
          labIds = JSON.parse(booking.lab_ids)
        }

        // Fetch multi-lab approvals
        const approvalsResult = await db.query(`
          SELECT 
            mla.id,
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
          WHERE mla.booking_request_id = ?
          ORDER BY l.name
        `, [booking.id])

        // Fetch responsible persons
        const responsiblePersonsResult = await db.query(`
          SELECT lab_id, name, email
          FROM multi_lab_responsible_persons
          WHERE booking_request_id = ?
        `, [booking.id])

        // Map responsible persons to approvals
        const multiLabApprovals = approvalsResult.rows.map((approval: any) => {
          const responsible = responsiblePersonsResult.rows.find((rp: any) => rp.lab_id === approval.lab_id)
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
    }))
    
    return NextResponse.json({ 
      requests,
      total: requests.length
    })
  } catch (error) {
    console.error("Error fetching HOD requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
