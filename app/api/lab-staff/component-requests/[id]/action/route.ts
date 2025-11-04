import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logComponentActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const db = Database.getInstance()

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS component_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    requester_id INT NOT NULL,
    initiator_role ENUM('student','faculty') NOT NULL,
    mentor_faculty_id INT NULL,
    purpose VARCHAR(1000) NULL,
    status ENUM('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') NOT NULL DEFAULT 'pending_lab_staff',
    faculty_approver_id INT NULL,
    faculty_approved_at DATETIME NULL,
    faculty_remarks VARCHAR(1000) NULL,
    lab_staff_approver_id INT NULL,
    lab_staff_approved_at DATETIME NULL,
    lab_staff_remarks VARCHAR(1000) NULL,
    hod_approver_id INT NULL,
    hod_approved_at DATETIME NULL,
    hod_remarks VARCHAR(1000) NULL,
    rejected_by_id INT NULL,
    rejected_at DATETIME NULL,
    rejection_reason VARCHAR(1000) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (lab_id), INDEX (requester_id), INDEX (status)
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS component_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (request_id), INDEX (component_id)
  )`)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = Database.getInstance()
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const requestId = Number(id)
    if (!requestId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()
    const remarks = String(body?.remarks || '') || null

    // Fetch request and verify lab-staff permissions
    const r = await db.query(`SELECT r.*, l.staff_id AS head_staff_id, l.department_id FROM component_requests r JOIN labs l ON l.id = r.lab_id WHERE r.id = ?`, [requestId])
    const request = r.rows[0]
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    // Permission: if lab has head, only that head can act; otherwise, any assigned staff can act at lab-staff stage
    const headId = request.head_staff_id ? Number(request.head_staff_id) : null
    if (headId && headId !== Number(user.userId)) {
      return NextResponse.json({ error: "Only Head Lab Staff can act for this lab" }, { status: 403 })
    }
    if (!headId) {
      // ensure this user is assigned to this lab
      const asg = await db.query(`SELECT 1 FROM lab_staff_assignments WHERE lab_id = ? AND staff_id = ?`, [request.lab_id, Number(user.userId)])
      if (!asg.rows[0]) return NextResponse.json({ error: "Not assigned to this lab" }, { status: 403 })
      // Only allow actions in pending_lab_staff when no head exists
      if (String(request.status) !== 'pending_lab_staff') {
        return NextResponse.json({ error: "Action not allowed in current status" }, { status: 400 })
      }
    }

    if (action === 'approve') {
      // Move to pending_hod
      await db.query(
        `UPDATE component_requests
         SET status = 'pending_hod', lab_staff_approver_id = ?, lab_staff_approved_at = NOW(), lab_staff_remarks = ?
         WHERE id = ? AND status = 'pending_lab_staff'`,
        [Number(user.userId), remarks, requestId]
      )
      
      // Send emails
      const details = await db.query(
        `SELECT r.*, l.name as lab_name, l.department_id,
                u.name as requester_name, u.email as requester_email,
                ls.name as lab_staff_name,
                d.hod_email
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users ls ON ls.id = ?
         LEFT JOIN departments d ON d.id = l.department_id
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      // Email to requester
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestApproved({
          requesterName: req.requester_name,
          approverName: req.lab_staff_name || 'Lab Staff',
          approverRole: 'Lab Staff',
          labName: req.lab_name,
          requestId: requestId,
          remarks: remarks || undefined
        })
        await sendEmail({ to: req.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Email to HOD (forwarding the approved request)
      if (req && req.hod_email) {
        const itemsDetails = await db.query(
          `SELECT c.name, cri.quantity_requested as quantity
           FROM component_request_items cri
           JOIN components c ON c.id = cri.component_id
           WHERE cri.request_id = ?`,
          [requestId]
        )
        const emailData = emailTemplates.componentRequestForwarded({
          recipientRole: 'HOD',
          requesterName: req.requester_name,
          requesterRole: req.initiator_role === 'faculty' ? 'Faculty' : 'Student',
          approverName: req.lab_staff_name || 'Lab Staff',
          approverRole: 'Lab Staff',
          labName: req.lab_name,
          purpose: req.purpose || 'Not specified',
          items: itemsDetails.rows,
          returnDate: req.return_date,
          requestId: requestId
        })
        await sendEmail({ to: req.hod_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Log the activity
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
      const userInfo = await getUserInfoForLogging(user.userId)
      if (sel.rows.length > 0) {
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
          action: 'approved_by_lab_staff',
          actionDescription: `Approved component request by lab staff${remarks ? ': ' + remarks : ''}`,
          entitySnapshot: { ...sel.rows[0], items: itemsDetails.rows },
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }
      
      return NextResponse.json({ request: sel.rows[0] })
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE component_requests
         SET status = 'rejected', rejected_by_id = ?, rejected_at = NOW(), rejection_reason = ?, lab_staff_remarks = COALESCE(lab_staff_remarks, ?)
         WHERE id = ? AND status IN ('pending_lab_staff','pending_hod','pending_faculty')`,
        [Number(user.userId), remarks, remarks, requestId]
      )
      
      // Send rejection email to requester
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name, u.email as requester_email,
                ls.name as lab_staff_name
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users ls ON ls.id = ?
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestRejected({
          requesterName: req.requester_name,
          rejecterName: req.lab_staff_name || 'Lab Staff',
          rejecterRole: 'Lab Staff',
          labName: req.lab_name,
          requestId: requestId,
          reason: remarks || undefined
        })
        await sendEmail({ to: req.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Log the activity
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
      const userInfo = await getUserInfoForLogging(user.userId)
      if (sel.rows.length > 0) {
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
          action: 'rejected_by_lab_staff',
          actionDescription: `Rejected component request by lab staff: ${remarks || 'No reason provided'}`,
          entitySnapshot: { ...sel.rows[0], items: itemsDetails.rows },
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }
      
      return NextResponse.json({ request: sel.rows[0] })
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("lab-staff component-requests action POST error:", e)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
