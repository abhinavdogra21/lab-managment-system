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
        SELECT br.*, l.name AS lab_name, d.name AS department_name,
          requester.name AS requester_name, requester.email AS requester_email, requester.role AS requester_role,
          faculty.name AS faculty_name,
          ls.name AS lab_staff_name,
          hodu.name AS hod_name
        FROM booking_requests br
        JOIN labs l ON br.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        LEFT JOIN users requester ON br.requested_by = requester.id
        LEFT JOIN users faculty ON br.faculty_approved_by = faculty.id
        LEFT JOIN users ls ON br.lab_staff_approved_by = ls.id
        LEFT JOIN users hodu ON d.hod_id = hodu.id
        WHERE br.status = 'approved'
        ORDER BY br.created_at DESC
      `)
      return NextResponse.json({ logs: res.rows || [] })
    }

    // Get labs where the user is head
    const labRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const labIds = labRes.rows.map((r: any) => Number(r.id))

    if (labIds.length === 0) return NextResponse.json({ logs: [] })

    const placeholders = labIds.map(() => '?').join(',')
    const res = await db.query(
      `
        SELECT br.*, l.name AS lab_name, d.name AS department_name,
          requester.name AS requester_name, requester.email AS requester_email, requester.role AS requester_role,
          faculty.name AS faculty_name,
          ls.name AS lab_staff_name,
          hodu.name AS hod_name
        FROM booking_requests br
        JOIN labs l ON br.lab_id = l.id
        JOIN departments d ON l.department_id = d.id
        LEFT JOIN users requester ON br.requested_by = requester.id
        LEFT JOIN users faculty ON br.faculty_approved_by = faculty.id
        LEFT JOIN users ls ON br.lab_staff_approved_by = ls.id
        LEFT JOIN users hodu ON d.hod_id = hodu.id
        WHERE br.status = 'approved' AND l.id IN (${placeholders})
        ORDER BY br.created_at DESC
      `,
      labIds
    )

    return NextResponse.json({ logs: res.rows || [] })
  } catch (error) {
    console.error('Error fetching lab booking logs for lab head:', error)
    return NextResponse.json({ error: 'Failed to fetch booking logs' }, { status: 500 })
  }
}
