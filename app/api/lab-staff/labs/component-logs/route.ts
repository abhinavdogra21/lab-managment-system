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

    if (user.role === 'admin') {
      const res = await db.query(`
        SELECT cr.*, l.name AS lab_name, d.name AS department_name,
          u.name AS requester_name, u.email AS requester_email, u.role AS requester_role,
          hodu.name AS hod_name
        FROM component_requests cr
        JOIN labs l ON cr.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        LEFT JOIN users u ON cr.requester_id = u.id
        LEFT JOIN users hodu ON d.hod_id = hodu.id
        WHERE cr.status = 'approved' AND cr.issued_at IS NOT NULL
        ORDER BY cr.created_at DESC
      `)
      // attempt to aggregate items per request
      const rows = res.rows || []
      for (const r of rows) {
        const items = await db.query(`SELECT ci.*, c.name as component_name FROM component_request_items ci JOIN components c ON ci.component_id = c.id WHERE ci.request_id = ?`, [r.id])
        // Attach items
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        r.items = items.rows || []
      }
      return NextResponse.json({ logs: rows })
    }

    // labs where user is head
    const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const labIds = labRes.rows.map((r: any) => Number(r.id))
    if (labIds.length === 0) return NextResponse.json({ logs: [] })

    const res = await db.query(`
      SELECT cr.*, l.name AS lab_name, d.name AS department_name,
        u.name AS requester_name, u.email AS requester_email, u.role AS requester_role,
        hodu.name AS hod_name
      FROM component_requests cr
      JOIN labs l ON cr.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u ON cr.requester_id = u.id
      LEFT JOIN users hodu ON d.hod_id = hodu.id
      WHERE cr.status = 'approved' AND cr.issued_at IS NOT NULL AND l.id IN (${labIds.join(',')})
      ORDER BY cr.created_at DESC
    `)

    const rows = res.rows || []
    for (const r of rows) {
      const items = await db.query(`SELECT ci.*, c.name as component_name FROM component_request_items ci JOIN components c ON ci.component_id = c.id WHERE ci.request_id = ?`, [r.id])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      r.items = items.rows || []
    }

    return NextResponse.json({ logs: rows })
  } catch (error) {
    console.error('Error fetching component logs for lab head:', error)
    return NextResponse.json({ error: 'Failed to fetch component logs' }, { status: 500 })
  }
}
