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
    if (!user || !hasRole(user, ["student", "faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ensureSchema()
    const labId = req.nextUrl.searchParams.get('lab_id')
    if (!labId) return NextResponse.json({ components: [] })
    const list = await db.query(`SELECT * FROM components WHERE lab_id = ? ORDER BY name`, [Number(labId)])
    return NextResponse.json({ components: list.rows })
  } catch (e) {
    console.error("student components GET error:", e)
    return NextResponse.json({ error: "Failed to list components" }, { status: 500 })
  }
}
