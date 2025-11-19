/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NULL,
    model VARCHAR(255) NULL,
    condition_status ENUM('working','dead','consumable') NOT NULL DEFAULT 'working',
    quantity_total INT NOT NULL DEFAULT 0,
    quantity_available INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (lab_id)
  )`)
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const labId = req.nextUrl.searchParams.get('lab_id')
    if (!labId) return NextResponse.json({ components: [] })
    const list = await db.query(`SELECT * FROM components WHERE lab_id = ? ORDER BY name`, [Number(labId)])
    return NextResponse.json({ components: list.rows })
  } catch (e) {
    console.error("components GET error:", e)
    return NextResponse.json({ error: "Failed to list components" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const { lab_id, name, category, model, condition_status, quantity_total } = body || {}
    if (!lab_id || !name || quantity_total == null) {
      return NextResponse.json({ error: "lab_id, name, quantity_total are required" }, { status: 400 })
    }
    // Head-only enforcement if head set
    const lab = await db.query(`SELECT staff_id FROM labs WHERE id = ?`, [lab_id])
    const headId = lab.rows[0]?.staff_id ? Number(lab.rows[0].staff_id) : null
    if (headId && headId !== Number(user.userId)) {
      return NextResponse.json({ error: "Only Head Lab Staff can add components for this lab" }, { status: 403 })
    }
    const cond = ["working","dead","consumable"].includes(String(condition_status)) ? String(condition_status) : 'working'
    const qty = Math.max(0, Number(quantity_total))
    const ins = await db.query(
      `INSERT INTO components (lab_id, name, category, model, condition_status, quantity_total, quantity_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lab_id, name, category || null, model || null, cond, qty, qty]
    )
    const sel = await db.query(`SELECT * FROM components WHERE id = ?`, [ins.insertId])
    return NextResponse.json({ component: sel.rows[0] }, { status: 201 })
  } catch (e) {
    console.error("components POST error:", e)
    return NextResponse.json({ error: "Failed to add component" }, { status: 500 })
  }
}
