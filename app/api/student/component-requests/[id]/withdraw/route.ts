import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { db } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["student"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const requestId = Number(id)
    if (!requestId) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    // Verify this is the student's request
    const check = await db.query(
      `SELECT id, status, requester_id, issued_at 
       FROM component_requests 
       WHERE id = ?`,
      [requestId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const request = check.rows[0]

    if (request.requester_id !== user.userId) {
      return NextResponse.json({ error: "Not your request" }, { status: 403 })
    }

    if (request.issued_at) {
      return NextResponse.json({ error: "Cannot withdraw - components already issued" }, { status: 400 })
    }

    if (request.status === 'rejected') {
      return NextResponse.json({ error: "Request already rejected" }, { status: 400 })
    }

    if (request.status === 'approved') {
      return NextResponse.json({ error: "Cannot withdraw approved request. Contact lab staff." }, { status: 400 })
    }

    // Withdraw the request by marking as rejected
    await db.transaction(async (client) => {
      await client.query(
        `UPDATE component_requests 
         SET status = 'rejected',
             rejected_by_id = ?,
             rejected_at = NOW(),
             rejection_reason = 'Withdrawn by student'
         WHERE id = ?`,
        [user.userId, requestId]
      )

      // Delete the request items
      await client.query(
        `DELETE FROM component_request_items WHERE request_id = ?`,
        [requestId]
      )
    })

    // Notify faculty mentor or lab staff depending on status
    try {
      const details = await db.query(
        `SELECT r.*, l.name as lab_name, l.email as lab_email,
                u.name as requester_name,
                mentor.email as mentor_email, mentor.name as mentor_name
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users mentor ON mentor.id = r.faculty_mentor_id
         WHERE r.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.requestWithdrawn({
          requesterName: req.requester_name,
          requesterRole: 'Student',
          labName: req.lab_name,
          requestId: requestId,
          notifyEmail: req.mentor_email || req.lab_email,
          notifyRole: req.mentor_email ? 'Faculty Mentor' : 'Lab Staff'
        })

        // Notify the appropriate person based on request status
        const notifyEmail = req.mentor_email || req.lab_email
        if (notifyEmail) {
          await sendEmail({
            to: [notifyEmail],
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send withdrawal notification:', emailError)
    }

    return NextResponse.json({ 
      message: "Request withdrawn successfully" 
    })

  } catch (e) {
    console.error("student withdraw error:", e)
    return NextResponse.json({ error: "Failed to withdraw request" }, { status: 500 })
  }
}
