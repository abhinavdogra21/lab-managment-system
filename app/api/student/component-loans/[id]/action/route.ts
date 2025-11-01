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
    if (!user || !hasRole(user, ["student", "faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const loanId = Number(id)
    if (!loanId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()

    const r = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [loanId])
    const loan = r.rows[0]
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    if (Number(loan.requester_id) !== Number(user.userId)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 })
    }

    if (action === 'request_return') {
      if (loan.status !== 'issued') return NextResponse.json({ error: "Loan not in issued state" }, { status: 400 })
      await db.query(`UPDATE component_loans SET status = 'return_requested' WHERE id = ? AND status = 'issued'`, [id])
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    if (action === 'request_extension') {
      const new_due_date = body?.new_due_date
      const reason = body?.reason || null
      if (!new_due_date) return NextResponse.json({ error: "new_due_date required" }, { status: 400 })
      if (loan.status !== 'issued') return NextResponse.json({ error: "Loan not in issued state" }, { status: 400 })
      await db.query(
        `UPDATE component_loans SET extension_requested_due_date = ?, extension_requested_reason = ?, extension_status = 'pending'
         WHERE id = ?`,
        [new_due_date, reason, id]
      )
      const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [id])
      return NextResponse.json({ loan: sel.rows[0] })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (e) {
    console.error("student component-loans action POST error:", e)
    return NextResponse.json({ error: "Failed to update loan" }, { status: 500 })
  }
}
