/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

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

    console.log('Fetching booked slots for lab_id:', labId, 'date:', date)

  // Get existing bookings for this lab and date
    let bookedSlots: any[] = []
    
    try {
      // Single-lab bookings: check main booking status
      const singleLabBookings = await db.query(`
        SELECT br.start_time, br.end_time, br.purpose, u.name as booker_name, u.salutation as booker_salutation
        FROM booking_requests br
        JOIN users u ON br.requested_by = u.id
        WHERE br.lab_id = ? 
        AND br.booking_date = ?
        AND br.is_multi_lab = 0
        AND br.status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
      `, [labId, date])
      
      // Multi-lab bookings: check if this specific lab is NOT rejected in multi_lab_approvals
      const multiLabBookings = await db.query(`
        SELECT br.start_time, br.end_time, br.purpose, u.name as booker_name, u.salutation as booker_salutation
        FROM booking_requests br
        JOIN users u ON br.requested_by = u.id
        JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id AND mla.lab_id = ?
        WHERE br.booking_date = ?
        AND br.is_multi_lab = 1
        AND mla.status != 'rejected'
        AND mla.status != 'withdrawn'
        AND br.status IN ('pending_lab_staff', 'pending_hod', 'approved')
      `, [labId, date])
      
      const bookingsResult = { rows: [...singleLabBookings.rows, ...multiLabBookings.rows] }
      
      bookedSlots = [...bookedSlots, ...bookingsResult.rows.map((booking: any) => ({
        start_time: booking.start_time,
        end_time: booking.end_time,
        purpose: booking.purpose || 'Lab Booking',
        booker_name: booking.booker_name,
        booker_salutation: booking.booker_salutation,
        type: 'booking'
      }))]
    } catch (bookingError: any) {
      console.log('Booking query failed, trying alternative table')
      try {
        const altBookingsResult = await db.query(`
          SELECT lb.start_time, lb.end_time, lb.purpose, u.name as booker_name, u.salutation as booker_salutation
          FROM lab_bookings lb
          JOIN users u ON lb.booked_by = u.id
          WHERE lb.lab_id = ? 
          AND lb.booking_date = ? 
          AND lb.approval_status IN ('pending', 'approved')
        `, [labId, date])
        
        bookedSlots = [...bookedSlots, ...altBookingsResult.rows.map((booking: any) => ({
          start_time: booking.start_time,
          end_time: booking.end_time,
          purpose: booking.purpose || 'Lab Booking',
          booker_name: booking.booker_name,
          booker_salutation: booking.booker_salutation,
          type: 'booking'
        }))]
      } catch (altError: any) {
        console.log('Alternative booking query failed, using empty bookings')
      }
    }

    // Get timetable entries (scheduled classes)
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    try {
      const timetableResult = await db.query(`
        SELECT time_slot_start as start_time, time_slot_end as end_time, notes
        FROM timetable_entries 
        WHERE lab_id = ? 
        AND day_of_week = ?
        AND is_active = true
      `, [labId, dayOfWeek])
      
      bookedSlots = [...bookedSlots, ...timetableResult.rows.map((entry: any) => ({
        start_time: entry.start_time,
        end_time: entry.end_time,
        purpose: entry.notes || 'Scheduled Class',
        type: 'class'
      }))]
    } catch (timetableError: any) {
      console.log('Timetable query failed:', timetableError.message)
    }

    // Sort booked slots by start time
    bookedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time))

    // Format the slots for display
    const formattedSlots = bookedSlots.map(slot => {
      const startTime = slot.start_time.substring(0, 5) // HH:MM
      const endTime = slot.end_time.substring(0, 5) // HH:MM
      
      // Format booker name with salutation
      let formattedBookerName = slot.booker_name || null
      if (slot.booker_name && slot.booker_salutation && slot.booker_salutation !== 'none') {
        const salutationMap: Record<string, string> = {
          'prof': 'Prof.',
          'dr': 'Dr.',
          'mr': 'Mr.',
          'mrs': 'Mrs.'
        }
        const salutation = salutationMap[slot.booker_salutation] || ''
        formattedBookerName = salutation ? `${salutation} ${slot.booker_name}` : slot.booker_name
      }
      
      return {
        start_time: startTime,
        end_time: endTime,
        time_range: `${startTime} - ${endTime}`,
        purpose: slot.purpose,
        booker_name: formattedBookerName,
        type: slot.type
      }
    })

    return NextResponse.json({
      success: true,
      date: date,
      lab_id: labId,
      booked_slots: formattedSlots,
      total_bookings: formattedSlots.length
    })

  } catch (error) {
    console.error("Failed to fetch booked slots:", error)
    return NextResponse.json(
      { error: "Failed to fetch booked slots" },
      { status: 500 }
    )
  }
}
