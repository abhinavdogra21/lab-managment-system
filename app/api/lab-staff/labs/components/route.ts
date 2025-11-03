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

    // If admin, behave like HOD admin view
    if (user.role === 'admin') {
      const labsRes = await db.query(`SELECT id, name, department_id FROM labs ORDER BY name`)
      const componentsRes = await db.query(`
        SELECT c.*, l.name as lab_name, l.department_id
        FROM components c
        JOIN labs l ON c.lab_id = l.id
        ORDER BY l.name, c.name
      `)
      return NextResponse.json({ labs: labsRes.rows || [], components: componentsRes.rows || [] })
    }

    // For lab staff, get labs where the user is head (l.staff_id)
    const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const labIds = labRes.rows.map((r: any) => Number(r.id))

    if (labIds.length === 0) {
      return NextResponse.json({ labs: [], components: [] })
    }

    const placeholders = labIds.map(() => '?').join(',')
    const labsRes = await db.query(
      `SELECT id, name, department_id FROM labs WHERE id IN (${placeholders}) ORDER BY name`,
      labIds
    )

    const componentsRes = await db.query(
      `SELECT c.*, l.name as lab_name, l.department_id
       FROM components c
       JOIN labs l ON c.lab_id = l.id
       WHERE l.id IN (${placeholders})
       ORDER BY l.name, c.name`,
      labIds
    )

    return NextResponse.json({ labs: labsRes.rows || [], components: componentsRes.rows || [] })
  } catch (error) {
    console.error('Error fetching lab components for lab head:', error)
    return NextResponse.json({ error: 'Failed to fetch lab components' }, { status: 500 })
  }
}
