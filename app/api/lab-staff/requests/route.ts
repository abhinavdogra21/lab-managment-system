import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending_lab_staff"
    const db = Database.getInstance()

    let query = `
      SELECT 
        br.*,
        u.name as student_name,
        u.email as student_email,
        l.name as lab_name,
        f.name as faculty_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
    `

    const params: any[] = []

    if (status === "pending_lab_staff") {
      query += " WHERE br.status = ?"
      params.push("pending_lab_staff")
    } else if (status === "all") {
      // Get all requests that lab staff has seen (approved by faculty)
      query += " WHERE br.status IN (?, ?, ?, ?)"
      params.push("pending_lab_staff", "pending_hod", "approved", "rejected")
    } else if (status === "approved") {
      query += " WHERE br.status IN (?, ?)"
      params.push("pending_hod", "approved")
    } else if (status === "rejected") {
      query += " WHERE br.status = ?"
      params.push("rejected")
    }

    query += " ORDER BY br.created_at DESC"

    const result = await db.query(query, params)
    const requests = result.rows

    // Build timeline for each request
    const requestsWithTimeline = await Promise.all(
      requests.map(async (request: any) => {
        const timeline: any[] = []

        // Submission step
        timeline.push({
          step_name: 'Submission',
          step_status: 'completed',
          completed_at: request.created_at,
          completed_by: request.student_id,
          remarks: null,
          user_name: request.student_name
        })

        // Faculty approval step
        if (request.faculty_approved_at) {
          timeline.push({
            step_name: 'Faculty Approval',
            step_status: 'completed',
            completed_at: request.faculty_approved_at,
            completed_by: request.faculty_approved_by,
            remarks: request.faculty_remarks,
            user_name: request.faculty_name
          })
        } else if (request.status === 'pending_faculty') {
          timeline.push({
            step_name: 'Faculty Approval',
            step_status: 'pending',
            completed_at: null,
            completed_by: null,
            remarks: null,
            user_name: null
          })
        }

        // Lab staff approval step
        if (request.lab_staff_approved_at) {
          timeline.push({
            step_name: 'Lab Staff Approval',
            step_status: 'completed',
            completed_at: request.lab_staff_approved_at,
            completed_by: request.lab_staff_approved_by,
            remarks: request.lab_staff_remarks,
            user_name: request.staff_approver_name
          })
        } else if (request.status === 'pending_lab_staff') {
          timeline.push({
            step_name: 'Lab Staff Approval',
            step_status: 'pending',
            completed_at: null,
            completed_by: null,
            remarks: null,
            user_name: null
          })
        }

        // HOD approval step
        if (request.hod_approved_at) {
          timeline.push({
            step_name: 'HOD Approval',
            step_status: 'completed',
            completed_at: request.hod_approved_at,
            completed_by: request.hod_approved_by,
            remarks: request.hod_remarks,
            user_name: request.hod_approver_name
          })
        } else if (request.status === 'pending_hod') {
          timeline.push({
            step_name: 'HOD Approval',
            step_status: 'pending',
            completed_at: null,
            completed_by: null,
            remarks: null,
            user_name: null
          })
        }

        return {
          ...request,
          timeline
        }
      })
    )

    return NextResponse.json({
      success: true,
      requests: requestsWithTimeline
    })

  } catch (error) {
    console.error("Error fetching lab staff requests:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    )
  }
}
