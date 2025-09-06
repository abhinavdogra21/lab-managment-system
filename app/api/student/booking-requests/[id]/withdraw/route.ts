import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

const db = Database.getInstance()

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const requestId = Number(params.id)
    // Only allow deleting if the booking request belongs to the student and is still pending
    const { rows } = await db.query(
      "SELECT * FROM booking_requests WHERE id = ? AND requested_by = ? AND status IN ('pending_faculty','pending_lab_staff','pending_hod')",
      [requestId, user.userId]
    )
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Request not found or not withdrawable" }, { status: 404 })
    }
    await db.query("DELETE FROM booking_requests WHERE id = ?", [requestId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to withdraw request:", error)
    return NextResponse.json({ error: "Failed to withdraw request" }, { status: 500 })
  }
}
