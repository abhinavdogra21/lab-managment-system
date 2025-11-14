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
    status ENUM('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') NOT NULL DEFAULT 'pending_lab_staff',
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
      where.push(`r.lab_id IN (${headLabIds.map(() => '?').join(',')})`)
      params.push(...headLabIds)
    }
    if (nonHeadLabIds.length > 0) {
      where.push(`(r.lab_id IN (${nonHeadLabIds.map(() => '?').join(',')}) AND r.status = 'pending_lab_staff')`)
      params.push(...nonHeadLabIds)
    }
    if (where.length === 0) {
      return NextResponse.json({ requests: [] })
    }
    const rows = await db.query(
      `SELECT r.*, l.name AS lab_name, l.department_id,
              d.highest_approval_authority, d.lab_coordinator_id,
              ureq.name AS requester_name, ureq.salutation AS requester_salutation,
              uf.name AS mentor_faculty_name, uf.salutation AS mentor_faculty_salutation,
              ul.name AS lab_staff_name,
              uh.name AS hod_name,
              uc.name AS lab_coordinator_name
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       JOIN departments d ON l.department_id = d.id
       JOIN users ureq ON ureq.id = r.requester_id
       LEFT JOIN users uf ON uf.id = r.mentor_faculty_id
       LEFT JOIN users ul ON ul.id = r.lab_staff_approver_id
       LEFT JOIN users uh ON uh.id = r.hod_approver_id
       LEFT JOIN users uc ON uc.id = d.lab_coordinator_id
       WHERE ${where.join(' OR ')}
       ORDER BY r.created_at DESC`,
      params
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
      for (const it of items.rows) {
        const arr = itemsByReq.get(Number(it.request_id)) || []
        arr.push(it)
        itemsByReq.set(Number(it.request_id), arr)
      }
    }
    const out = rows.rows.map((r: any) => ({ ...r, items: itemsByReq.get(Number(r.id)) || [] }))
    return NextResponse.json({ requests: out })
  } catch (e) {
    console.error("lab-staff component-requests GET error:", e)
    return NextResponse.json({ error: "Failed to list component requests" }, { status: 500 })
  }
}
