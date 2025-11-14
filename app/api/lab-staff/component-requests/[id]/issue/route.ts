import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { db } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logComponentActivity, getUserInfoForLogging } from "@/lib/activity-logger"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const requestId = Number(id)
    if (!requestId) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    // Verify request is approved and not yet issued
    const check = await db.query(
      `SELECT r.id, r.status, r.issued_at, r.lab_id
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
      return NextResponse.json({ error: "Request must be approved before issuing" }, { status: 400 })
    }

    if (request.issued_at) {
      return NextResponse.json({ error: "Components already issued" }, { status: 400 })
    }

    // Get all items in this request
    const items = await db.query(
      `SELECT component_id, quantity_requested FROM component_request_items WHERE request_id = ?`,
      [requestId]
    )

    console.log(`Issue request #${requestId}: Found ${items.rows.length} items to issue`)
    for (const item of items.rows) {
      console.log(`  - Component ${item.component_id}: issuing ${item.quantity_requested} units`)
    }

    // Mark as issued and decrease component quantities in a transaction
    await db.transaction(async (client) => {
      // Mark as issued
      await client.query(
        `UPDATE component_requests SET issued_at = NOW() WHERE id = ?`,
        [requestId]
      )

      // Decrease quantities for each component
      for (const item of items.rows) {
        const result = await client.query(
          `UPDATE components 
           SET quantity_available = quantity_available - ? 
           WHERE id = ? AND quantity_available >= ?`,
          [item.quantity_requested, item.component_id, item.quantity_requested]
        )
        console.log(`  - Updated component ${item.component_id}: affected ${result.affectedRows} rows`)
        
        if (result.affectedRows === 0) {
          throw new Error(`Insufficient quantity for component ${item.component_id}`)
        }
      }
    })

    console.log(`Issue request #${requestId}: Transaction completed successfully`)

    // Send email to requester
    const details = await db.query(
      `SELECT r.*, l.name as lab_name,
              u.name as requester_name, u.email as requester_email, u.salutation as requester_salutation,
              fac.name as faculty_name, fac.salutation as faculty_salutation,
              ls.name as lab_staff_name, ls.salutation as lab_staff_salutation,
              hod.name as hod_name, hod.salutation as hod_salutation,
              lc.name as lab_coordinator_name, lc.salutation as lab_coordinator_salutation
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       JOIN users u ON u.id = r.requester_id
       LEFT JOIN users fac ON r.faculty_approver_id = fac.id
       LEFT JOIN users ls ON r.lab_staff_approver_id = ls.id
       LEFT JOIN users hod ON r.hod_approver_id = hod.id
       LEFT JOIN users lc ON l.lab_coordinator_id = lc.id AND r.final_approver_role = 'lab_coordinator'
       WHERE r.id = ?`,
      [requestId]
    )
    const requestDetails = details.rows[0]
    
    if (requestDetails && requestDetails.requester_email) {
      const itemsDetails = await db.query(
        `SELECT c.name, cri.quantity_requested as quantity
         FROM component_request_items cri
         JOIN components c ON c.id = cri.component_id
         WHERE cri.request_id = ?`,
        [requestId]
      )
      
      const emailData = emailTemplates.componentIssued({
        requesterName: requestDetails.requester_name,
        requesterSalutation: requestDetails.requester_salutation,
        requesterRole: requestDetails.initiator_role === 'faculty' ? 'Faculty' : 'Student',
        labName: requestDetails.lab_name,
        requestId: requestId,
        items: itemsDetails.rows,
        returnDate: requestDetails.return_date || 'Not specified'
      })
      await sendEmail({ to: requestDetails.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
    }

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    if (requestDetails) {
      const itemsDetails = await db.query(
        `SELECT c.name as component_name, cri.quantity_requested
         FROM component_request_items cri
         JOIN components c ON c.id = cri.component_id
         WHERE cri.request_id = ?`,
        [requestId]
      )
      
      logComponentActivity({
        entityType: 'component_request',
        entityId: requestId,
        labId: request.lab_id,
        actorUserId: userInfo?.userId || null,
        actorName: userInfo?.name || null,
        actorEmail: userInfo?.email || null,
        actorRole: userInfo?.role || null,
        action: 'issued',
        actionDescription: `Components issued to ${requestDetails.initiator_role}`,
        entitySnapshot: { ...requestDetails, items: itemsDetails.rows },
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
      }).catch(err => console.error("Activity logging failed:", err))
    }

    return NextResponse.json({ 
      message: "Components marked as issued to student and quantities updated" 
    })

  } catch (e) {
    console.error("lab-staff component-requests issue error:", e)
    return NextResponse.json({ error: "Failed to issue components" }, { status: 500 })
  }
}
