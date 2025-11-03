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

    // Get labs where user is head
    let labIds: number[] = []
    if (user.role !== 'admin') {
      const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
      labIds = labRes.rows.map((r: any) => Number(r.id))

      if (labIds.length === 0) {
        return NextResponse.json({ labStats: [], componentStats: [], allLabs: [] })
      }
    }

    // Get lab-wise component utilization
    let labStatsQuery
    if (user.role === 'admin') {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          c.id as component_id,
          c.name as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          SUM(cri.quantity_requested) as total_quantity_issued,
          CASE 
            WHEN c.quantity_total > 0 THEN LEAST(ROUND((SUM(cri.quantity_requested) / c.quantity_total) * 100, 2), 100)
            ELSE 0
          END as utilization_percentage
        FROM component_request_items cri
        JOIN component_requests cr ON cri.request_id = cr.id AND cr.status = 'approved' AND cr.issued_at IS NOT NULL
        JOIN components c ON cri.component_id = c.id
        JOIN labs l ON c.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        GROUP BY l.id, c.id
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_issued DESC
      `
    } else {
      labStatsQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          d.name as department_name,
          c.id as component_id,
          c.name as component_name,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          SUM(cri.quantity_requested) as total_quantity_issued,
          CASE 
            WHEN c.quantity_total > 0 THEN LEAST(ROUND((SUM(cri.quantity_requested) / c.quantity_total) * 100, 2), 100)
            ELSE 0
          END as utilization_percentage
        FROM component_request_items cri
        JOIN component_requests cr ON cri.request_id = cr.id AND cr.status = 'approved' AND cr.issued_at IS NOT NULL
        JOIN components c ON cri.component_id = c.id
        JOIN labs l ON c.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        WHERE l.id IN (${labIds.join(',')})
        GROUP BY l.id, c.id
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_issued DESC
      `
    }

    const labStats = await db.query(labStatsQuery)

    // Get overall component utilization (across all assigned labs)
    let componentStatsQuery
    if (user.role === 'admin') {
      componentStatsQuery = `
        SELECT 
          c.id as component_id,
          c.name as component_name,
          c.category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          SUM(cri.quantity_requested) as total_quantity_issued,
          CASE 
            WHEN c.quantity_total > 0 THEN LEAST(ROUND((SUM(cri.quantity_requested) / c.quantity_total) * 100, 2), 100)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT l.id) as labs_count
        FROM component_request_items cri
        JOIN component_requests cr ON cri.request_id = cr.id AND cr.status = 'approved' AND cr.issued_at IS NOT NULL
        JOIN components c ON cri.component_id = c.id
        JOIN labs l ON c.lab_id = l.id
        GROUP BY c.id
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_issued DESC
      `
    } else {
      componentStatsQuery = `
        SELECT 
          c.id as component_id,
          c.name as component_name,
          c.category,
          c.quantity_total,
          c.quantity_available,
          COUNT(DISTINCT cr.id) as times_requested,
          SUM(cri.quantity_requested) as total_quantity_issued,
          CASE 
            WHEN c.quantity_total > 0 THEN LEAST(ROUND((SUM(cri.quantity_requested) / c.quantity_total) * 100, 2), 100)
            ELSE 0
          END as utilization_percentage,
          COUNT(DISTINCT l.id) as labs_count
        FROM component_request_items cri
        JOIN component_requests cr ON cri.request_id = cr.id AND cr.status = 'approved' AND cr.issued_at IS NOT NULL
        JOIN components c ON cri.component_id = c.id
        JOIN labs l ON c.lab_id = l.id
        WHERE l.id IN (${labIds.join(',')})
        GROUP BY c.id
        ORDER BY utilization_percentage DESC, times_requested DESC, total_quantity_issued DESC
      `
    }

    const componentStats = await db.query(componentStatsQuery)

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
