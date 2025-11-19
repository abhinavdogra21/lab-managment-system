/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

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
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()

    const { searchParams } = new URL(req.url)
    const status = (searchParams.get('status') || 'pending').toLowerCase()

    let where = ''
    let params: any[] = []

    if (status === 'pending') {
      // Requests awaiting this faculty's review
      where = `r.status = 'pending_faculty' AND r.mentor_faculty_id = ?`
      params = [Number(user.userId)]
    } else if (status === 'approved') {
      // Requests this faculty approved (show current overall status)
      where = `r.faculty_approver_id = ?`
      params = [Number(user.userId)]
    } else if (status === 'rejected') {
      // Requests this faculty rejected
      where = `r.rejected_by_id = ?`
      params = [Number(user.userId)]
    } else {
      // Fallback to pending
      where = `r.status = 'pending_faculty' AND r.mentor_faculty_id = ?`
      params = [Number(user.userId)]
    }

    const rows = await db.query(
      `SELECT r.*, l.name AS lab_name, ureq.name AS requester_name,
              uf.name AS mentor_faculty_name,
              ul.name AS lab_staff_name,
              uh.name AS hod_name
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       JOIN users ureq ON ureq.id = r.requester_id
       LEFT JOIN users uf ON uf.id = r.mentor_faculty_id
       LEFT JOIN users ul ON ul.id = r.lab_staff_approver_id
       LEFT JOIN users uh ON uh.id = r.hod_approver_id
       WHERE ${where}
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
    console.error("faculty component-requests review GET error:", e)
    return NextResponse.json({ error: "Failed to list component requests" }, { status: 500 })
  }
}
