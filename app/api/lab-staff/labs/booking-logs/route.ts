import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Build search condition - search in activity logs and booking snapshot
    const searchCondition = search 
      ? `AND (l.name LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_name')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.purpose')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_email')) LIKE ?)`
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

    if (user.role === 'admin') {
      const params = [
        ...(search ? [searchValue, searchValue, searchValue, searchValue] : []),
        ...dateParams
      ]
      // Use activity logs to preserve deleted user information
      const res = await db.query(`
        SELECT DISTINCT
          lbal.booking_id as id,
          lbal.created_at,
          l.name AS lab_name,
          d.name AS department_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_name')) AS requester_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_salutation')) AS requester_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_email')) AS requester_email,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_role')) AS requester_role,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.booking_date')) AS booking_date,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.start_time')) AS start_time,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.end_time')) AS end_time,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.purpose')) AS purpose,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.status')) AS status,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_name')) AS faculty_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_salutation')) AS faculty_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_approved_at')) AS faculty_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_name')) AS lab_staff_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_salutation')) AS lab_staff_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_approved_at')) AS lab_staff_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_name')) AS hod_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_salutation')) AS hod_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_approved_at')) AS hod_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_coordinator_name')) AS lab_coordinator_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_coordinator_salutation')) AS lab_coordinator_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.responsible_person_name')) AS responsible_person_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.responsible_person_email')) AS responsible_person_email
        FROM lab_booking_activity_logs lbal
        JOIN labs l ON lbal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        WHERE lbal.action = 'approved_by_hod' ${searchCondition} ${dateCondition}
        ORDER BY lbal.created_at DESC
      `, params)
      return NextResponse.json({ logs: res.rows || [] })
    }

    // Get labs where the user is head
    const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const labIds = labRes.rows.map((r: any) => Number(r.id))

    if (labIds.length === 0) return NextResponse.json({ logs: [] })

    const placeholders = labIds.map(() => '?').join(',')
    const params = [
      ...labIds, 
      ...(search ? [searchValue, searchValue, searchValue, searchValue] : []),
      ...dateParams
    ]
    // Use activity logs to preserve deleted user information
    const res = await db.query(
      `
        SELECT DISTINCT
          lbal.booking_id as id,
          lbal.created_at,
          l.name AS lab_name,
          d.name AS department_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_name')) AS requester_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_salutation')) AS requester_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_email')) AS requester_email,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_role')) AS requester_role,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.booking_date')) AS booking_date,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.start_time')) AS start_time,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.end_time')) AS end_time,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.purpose')) AS purpose,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.status')) AS status,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_name')) AS faculty_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_salutation')) AS faculty_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_approved_at')) AS faculty_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_name')) AS lab_staff_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_salutation')) AS lab_staff_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_staff_approved_at')) AS lab_staff_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_name')) AS hod_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_salutation')) AS hod_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.hod_approved_at')) AS hod_approved_at,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_coordinator_name')) AS lab_coordinator_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.lab_coordinator_salutation')) AS lab_coordinator_salutation,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.responsible_person_name')) AS responsible_person_name,
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.responsible_person_email')) AS responsible_person_email
        FROM lab_booking_activity_logs lbal
        JOIN labs l ON lbal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        WHERE lbal.action = 'approved_by_hod' AND l.id IN (${placeholders}) ${searchCondition} ${dateCondition}
        ORDER BY lbal.created_at DESC
      `,
      params
    )

    return NextResponse.json({ logs: res.rows || [] })
  } catch (error) {
    console.error('Error fetching lab booking logs for lab head:', error)
    return NextResponse.json({ error: 'Failed to fetch booking logs' }, { status: 500 })
  }
}
