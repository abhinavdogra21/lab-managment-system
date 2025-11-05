import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const db = Database.getInstance()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["others", "admin"])) {
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

    // Insert request: Others requests go directly to lab staff
    const result = await db.query(
      `INSERT INTO booking_requests (request_type, requested_by, lab_id, faculty_supervisor_id, booking_date, start_time, end_time, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lab_booking',
        user.userId,
        lab_id,
        user.userId, // Others acts as own supervisor context
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
        `SELECT u.name as requester_name, u.salutation as requester_salutation, l.name as lab_name
         FROM users u
         JOIN labs l ON l.id = ?
         WHERE u.id = ?`,
        [lab_id, user.userId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        
        // Get lab staff email, name, and salutation for this lab
        const labStaff = await db.query(
          `SELECT u.email, u.name, u.salutation
           FROM users u
           JOIN labs l ON l.staff_id = u.id
           WHERE u.role = 'lab_staff' AND l.id = ?`,
          [lab_id]
        )
        
        if (labStaff.rows.length > 0) {
          // Send to each lab staff with their specific salutation
          for (const staff of labStaff.rows) {
            const emailData = emailTemplates.labBookingCreated({
              requesterName: req.requester_name,
              requesterRole: 'Others',
              labName: req.lab_name,
              bookingDate: booking_date,
              startTime: start_time,
              endTime: end_time,
              purpose: purpose,
              requestId: result.insertId!,
              recipientName: staff.name,
              recipientSalutation: staff.salutation
            })

            await sendEmail({
              to: [staff.email],
              ...emailData
            }).catch(err => console.error('Email send failed:', err))
          }
        }
      }
    } catch (emailError) {
      console.error('Failed to send booking notification:', emailError)
    }

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    const createdBooking = await db.query('SELECT * FROM booking_requests WHERE id = ?', [result.insertId])
    if (createdBooking.rows.length > 0) {
      logLabBookingActivity({
        bookingId: Number(result.insertId),
        labId: Number(lab_id),
        actorUserId: userInfo?.userId || null,
        actorName: userInfo?.name || null,
        actorEmail: userInfo?.email || null,
        actorRole: userInfo?.role || null,
        action: "created",
        actionDescription: `Others booking created for ${purpose}`,
        bookingSnapshot: createdBooking.rows[0],
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      }).catch(err => console.error("Activity logging failed:", err))
    }

    return NextResponse.json({ success: true, message: "Booking request submitted", id: result.insertId })
  } catch (error) {
    console.error("Others booking create error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
