import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = await verifyToken(request)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const labId = searchParams.get("labId")
  const bookings = await dbOperations.getAllBookings({ status, labId })
  return NextResponse.json({ bookings })
}
