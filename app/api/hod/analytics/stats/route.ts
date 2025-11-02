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

    // Get pending requests count for HOD's department
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE d.name = ? AND br.status = 'pending_hod'
    `
    const pendingResult = await db.query(pendingQuery, [user.department])
    const pending = pendingResult.rows[0]?.count || 0

    // Get total approved requests this month
    const approvedQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE d.name = ? AND br.status = 'approved' 
      AND MONTH(br.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(br.created_at) = YEAR(CURRENT_DATE())
    `
    const approvedResult = await db.query(approvedQuery, [user.department])
    const approved = approvedResult.rows[0]?.count || 0

    // Get total rejected requests this month
    const rejectedQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE d.name = ? AND br.status = 'rejected'
      AND MONTH(br.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(br.created_at) = YEAR(CURRENT_DATE())
    `
    const rejectedResult = await db.query(rejectedQuery, [user.department])
    const rejected = rejectedResult.rows[0]?.count || 0

    // Get department labs count
    const labsQuery = `
      SELECT COUNT(*) as count
      FROM labs l
      JOIN departments d ON l.department_id = d.id
      WHERE d.name = ?
    `
    const labsResult = await db.query(labsQuery, [user.department])
    const departmentLabs = labsResult.rows[0]?.count || 0

    // Get active faculty count in department
    const facultyQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'faculty' AND department = ?
    `
    const facultyResult = await db.query(facultyQuery, [user.department])
    const activeFaculty = facultyResult.rows[0]?.count || 0

    // Get monthly bookings count
    const monthlyQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE d.name = ?
      AND MONTH(br.date) = MONTH(CURRENT_DATE())
      AND YEAR(br.date) = YEAR(CURRENT_DATE())
    `
    const monthlyResult = await db.query(monthlyQuery, [user.department])
    const monthlyBookings = monthlyResult.rows[0]?.count || 0

    return NextResponse.json({
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
      departmentLabs,
      activeFaculty,
      monthlyBookings
    })
  } catch (error) {
    console.error("Error fetching HOD analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
