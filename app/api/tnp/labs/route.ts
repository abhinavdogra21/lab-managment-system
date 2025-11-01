import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["tnp", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all labs
    const result = await db.query(
      `SELECT id, name, code, department_id, capacity, location 
       FROM labs 
       ORDER BY name`
    )

    return NextResponse.json({ labs: result.rows })
  } catch (error) {
    console.error("Failed to fetch labs:", error)
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 })
  }
}
