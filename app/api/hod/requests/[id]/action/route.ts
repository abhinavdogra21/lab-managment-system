import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requestId = parseInt((await params).id)
    const { action, remarks } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (action === 'reject' && (!remarks || remarks.trim() === '')) {
      return NextResponse.json({ error: "Remarks are required for rejection" }, { status: 400 })
    }

    const db = Database.getInstance()

    // First, verify the request exists and is in the correct state
    const checkQuery = `
      SELECT br.*, l.department_id, d.code as dept_code
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE br.id = ? AND d.code = ?
    `
    const checkResult = await db.query(checkQuery, [requestId, user.department])
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found or not in your department" }, { status: 404 })
    }

    const booking = checkResult.rows[0]
    
    if (booking.status !== 'pending_hod') {
      return NextResponse.json({ error: "Request is not pending HOD approval" }, { status: 400 })
    }

    // Update the booking status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateQuery = `
      UPDATE booking_requests 
      SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?
      WHERE id = ?
    `
    
    await db.query(updateQuery, [newStatus, user.userId, remarks || null, requestId])

    // Send email notification to student
    try {
      const studentDetails = await db.query(
        `SELECT u.name as student_name, u.email as student_email,
                l.name as lab_name,
                br.booking_date, br.start_time, br.end_time,
                hod.name as hod_name
         FROM booking_requests br
         JOIN users u ON u.id = br.requested_by
         JOIN labs l ON l.id = br.lab_id
         JOIN users hod ON hod.id = ?
         WHERE br.id = ?`,
        [user.userId, requestId]
      )

      if (studentDetails.rows.length > 0) {
        const student = studentDetails.rows[0]
        
        if (action === 'approve') {
          const emailData = emailTemplates.labBookingApproved({
            requesterName: student.student_name,
            labName: student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            approverRole: 'HOD',
            nextStep: undefined // Final approval
          })

          await sendEmail({
            to: student.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        } else {
          const emailData = emailTemplates.labBookingRejected({
            requesterName: student.student_name,
            labName: student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            reason: remarks || 'No reason provided',
            rejectedBy: student.hod_name || 'HOD'
          })

          await sendEmail({
            to: student.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
    }

    const actionText = action === 'approve' ? 'approved' : 'rejected'
    
    return NextResponse.json({
      success: true,
      message: `Request has been ${actionText} successfully`
    })

  } catch (error) {
    console.error("Error processing HOD action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
