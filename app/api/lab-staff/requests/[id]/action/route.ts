import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, remarks } = await request.json()
    const db = Database.getInstance()

    // Authenticate user
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }
    const userId = user.userId

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

    // Authorization: ensure this staff is allowed to act on this lab's requests
    const labAuth = await db.query(
      `SELECT 
         l.staff_id AS head_staff_id,
         EXISTS(SELECT 1 FROM lab_staff_assignments la WHERE la.lab_id = l.id AND la.staff_id = ?) AS is_assigned
       FROM labs l WHERE l.id = ?`,
      [userId, bookingRequest.lab_id]
    )
    const authRow = labAuth.rows[0]
    const isAssigned = authRow && (authRow.is_assigned === 1 || authRow.is_assigned === true || authRow.is_assigned === '1')
    if (!isAssigned) {
      return NextResponse.json({ success: false, error: "Not authorized for this lab" }, { status: 403 })
    }
    if (authRow.head_staff_id && Number(authRow.head_staff_id) !== Number(userId)) {
      return NextResponse.json({ success: false, error: "Only head lab staff can process this request" }, { status: 403 })
    }

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

    // Get updated request details for response and emails
    const updatedResult = await db.query(
      `SELECT 
        br.*,
        u.name as student_name,
        u.email as student_email,
        l.name as lab_name,
        f.name as faculty_name,
        staff.name as staff_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users staff ON staff.id = ?
      WHERE br.id = ?`,
      [userId, id]
    )

    const updatedRequest = updatedResult.rows[0]

    // Send email notifications
    try {
      if (action === 'approve') {
        // Email to student
        const studentEmailData = emailTemplates.labBookingApproved({
          requesterName: updatedRequest.student_name,
          labName: updatedRequest.lab_name,
          bookingDate: updatedRequest.booking_date,
          startTime: updatedRequest.start_time,
          endTime: updatedRequest.end_time,
          requestId: Number(id),
          approverRole: 'Lab Staff',
          nextStep: 'Your request is now pending HOD approval'
        })

        await sendEmail({
          to: updatedRequest.student_email,
          ...studentEmailData
        }).catch(err => console.error('Email send failed:', err))

        // Email to HOD
        const hod = await db.query(
          `SELECT email FROM users WHERE role = 'hod' LIMIT 1`
        )
        
        if (hod.rows.length > 0) {
          const hodEmailData = emailTemplates.labBookingCreated({
            requesterName: updatedRequest.student_name,
            requesterRole: 'Student',
            labName: updatedRequest.lab_name,
            bookingDate: updatedRequest.booking_date,
            startTime: updatedRequest.start_time,
            endTime: updatedRequest.end_time,
            purpose: updatedRequest.purpose || 'Not specified',
            requestId: Number(id)
          })

          await sendEmail({
            to: hod.rows[0].email,
            ...hodEmailData
          }).catch(err => console.error('Email send failed:', err))
        }
      } else {
        // Email to student for rejection
        const emailData = emailTemplates.labBookingRejected({
          requesterName: updatedRequest.student_name,
          labName: updatedRequest.lab_name,
          bookingDate: updatedRequest.booking_date,
          startTime: updatedRequest.start_time,
          endTime: updatedRequest.end_time,
          requestId: Number(id),
          reason: remarks || 'No reason provided',
          rejectedBy: updatedRequest.staff_name || 'Lab Staff'
        })

        await sendEmail({
          to: updatedRequest.student_email,
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
    }

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
