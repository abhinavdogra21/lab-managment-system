import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { dbOperations } from "@/lib/database"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

// GET - Student: list my bookings
export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["student"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const rows = await dbOperations.getBookingsByUser(user.userId)
  return NextResponse.json({ bookings: rows })
}

// POST - Student: create a booking for myself
export async function POST(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["student"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const required = ["labId", "bookingDate", "startTime", "endTime", "purpose"]
  for (const k of required) if (!body?.[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 })
  // Optional: conflict check could be applied here using dbOperations.checkBookingConflicts
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
  
  // Log the activity
  const userInfo = await getUserInfoForLogging(user.userId)
  logLabBookingActivity({
    bookingId: booking.id,
    labId: booking.lab_id,
    actorUserId: userInfo?.userId || null,
    actorName: userInfo?.name || null,
    actorEmail: userInfo?.email || null,
    actorRole: userInfo?.role || null,
    action: "created",
    actionDescription: `Created lab booking for ${booking.purpose}`,
    bookingSnapshot: booking,
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    userAgent: req.headers.get("user-agent") || null,
  }).catch(err => console.error("Activity logging failed:", err))
  
  return NextResponse.json({ booking }, { status: 201 })
}
