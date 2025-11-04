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

    // Build search condition - search in activity logs and snapshot
    const searchCondition = search 
      ? `AND (l.name LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_name')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.purpose')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_email')) LIKE ? OR c.name LIKE ?)`
      : ''
    const searchValue = `%${search}%`
    
    // Build date filter condition
    const dateConditions: string[] = []
    const dateParams: string[] = []
    if (startDate) {
      dateConditions.push('cal.created_at >= ?')
      dateParams.push(startDate)
    }
    if (endDate) {
      dateConditions.push('cal.created_at <= ?')
      dateParams.push(`${endDate} 23:59:59`)
    }
    const dateCondition = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : ''

    if (user.role === 'admin') {
      const params = [
        ...(search ? [searchValue, searchValue, searchValue, searchValue, searchValue] : []),
        ...dateParams
      ]
      // Use activity logs to preserve deleted user information
      const res = await db.query(`
        SELECT DISTINCT 
          cal.entity_id as id,
          cal.created_at,
          l.name AS lab_name, 
          d.name AS department_name,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_name')) AS requester_name,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_email')) AS requester_email,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_role')) AS requester_role,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.purpose')) AS purpose,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.return_date')) AS return_date,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.status')) AS status,
          cal.created_at as issued_at,
          cal.entity_snapshot,
          hodu.name AS hod_name,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.hod_approved_at')) AS hod_approved_at
        FROM component_activity_logs cal
        JOIN labs l ON cal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        LEFT JOIN users hodu ON d.hod_id = hodu.id
        LEFT JOIN component_request_items cri ON cal.entity_id = cri.request_id
        LEFT JOIN components c ON cri.component_id = c.id
        WHERE cal.action = 'issued' AND cal.entity_type = 'component_request' ${searchCondition} ${dateCondition}
        ORDER BY cal.created_at DESC
      `, params)
      
      const rows = res.rows || []
      for (const r of rows) {
        // Get items from snapshot (already an object, not a string)
        const snapshot = typeof r.entity_snapshot === 'string' 
          ? JSON.parse(r.entity_snapshot) 
          : r.entity_snapshot
        r.items = snapshot?.items || []
        
        // Get returned_at from activity logs if returned
        const returnLog = await db.query(
          `SELECT created_at, JSON_UNQUOTE(JSON_EXTRACT(entity_snapshot, '$.actual_return_date')) as actual_return_date 
           FROM component_activity_logs 
           WHERE entity_id = ? AND action = 'returned' AND entity_type = 'component_request' 
           ORDER BY created_at DESC LIMIT 1`,
          [r.id]
        )
        if (returnLog.rows && returnLog.rows.length > 0) {
          r.returned_at = returnLog.rows[0].created_at
          r.actual_return_date = returnLog.rows[0].actual_return_date
        } else {
          r.returned_at = null
          r.actual_return_date = null
        }
        
        delete r.entity_snapshot
      }
      return NextResponse.json({ logs: rows })
    }

    // labs where user is head
    const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const labIds = labRes.rows.map((r: any) => Number(r.id))
    if (labIds.length === 0) return NextResponse.json({ logs: [] })

    const params = [
      ...(search ? [searchValue, searchValue, searchValue, searchValue, searchValue] : []),
      ...dateParams
    ]
    // Use activity logs to preserve deleted user information
    const res = await db.query(`
      SELECT DISTINCT 
        cal.entity_id as id,
        cal.created_at,
        l.name AS lab_name, 
        d.name AS department_name,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_name')) AS requester_name,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_email')) AS requester_email,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_role')) AS requester_role,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.purpose')) AS purpose,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.return_date')) AS return_date,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.status')) AS status,
        cal.created_at as issued_at,
        cal.entity_snapshot,
        hodu.name AS hod_name,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.hod_approved_at')) AS hod_approved_at
      FROM component_activity_logs cal
      JOIN labs l ON cal.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      LEFT JOIN users hodu ON d.hod_id = hodu.id
      LEFT JOIN component_request_items cri ON cal.entity_id = cri.request_id
      LEFT JOIN components c ON cri.component_id = c.id
      WHERE cal.action = 'issued' AND cal.entity_type = 'component_request' AND l.id IN (${labIds.join(',')}) ${searchCondition} ${dateCondition}
      ORDER BY cal.created_at DESC
    `, params)

    const rows = res.rows || []
    for (const r of rows) {
      // Get items from snapshot (already an object, not a string)
      const snapshot = typeof r.entity_snapshot === 'string' 
        ? JSON.parse(r.entity_snapshot) 
        : r.entity_snapshot
      r.items = snapshot?.items || []
      
      // Get returned_at from activity logs if returned
      const returnLog = await db.query(
        `SELECT created_at, JSON_UNQUOTE(JSON_EXTRACT(entity_snapshot, '$.actual_return_date')) as actual_return_date 
         FROM component_activity_logs 
         WHERE entity_id = ? AND action = 'returned' AND entity_type = 'component_request' 
         ORDER BY created_at DESC LIMIT 1`,
        [r.id]
      )
      if (returnLog.rows && returnLog.rows.length > 0) {
        r.returned_at = returnLog.rows[0].created_at
        r.actual_return_date = returnLog.rows[0].actual_return_date
      } else {
        r.returned_at = null
        r.actual_return_date = null
      }
      
      delete r.entity_snapshot
    }

    return NextResponse.json({ logs: rows })
  } catch (error) {
    console.error('Error fetching component logs for lab head:', error)
    return NextResponse.json({ error: 'Failed to fetch component logs' }, { status: 500 })
  }
}
