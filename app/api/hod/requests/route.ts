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
        br.hod_approved_at,
        s.name as student_name,
        s.email as student_email,
        f.name as faculty_name,
        l.name as lab_name,
        d.highest_approval_authority,
        d.lab_coordinator_id
      FROM booking_requests br
      JOIN users s ON br.requested_by = s.id
      JOIN users f ON br.faculty_supervisor_id = f.id
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
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
    
    return NextResponse.json({ 
      requests: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error("Error fetching HOD requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
