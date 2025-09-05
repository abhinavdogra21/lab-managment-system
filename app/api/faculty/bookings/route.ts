import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { dbOperations } from "@/lib/database"

// GET - Faculty: list my bookings
export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["faculty"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const hist = await dbOperations.getUserHistory(user.userId)
  return NextResponse.json({ bookings: hist.bookings || [] })
}

// POST - Faculty: create a booking for myself
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["faculty"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const required = ["labId", "bookingDate", "startTime", "endTime", "purpose"]
  for (const k of required) if (!body?.[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 })
  const booking = await dbOperations.createBooking({
    labId: Number.parseInt(String(body.labId), 10),
    bookedBy: user.userId,
    bookingDate: String(body.bookingDate),
    startTime: String(body.startTime),
    endTime: String(body.endTime),
    purpose: String(body.purpose),
    expectedStudents: body?.expectedStudents ?? null,
    equipmentNeeded: body?.equipmentNeeded ?? null,
  })
  return NextResponse.json({ booking }, { status: 201 })
}
