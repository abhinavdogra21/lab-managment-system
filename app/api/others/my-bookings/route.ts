/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["others", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all booking requests created by this TnP user
    const result = await db.query(
      `SELECT 
        br.id,
        br.booking_date as date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.faculty_remarks,
        br.lab_staff_remarks,
        br.hod_remarks,
        br.created_at,
        l.name as lab_name,
        l.department_id,
        d.highest_approval_authority
      FROM booking_requests br
      JOIN labs l ON l.id = br.lab_id
      LEFT JOIN departments d ON l.department_id = d.id
      WHERE br.requested_by = ?
      ORDER BY br.created_at DESC`,
      [user.userId]
    )

    return NextResponse.json({ bookings: result.rows })
  } catch (error) {
    console.error("Error fetching TnP bookings:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    )
  }
}
