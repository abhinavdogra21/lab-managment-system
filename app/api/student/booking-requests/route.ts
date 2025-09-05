import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('student_id') || '99' // Use test student ID for now
    
    // Get booking requests with lab and faculty details
    const result = await db.query(`
      SELECT 
        br.id,
        br.lab_id,
        l.name as lab_name,
        br.faculty_supervisor_id,
        u.name as faculty_name,
        br.booking_date as date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.faculty_remarks,
        br.lab_staff_remarks,
        br.hod_remarks,
        br.created_at
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users u ON br.faculty_supervisor_id = u.id
      WHERE br.requested_by = ? AND br.request_type = 'lab_booking'
      ORDER BY br.created_at DESC
    `, [studentId])

    return NextResponse.json({ 
      success: true,
      requests: result.rows 
    })
  } catch (error) {
    console.error("Failed to fetch booking requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking requests" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      lab_id, 
      faculty_supervisor_id, 
      booking_date, 
      start_time, 
      end_time, 
      purpose 
    } = body

    if (!lab_id || !faculty_supervisor_id || !booking_date || !start_time || !end_time || !purpose) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    const studentId = 99 // Use test student ID for now

    // Check for conflicts with existing bookings
    const conflictResult = await db.query(`
      SELECT id FROM booking_requests 
      WHERE lab_id = ? 
      AND booking_date = ? 
      AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [lab_id, booking_date, end_time, start_time, start_time, end_time, start_time, end_time])

    if (conflictResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Lab is already booked for this time slot" },
        { status: 400 }
      )
    }

    // Check for conflicts with timetable
    const date = new Date(booking_date)
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const timetableResult = await db.query(`
      SELECT id FROM timetable_entries 
      WHERE lab_id = ? 
      AND day_of_week = ? 
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [lab_id, dayOfWeek, end_time, start_time, start_time, end_time, start_time, end_time])

    if (timetableResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Lab has scheduled classes during this time" },
        { status: 400 }
      )
    }

    // Create the booking request
    const result = await db.query(`
      INSERT INTO booking_requests (
        request_type,
        requested_by,
        lab_id,
        faculty_supervisor_id,
        booking_date,
        start_time,
        end_time,
        purpose,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'lab_booking',
      studentId,
      lab_id,
      faculty_supervisor_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      'pending_faculty'
    ])

    return NextResponse.json({ 
      success: true,
      message: "Booking request submitted successfully",
      id: result.insertId
    })
  } catch (error) {
    console.error("Failed to create booking request:", error)
    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    )
  }
}