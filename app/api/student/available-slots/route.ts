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

    console.log('Fetching available slots for lab_id:', labId, 'date:', date)

    // Get existing bookings for this lab and date with error handling
  let bookingsResult: any = { rows: [] }
    try {
      bookingsResult = await db.query(`
        SELECT start_time, end_time 
        FROM booking_requests 
        WHERE lab_id = ? 
    AND booking_date = ? 
    AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
      `, [labId, date])
    } catch (bookingError: any) {
      console.log('Booking query failed, trying alternative table:', bookingError.message)
      try {
        // Try alternative table structure
        bookingsResult = await db.query(`
          SELECT start_time, end_time 
          FROM lab_bookings 
          WHERE lab_id = ? 
          AND booking_date = ? 
          AND approval_status IN ('pending', 'approved')
        `, [labId, date])
      } catch (altError: any) {
        console.log('Alternative booking query also failed, using empty bookings')
      }
    }

    // Get timetable entries for this lab and day with error handling
    let timetableResult: any = { rows: [] }
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    try {
      timetableResult = await db.query(`
        SELECT time_slot_start, time_slot_end 
        FROM timetable_entries 
        WHERE lab_id = ? 
        AND day_of_week = ?
        AND is_active = true
      `, [labId, dayOfWeek])
    } catch (timetableError: any) {
      console.log('Timetable query failed:', timetableError.message)
      // If timetable table doesn't exist or has different structure, continue with empty results
    }

    // Combine all blocked time slots
    const blockedSlots = [
      ...bookingsResult.rows.map((booking: any) => ({
        start: booking.start_time,
        end: booking.end_time
      })),
      ...timetableResult.rows.map((entry: any) => ({
        start: entry.time_slot_start,
        end: entry.time_slot_end
      }))
    ]

  // Generate available time slots (8 AM to 6 PM)
  const availableSlots = []
  for (let hour = 8; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`
      
      // Check if this slot conflicts with any blocked slots
      const hasConflict = blockedSlots.some(blocked => {
        return (startTime < blocked.end && endTime > blocked.start)
      })
      
      availableSlots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: !hasConflict,
        display: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'} - ${((hour + 1) % 12 || 12)}:00 ${(hour + 1) < 12 ? 'AM' : 'PM'}`
      })
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
