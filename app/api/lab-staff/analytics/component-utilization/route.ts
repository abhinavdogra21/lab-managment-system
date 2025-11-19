/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole } from '@/lib/auth'
import { Database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ['lab_staff', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = Database.getInstance()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

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

    // Get labs where user is head
    let labIds: number[] = []
    if (user.role !== 'admin') {
      const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
      labIds = labRes.rows.map((r: any) => Number(r.id))

      if (labIds.length === 0) {
        return NextResponse.json({ labStats: [], componentStats: [], allLabs: [] })
      }
    }

    // Get lab-wise component utilization from activity logs
    let labStatsQuery
    let labStatsParams: any[] = []
    
    if (user.role === 'admin') {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') as component_id,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')) as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cal.entity_id) as times_requested,
          COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage
        FROM component_activity_logs cal
        JOIN labs l ON cal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        INNER JOIN components c ON c.id = JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id')
        WHERE cal.action = 'issued' AND JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') IS NOT NULL ${dateCondition}
        GROUP BY l.id, l.name, d.name, JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id'), JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')), c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      labStatsParams = [...dateParams]
    } else {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') as component_id,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')) as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cal.entity_id) as times_requested,
          COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage
        FROM component_activity_logs cal
        JOIN labs l ON cal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        INNER JOIN components c ON c.id = JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id')
        WHERE cal.action = 'issued' AND l.id IN (${labIds.join(',')}) AND JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') IS NOT NULL ${dateCondition}
        GROUP BY l.id, l.name, d.name, JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id'), JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')), c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      labStatsParams = [...dateParams]
    }

    const labStats = await db.query(labStatsQuery, labStatsParams)

    // Get overall component utilization (across all assigned labs)
    let componentStatsQuery
    let componentStatsParams: any[] = []
    
    if (user.role === 'admin') {
      componentStatsQuery = `
        SELECT 
          JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') as component_id,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')) as component_name,
          c.category as category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cal.entity_id) as times_requested,
          COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT cal.lab_id) as labs_count
        FROM component_activity_logs cal
        INNER JOIN components c ON c.id = JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id')
        WHERE cal.action = 'issued' AND JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') IS NOT NULL ${dateCondition}
        GROUP BY JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id'), JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')), c.category, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      componentStatsParams = [...dateParams]
    } else {
      componentStatsQuery = `
        SELECT 
          JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') as component_id,
          JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')) as component_name,
          c.category as category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cal.entity_id) as times_requested,
          COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].quantity_requested')), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT cal.lab_id) as labs_count
        FROM component_activity_logs cal
        JOIN labs l ON cal.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        INNER JOIN components c ON c.id = JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id')
        WHERE cal.action = 'issued' AND l.id IN (${labIds.join(',')}) AND JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id') IS NOT NULL ${dateCondition}
        GROUP BY JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_id'), JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.items[0].component_name')), c.category, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      componentStatsParams = [...dateParams]
    }

    const componentStats = await db.query(componentStatsQuery, componentStatsParams)

    // Get all labs that the staff member is head of
    let allLabsQuery
    if (user.role === 'admin') {
      allLabsQuery = `
        SELECT l.id as lab_id, l.name as lab_name, d.name as department_name
        FROM labs l
        JOIN departments d ON l.department_id = d.id
        ORDER BY d.name, l.name
      `
    } else {
      allLabsQuery = `
        SELECT l.id as lab_id, l.name as lab_name, d.name as department_name
        FROM labs l
        JOIN departments d ON l.department_id = d.id
        WHERE l.id IN (${labIds.join(',')})
        ORDER BY d.name, l.name
      `
    }
    const allLabs = await db.query(allLabsQuery)

    return NextResponse.json({
      labStats: labStats.rows || [],
      componentStats: componentStats.rows || [],
      allLabs: allLabs.rows || []
    })
  } catch (error) {
    console.error('Error fetching component utilization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component utilization' },
      { status: 500 }
    )
  }
}
