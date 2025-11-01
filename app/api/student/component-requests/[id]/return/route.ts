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

    // Verify this is the student's request and it's approved and issued
    const check = await db.query(
      `SELECT id, status, requester_id, issued_at, return_requested_at, returned_at 
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

    if (request.status !== 'approved') {
      return NextResponse.json({ error: "Request must be approved" }, { status: 400 })
    }

    if (!request.issued_at) {
      return NextResponse.json({ error: "Components have not been issued yet" }, { status: 400 })
    }

    if (request.return_requested_at) {
      return NextResponse.json({ error: "Return already requested" }, { status: 400 })
    }

    if (request.returned_at) {
      return NextResponse.json({ error: "Components already returned" }, { status: 400 })
    }

    // Mark return as requested (not yet returned)
    await db.query(
      `UPDATE component_requests 
       SET return_requested_at = NOW() 
       WHERE id = ?`,
      [requestId]
    )

    // Send email to lab staff
    try {
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         WHERE r.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        
        // Get head lab staff email for this lab
        const labStaff = await db.query(
          `SELECT u.email 
           FROM users u
           JOIN labs l ON l.staff_id = u.id
           WHERE u.role = 'lab_staff' AND l.id = ?`,
          [req.lab_id]
        )
        
        const labStaffEmails = labStaff.rows.map(staff => staff.email)
        
        if (labStaffEmails.length > 0) {
          const emailData = emailTemplates.returnRequested({
            requesterName: req.requester_name,
            requesterRole: 'Student',
            labName: req.lab_name,
            requestId: requestId
          })

          await sendEmail({
            to: labStaffEmails,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send return notification:', emailError)
    }

    return NextResponse.json({ 
      message: "Return request submitted. Lab staff will verify and approve the return." 
    })

  } catch (e) {
    console.error("student component-requests return error:", e)
    return NextResponse.json({ error: "Failed to mark as returned" }, { status: 500 })
  }
}
