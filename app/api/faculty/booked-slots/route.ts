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
      return NextResponse.json({ error: "Lab ID and date are required" }, { status: 400 })
    }

    let bookedSlots: any[] = []
    try {
      // Single-lab bookings: check main booking status
      const singleLabBookings = await db.query(
        `SELECT br.start_time, br.end_time, br.purpose, u.name as booker_name, u.salutation as booker_salutation
         FROM booking_requests br
         JOIN users u ON br.requested_by = u.id
         WHERE br.lab_id = ? AND br.booking_date = ?
           AND br.is_multi_lab = 0
           AND br.status IN ('pending_faculty','pending_lab_staff','pending_hod','approved')`,
        [labId, date]
      )
      
      // Multi-lab bookings: check if this specific lab is NOT rejected in multi_lab_approvals
      const multiLabBookings = await db.query(
        `SELECT br.start_time, br.end_time, br.purpose, u.name as booker_name, u.salutation as booker_salutation
         FROM booking_requests br
         JOIN users u ON br.requested_by = u.id
         JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id AND mla.lab_id = ?
         WHERE br.booking_date = ?
           AND br.is_multi_lab = 1
           AND mla.status != 'rejected'
           AND mla.status != 'withdrawn'
           AND br.status IN ('pending_lab_staff','pending_hod','approved')`,
        [labId, date]
      )
      
      const bookings = { rows: [...singleLabBookings.rows, ...multiLabBookings.rows] }
      bookedSlots = [
        ...bookedSlots,
        ...bookings.rows.map((b: any) => ({
          start_time: b.start_time,
          end_time: b.end_time,
          purpose: b.purpose || 'Lab Booking',
          booker_name: b.booker_name,
          booker_salutation: b.booker_salutation,
          type: 'booking'
        }))
      ]
    } catch {}

    const dayOfWeek = new Date(date).getDay()
    try {
      const timetable = await db.query(
        `SELECT time_slot_start as start_time, time_slot_end as end_time, notes
         FROM timetable_entries WHERE lab_id = ? AND day_of_week = ? AND is_active = true`,
        [labId, dayOfWeek]
      )
      bookedSlots = [
        ...bookedSlots,
        ...timetable.rows.map((t: any) => ({
          start_time: t.start_time,
          end_time: t.end_time,
          purpose: t.notes || 'Scheduled Class',
          type: 'class'
        }))
      ]
    } catch {}

    bookedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
    const formatted = bookedSlots.map(slot => {
      const s = slot.start_time.substring(0,5)
      const e = slot.end_time.substring(0,5)
      
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
      
      return { start_time: s, end_time: e, time_range: `${s} - ${e}`, purpose: slot.purpose, booker_name: formattedBookerName, type: slot.type }
    })

    return NextResponse.json({ success: true, date, lab_id: labId, booked_slots: formatted, total_bookings: formatted.length })
  } catch (error) {
    console.error("Failed to fetch booked slots:", error)
    return NextResponse.json({ error: "Failed to fetch booked slots" }, { status: 500 })
  }
}
