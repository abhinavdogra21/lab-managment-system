import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // For non-admin HODs, get their department(s) by hod_id or hod_email
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
        [Number(user.userId), String(user.email || '')]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ logs: [] })
      }
    }

    // Build search condition
    const searchCondition = search 
      ? `AND (l.name LIKE ? OR requester.name LIKE ? OR br.purpose LIKE ? OR requester.email LIKE ?)`
      : ''
    const searchValue = `%${search}%`

    // Get approved booking logs from labs in HOD's departments
    // Including the approval chain: requester -> faculty -> lab staff -> hod
    let logsRes
    if (user.role === 'admin') {
      const params = search ? [searchValue, searchValue, searchValue, searchValue] : []
      logsRes = await db.query(
        `SELECT 
          br.id, br.lab_id, br.purpose, br.booking_date, br.start_time, br.end_time, br.status,
          br.created_at, br.updated_at,
          br.faculty_approved_at, br.lab_staff_approved_at, br.hod_approved_at,
          l.name as lab_name, l.department_id,
          requester.name as requester_name, requester.email as requester_email, requester.role as requester_role,
          faculty.name as faculty_name, faculty.email as faculty_email,
          lab_staff.name as lab_staff_name, lab_staff.email as lab_staff_email,
          hod.name as hod_name, hod.email as hod_email
         FROM booking_requests br
         JOIN labs l ON br.lab_id = l.id
         JOIN departments d ON l.department_id = d.id
         LEFT JOIN users requester ON br.requested_by = requester.id
         LEFT JOIN users faculty ON br.faculty_approved_by = faculty.id
         LEFT JOIN users lab_staff ON br.lab_staff_approved_by = lab_staff.id
         LEFT JOIN users hod ON d.hod_id = hod.id
         WHERE br.status = 'approved' AND br.request_type = 'lab_booking' ${searchCondition}
         ORDER BY br.created_at DESC
         LIMIT 100`,
        params
      )
    } else {
      const placeholders = departmentIds.map(() => '?').join(',')
      const params = search 
        ? [...departmentIds, searchValue, searchValue, searchValue, searchValue]
        : departmentIds
      logsRes = await db.query(
        `SELECT 
          br.id, br.lab_id, br.purpose, br.booking_date, br.start_time, br.end_time, br.status,
          br.created_at, br.updated_at,
          br.faculty_approved_at, br.lab_staff_approved_at, br.hod_approved_at,
          l.name as lab_name, l.department_id,
          requester.name as requester_name, requester.email as requester_email, requester.role as requester_role,
          faculty.name as faculty_name, faculty.email as faculty_email,
          lab_staff.name as lab_staff_name, lab_staff.email as lab_staff_email,
          hod.name as hod_name, hod.email as hod_email
         FROM booking_requests br
         JOIN labs l ON br.lab_id = l.id
         JOIN departments d ON l.department_id = d.id
         LEFT JOIN users requester ON br.requested_by = requester.id
         LEFT JOIN users faculty ON br.faculty_approved_by = faculty.id
         LEFT JOIN users lab_staff ON br.lab_staff_approved_by = lab_staff.id
         LEFT JOIN users hod ON d.hod_id = hod.id
         WHERE br.status = 'approved' AND br.request_type = 'lab_booking' AND l.department_id IN (${placeholders}) ${searchCondition}
         ORDER BY br.created_at DESC
         LIMIT 100`,
        params
      )
    }

    const logs = logsRes.rows

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error fetching booking logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking logs' },
      { status: 500 }
    )
  }
}
