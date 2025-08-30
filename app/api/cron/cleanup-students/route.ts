import { NextResponse } from "next/server"
import { db } from "@/lib/database"

// Deactivate student accounts with no activity in last 6 months
export async function POST() {
  try {
    const result = await db.query(
      `UPDATE users
       SET is_active = false
       WHERE role = 'student'
         AND updated_at < (NOW() - INTERVAL '6 months')
         AND is_active = true
       RETURNING id, email`
    )
    return NextResponse.json({ success: true, deactivated: result.rows.length })
  } catch (e) {
    console.error("Cleanup students error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
