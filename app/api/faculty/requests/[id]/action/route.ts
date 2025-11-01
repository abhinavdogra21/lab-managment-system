import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Await params in Next.js 15
    const { id: paramId } = await params
    const id = Number(paramId)
    const body = await request.json()
    const { action, remarks } = body as { action: 'approve' | 'reject', remarks?: string }
    if (!id || !action) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // Ensure faculty owns this request and it's pending_faculty
    const reqRes = await db.query(`SELECT * FROM booking_requests WHERE id = ? AND faculty_supervisor_id = ? AND status = 'pending_faculty'`, [id, user.userId])
    const req = reqRes.rows?.[0]
    if (!req) return NextResponse.json({ error: 'Request not found or not actionable' }, { status: 404 })

    if (action === 'approve') {
      await db.query(
        `UPDATE booking_requests SET status = 'pending_lab_staff', faculty_remarks = ?, faculty_approved_by = ?, faculty_approved_at = NOW() WHERE id = ?`,
        [remarks || null, user.userId, id]
      )

      // Send email notification to student and lab staff
      try {
        const details = await db.query(
          `SELECT u.name as student_name, u.email as student_email,
                  l.name as lab_name, l.id as lab_id,
                  br.booking_date, br.start_time, br.end_time
           FROM booking_requests br
           JOIN users u ON u.id = br.requested_by
           JOIN labs l ON l.id = br.lab_id
           WHERE br.id = ?`,
          [id]
        )

        if (details.rows.length > 0) {
          const booking = details.rows[0]
          
          // Email to student
          const studentEmailData = emailTemplates.labBookingApproved({
            requesterName: booking.student_name,
            labName: booking.lab_name,
            bookingDate: booking.booking_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            requestId: id,
            approverRole: 'Faculty',
            nextStep: 'Your request is now pending Lab Staff approval'
          })

          await sendEmail({
            to: booking.student_email,
            ...studentEmailData
          }).catch(err => console.error('Email send failed:', err))

          // Email to head lab staff only
          const labStaff = await db.query(
            `SELECT u.email, u.name
             FROM users u
             JOIN labs l ON l.staff_id = u.id
             WHERE u.role = 'lab_staff' ANDs l.id = ?`,
            [booking.lab_id]
          )
          
          const labStaffEmails = labStaff.rows.map(staff => staff.email)
          
          if (labStaffEmails.length > 0) {
            const labStaffEmailData = emailTemplates.labBookingCreated({
              requesterName: booking.student_name,
              requesterRole: 'Student',
              labName: booking.lab_name,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              purpose: req.purpose || 'Not specified',
              requestId: id
            })

            await sendEmail({
              to: labStaffEmails,
              ...labStaffEmailData
            }).catch(err => console.error('Lab staff email send failed:', err))
          }
        }
      } catch (emailError) {
        console.error('Failed to send approval notification:', emailError)
      }

    } else if (action === 'reject') {
      await db.query(
        `UPDATE booking_requests SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW(), faculty_remarks = ? WHERE id = ?`,
        [remarks || 'Rejected by faculty', user.userId, remarks || null, id]
      )

      // Send email notification to student
      try {
        const details = await db.query(
          `SELECT u.name as student_name, u.email as student_email,
                  l.name as lab_name,
                  br.booking_date, br.start_time, br.end_time,
                  f.name as faculty_name
           FROM booking_requests br
           JOIN users u ON u.id = br.requested_by
           JOIN labs l ON l.id = br.lab_id
           JOIN users f ON f.id = br.faculty_supervisor_id
           WHERE br.id = ?`,
          [id]
        )

        if (details.rows.length > 0) {
          const booking = details.rows[0]
          const emailData = emailTemplates.labBookingRejected({
            requesterName: booking.student_name,
            labName: booking.lab_name,
            bookingDate: booking.booking_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            requestId: id,
            reason: remarks || 'No reason provided',
            rejectedBy: booking.faculty_name
          })

          await sendEmail({
            to: booking.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      } catch (emailError) {
        console.error('Failed to send rejection notification:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to take action on request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
