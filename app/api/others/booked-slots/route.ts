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
    if (!user || !hasRole(user, ["others", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('lab_id')
    const date = searchParams.get('date')

    if (!labId || !date) {
      return NextResponse.json({ error: "Missing lab_id or date" }, { status: 400 })
    }

    const dayOfWeek = new Date(date).getDay()

    // Get existing bookings for this lab and date
    const bookings = await db.query(
      `SELECT br.start_time, br.end_time, u.name as booker_name, u.salutation as booker_salutation, br.purpose
       FROM booking_requests br
       LEFT JOIN users u ON br.requested_by = u.id
       WHERE br.lab_id = ? 
         AND br.booking_date = ? 
         AND br.status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
       ORDER BY br.start_time`,
      [labId, date]
    )

    // Get timetable entries for this lab and day
    const timetableEntries = await db.query(
      `SELECT time_slot_start as start_time, time_slot_end as end_time, notes
       FROM timetable_entries
       WHERE lab_id = ? AND day_of_week = ? AND is_active = true
       ORDER BY time_slot_start`,
      [labId, dayOfWeek]
    )

    const booked_slots = [
      ...bookings.rows.map(b => {
        // Format booker name with salutation
        let formattedBookerName = b.booker_name
        if (b.booker_name && b.booker_salutation && b.booker_salutation !== 'none') {
          const salutationMap: Record<string, string> = {
            'prof': 'Prof.',
            'dr': 'Dr.',
            'mr': 'Mr.',
            'mrs': 'Mrs.'
          }
          const salutation = salutationMap[b.booker_salutation] || ''
          formattedBookerName = salutation ? `${salutation} ${b.booker_name}` : b.booker_name
        }
        
        return {
          start_time: b.start_time,
          end_time: b.end_time,
          time_range: `${b.start_time} - ${b.end_time}`,
          purpose: b.purpose || 'No purpose specified',
          booker_name: formattedBookerName,
          type: 'booking' as const
        }
      }),
      ...timetableEntries.rows.map(t => ({
        start_time: t.start_time,
        end_time: t.end_time,
        time_range: `${t.start_time} - ${t.end_time}`,
        purpose: t.notes || 'Scheduled Class',
        type: 'class' as const
      }))
    ].sort((a, b) => a.start_time.localeCompare(b.start_time))

    return NextResponse.json({ booked_slots })
  } catch (error) {
    console.error("Failed to fetch booked slots:", error)
    return NextResponse.json({ error: "Failed to fetch booked slots" }, { status: 500 })
  }
}
