/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const uid = Number(user.userId)
    
    // Get labs where user is assigned as staff (includes both staff_id in labs table and lab_staff_assignments)
    const rows = await db.query(
      `(
         SELECT l.id, l.name, l.code, d.name as department, l.capacity, l.location
         FROM labs l
         LEFT JOIN departments d ON l.department_id = d.id
         WHERE l.staff_id = ?
       )
       UNION
       (
         SELECT l.id, l.name, l.code, d.name as department, l.capacity, l.location
         FROM lab_staff_assignments la
         JOIN labs l ON l.id = la.lab_id
         LEFT JOIN departments d ON l.department_id = d.id
         WHERE la.staff_id = ?
       )
       ORDER BY name`,
      [uid, uid]
    )
    
    return NextResponse.json({ labs: rows.rows })
  } catch (e) {
    console.error("lab-staff/labs GET error:", e)
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 })
  }
}
