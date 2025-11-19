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
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()

    // Labs where user is head
    const headLabsRes = await db.query(`SELECT id FROM labs WHERE staff_id = ?`, [Number(user.userId)])
    const headLabIds: number[] = headLabsRes.rows.map((r: any) => Number(r.id))
    // Labs where user is assigned and no head set
    const assignRes = await db.query(
      `SELECT la.lab_id AS id
       FROM lab_staff_assignments la
       JOIN labs l ON l.id = la.lab_id
       WHERE la.staff_id = ? AND (l.staff_id IS NULL OR l.staff_id = 0)`,
      [Number(user.userId)]
    )
    const nonHeadLabIds: number[] = assignRes.rows.map((r: any) => Number(r.id))

    const where: string[] = []
    const params: any[] = []
    if (headLabIds.length > 0) {
      where.push(`l.lab_id IN (${headLabIds.map(() => '?').join(',')})`)
      params.push(...headLabIds)
    }
    if (nonHeadLabIds.length > 0) {
      // Non-head only see pending flow in their assigned labs
      where.push(`(l.lab_id IN (${nonHeadLabIds.map(() => '?').join(',')}) AND l.status = 'pending_lab_staff')`)
      params.push(...nonHeadLabIds)
    }
    if (where.length === 0 && user.role !== 'admin') {
      return NextResponse.json({ loans: [] })
    }

    let rows
    if (user.role === 'admin') {
      rows = await db.query(
        `SELECT l.*, lb.name AS lab_name, u.name AS requester_name
         FROM component_loans l
         JOIN labs lb ON lb.id = l.lab_id
         JOIN users u ON u.id = l.requester_id
         ORDER BY l.created_at DESC`
      )
    } else {
      rows = await db.query(
        `SELECT l.*, lb.name AS lab_name, u.name AS requester_name
         FROM component_loans l
         JOIN labs lb ON lb.id = l.lab_id
         JOIN users u ON u.id = l.requester_id
         WHERE ${where.join(' OR ')}
         ORDER BY l.created_at DESC`,
        params
      )
    }

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
    console.error("lab-staff component-loans GET error:", e)
    return NextResponse.json({ error: "Failed to list loans" }, { status: 500 })
  }
}
