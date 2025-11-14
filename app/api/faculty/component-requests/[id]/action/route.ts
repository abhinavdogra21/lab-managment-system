import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS component_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    requester_id INT NOT NULL,
    initiator_role ENUM('student','faculty') NOT NULL,
    mentor_faculty_id INT NULL,
    purpose VARCHAR(1000) NULL,
    status ENUM('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') NOT NULL DEFAULT 'pending_faculty',
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
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const requestId = Number(id)
    if (!requestId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()
    const remarks = String(body?.remarks || '') || null

    const r = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
    const request = r.rows[0]
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 })
    // Only requests in pending_faculty and where mentor_faculty_id matches can be approved by faculty
    if (String(request.status) !== 'pending_faculty' || Number(request.mentor_faculty_id) !== Number(user.userId)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 })
    }

    if (action === 'approve') {
      await db.query(
        `UPDATE component_requests SET status = 'pending_lab_staff', faculty_approver_id = ?, faculty_approved_at = NOW(), faculty_remarks = ? WHERE id = ? AND status = 'pending_faculty'`,
        [Number(user.userId), remarks, requestId]
      )
      
      // Send email to student and lab staff
      const details = await db.query(
        `SELECT r.*, l.name as lab_name, l.staff_id as lab_staff_id,
                u.name as requester_name, u.email as requester_email, u.salutation as requester_salutation,
                f.name as faculty_name, f.salutation as faculty_salutation,
                ls.email as lab_staff_email
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users f ON f.id = ?
         LEFT JOIN users ls ON ls.id = l.staff_id
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      // Email to student
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestApproved({
          requesterName: req.requester_name,
          requesterSalutation: req.requester_salutation,
          approverName: req.faculty_name || 'Faculty',
          approverSalutation: req.faculty_salutation,
          approverRole: 'Faculty Mentor',
          labName: req.lab_name,
          requestId: requestId,
          remarks: remarks || undefined
        })
        await sendEmail({ to: req.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      // Email to lab staff (forwarding the approved request)
      if (req && req.lab_staff_email) {
        const itemsDetails = await db.query(
          `SELECT c.name, cri.quantity_requested as quantity
           FROM component_request_items cri
           JOIN components c ON c.id = cri.component_id
           WHERE cri.request_id = ?`,
          [requestId]
        )
        
        // Get lab staff details with salutation
        const staffDetails = await db.query(
          `SELECT name, salutation FROM users WHERE id = ?`,
          [req.lab_staff_id]
        )
        const labStaff = staffDetails.rows[0]
        
        const emailData = emailTemplates.componentRequestForwarded({
          recipientRole: 'Lab Staff',
          recipientName: labStaff?.name,
          recipientSalutation: labStaff?.salutation,
          requesterName: req.requester_name,
          requesterSalutation: req.requester_salutation,
          requesterRole: 'Student',
          approverName: req.faculty_name || 'Faculty',
          approverSalutation: req.faculty_salutation,
          approverRole: 'Faculty',
          labName: req.lab_name,
          purpose: req.purpose || 'Not specified',
          items: itemsDetails.rows,
          returnDate: req.return_date,
          requestId: requestId
        })
        await sendEmail({ to: req.lab_staff_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
      return NextResponse.json({ request: sel.rows[0] })
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE component_requests SET status = 'rejected', rejected_by_id = ?, rejected_at = NOW(), rejection_reason = ?, faculty_remarks = COALESCE(faculty_remarks, ?) WHERE id = ? AND status = 'pending_faculty'`,
        [Number(user.userId), remarks, remarks, requestId]
      )
      
      // Send rejection email to student
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name, u.email as requester_email,
                f.name as faculty_name
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users f ON f.id = ?
         WHERE r.id = ?`,
        [Number(user.userId), requestId]
      )
      const req = details.rows[0]
      
      if (req && req.requester_email) {
        const emailData = emailTemplates.componentRequestRejected({
          requesterName: req.requester_name,
          rejecterName: req.faculty_name || 'Faculty',
          rejecterRole: 'Faculty Mentor',
          labName: req.lab_name,
          requestId: requestId,
          reason: remarks || undefined
        })
        await sendEmail({ to: req.requester_email, ...emailData }).catch(err => console.error('Email failed:', err))
      }
      
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [requestId])
      return NextResponse.json({ request: sel.rows[0] })
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("faculty component-requests action POST error:", e)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
