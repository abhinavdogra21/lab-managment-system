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
    
    // Get date filters from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get Lab Coordinator's departments
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
        [Number(user.userId)]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))

      if (departmentIds.length === 0) {
        return NextResponse.json({ labStats: [], componentStats: [], allLabs: [] })
      }
    }

    // Build date filter condition
    let dateCondition = ''
    const dateParams: string[] = []
    if (startDate) {
      dateCondition += ' AND cr.created_at >= ?'
      dateParams.push(startDate)
    }
    if (endDate) {
      dateCondition += ' AND cr.created_at <= ?'
      dateParams.push(`${endDate} 23:59:59`)
    }

    // Get lab-wise component utilization from component_requests and component_request_items
    let labStatsQuery
    let labStatsParams: any[] = []
    
    if (user.role === 'admin') {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          cri.component_id,
          c.name as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          COALESCE(SUM(cri.quantity_requested), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(cri.quantity_requested), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage
        FROM component_requests cr
        JOIN component_request_items cri ON cr.id = cri.request_id
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        JOIN components c ON cri.component_id = c.id
        WHERE cr.status IN ('approved', 'issued', 'returned') ${dateCondition.replace('cal.', 'cr.')}
        GROUP BY l.id, l.name, d.name, cri.component_id, c.name, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      labStatsParams = [...dateParams]
    } else {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          cri.component_id,
          c.name as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          COALESCE(SUM(cri.quantity_requested), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(cri.quantity_requested), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage
        FROM component_requests cr
        JOIN component_request_items cri ON cr.id = cri.request_id
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        JOIN components c ON cri.component_id = c.id
        WHERE cr.status IN ('approved', 'issued', 'returned') AND d.id IN (${departmentIds.join(',')}) ${dateCondition.replace('cal.', 'cr.')}
        GROUP BY l.id, l.name, d.name, cri.component_id, c.name, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      labStatsParams = [...dateParams]
    }

    const labStats = await db.query(labStatsQuery, labStatsParams)

    // Get overall component utilization (across all labs) from component_requests
    let componentStatsQuery
    let componentStatsParams: any[] = []
    
    if (user.role === 'admin') {
      componentStatsQuery = `
        SELECT 
          cri.component_id,
          c.name as component_name,
          c.category as category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          COALESCE(SUM(cri.quantity_requested), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(cri.quantity_requested), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT cr.lab_id) as labs_count
        FROM component_requests cr
        JOIN component_request_items cri ON cr.id = cri.request_id
        JOIN components c ON cri.component_id = c.id
        WHERE cr.status IN ('approved', 'issued', 'returned') ${dateCondition.replace('cal.', 'cr.')}
        GROUP BY cri.component_id, c.name, c.category, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      componentStatsParams = [...dateParams]
    } else {
      componentStatsQuery = `
        SELECT 
          cri.component_id,
          c.name as component_name,
          c.category as category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          COALESCE(SUM(cri.quantity_requested), 0) as total_quantity_requested,
          CASE 
            WHEN c.quantity_total > 0 THEN ROUND((COALESCE(SUM(cri.quantity_requested), 0) / c.quantity_total) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT cr.lab_id) as labs_count
        FROM component_requests cr
        JOIN component_request_items cri ON cr.id = cri.request_id
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        JOIN components c ON cri.component_id = c.id
        WHERE cr.status IN ('approved', 'issued', 'returned') AND d.id IN (${departmentIds.join(',')}) ${dateCondition.replace('cal.', 'cr.')}
        GROUP BY cri.component_id, c.name, c.category, c.quantity_total, c.quantity_available
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_requested DESC
      `
      componentStatsParams = [...dateParams]
    }

    const componentStats = await db.query(componentStatsQuery, componentStatsParams)

    // Get all labs in the department (to show labs with no components)
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
        WHERE d.id IN (${departmentIds.join(',')})
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
