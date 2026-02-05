/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole } from '@/lib/auth'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ['lab_coordinator', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Get Lab Coordinator's departments
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

    // Build search condition - search in activity log fields and JSON snapshot
    const searchCondition = search 
      ? `AND (l.name LIKE ? OR cal.actor_name LIKE ? OR JSON_EXTRACT(cal.entity_snapshot, '$.purpose') LIKE ? OR cal.actor_email LIKE ?)`
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

    // Get component logs from activity logs (deletion-proof)
    // Show logs where action = 'issued' OR action = 'returned'
    let logsRes
    if (user.role === 'admin') {
      const params = [...(search ? [searchValue, searchValue, searchValue, searchValue] : []), ...dateParams]
      logsRes = await db.query(`
        SELECT 
          cal.id as log_id,
          cal.entity_id as id,
          cal.entity_type,
          cal.lab_id,
          cal.actor_user_id,
          cal.actor_name,
          cal.actor_email,
          cal.actor_role,
          cal.action,
          cal.action_description,
          cal.entity_snapshot,
          cal.created_at,
          l.name as lab_name,
          l.department_id
        FROM component_activity_logs cal
        LEFT JOIN labs l ON cal.lab_id = l.id
        WHERE cal.action IN ('issued', 'returned') AND cal.entity_type = 'component_request' ${searchCondition} ${dateCondition}
        ORDER BY cal.created_at DESC
        LIMIT 100
      `, params)
    } else {
      const placeholders = departmentIds.map(() => '?').join(',')
      const params = [
        ...departmentIds,
        ...(search ? [searchValue, searchValue, searchValue, searchValue] : []),
        ...dateParams
      ]
      logsRes = await db.query(`
        SELECT 
          cal.id as log_id,
          cal.entity_id as id,
          cal.entity_type,
          cal.lab_id,
          cal.actor_user_id,
          cal.actor_name,
          cal.actor_email,
          cal.actor_role,
          cal.action,
          cal.action_description,
          cal.entity_snapshot,
          cal.created_at,
          l.name as lab_name,
          l.department_id
        FROM component_activity_logs cal
        LEFT JOIN labs l ON cal.lab_id = l.id
        WHERE cal.action IN ('issued', 'returned') AND cal.entity_type = 'component_request' 
          AND l.department_id IN (${placeholders}) ${searchCondition} ${dateCondition}
        ORDER BY cal.created_at DESC
        LIMIT 100
      `, params)
    }

    // Parse entity_snapshot JSON for each log
    const logs = logsRes.rows.map((row: any) => {
      const snapshot = typeof row.entity_snapshot === 'string' 
        ? JSON.parse(row.entity_snapshot) 
        : row.entity_snapshot
      
      // Extract component items from snapshot
      const items = snapshot?.items || []
      const components_list = items.map((item: any) => 
        `${item.component_name || 'Unknown'} (Qty: ${item.quantity_requested || 0})`
      ).join(', ')

      return {
        id: row.id,
        log_id: row.log_id,
        lab_id: row.lab_id,
        lab_name: row.lab_name,
        department_id: row.department_id,
        purpose: snapshot?.purpose || '',
        status: snapshot?.status || 'approved',
        return_date: snapshot?.return_date || null,
        issued_at: snapshot?.issued_at || row.created_at,
        returned_at: snapshot?.returned_at || null,
        actual_return_date: snapshot?.actual_return_date || null,
        created_at: snapshot?.created_at || row.created_at,
        requester_name: snapshot?.requester_name || 'Unknown',
        requester_email: snapshot?.requester_email || '',
        requester_role: snapshot?.requester_role || snapshot?.initiator_role || 'student',
        faculty_name: snapshot?.faculty_name || null,
        faculty_approved_at: snapshot?.faculty_approved_at || null,
        lab_staff_name: snapshot?.lab_staff_name || null,
        lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
        lab_coordinator_name: snapshot?.lab_coordinator_name || null,
        lab_coordinator_approved_at: snapshot?.lab_coordinator_approved_at || null,
        hod_name: snapshot?.hod_name || null,
        hod_email: snapshot?.hod_email || null,
        hod_approved_at: snapshot?.hod_approved_at || null,
        action_description: row.action_description,
        components_list,
        final_approver_role: snapshot?.final_approver_role || null,
        highest_approval_authority: snapshot?.highest_approval_authority || null,
      }
    })

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error fetching component logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component logs' },
      { status: 500 }
    )
  }
}
