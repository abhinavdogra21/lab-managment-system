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
    status ENUM('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') NOT NULL DEFAULT 'pending_hod',
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const requestId = Number(id)
    if (!requestId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()
    const remarks = String(body?.remarks || '') || null

    // Fetch request and verify HOD has domain over the lab
    const r = await db.query(
      `SELECT r.*, l.department_id, d.hod_id, d.hod_email
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       LEFT JOIN departments d ON d.id = l.department_id
       WHERE r.id = ?`,
      [requestId]
    )
    const request = r.rows[0]
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 })
    const isAdmin = user.role === 'admin'
    const hodMatchesId = Number(request.hod_id) === Number(user.userId)
    const hodMatchesEmail = (request.hod_email && String(request.hod_email).toLowerCase() === String(user.email || '').toLowerCase())
    if (!isAdmin && !hodMatchesId && !hodMatchesEmail) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 })
    }

    if (action === 'approve') {
      // Mark as approved - quantities will be deducted when lab staff issues the components
      await db.query(
        `UPDATE component_requests
         SET status = 'approved', hod_approver_id = ?, hod_approved_at = NOW(), hod_remarks = ?
         WHERE id = ? AND status = 'pending_hod'`,
        [Number(user.userId), remarks, requestId]
      )
      
      // Send emails
      const details = await db.query(
        `SELECT r.*, l.name as lab_name, l.staff_id,
                u.name as requester_name, u.email as requester_email,
                hod.name as hod_name, hod.salutation as hod_salutation,
                ls.name as lab_staff_name, ls.email as lab_staff_email, ls.salutation as lab_staff_salutation
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users hod ON hod.id = ?
         LEFT JOIN users ls ON ls.id = l.staff_id
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      // Email to requester
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestApproved({
          requesterName: req.requester_name,
          approverName: req.hod_name || 'HOD',
          approverRole: 'HOD',
          labName: req.lab_name,
          requestId: requestId,
          remarks: remarks || undefined
        })
        await sendEmail({ to: req.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Fetch items for email and logging
      const itemsDetails = await db.query(
        `SELECT c.name, cri.quantity_requested as quantity
         FROM component_request_items cri
         JOIN components c ON c.id = cri.component_id
         WHERE cri.request_id = ?`,
        [requestId]
      )
      
      // Email to lab staff (notify them to issue components)
      if (req && req.lab_staff_email) {
        const emailData = emailTemplates.componentRequestApprovedForLabStaff({
          labStaffName: req.lab_staff_name || '',
          labStaffSalutation: req.lab_staff_salutation || 'none',
          requesterName: req.requester_name,
          requesterRole: req.initiator_role === 'faculty' ? 'Faculty' : 'Student',
          approverName: req.hod_name || 'HOD',
          approverSalutation: req.hod_salutation || 'none',
          labName: req.lab_name,
          purpose: req.purpose || 'Not specified',
          items: itemsDetails.rows,
          returnDate: req.return_date,
          requestId: requestId
        })
        await sendEmail({ to: req.lab_staff_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Log the activity
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
      const userInfo = await getUserInfoForLogging(user.userId)
      if (sel.rows.length > 0) {
        logComponentActivity({
          entityType: 'component_request',
          entityId: requestId,
          labId: request.lab_id,
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: userInfo?.role || null,
          action: 'approved_by_hod',
          actionDescription: `Approved component request${remarks ? ': ' + remarks : ''}`,
          entitySnapshot: { ...sel.rows[0], items: itemsDetails.rows },
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }
      
      return NextResponse.json({ request: sel.rows[0] })
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE component_requests SET status = 'rejected', rejected_by_id = ?, rejected_at = NOW(), rejection_reason = ?, hod_remarks = COALESCE(hod_remarks, ?) WHERE id = ? AND status = 'pending_hod'`,
        [Number(user.userId), remarks, remarks, requestId]
      )
      
      // Send rejection email to requester
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name, u.email as requester_email,
                hod.name as hod_name
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users hod ON hod.id = ?
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestRejected({
          requesterName: req.requester_name,
          rejecterName: req.hod_name || 'HOD',
          rejecterRole: 'HOD',
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
          `SELECT c.name, cri.quantity_requested as quantity
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
          action: 'rejected_by_hod',
          actionDescription: `Rejected component request: ${remarks || 'No reason provided'}`,
          entitySnapshot: { ...sel.rows[0], items: itemsDetails.rows },
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }
      
      return NextResponse.json({ request: sel.rows[0] })
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("hod component-requests action POST error:", e)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
