/**
 * Partial withdrawal - Withdraw a specific lab from a multi-lab booking (Faculty)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const db = Database.getInstance()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: bookingId } = await params
    const { lab_id } = await request.json()

    if (!lab_id) {
      return NextResponse.json({ error: "Lab ID is required" }, { status: 400 })
    }

    // Get booking details with requester info
    const bookingResult = await db.query(
      `SELECT br.*, 
              u.name as requester_name, 
              u.email as requester_email,
              u.role as requester_role
       FROM booking_requests br
       JOIN users u ON br.requested_by = u.id
       WHERE br.id = ?`,
      [bookingId]
    )

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingResult.rows[0]

    // Only the requester can withdraw
    if (booking.requested_by !== user.userId) {
      return NextResponse.json({ error: "You can only withdraw your own bookings" }, { status: 403 })
    }

    // Must be a multi-lab booking
    if (!booking.is_multi_lab) {
      return NextResponse.json({ error: "This is not a multi-lab booking" }, { status: 400 })
    }

    // Check if booking can be withdrawn
    if (booking.status === "rejected" || booking.status === "withdrawn") {
      return NextResponse.json({ 
        error: `Cannot withdraw from a booking that is ${booking.status}` 
      }, { status: 400 })
    }

    // Check if this lab is part of the booking
    let labIds: number[] = []
    if (Buffer.isBuffer(booking.lab_ids)) {
      labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
    } else if (typeof booking.lab_ids === 'string') {
      labIds = JSON.parse(booking.lab_ids)
    } else if (Array.isArray(booking.lab_ids)) {
      labIds = booking.lab_ids
    }
    
    if (!labIds.includes(Number(lab_id))) {
      return NextResponse.json({ error: "This lab is not part of this booking" }, { status: 400 })
    }

    // Get lab details
    const labResult = await db.query("SELECT name FROM labs WHERE id = ?", [lab_id])
    const labName = labResult.rows[0]?.name || "Unknown Lab"

    // Mark this specific lab as withdrawn in multi_lab_approvals
    await db.query(
      `UPDATE multi_lab_approvals 
       SET status = 'withdrawn', 
           lab_staff_remarks = CONCAT(COALESCE(lab_staff_remarks, ''), 
                                     IF(lab_staff_remarks IS NULL OR lab_staff_remarks = '', '', '\n'), 
                                     'Withdrawn by requester on ', NOW())
       WHERE booking_request_id = ? AND lab_id = ?`,
      [bookingId, lab_id]
    )

    // Check how many labs are left (not withdrawn or rejected)
    const statusCheck = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn_count,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
         SUM(CASE WHEN status IN ('approved', 'approved_by_lab_staff') THEN 1 ELSE 0 END) as approved_count
       FROM multi_lab_approvals 
       WHERE booking_request_id = ?`,
      [bookingId]
    )

    const stats = statusCheck.rows[0]
    const inactiveLabs = stats.withdrawn_count + stats.rejected_count

    // If all labs are withdrawn/rejected, mark entire booking as withdrawn
    if (inactiveLabs >= stats.total) {
      await db.query(
        `UPDATE booking_requests 
         SET status = 'withdrawn', withdrawn_at = NOW() 
         WHERE id = ?`,
        [bookingId]
      )
    }

    // Send notification emails
    const emailRecipients: Array<{email: string, name: string, role: string, isRequester: boolean}> = []
    const emailsSent = new Set<string>()

    // Check if current user is the requester
    const isRequester = Number(booking.requested_by) === Number(user.userId)

    // Always notify the requester
    emailRecipients.push({
      email: booking.requester_email,
      name: booking.requester_name,
      role: "Requester",
      isRequester: true
    })
    emailsSent.add(booking.requester_email)

    // Notify faculty if they have already approved
    if (booking.status !== "pending_faculty" && booking.faculty_supervisor_id) {
      const facultyResult = await db.query(
        `SELECT u.email, u.name FROM users u WHERE u.id = ?`,
        [booking.faculty_supervisor_id]
      )
      if (facultyResult.rows.length > 0) {
        const faculty = facultyResult.rows[0]
        if (!emailsSent.has(faculty.email)) {
          emailsSent.add(faculty.email)
          emailRecipients.push({
            email: faculty.email,
            name: faculty.name,
            role: "Faculty Approver",
            isRequester: false
          })
        }
      }
    }

    // Notify head lab staff for this specific lab if request was in their queue
    // Only use labs.staff_id (head staff), not lab_staff_assignments (assistants)
    if (booking.status === "pending_lab_staff" || booking.status === "pending_hod") {
      const labStaffResult = await db.query(
        `SELECT u.email, u.name 
         FROM labs l
         JOIN users u ON l.staff_id = u.id
         WHERE l.id = ?`,
        [lab_id]
      )
      if (labStaffResult.rows.length > 0) {
        const staff = labStaffResult.rows[0]
        if (!emailsSent.has(staff.email)) {
          emailsSent.add(staff.email)
          emailRecipients.push({
            email: staff.email,
            name: staff.name,
            role: `Lab Staff (${labName})`,
            isRequester: false
          })
        }
      }
    }

    // Send emails
    for (const recipient of emailRecipients) {
      const salutation = recipient.name ? `Dear ${recipient.name},` : `Dear ${recipient.role},`
      
      // Customize message based on whether recipient is the requester
      const withdrawalMessage = recipient.isRequester
        ? `You have successfully withdrawn <strong>${labName}</strong> from your multi-lab booking request.`
        : `<strong>${labName}</strong> has been withdrawn from a multi-lab booking request by ${booking.requester_name}.`

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Lab Withdrawn from Multi-Lab Booking</h2>
            </div>
            <div class="content">
              <p>${salutation}</p>
              <p>${withdrawalMessage}</p>
              
              <div class="details">
                <h3>Withdrawn Lab:</h3>
                <p><strong>${labName}</strong></p>
                
                <h3>Booking Details:</h3>
                <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>Purpose:</strong> ${booking.purpose}</p>
                ${!recipient.isRequester ? `<p><strong>Requester:</strong> ${booking.requester_name} (${booking.requester_email})</p>` : ''}
              </div>

              <p>${inactiveLabs >= stats.total 
                ? 'All labs have been withdrawn or rejected. The entire booking is now withdrawn.' 
                : 'Other labs in this booking remain active.'}</p>
            </div>
            <div class="footer">
              <p>Lab Management System - The LNM Institute of Information Technology, Jaipur</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: [recipient.email],
        subject: "Lab Withdrawn from Multi-Lab Booking",
        html: emailHtml
      }).catch(err => console.error(`Failed to send email to ${recipient.email}:`, err))
    }

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    logLabBookingActivity({
      bookingId: Number(bookingId),
      labId: Number(lab_id),
      actorUserId: userInfo?.userId || null,
      actorName: userInfo?.name || null,
      actorEmail: userInfo?.email || null,
      actorRole: userInfo?.role || null,
      action: "lab_withdrawn",
      actionDescription: `Lab ${labName} withdrawn from multi-lab booking by requester`,
      bookingSnapshot: booking,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      userAgent: request.headers.get("user-agent") || null,
    }).catch(err => console.error(`Activity logging failed:`, err))

    return NextResponse.json({ 
      success: true, 
      message: `Lab ${labName} withdrawn successfully`,
      all_withdrawn: inactiveLabs >= stats.total
    })
  } catch (error) {
    console.error("Lab withdrawal error:", error)
    return NextResponse.json({ error: "Failed to withdraw lab" }, { status: 500 })
  }
}
