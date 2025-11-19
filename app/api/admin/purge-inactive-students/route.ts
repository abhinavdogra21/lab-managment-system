/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { db } from "@/lib/database"

export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { days = 30 } = await req.json().catch(() => ({}))
    const cutoffDays = Math.max(7, Math.min(365, Number(days) || 30))

    // Identify inactive student users with no activity (no logs or bookings) since cutoff
    const inactive = await db.query(
      `SELECT u.id FROM users u
       LEFT JOIN (
         SELECT user_id, MAX(created_at) AS last_log FROM system_logs GROUP BY user_id
       ) sl ON sl.user_id = u.id
       LEFT JOIN (
         SELECT booked_by AS user_id, MAX(created_at) AS last_booking FROM lab_bookings GROUP BY booked_by
       ) lb ON lb.user_id = u.id
       WHERE u.role = 'student'
         AND COALESCE(GREATEST(IFNULL(sl.last_log, '1900-01-01'), IFNULL(lb.last_booking, '1900-01-01')), '1900-01-01') < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [cutoffDays]
    )

    const ids: number[] = inactive.rows.map((r: any) => r.id)
    if (!ids.length) return NextResponse.json({ ok: true, matched: 0, archived: 0, deleted: 0 })

    // Archive then delete selected users and their child records reusing existing logic shape
    // We'll perform a minimal archive: move users to archived_users and delete their child data
    const placeholders = ids.map(() => '?').join(',')
    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO archived_users (original_user_id, email, password_hash, name, role, department, phone, student_id, employee_id, was_active, created_at, updated_at)
         SELECT id, email, password_hash, name, role, department, phone, student_id, employee_id, is_active, created_at, updated_at
         FROM users WHERE id IN (${placeholders})`,
        ids
      )
      await client.query(`DELETE FROM lab_bookings WHERE booked_by IN (${placeholders})`, ids)
      await client.query(`DELETE FROM attendance WHERE student_id IN (${placeholders})`, ids)
      await client.query(`DELETE FROM marks WHERE student_id IN (${placeholders})`, ids)
      await client.query(`DELETE FROM item_issues WHERE issued_to IN (${placeholders})`, ids)
      await client.query(`DELETE FROM system_logs WHERE user_id IN (${placeholders})`, ids)
      await client.query(`DELETE FROM password_resets WHERE user_id IN (${placeholders})`, ids)
      await client.query(`DELETE FROM users WHERE id IN (${placeholders})`, ids)
    })

    return NextResponse.json({ ok: true, matched: ids.length, archived: ids.length, deleted: ids.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
