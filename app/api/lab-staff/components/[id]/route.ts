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

async function canManage(userId: number, labId: number): Promise<boolean> {
  // If lab has a head, only the head can manage
  const lab = await db.query(`SELECT staff_id FROM labs WHERE id = ?`, [labId])
  const headId = lab.rows[0]?.staff_id ? Number(lab.rows[0].staff_id) : null
  if (headId) return headId === userId
  // If no head, allow assigned lab staff
  const assigned = await db.query(
    `SELECT 1 FROM lab_staff_assignments WHERE lab_id = ? AND staff_id = ? LIMIT 1`,
    [labId, userId]
  )
  if (assigned.rows.length) return true
  // Fallback to legacy single assignment
  if (!headId) {
    const legacy = await db.query(`SELECT 1 FROM labs WHERE id = ? AND staff_id = ? LIMIT 1`, [labId, userId])
    if (legacy.rows.length) return true
  }
  return false
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const componentId = Number(id)
    if (!componentId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const current = await db.query(`SELECT * FROM components WHERE id = ?`, [componentId])
    const comp = current.rows[0]
    if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const allowed = await canManage(Number(user.userId), Number(comp.lab_id))
    if (!allowed) return NextResponse.json({ error: "Only Head (or assigned when no head) can manage components" }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    let { name, category, model, condition_status, quantity_total, quantity_available } = body || {}
    const cond = ["working", "dead", "consumable"].includes(String(condition_status)) ? String(condition_status) : comp.condition_status
    const total = quantity_total != null ? Math.max(0, Number(quantity_total)) : comp.quantity_total
    let available = quantity_available != null ? Math.max(0, Number(quantity_available)) : comp.quantity_available
    if (available > total) available = total

    await db.query(
      `UPDATE components SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        model = COALESCE(?, model),
        condition_status = ?,
        quantity_total = ?,
        quantity_available = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [name || null, category || null, model || null, cond, total, available, id]
    )
    const sel = await db.query(`SELECT * FROM components WHERE id = ?`, [id])
    return NextResponse.json({ component: sel.rows[0] })
  } catch (e) {
    console.error("components PATCH error:", e)
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const { id } = await params
    const componentId = Number(id)
    if (!componentId) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const current = await db.query(`SELECT * FROM components WHERE id = ?`, [componentId])
    const comp = current.rows[0]
    if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const allowed = await canManage(Number(user.userId), Number(comp.lab_id))
    if (!allowed) return NextResponse.json({ error: "Only Head (or assigned when no head) can manage components" }, { status: 403 })

    await db.query(`DELETE FROM components WHERE id = ?`, [componentId])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("components DELETE error:", e)
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 })
  }
}
