import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        l.name,
        l.code,
        l.department_id,
        d.name as department_name,
        l.capacity,
        l.location,
        l.is_active
      FROM labs l
      LEFT JOIN departments d ON l.department_id = d.id
      WHERE l.is_active = 1
      ORDER BY l.name
    `)

    return NextResponse.json({
      success: true,
      labs: result.rows
    })
  } catch (error: any) {
    console.error("Failed to fetch labs:", error)
    return NextResponse.json(
      { error: "Failed to fetch labs" },
      { status: 500 }
    )
  }
}