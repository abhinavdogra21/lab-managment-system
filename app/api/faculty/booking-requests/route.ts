import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { lab_id, booking_date, start_time, end_time, purpose } = body || {}
    if (!lab_id || !booking_date || !start_time || !end_time || !purpose) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Prevent overlaps with existing bookings
    const conflict = await db.query(
      `SELECT id FROM booking_requests 
       WHERE lab_id = ? AND booking_date = ? 
         AND status IN ('pending_faculty','pending_lab_staff','pending_hod','approved')
         AND (start_time < ? AND end_time > ?)`,
      [lab_id, booking_date, end_time, start_time]
    )
    if (conflict.rows.length > 0) {
      return NextResponse.json({ error: "Lab is already booked for this time slot" }, { status: 400 })
    }

    // Prevent clashes with timetable
    const dayOfWeek = new Date(booking_date).getDay()
    const timetable = await db.query(
      `SELECT id FROM timetable_entries 
       WHERE lab_id = ? AND day_of_week = ? AND is_active = true
         AND (time_slot_start < ? AND time_slot_end > ?)`,
      [lab_id, dayOfWeek, end_time, start_time]
    )
    if (timetable.rows.length > 0) {
      return NextResponse.json({ error: "Lab has scheduled classes during this time" }, { status: 400 })
    }

    // Insert request: faculty requests go directly to lab staff (skip faculty step)
    const result = await db.query(
      `INSERT INTO booking_requests (request_type, requested_by, lab_id, faculty_supervisor_id, booking_date, start_time, end_time, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lab_booking',
        user.userId,
        lab_id,
        user.userId, // faculty acts as own supervisor context
        booking_date,
        start_time,
        end_time,
        purpose,
        'pending_lab_staff'
      ]
    )

    return NextResponse.json({ success: true, message: "Booking request submitted", id: result.insertId })
  } catch (error) {
    console.error("Faculty booking create error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
