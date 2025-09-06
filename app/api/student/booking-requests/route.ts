import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { isSmtpConfigured, sendMail } from "@/lib/email"

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

    // Notify faculty via email if SMTP configured
    // Email notification code commented out for testing purposes
    /*
    try {
      const smtp = isSmtpConfigured()
      if (smtp.configured) {
        const fac = await db.query(`SELECT email, name FROM users WHERE id = ? LIMIT 1`, [faculty_supervisor_id])
        const lab = await db.query(`SELECT name FROM labs WHERE id = ? LIMIT 1`, [lab_id])
        const facultyEmail = fac.rows?.[0]?.email
        const facultyName = fac.rows?.[0]?.name || 'Faculty'
        const labName = lab.rows?.[0]?.name || 'Lab'
        if (facultyEmail) {
          const subject = `New Lab Booking Request: ${labName} on ${booking_date}`
          const html = `<p>Dear ${facultyName},</p>
            <p>You have a new lab booking request awaiting your review.</p>
            <ul>
              <li><b>Lab:</b> ${labName}</li>
              <li><b>Date:</b> ${booking_date}</li>
              <li><b>Time:</b> ${start_time} - ${end_time}</li>
              <li><b>Purpose:</b> ${purpose}</li>
            </ul>
            <p>Please log in to review and take action.</p>`
          await sendMail({ to: facultyEmail, subject, html })
        }
      }
    } catch (e) {
      console.warn('Faculty notification email skipped or failed:', (e as any)?.message || e)
    }
    */

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