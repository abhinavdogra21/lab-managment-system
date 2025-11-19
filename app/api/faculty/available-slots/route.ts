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
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const labId = searchParams.get('lab_id')
    const date = searchParams.get('date')

    if (!labId || !date) {
      return NextResponse.json(
        { error: "Lab ID and date are required" },
        { status: 400 }
      )
    }

    // Existing bookings and timetable (same as student version)
    let bookingsResult: any = { rows: [] }
    try {
      bookingsResult = await db.query(
        `SELECT start_time, end_time 
         FROM booking_requests 
         WHERE lab_id = ? 
           AND booking_date = ? 
           AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')`,
        [labId, date]
      )
    } catch {}

    let timetableResult: any = { rows: [] }
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    try {
      timetableResult = await db.query(
        `SELECT time_slot_start, time_slot_end 
         FROM timetable_entries 
         WHERE lab_id = ? AND day_of_week = ? AND is_active = true`,
        [labId, dayOfWeek]
      )
    } catch {}

    const blockedSlots = [
      ...bookingsResult.rows.map((b: any) => ({ start: b.start_time, end: b.end_time })),
      ...timetableResult.rows.map((t: any) => ({ start: t.time_slot_start, end: t.time_slot_end }))
    ]

    const availableSlots = [] as any[]
    for (let hour = 8; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`
      const hasConflict = blockedSlots.some(blocked => startTime < blocked.end && endTime > blocked.start)
      availableSlots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: !hasConflict,
        display: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'} - ${((hour + 1) % 12 || 12)}:00 ${(hour + 1) < 12 ? 'AM' : 'PM'}`
      })
    }

    return NextResponse.json({ success: true, availableSlots, blockedSlots })
  } catch (error) {
    console.error("Failed to fetch available slots:", error)
    return NextResponse.json({ error: "Failed to fetch available slots" }, { status: 500 })
  }
}
