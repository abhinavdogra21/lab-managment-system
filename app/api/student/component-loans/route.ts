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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (lab_id), INDEX (requester_id), INDEX (status), INDEX (due_date)
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS component_loan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (loan_id), INDEX (component_id)
  )`)
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["student", "faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const rows = await db.query(
      `SELECT l.*, lb.name AS lab_name
       FROM component_loans l JOIN labs lb ON lb.id = l.lab_id
       WHERE l.requester_id = ?
       ORDER BY l.created_at DESC`,
      [Number(user.userId)]
    )
    const loanIds = rows.rows.map((r: any) => r.id)
    let itemsByLoan = new Map<number, any[]>()
    if (loanIds.length > 0) {
      const placeholders = loanIds.map(() => '?').join(',')
      const items = await db.query(
        `SELECT i.*, c.name AS component_name, c.model, c.category
         FROM component_loan_items i JOIN components c ON c.id = i.component_id
         WHERE i.loan_id IN (${placeholders})`,
        loanIds
      )
      for (const it of items.rows) {
        const arr = itemsByLoan.get(Number(it.loan_id)) || []
        arr.push(it)
        itemsByLoan.set(Number(it.loan_id), arr)
      }
    }
    const out = rows.rows.map((r: any) => ({ ...r, items: itemsByLoan.get(Number(r.id)) || [] }))
    return NextResponse.json({ loans: out })
  } catch (e) {
    console.error("student component-loans GET error:", e)
    return NextResponse.json({ error: "Failed to list loans" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["student", "faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const { lab_id, items, due_date, purpose } = body || {}
    if (!lab_id || !Array.isArray(items) || items.length === 0 || !due_date) {
      return NextResponse.json({ error: "Missing lab_id, items, or due_date" }, { status: 400 })
    }
    // basic quantity validation
    for (const it of items) {
      if (!it.component_id || !it.quantity || it.quantity <= 0) {
        return NextResponse.json({ error: "Invalid item in request" }, { status: 400 })
      }
    }
    const initiator_role = user.role === 'faculty' ? 'faculty' : 'student'
    const result = await db.query(
      `INSERT INTO component_loans (lab_id, requester_id, initiator_role, purpose, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'pending_lab_staff')`,
      [Number(lab_id), Number(user.userId), initiator_role, purpose || null, due_date]
    )
    const loanId = Number((result as any).insertId || (result as any).rows?.insertId || (result as any).rows?.[0]?.id)
    for (const it of items) {
      await db.query(`INSERT INTO component_loan_items (loan_id, component_id, quantity) VALUES (?,?,?)`, [loanId, Number(it.component_id), Number(it.quantity)])
    }
    const sel = await db.query(`SELECT * FROM component_loans WHERE id = ?`, [loanId])
    return NextResponse.json({ loan: sel.rows[0] })
  } catch (e) {
    console.error("student component-loans POST error:", e)
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 })
  }
}
