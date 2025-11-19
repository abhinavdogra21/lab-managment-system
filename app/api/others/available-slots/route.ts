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
    if (!user || !hasRole(user, ["others", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('lab_id')
    const date = searchParams.get('date')

    if (!labId || !date) {
      return NextResponse.json({ error: "Missing lab_id or date" }, { status: 400 })
    }

    // For TnP, just return empty array since they pick custom times
    // This endpoint exists for consistency with faculty interface
    return NextResponse.json({ availableSlots: [] })
  } catch (error) {
    console.error("Failed to fetch available slots:", error)
    return NextResponse.json({ error: "Failed to fetch available slots" }, { status: 500 })
  }
}
