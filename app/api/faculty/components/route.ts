/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(req: NextRequest) {
  try {
    // Verify faculty authentication
    const user = await verifyToken(req)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const labId = searchParams.get("lab_id")
    
    if (!labId) {
      return NextResponse.json({ error: "lab_id is required" }, { status: 400 })
    }

    const rows = (await db.query(
      `SELECT id, name, category, model, condition_status, quantity_total, quantity_available, lab_id
       FROM components 
       WHERE lab_id = ? AND condition_status IN ('working', 'consumable')
       ORDER BY name ASC`,
      [labId]
    )).rows
    
    return NextResponse.json({ components: rows })
  } catch (error: any) {
    console.error("Failed to fetch components:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch components" }, { status: 500 })
  }
}
