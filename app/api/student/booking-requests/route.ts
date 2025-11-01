import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
  const user = await verifyToken(request)
    const paramId = searchParams.get('student_id')
    if (!user && !paramId) {
      return NextResponse.json({ success: true, requests: [] })
    }
    const studentId = String(user?.userId || paramId)
    
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
      WHERE br.requested_by = ?
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

  const user = await verifyToken(request)
  const studentId = user?.userId || 99

    // Check for conflicts with existing bookings (overlap if start < existing.end AND end > existing.start)
    const conflictResult = await db.query(`
      SELECT id FROM booking_requests 
      WHERE lab_id = ? 
      AND booking_date = ? 
      AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
      AND (start_time < ? AND end_time > ?)
    `, [lab_id, booking_date, end_time, start_time])

    if (conflictResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Lab is already booked for this time slot" },
        { status: 400 }
      )
    }

    // Check for conflicts with timetable (day_of_week INT 0-6; columns: time_slot_start/time_slot_end)
    const dateObj = new Date(booking_date)
    const dayOfWeek = dateObj.getDay() // 0=Sunday
    const timetableResult = await db.query(`
      SELECT id FROM timetable_entries 
      WHERE lab_id = ? 
      AND day_of_week = ? 
      AND is_active = true
      AND (time_slot_start < ? AND time_slot_end > ?)
    `, [lab_id, dayOfWeek, end_time, start_time])

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

    // Send email notification to faculty supervisor
    try {
      const details = await db.query(
        `SELECT u.name as student_name, u.email as student_email,
                f.name as faculty_name, f.email as faculty_email,
                l.name as lab_name
         FROM users u
         JOIN users f ON f.id = ?
         JOIN labs l ON l.id = ?
         WHERE u.id = ?`,
        [faculty_supervisor_id, lab_id, studentId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.labBookingCreated({
          requesterName: req.student_name,
          requesterRole: 'Student',
          labName: req.lab_name,
          bookingDate: booking_date,
          startTime: start_time,
          endTime: end_time,
          purpose: purpose,
          requestId: result.insertId!
        })

        await sendEmail({
          to: req.faculty_email,
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send booking notification:', emailError)
    }

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