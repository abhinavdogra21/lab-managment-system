import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole } from '@/lib/auth'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ['hod', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Get HOD's departments
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
      ? `AND (l.name LIKE ? OR u_req.name LIKE ? OR cr.purpose LIKE ? OR u_req.email LIKE ? OR c.name LIKE ?)`
      : ''
    const searchValue = `%${search}%`

    // Get issued and returned component requests with full details
    let logsRes
    if (user.role === 'admin') {
      const params = search ? [searchValue, searchValue, searchValue, searchValue, searchValue] : []
      // Admin sees all component requests
      logsRes = await db.query(`
        SELECT 
          cr.id,
          cr.purpose,
          cr.status,
          cr.return_date,
          cr.issued_at,
          cr.returned_at,
          cr.actual_return_date,
          cr.created_at,
          l.name as lab_name,
          l.department_id,
          u_req.name as requester_name,
          u_req.email as requester_email,
          u_req.role as requester_role,
          u_fac.name as faculty_name,
          u_fac.email as faculty_email,
          cr.faculty_approved_at,
          u_staff.name as lab_staff_name,
          u_staff.email as lab_staff_email,
          cr.lab_staff_approved_at,
          u_hod.name as hod_name,
          u_hod.email as hod_email,
          cr.hod_approved_at,
          GROUP_CONCAT(
            CONCAT(c.name, ' (Qty: ', cri.quantity_requested, ')')
            SEPARATOR ', '
          ) as components_list
        FROM component_requests cr
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        JOIN users u_req ON cr.requester_id = u_req.id
        LEFT JOIN users u_fac ON cr.faculty_approver_id = u_fac.id
        LEFT JOIN users u_staff ON cr.lab_staff_approver_id = u_staff.id
        LEFT JOIN users u_hod ON d.hod_id = u_hod.id
        LEFT JOIN component_request_items cri ON cr.id = cri.request_id
        LEFT JOIN components c ON cri.component_id = c.id
        WHERE cr.status = 'approved' AND cr.issued_at IS NOT NULL ${searchCondition}
        GROUP BY cr.id
        ORDER BY cr.created_at DESC
      `, params)
    } else {
      const params = search 
        ? [...departmentIds, searchValue, searchValue, searchValue, searchValue, searchValue]
        : departmentIds
      // HOD sees component requests from their department's labs
      logsRes = await db.query(`
        SELECT 
          cr.id,
          cr.purpose,
          cr.status,
          cr.return_date,
          cr.issued_at,
          cr.returned_at,
          cr.actual_return_date,
          cr.created_at,
          l.name as lab_name,
          l.department_id,
          u_req.name as requester_name,
          u_req.email as requester_email,
          u_req.role as requester_role,
          u_fac.name as faculty_name,
          u_fac.email as faculty_email,
          cr.faculty_approved_at,
          u_staff.name as lab_staff_name,
          u_staff.email as lab_staff_email,
          cr.lab_staff_approved_at,
          u_hod.name as hod_name,
          u_hod.email as hod_email,
          cr.hod_approved_at,
          GROUP_CONCAT(
            CONCAT(c.name, ' (Qty: ', cri.quantity_requested, ')')
            SEPARATOR ', '
          ) as components_list
        FROM component_requests cr
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        JOIN users u_req ON cr.requester_id = u_req.id
        LEFT JOIN users u_fac ON cr.faculty_approver_id = u_fac.id
        LEFT JOIN users u_staff ON cr.lab_staff_approver_id = u_staff.id
        LEFT JOIN users u_hod ON d.hod_id = u_hod.id
        LEFT JOIN component_request_items cri ON cr.id = cri.request_id
        LEFT JOIN components c ON cri.component_id = c.id
        WHERE l.department_id IN (${departmentIds.map(() => '?').join(',')})
          AND cr.status = 'approved' AND cr.issued_at IS NOT NULL ${searchCondition}
        GROUP BY cr.id
        ORDER BY cr.created_at DESC
      `, params)
    }

    return NextResponse.json({ logs: logsRes.rows || [] })
  } catch (error) {
    console.error('Error fetching component logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component logs' },
      { status: 500 }
    )
  }
}
