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

    // For non-admin HODs, get their department(s) by hod_id or hod_email
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
        [Number(user.userId), String(user.email || '')]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ components: [] })
      }
    }

    // Get all labs and components from HOD's departments
    let labsRes, componentsRes
    if (user.role === 'admin') {
      // Get all labs
      labsRes = await db.query(
        `SELECT id, name, department_id FROM labs ORDER BY name`
      )
      // Get all components
      componentsRes = await db.query(
        `SELECT c.*, l.name as lab_name, l.department_id
         FROM components c
         JOIN labs l ON c.lab_id = l.id
         ORDER BY l.name, c.name`
      )
    } else {
      const placeholders = departmentIds.map(() => '?').join(',')
      // Get labs in HOD's departments
      labsRes = await db.query(
        `SELECT id, name, department_id 
         FROM labs 
         WHERE department_id IN (${placeholders})
         ORDER BY name`,
        departmentIds
      )
      // Get components from labs in HOD's departments
      componentsRes = await db.query(
        `SELECT c.*, l.name as lab_name, l.department_id
         FROM components c
         JOIN labs l ON c.lab_id = l.id
         WHERE l.department_id IN (${placeholders})
         ORDER BY l.name, c.name`,
        departmentIds
      )
    }

    const labs = labsRes.rows
    const components = componentsRes.rows

    return NextResponse.json({ labs: labs || [], components: components || [] })
  } catch (error) {
    console.error('Error fetching lab components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lab components' },
      { status: 500 }
    )
  }
}
