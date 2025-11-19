/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      )
    }

    // Get booking requests with basic info
    const requests = await db.query(
      `SELECT 
        br.*,
        l.name as lab_name,
        l.code as lab_code,
        l.location as lab_location,
        f.name as faculty_name,
        f.email as faculty_email,
        d.name as department_name
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_id = f.id
      LEFT JOIN departments d ON l.department_id = d.id
      WHERE br.student_id = ?
      ORDER BY br.created_at DESC`,
      [studentId]
    )

    // Get timeline for each request
    const requestsWithTimeline = await Promise.all(
      requests.rows.map(async (request: any) => {
        const timeline = await db.query(
          `SELECT 
            at.*,
            u.name as user_name
          FROM approval_timeline at
          LEFT JOIN users u ON at.completed_by = u.id
          WHERE at.booking_request_id = ?
          ORDER BY 
            CASE at.step_name
              WHEN 'submitted' THEN 1
              WHEN 'faculty_review' THEN 2
              WHEN 'faculty_approved' THEN 3
              WHEN 'staff_review' THEN 4
              WHEN 'staff_approved' THEN 5
              WHEN 'hod_review' THEN 6
              WHEN 'hod_approved' THEN 7
              WHEN 'rejected' THEN 8
              ELSE 9
            END`,
          [request.id]
        )

        return {
          ...request,
          timeline: timeline.rows
        }
      })
    )
    
    return NextResponse.json({ requests: requestsWithTimeline })
  } catch (error) {
    console.error("Error fetching student requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    )
  }
}
