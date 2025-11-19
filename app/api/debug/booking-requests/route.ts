/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET() {
  try {
    // Get all booking requests to check for dummy data
    const result = await db.query(`
      SELECT 
        br.id,
        br.requested_by,
        br.purpose,
        br.status,
        br.created_at,
        u.name as student_name,
        u.email as student_email
      FROM booking_requests br
      LEFT JOIN users u ON br.requested_by = u.id
      ORDER BY br.created_at DESC
    `)

    return NextResponse.json({
      success: true,
      total: result.rows.length,
      requests: result.rows
    })

  } catch (error) {
    console.error("Failed to fetch booking requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking requests" },
      { status: 500 }
    )
  }
}
