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
    
    // Get labs where user is assigned as staff, prioritizing head staff status if user has both roles
    const rows = await db.query(
      `SELECT DISTINCT
         l.id, 
         l.name, 
         l.code, 
         d.name as department, 
         l.capacity, 
         l.location,
         MAX(CASE WHEN l.staff_id = ? THEN 1 ELSE 0 END) as is_head_staff
       FROM labs l
       LEFT JOIN departments d ON l.department_id = d.id
       LEFT JOIN lab_staff_assignments la ON l.id = la.lab_id AND la.staff_id = ?
       WHERE l.staff_id = ? OR la.staff_id = ?
       GROUP BY l.id, l.name, l.code, d.name, l.capacity, l.location
       ORDER BY l.name`,
      [uid, uid, uid, uid]
    )
    
    return NextResponse.json({ labs: rows.rows })
  } catch (e) {
    console.error("lab-staff/labs GET error:", e)
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 })
  }
}
