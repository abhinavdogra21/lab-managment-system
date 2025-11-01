import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["tnp", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { lab_id, booking_date, start_time, end_time, purpose } = body || {}
    if (!lab_id || !booking_date || !start_time || !end_time || !purpose) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Prevent overlaps with existing bookings
    const conflict = await db.query(
      `SELECT id FROM booking_requests 
       WHERE lab_id = ? AND booking_date = ? 
         AND status IN ('pending_faculty','pending_lab_staff','pending_hod','approved')
         AND (start_time < ? AND end_time > ?)`,
      [lab_id, booking_date, end_time, start_time]
    )
    if (conflict.rows.length > 0) {
      return NextResponse.json({ error: "Lab is already booked for this time slot" }, { status: 400 })
    }

    // Prevent clashes with timetable
    const dayOfWeek = new Date(booking_date).getDay()
    const timetable = await db.query(
      `SELECT id FROM timetable_entries 
       WHERE lab_id = ? AND day_of_week = ? AND is_active = true
         AND (time_slot_start < ? AND time_slot_end > ?)`,
      [lab_id, dayOfWeek, end_time, start_time]
    )
    if (timetable.rows.length > 0) {
      return NextResponse.json({ error: "Lab has scheduled classes during this time" }, { status: 400 })
    }

    // Insert request: TnP requests go directly to lab staff
    const result = await db.query(
      `INSERT INTO booking_requests (request_type, requested_by, lab_id, faculty_supervisor_id, booking_date, start_time, end_time, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lab_booking',
        user.userId,
        lab_id,
        user.userId, // TnP acts as own supervisor context
        booking_date,
        start_time,
        end_time,
        purpose,
        'pending_lab_staff'
      ]
    )

    // Send email notification to lab staff
    try {
      const details = await db.query(
        `SELECT u.name as tnp_name, l.name as lab_name
         FROM users u
         JOIN labs l ON l.id = ?
         WHERE u.id = ?`,
        [lab_id, user.userId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        
        // Get head lab staff email for this lab
        const labStaff = await db.query(
          `SELECT u.email 
           FROM users u
           JOIN labs l ON l.staff_id = u.id
           WHERE u.role = 'lab_staff' AND l.id = ?`,
          [lab_id]
        )
        
        const labStaffEmails = labStaff.rows.map(staff => staff.email)
        
        if (labStaffEmails.length > 0) {
          const emailData = emailTemplates.labBookingCreated({
            requesterName: req.tnp_name,
            requesterRole: 'TnP Officer',
            labName: req.lab_name,
            bookingDate: booking_date,
            startTime: start_time,
            endTime: end_time,
            purpose: purpose,
            requestId: result.insertId!
          })

          await sendEmail({
            to: labStaffEmails,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send booking notification:', emailError)
    }

    return NextResponse.json({ success: true, message: "Booking request submitted", id: result.insertId })
  } catch (error) {
    console.error("TnP booking create error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
