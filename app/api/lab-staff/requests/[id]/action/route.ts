import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { cookies } from "next/headers"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, remarks } = await request.json()
    const db = Database.getInstance()

    // Get user from token
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const decoded = JSON.parse(decodeURIComponent(token))
    const userId = decoded.id

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      )
    }

    // Get the request details first
    const requestResult = await db.query(
      "SELECT * FROM booking_requests WHERE id = ? AND status = 'pending_lab_staff'",
      [id]
    )

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Request not found or not pending lab staff approval" },
        { status: 404 }
      )
    }

    const bookingRequest = requestResult.rows[0]

    // Update the request based on action
    let newStatus: string
    let updateQuery: string
    let updateParams: any[]

    if (action === 'approve') {
      // Move to next step (HOD approval)
      newStatus = 'pending_hod'
      updateQuery = `
        UPDATE booking_requests 
        SET 
          status = ?,
          lab_staff_approved_at = NOW(),
          lab_staff_approved_by = ?,
          lab_staff_remarks = ?
        WHERE id = ?
      `
      updateParams = [newStatus, userId, remarks || null, id]
    } else {
      // Reject the request
      newStatus = 'rejected'
      updateQuery = `
        UPDATE booking_requests 
        SET 
          status = ?,
          lab_staff_approved_at = NOW(),
          lab_staff_approved_by = ?,
          lab_staff_remarks = ?,
          rejected_at = NOW(),
          rejected_by = ?,
          rejection_reason = ?
        WHERE id = ?
      `
      updateParams = [newStatus, userId, remarks || null, userId, remarks || 'Rejected by lab staff', id]
    }

    await db.query(updateQuery, updateParams)

    // Get updated request details for response
    const updatedResult = await db.query(
      `SELECT 
        br.*,
        u.name as student_name,
        u.email as student_email,
        l.name as lab_name,
        f.name as faculty_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      WHERE br.id = ?`,
      [id]
    )

    const updatedRequest = updatedResult.rows[0]

    return NextResponse.json({
      success: true,
      message: `Request ${action}d successfully`,
      request: updatedRequest,
      newStatus
    })

  } catch (error) {
    console.error("Error processing lab staff action:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 }
    )
  }
}
