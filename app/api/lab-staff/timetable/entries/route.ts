/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uid = Number(user.userId)

    // Get labs assigned to this lab staff member
    const labsQuery = `
      (
        SELECT l.id FROM labs l WHERE l.staff_id = ?
      )
      UNION
      (
        SELECT l.id FROM lab_staff_assignments la
        JOIN labs l ON l.id = la.lab_id
        WHERE la.staff_id = ?
      )
    `
    const labsResult = await db.query(labsQuery, [uid, uid])
    const assignedLabIds = labsResult.rows.map((row: any) => row.id)

    if (assignedLabIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        entries: [] 
      })
    }

    // Get timetable entries only for assigned labs
    const labIdsPlaceholder = assignedLabIds.map(() => '?').join(',')
    
    const query = `
      SELECT 
        id, 
        lab_id, 
        day_of_week, 
        time_slot_start, 
        time_slot_end, 
        notes, 
        is_active
      FROM timetable_entries
      WHERE lab_id IN (${labIdsPlaceholder})
      AND is_active = 1
      ORDER BY day_of_week, time_slot_start
    `
    
    const result = await db.query(query, assignedLabIds)
    
    return NextResponse.json({
      success: true,
      entries: result.rows
    })
  } catch (error: any) {
    console.error("Failed to fetch timetable entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch timetable entries" },
      { status: 500 }
    )
  }
}
