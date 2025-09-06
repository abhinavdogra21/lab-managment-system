import { type NextRequest, NextResponse } from "next/server"
import { dbOperations, Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get requests that need HOD approval from the user's department
    let query = `
      SELECT DISTINCT
        br.id,
        br.booking_date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.created_at,
        br.faculty_remarks,
        br.lab_staff_remarks,
        br.hod_remarks,
        s.name as student_name,
        s.email as student_email,
        f.name as faculty_name,
        l.name as lab_name
      FROM booking_requests br
      JOIN users s ON br.requested_by = s.id
      JOIN users f ON br.faculty_supervisor_id = f.id
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE d.code = ?
    `

    const params = [user.department]

    if (status && status !== 'all') {
      if (status === 'rejected') {
        // For rejected status, only show requests rejected BY HOD (not by faculty or lab staff)
        query += ` AND br.status = 'rejected' AND br.hod_approved_by IS NOT NULL`
      } else {
        // specific status requested
        query += ` AND br.status = ?`
        params.push(status)
      }
    } else if (status === 'all') {
      // For 'all' status, only show requests that reached HOD level
      // This includes: pending_hod, approved, and requests rejected BY HOD
      query += ` AND (br.status = 'pending_hod' OR br.status = 'approved' OR (br.status = 'rejected' AND br.hod_approved_by IS NOT NULL))`
    } else {
      // Default: show requests waiting for HOD approval when no status provided
      query += ` AND br.status = 'pending_hod'`
    }

    query += ` ORDER BY br.created_at DESC LIMIT 50`

    const db = Database.getInstance()
    const result = await db.query(query, params)
    
    return NextResponse.json({ 
      requests: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error("Error fetching HOD requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
