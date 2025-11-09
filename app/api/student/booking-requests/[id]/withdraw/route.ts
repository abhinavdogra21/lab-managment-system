import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await params
    const requestId = Number(id)
    // Only allow deleting if the booking request belongs to the student and is still pending
    const { rows } = await db.query(
      "SELECT * FROM booking_requests WHERE id = ? AND requested_by = ? AND status IN ('pending_faculty','pending_lab_staff','pending_hod')",
      [requestId, user.userId]
    )
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Request not found or not withdrawable" }, { status: 404 })
    }

    const booking = rows[0]

    // Get details for email notification
    try {
      const details = await db.query(
        `SELECT u.name as student_name,
                l.name as lab_name, l.id as lab_id,
                br.booking_date, br.start_time, br.end_time, br.status,
                f.email as faculty_email
         FROM booking_requests br
         JOIN users u ON u.id = br.requested_by
         JOIN labs l ON l.id = br.lab_id
         LEFT JOIN users f ON f.id = br.faculty_supervisor_id
         WHERE br.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.labBookingWithdrawn({
          labName: req.lab_name,
          bookingDate: req.booking_date,
          startTime: req.start_time,
          endTime: req.end_time,
          requestId: requestId,
          requesterName: req.student_name,
          requesterRole: 'Student'
        })

        // Send to appropriate approver based on current status
        const emailRecipients: string[] = []
        
        if (req.status === 'pending_faculty' && req.faculty_email) {
          emailRecipients.push(req.faculty_email)
        } else if (req.status === 'pending_lab_staff') {
          const labStaff = await db.query(
            `SELECT u.email 
             FROM users u
             JOIN labs l ON l.staff_id = u.id
             WHERE u.role = 'lab_staff' AND l.id = ?`,
            [req.lab_id]
          )
          emailRecipients.push(...labStaff.rows.map(s => s.email))
        } else if (req.status === 'pending_hod') {
          const hod = await db.query(
            `SELECT u.email
             FROM users u
             JOIN labs l ON l.department_id = (SELECT id FROM departments WHERE code = u.department)
             WHERE u.role = 'hod' AND l.id = ?
             LIMIT 1`,
            [req.lab_id]
          )
          if (hod.rows.length > 0) {
            emailRecipients.push(hod.rows[0].email)
          }
        }

        if (emailRecipients.length > 0) {
          await sendEmail({
            to: emailRecipients,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send withdrawal notification:', emailError)
    }

    await db.query("DELETE FROM booking_requests WHERE id = ?", [requestId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to withdraw request:", error)
    return NextResponse.json({ error: "Failed to withdraw request" }, { status: 500 })
  }
}
