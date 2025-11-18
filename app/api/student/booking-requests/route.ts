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
      lab_ids,
      is_multi_lab,
      faculty_supervisor_id, 
      booking_date, 
      start_time, 
      end_time, 
      purpose,
      responsible_persons // NEW: Array of {lab_id, name, email}
    } = body

    // Determine if this is a multi-lab booking
    const isMultiLab = is_multi_lab === true || (lab_ids && lab_ids.length > 1)
    const labsToBook = isMultiLab ? lab_ids : [lab_id]

    if (!labsToBook || labsToBook.length === 0 || !faculty_supervisor_id || !booking_date || !start_time || !end_time || !purpose || !responsible_persons || responsible_persons.length === 0) {
      return NextResponse.json(
        { error: "All fields are required including person responsible details for each lab" },
        { status: 400 }
      )
    }

    // Validate all emails end with @lnmiit.ac.in
    for (const rp of responsible_persons) {
      if (!rp.email || !rp.email.toLowerCase().endsWith('@lnmiit.ac.in')) {
        return NextResponse.json(
          { error: `All responsible person emails must end with @lnmiit.ac.in` },
          { status: 400 }
        )
      }
      if (!rp.name || !rp.name.trim()) {
        return NextResponse.json(
          { error: "All responsible persons must have a name" },
          { status: 400 }
        )
      }
    }

  const user = await verifyToken(request)
  const studentId = user?.userId || 99

    // Check for conflicts in ALL labs that will be booked
    for (const labId of labsToBook) {
      // Check for conflicts with existing bookings
      const conflictResult = await db.query(`
        SELECT id FROM booking_requests 
        WHERE lab_id = ? 
        AND booking_date = ? 
        AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
        AND (start_time < ? AND end_time > ?)
      `, [labId, booking_date, end_time, start_time])

      if (conflictResult.rows.length > 0) {
        const labResult = await db.query('SELECT name FROM labs WHERE id = ?', [labId])
        const labName = labResult.rows[0]?.name || `Lab ${labId}`
        return NextResponse.json(
          { error: `${labName} is already booked for this time slot` },
          { status: 400 }
        )
      }

      // Check for conflicts with timetable
      const dateObj = new Date(booking_date)
      const dayOfWeek = dateObj.getDay()
      const timetableResult = await db.query(`
        SELECT id FROM timetable_entries 
        WHERE lab_id = ? 
        AND day_of_week = ? 
        AND is_active = true
        AND (time_slot_start < ? AND time_slot_end > ?)
      `, [labId, dayOfWeek, end_time, start_time])

      if (timetableResult.rows.length > 0) {
        const labResult = await db.query('SELECT name FROM labs WHERE id = ?', [labId])
        const labName = labResult.rows[0]?.name || `Lab ${labId}`
        return NextResponse.json(
          { error: `${labName} has scheduled classes during this time` },
          { status: 400 }
        )
      }
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
        status,
        is_multi_lab,
        lab_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'lab_booking',
      studentId,
      isMultiLab ? labsToBook[0] : lab_id,
      faculty_supervisor_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      'pending_faculty',
      isMultiLab ? 1 : 0,
      isMultiLab ? JSON.stringify(labsToBook) : null
    ])

    const bookingId = result.insertId

    // Store responsible persons for each lab in separate table
    for (const rp of responsible_persons) {
      await db.query(`
        INSERT INTO multi_lab_responsible_persons (
          booking_request_id,
          lab_id,
          name,
          email
        ) VALUES (?, ?, ?, ?)
      `, [bookingId, rp.lab_id, rp.name.trim(), rp.email.trim().toLowerCase()])
    }

    // For multi-lab bookings, create entries in multi_lab_approvals table
    if (isMultiLab) {
      for (const labId of labsToBook) {
        await db.query(`
          INSERT INTO multi_lab_approvals (
            booking_request_id,
            lab_id,
            status
          ) VALUES (?, ?, ?)
        `, [bookingId, labId, 'pending'])
      }
    }

    // Send email notification to faculty supervisor
    try {
      // Get lab names
      let labNamesText = ''
      if (isMultiLab) {
        const labNamesResult = await db.query(
          `SELECT name FROM labs WHERE id IN (${labsToBook.map(() => '?').join(',')})`,
          labsToBook
        )
        labNamesText = labNamesResult.rows.map((l: any) => l.name).join(', ')
      } else {
        const labResult = await db.query('SELECT name FROM labs WHERE id = ?', [lab_id])
        labNamesText = labResult.rows[0]?.name || ''
      }

      const details = await db.query(
        `SELECT u.name as student_name, u.email as student_email,
                f.name as faculty_name, f.email as faculty_email, f.salutation as faculty_salutation
         FROM users u
         JOIN users f ON f.id = ?
         WHERE u.id = ?`,
        [faculty_supervisor_id, studentId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.labBookingCreated({
          requesterName: req.student_name,
          requesterRole: 'Student',
          labName: labNamesText,
          bookingDate: booking_date,
          startTime: start_time,
          endTime: end_time,
          purpose: purpose,
          requestId: result.insertId!,
          recipientName: req.faculty_name,
          recipientSalutation: req.faculty_salutation,
          recipientRole: 'faculty'
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
      message: isMultiLab ? "Multi-lab booking request submitted successfully" : "Booking request submitted successfully",
      id: bookingId,
      is_multi_lab: isMultiLab,
      lab_count: labsToBook.length
    })
  } catch (error) {
    console.error("Failed to create booking request:", error)
    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    )
  }
}