/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    // Debug: Check the actual data in the database
    const result = await db.query(`
      SELECT 
        br.id,
        br.status,
        br.faculty_approved_at,
        br.faculty_approved_by,
        br.faculty_remarks,
        br.lab_staff_approved_at,
        br.created_at,
        f.name as faculty_approver_name
      FROM booking_requests br
      LEFT JOIN users f ON br.faculty_approved_by = f.id
      WHERE br.request_type = 'lab_booking'
      ORDER BY br.created_at DESC
      LIMIT 5
    `)

    return NextResponse.json({
      success: true,
      debug_data: result.rows,
      note: "This is debug data to check faculty approval timestamps"
    })

  } catch (error) {
    console.error("Debug query failed:", error)
    return NextResponse.json(
      { error: "Debug query failed" },
      { status: 500 }
    )
  }
}
