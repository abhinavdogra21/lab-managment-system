import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

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
    const id = Number(params.id)
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
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
      [id]
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
      // Final approval: ensure stock and deduct
      // Gather items
      const items = await db.query(
        `SELECT i.*, c.quantity_available
         FROM component_request_items i
         JOIN components c ON c.id = i.component_id
         WHERE i.request_id = ?`,
        [id]
      )
      // Check stock
      for (const it of items.rows) {
        if (Number(it.quantity_requested) > Number(it.quantity_available)) {
          return NextResponse.json({ error: `Insufficient stock for component ${it.component_id}` }, { status: 400 })
        }
      }
      // Deduct and mark approved in a transaction
      await db.transaction(async (client) => {
        for (const it of items.rows) {
          await client.query(
            `UPDATE components SET quantity_available = quantity_available - ? WHERE id = ?`,
            [Number(it.quantity_requested), Number(it.component_id)]
          )
        }
        await client.query(
          `UPDATE component_requests
           SET status = 'approved', hod_approver_id = ?, hod_approved_at = NOW(), hod_remarks = ?
           WHERE id = ? AND status = 'pending_hod'`,
          [Number(user.userId), remarks, id]
        )
      })
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [id])
      return NextResponse.json({ request: sel.rows[0] })
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE component_requests SET status = 'rejected', rejected_by_id = ?, rejected_at = NOW(), rejection_reason = ?, hod_remarks = COALESCE(hod_remarks, ?) WHERE id = ? AND status = 'pending_hod'`,
        [Number(user.userId), remarks, remarks, id]
      )
      const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [id])
      return NextResponse.json({ request: sel.rows[0] })
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("hod component-requests action POST error:", e)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
