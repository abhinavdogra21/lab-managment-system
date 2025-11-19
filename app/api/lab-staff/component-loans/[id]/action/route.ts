/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS component_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    requester_id INT NOT NULL,
    initiator_role ENUM('student','faculty') NOT NULL,
    purpose VARCHAR(1000) NULL,
    status ENUM('pending_lab_staff','issued','return_requested','returned','rejected') NOT NULL DEFAULT 'pending_lab_staff',
    due_date DATE NOT NULL,
    issued_at DATETIME NULL,
    returned_at DATETIME NULL,
    lab_staff_approver_id INT NULL,
    lab_staff_remarks VARCHAR(1000) NULL,
    extension_requested_due_date DATE NULL,
    extension_requested_reason VARCHAR(1000) NULL,
    extension_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
    delay_days INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS component_loan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const loanId = Number(id)
    if (!loanId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()
    const remarks = body?.remarks || null

    // Fetch loan and lab ownership
    const r = await db.query(
      `SELECT l.*, lb.staff_id AS head_staff_id
       FROM component_loans l JOIN labs lb ON lb.id = l.lab_id
       WHERE l.id = ?`,
      [loanId]
    )
    const loan = r.rows[0]
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 })

    if (user.role !== 'admin') {
      if (loan.head_staff_id && Number(loan.head_staff_id) !== Number(user.userId)) {
        // If head set, only head can act
        return NextResponse.json({ error: "Only head lab staff can act for this lab" }, { status: 403 })
      }
      if (!loan.head_staff_id) {
        // If no head set, ensure user is assigned to the lab
        const assign = await db.query(`SELECT 1 FROM lab_staff_assignments WHERE lab_id = ? AND staff_id = ?`, [Number(loan.lab_id), Number(user.userId)])
        if (assign.rows.length === 0) {
          return NextResponse.json({ error: "Not assigned to this lab" }, { status: 403 })
        }
      }
    }

    if (action === 'approve') {
      // Issue items: decrement stock, mark issued
      if (loan.status !== 'pending_lab_staff') return NextResponse.json({ error: "Loan not pending" }, { status: 400 })
      const items = await db.query(`SELECT * FROM component_loan_items WHERE loan_id = ?`, [id])
      // Validate stock
      for (const it of items.rows) {
        const c = await db.query(`SELECT quantity_available FROM components WHERE id = ?`, [Number(it.component_id)])
        const qa = Number(c.rows[0]?.quantity_available || 0)
        if (qa < Number(it.quantity)) {
          return NextResponse.json({ error: `Insufficient stock for component ${it.component_id}` }, { status: 400 })
        }
      }
      await db.transaction(async (client) => {
        for (const it of items.rows) {
          await client.query(`UPDATE components SET quantity_available = quantity_available - ? WHERE id = ?`, [Number(it.quantity), Number(it.component_id)])
        }
        await client.query(`UPDATE component_loans SET status = 'issued', issued_at = NOW(), lab_staff_approver_id = ?, lab_staff_remarks = ? WHERE id = ?`, [Number(user.userId), remarks, id])
      })
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    if (action === 'reject') {
      if (loan.status !== 'pending_lab_staff') return NextResponse.json({ error: "Loan not pending" }, { status: 400 })
      await db.query(`UPDATE component_loans SET status = 'rejected', lab_staff_approver_id = ?, lab_staff_remarks = ? WHERE id = ?`, [Number(user.userId), remarks, id])
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    if (action === 'approve_return') {
      if (loan.status !== 'return_requested' && loan.status !== 'issued') return NextResponse.json({ error: "Loan not in returnable state" }, { status: 400 })
      const items = await db.query(`SELECT * FROM component_loan_items WHERE loan_id = ?`, [id])
      await db.transaction(async (client) => {
        for (const it of items.rows) {
          await client.query(`UPDATE components SET quantity_available = quantity_available + ? WHERE id = ?`, [Number(it.quantity), Number(it.component_id)])
        }
        // compute delay
        const delayRes = await client.query(`SELECT GREATEST(DATEDIFF(NOW(), due_date), 0) AS delay_days FROM component_loans WHERE id = ?`, [id])
        const delay = Number(delayRes.rows[0]?.delay_days || 0)
        await client.query(`UPDATE component_loans SET status = 'returned', returned_at = NOW(), delay_days = ?, lab_staff_remarks = COALESCE(lab_staff_remarks, ?) WHERE id = ?`, [delay, remarks, id])
      })
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    if (action === 'approve_extension') {
      if (loan.extension_status !== 'pending' || !loan.extension_requested_due_date) {
        return NextResponse.json({ error: "No pending extension" }, { status: 400 })
      }
      await db.query(`UPDATE component_loans SET due_date = ?, extension_status = 'approved' WHERE id = ?`, [loan.extension_requested_due_date, id])
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    if (action === 'reject_extension') {
      if (loan.extension_status !== 'pending') return NextResponse.json({ error: "No pending extension" }, { status: 400 })
      await db.query(`UPDATE component_loans SET extension_status = 'rejected' WHERE id = ?`, [id])
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("lab-staff component-loans action POST error:", e)
    return NextResponse.json({ error: "Failed to update loan" }, { status: 500 })
  }
}
