import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const labId = searchParams.get('lab_id')
    const date = searchParams.get('date')

    if (!labId || !date) {
      return NextResponse.json(
        { error: "Lab ID and date are required" },
        { status: 400 }
      )
    }

    // Get existing bookings for this lab and date
    const bookingsResult = await db.query(`
      SELECT start_time, end_time 
      FROM booking_requests 
      WHERE lab_id = ? 
      AND booking_date = ? 
      AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
    `, [labId, date])

    // Get timetable entries for this lab and day
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    const timetableResult = await db.query(`
      SELECT start_time, end_time 
      FROM timetable_entries 
      WHERE lab_id = ? 
      AND day_of_week = ?
    `, [labId, dayOfWeek])

    // Combine all blocked time slots
    const blockedSlots = [
      ...bookingsResult.rows.map((booking: any) => ({
        start: booking.start_time,
        end: booking.end_time
      })),
      ...timetableResult.rows.map((entry: any) => ({
        start: entry.start_time,
        end: entry.end_time
      }))
    ]

    // Generate available time slots (9 AM to 6 PM)
    const availableSlots = []
    for (let hour = 9; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`
      
      // Check if this slot conflicts with any blocked slots
      const hasConflict = blockedSlots.some(blocked => {
        return (startTime < blocked.end && endTime > blocked.start)
      })
      
      if (!hasConflict) {
        availableSlots.push({
          start: startTime,
          end: endTime,
          display: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'} - ${((hour + 1) % 12 || 12)}:00 ${(hour + 1) < 12 ? 'AM' : 'PM'}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      availableSlots,
      blockedSlots
    })
  } catch (error) {
    console.error("Failed to fetch available slots:", error)
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    )
  }
}
