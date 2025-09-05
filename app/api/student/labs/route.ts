import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get("department_id")
    let rows
    if (departmentId) {
      rows = (await db.query(
        `SELECT id, name, code, department_id, capacity, location FROM labs WHERE department_id = ? ORDER BY name ASC`,
        [departmentId]
      )).rows
    } else {
      rows = (await db.query(
        `SELECT id, name, code, department_id, capacity, location FROM labs ORDER BY name ASC`
      )).rows
    }
    return NextResponse.json({ labs: rows })
  } catch (error) {
    console.error("Failed to fetch labs:", error)
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 })
  }
}
