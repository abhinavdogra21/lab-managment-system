import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(_req: NextRequest) {
  try {
    const result = await db.query(`
      SELECT id, name, code 
      FROM departments 
      ORDER BY name ASC
    `)
    return NextResponse.json({ departments: result.rows })
  } catch (error) {
    console.error("Failed to fetch departments:", error)
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
  }
}
