import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { dbOperations } from "@/lib/database"

// GET - HOD: view all bookings (optionally filter by status/lab)
export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["faculty", "admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const labId = searchParams.get("labId")
  const bookings = await dbOperations.getAllBookings({ status, labId })
  return NextResponse.json({ bookings })
}
