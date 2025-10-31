import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

async function ensureSchema() {
  // Requests master table
  await db.query(`CREATE TABLE IF NOT EXISTS component_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    requester_id INT NOT NULL,
    initiator_role ENUM('student','faculty') NOT NULL,
    mentor_faculty_id INT NULL,
    purpose VARCHAR(1000) NULL,
    return_date DATE NULL,
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
    issued_at DATETIME NULL,
    return_requested_at DATETIME NULL,
    returned_at DATETIME NULL,
    actual_return_date DATE NULL,
    return_approved_by INT NULL,
    return_approved_at DATETIME NULL,
    rejected_by_id INT NULL,
    rejected_at DATETIME NULL,
    rejection_reason VARCHAR(1000) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (lab_id), INDEX (requester_id), INDEX (status)
  )`)
  // Request items
  await db.query(`CREATE TABLE IF NOT EXISTS component_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (request_id), INDEX (component_id)
  )`)
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["student", "faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    // List the current user's component requests with items
    const rows = await db.query(
      `SELECT r.*, l.name AS lab_name,
              uf.name AS faculty_name,
              ul.name AS lab_staff_name,
              uh.name AS hod_name
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       LEFT JOIN users uf ON uf.id = r.mentor_faculty_id
       LEFT JOIN users ul ON ul.id = r.lab_staff_approver_id
       LEFT JOIN users uh ON uh.id = r.hod_approver_id
       WHERE r.requester_id = ?
       ORDER BY r.created_at DESC`,
      [Number(user.userId)]
    )
    const reqIds = rows.rows.map((r: any) => r.id)
    let itemsByReq = new Map<number, any[]>()
    if (reqIds.length > 0) {
      const placeholders = reqIds.map(() => '?').join(',')
      const items = await db.query(
        `SELECT i.*, c.name AS component_name, c.model, c.category
         FROM component_request_items i
         JOIN components c ON c.id = i.component_id
         WHERE i.request_id IN (${placeholders})`,
        reqIds
      )
      itemsByReq = new Map<number, any[]>()
      for (const it of items.rows) {
        const arr = itemsByReq.get(Number(it.request_id)) || []
        arr.push(it)
        itemsByReq.set(Number(it.request_id), arr)
      }
    }
    const out = rows.rows.map((r: any) => ({ ...r, items: itemsByReq.get(Number(r.id)) || [] }))
    return NextResponse.json({ requests: out })
  } catch (e) {
    console.error("student component-requests GET error:", e)
    return NextResponse.json({ error: "Failed to list component requests" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["student"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const { lab_id, purpose, mentor_faculty_id, items, return_date } = body || {}
    if (!lab_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "lab_id and items are required" }, { status: 400 })
    }
    if (!mentor_faculty_id) {
      return NextResponse.json({ error: "mentor_faculty_id is required for student requests" }, { status: 400 })
    }
    if (!return_date) {
      return NextResponse.json({ error: "return_date is required" }, { status: 400 })
    }
    // Validate items and availability snapshot (no deduction yet)
    const compIds: number[] = items.map((it: any) => Number(it.component_id)).filter(Boolean)
    const qtyMap = new Map<number, number>()
    for (const it of items) {
      const cid = Number(it.component_id)
      const q = Math.max(1, Number(it.quantity || it.quantity_requested))
      qtyMap.set(cid, (qtyMap.get(cid) || 0) + q)
    }
    const placeholders = compIds.map(() => '?').join(',')
    const comps = compIds.length ? await db.query(`SELECT id, lab_id, name, quantity_available FROM components WHERE id IN (${placeholders})`, compIds) : { rows: [] as any[] }
    // All components must belong to same lab
    if (comps.rows.some((c: any) => Number(c.lab_id) !== Number(lab_id))) {
      return NextResponse.json({ error: "All components must belong to the selected lab" }, { status: 400 })
    }
    // Create request with items in a transaction
    const created = await db.transaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO component_requests (lab_id, requester_id, initiator_role, mentor_faculty_id, purpose, return_date, status)
         VALUES (?, ?, 'student', ?, ?, ?, 'pending_faculty')`,
        [Number(lab_id), Number(user.userId), Number(mentor_faculty_id), purpose || null, return_date]
      )
      const reqId = Number(ins.insertId)
      for (const [cid, q] of qtyMap.entries()) {
        await client.query(
          `INSERT INTO component_request_items (request_id, component_id, quantity_requested) VALUES (?, ?, ?)`,
          [reqId, cid, q]
        )
      }
      return reqId
    })
    const sel = await db.query(`SELECT * FROM component_requests WHERE id = ?`, [created])
    return NextResponse.json({ request: sel.rows[0] }, { status: 201 })
  } catch (e) {
    console.error("student component-requests POST error:", e)
    return NextResponse.json({ error: "Failed to create component request" }, { status: 500 })
  }
}
