import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const labId = searchParams.get('lab_id')

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      )
    }

    // Get the day of week for timetable entries
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday

    let scheduleEntries: any[] = []

        // Get timetable entries for the day
    const timetableQuery = labId
      ? `SELECT 
           CONCAT('timetable_', te.id) as id,
           te.lab_id,
           l.name as lab_name,
           l.code as lab_code,
           te.time_slot_start as start_time,
           te.time_slot_end as end_time,
           CONCAT(te.time_slot_start, ' - ', te.time_slot_end) as time_range,
           COALESCE(te.notes, 'Scheduled Class') as purpose,
           'class' as type,
           null as booker_name,
           'scheduled' as status
         FROM timetable_entries te
         JOIN labs l ON te.lab_id = l.id
         WHERE te.day_of_week = ? AND te.lab_id = ? AND te.is_active = true
         ORDER BY te.time_slot_start`
      : `SELECT 
           CONCAT('timetable_', te.id) as id,
           te.lab_id,
           l.name as lab_name,
           l.code as lab_code,
           te.time_slot_start as start_time,
           te.time_slot_end as end_time,
           CONCAT(te.time_slot_start, ' - ', te.time_slot_end) as time_range,
           COALESCE(te.notes, 'Scheduled Class') as purpose,
           'class' as type,
           null as booker_name,
           'scheduled' as status
         FROM timetable_entries te
         JOIN labs l ON te.lab_id = l.id
         WHERE te.day_of_week = ? AND te.is_active = true
         ORDER BY l.name, te.time_slot_start`

    const timetableParams = labId ? [dayOfWeek, labId] : [dayOfWeek]
    const timetableResult = await db.query(timetableQuery, timetableParams)
    scheduleEntries = [...scheduleEntries, ...timetableResult.rows]

    // Get booking requests for the specific date (only approved bookings)
    const bookingsQuery = labId
      ? `SELECT 
           CONCAT('booking_', br.id) as id,
           br.lab_id,
           l.name as lab_name,
           l.code as lab_code,
           br.start_time,
           br.end_time,
           CONCAT(br.start_time, ' - ', br.end_time) as time_range,
           br.purpose,
           'booking' as type,
           u.name as booker_name,
           br.status
         FROM booking_requests br
         JOIN labs l ON br.lab_id = l.id
         JOIN users u ON br.requested_by = u.id
         WHERE br.booking_date = ? AND br.lab_id = ?
         AND br.status = 'approved'
         ORDER BY br.start_time`
      : `SELECT 
           CONCAT('booking_', br.id) as id,
           br.lab_id,
           l.name as lab_name,
           l.code as lab_code,
           br.start_time,
           br.end_time,
           CONCAT(br.start_time, ' - ', br.end_time) as time_range,
           br.purpose,
           'booking' as type,
           u.name as booker_name,
           br.status
         FROM booking_requests br
         JOIN labs l ON br.lab_id = l.id
         JOIN users u ON br.requested_by = u.id
         WHERE br.booking_date = ?
         AND br.status = 'approved'
         ORDER BY l.name, br.start_time`

    const bookingsParams = labId ? [date, labId] : [date]
    const bookingsResult = await db.query(bookingsQuery, bookingsParams)
    scheduleEntries = [...scheduleEntries, ...bookingsResult.rows]

    // Sort all entries by lab name and then by start time
    scheduleEntries.sort((a, b) => {
      const labCompare = a.lab_name.localeCompare(b.lab_name)
      if (labCompare !== 0) return labCompare
      return a.start_time.localeCompare(b.start_time)
    })

    // Format the entries for display
    const formattedEntries = scheduleEntries.map(entry => {
      const startTime = entry.start_time ? entry.start_time.substring(0, 5) : '00:00' // HH:MM
      const endTime = entry.end_time ? entry.end_time.substring(0, 5) : '00:00' // HH:MM
      
      return {
        id: entry.id,
        lab_id: entry.lab_id,
        lab_name: entry.lab_name,
        lab_code: entry.lab_code,
        start_time: startTime,
        end_time: endTime,
        time_range: `${startTime} - ${endTime}`,
        purpose: entry.purpose || (entry.type === 'class' ? 'Scheduled Class' : 'Lab Booking'),
        type: entry.type,
        booker_name: entry.booker_name,
        status: entry.status
      }
    })

    // Always group by lab for consistent frontend structure
    const groupedSchedule = groupByLab(formattedEntries)

    return NextResponse.json({
      success: true,
      date,
      day_of_week: dayOfWeek,
      schedule: groupedSchedule,
      total_entries: formattedEntries.length
    })

  } catch (error: any) {
    console.error("Failed to fetch daily schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch daily schedule" },
      { status: 500 }
    )
  }
}

function groupByLab(entries: any[]) {
  const grouped: { [key: string]: any } = {}
  
  entries.forEach(entry => {
    const labKey = `${entry.lab_name} (${entry.lab_code})`
    if (!grouped[labKey]) {
      grouped[labKey] = {
        lab_id: entry.lab_id,
        lab_name: entry.lab_name,
        lab_code: entry.lab_code,
        entries: []
      }
    }
    grouped[labKey].entries.push(entry)
  })
  
  return Object.values(grouped)
}
