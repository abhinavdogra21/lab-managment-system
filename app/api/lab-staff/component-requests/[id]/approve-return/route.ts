import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { db } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { remarks } = body || {}

    const { id } = await params
    const requestId = Number(id)
    if (!requestId) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    // Verify request has return requested and not yet approved
    const check = await db.query(
      `SELECT r.id, r.status, r.issued_at, r.return_requested_at, r.returned_at, r.lab_id
       FROM component_requests r
       WHERE r.id = ?`,
      [requestId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const request = check.rows[0]

    // Verify lab staff is assigned to this lab
    const labCheck = await db.query(
      `SELECT lab_id FROM lab_staff_assignments WHERE staff_id = ? AND lab_id = ?`,
      [user.userId, request.lab_id]
    )

    if (labCheck.rows.length === 0) {
      return NextResponse.json({ error: "You are not assigned to this lab" }, { status: 403 })
    }

    if (request.status !== 'approved') {
      return NextResponse.json({ error: "Request must be approved" }, { status: 400 })
    }

    if (!request.issued_at) {
      return NextResponse.json({ error: "Components have not been issued" }, { status: 400 })
    }

    if (!request.return_requested_at) {
      return NextResponse.json({ error: "Student has not requested return yet" }, { status: 400 })
    }

    if (request.returned_at) {
      return NextResponse.json({ error: "Return already approved" }, { status: 400 })
    }

    // Get all items in this request to restore quantities
    const items = await db.query(
      `SELECT component_id, quantity_requested FROM component_request_items WHERE request_id = ?`,
      [requestId]
    )

    console.log(`Approve return #${requestId}: Found ${items.rows.length} items to restore`)
    for (const item of items.rows) {
      console.log(`  - Component ${item.component_id}: restoring ${item.quantity_requested} units`)
    }

    // Approve the return and restore quantities in a transaction
    await db.transaction(async (client) => {
      // Mark as returned
      await client.query(
        `UPDATE component_requests 
         SET returned_at = NOW(), 
             actual_return_date = CURDATE(),
             return_approved_by = ?,
             return_approved_at = NOW(),
             return_remarks = ?
         WHERE id = ?`,
        [user.userId, remarks || null, requestId]
      )

      // Restore quantities for each component
      for (const item of items.rows) {
        const result = await client.query(
          `UPDATE components 
           SET quantity_available = quantity_available + ? 
           WHERE id = ?`,
          [item.quantity_requested, item.component_id]
        )
        console.log(`  - Updated component ${item.component_id}: affected ${result.affectedRows} rows`)
      }
    })

    console.log(`Approve return #${requestId}: Transaction completed successfully`)

    // Send email to requester
    try {
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name, u.email as requester_email,
                r.initiator_role
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         WHERE r.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.returnApproved({
          requesterName: req.requester_name,
          requesterRole: req.initiator_role === 'student' ? 'Student' : 'Faculty',
          labName: req.lab_name,
          requestId: requestId
        })

        await sendEmail({
          to: [req.requester_email],
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send return approval notification:', emailError)
    }

    return NextResponse.json({ 
      message: "Return approved. Components marked as returned and quantities restored." 
    })

  } catch (e) {
    console.error("lab-staff approve-return error:", e)
    return NextResponse.json({ error: "Failed to approve return" }, { status: 500 })
  }
}
