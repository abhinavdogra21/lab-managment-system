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
    const { lab_id, lab_ids, is_multi_lab, booking_date, start_time, end_time, purpose, responsible_persons } = body || {}
    
    const isMultiLab = is_multi_lab === true || (lab_ids && lab_ids.length > 1)
    const labsToBook = isMultiLab ? lab_ids : [lab_id]

    if (!labsToBook || labsToBook.length === 0 || !booking_date || !start_time || !end_time || !purpose || !responsible_persons || responsible_persons.length === 0) {
      return NextResponse.json({ error: "All fields are required including person responsible details" }, { status: 400 })
    }

    // Validate all responsible persons
    for (const rp of responsible_persons) {
      if (!rp.name || !rp.email) {
        return NextResponse.json({ error: "Each lab must have a responsible person with name and email" }, { status: 400 })
      }
      if (!rp.email.toLowerCase().endsWith('@lnmiit.ac.in')) {
        return NextResponse.json({ error: "All responsible person emails must end with @lnmiit.ac.in" }, { status: 400 })
      }
    }

    // Check conflicts in ALL labs
    for (const labId of labsToBook) {
      const conflict = await db.query(
        `SELECT id FROM booking_requests 
         WHERE lab_id = ? AND booking_date = ? 
           AND status IN ('pending_faculty','pending_lab_staff','pending_hod','approved')
           AND (start_time < ? AND end_time > ?)`,
        [labId, booking_date, end_time, start_time]
      )
      if (conflict.rows.length > 0) {
        const labResult = await db.query('SELECT name FROM labs WHERE id = ?', [labId])
        const labName = labResult.rows[0]?.name || `Lab ${labId}`
        return NextResponse.json({ error: `${labName} is already booked for this time slot` }, { status: 400 })
      }

      const dayOfWeek = new Date(booking_date).getDay()
      const timetable = await db.query(
        `SELECT id FROM timetable_entries 
         WHERE lab_id = ? AND day_of_week = ? AND is_active = true
           AND (time_slot_start < ? AND time_slot_end > ?)`,
        [labId, dayOfWeek, end_time, start_time]
      )
      if (timetable.rows.length > 0) {
        const labResult = await db.query('SELECT name FROM labs WHERE id = ?', [labId])
        const labName = labResult.rows[0]?.name || `Lab ${labId}`
        return NextResponse.json({ error: `${labName} has scheduled classes during this time` }, { status: 400 })
      }
    }

    // Insert request: Others requests go directly to lab staff
    const result = await db.query(
      `INSERT INTO booking_requests (request_type, requested_by, lab_id, faculty_supervisor_id, booking_date, start_time, end_time, purpose, status, is_multi_lab, lab_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lab_booking',
        user.userId,
        isMultiLab ? labsToBook[0] : lab_id,
        user.userId, // Others acts as own supervisor context
        booking_date,
        start_time,
        end_time,
        purpose,
        'pending_lab_staff',
        isMultiLab ? 1 : 0,
        isMultiLab ? JSON.stringify(labsToBook) : null
      ]
    )

    const bookingId = result.insertId

    // Store responsible persons for each lab in separate table
    for (const rp of responsible_persons) {
      await db.query(`
        INSERT INTO multi_lab_responsible_persons (booking_request_id, lab_id, name, email)
        VALUES (?, ?, ?, ?)
      `, [bookingId, rp.lab_id, rp.name.trim(), rp.email.trim().toLowerCase()])
    }

    // Create multi-lab approval entries
    if (isMultiLab) {
      for (const labId of labsToBook) {
        await db.query(`
          INSERT INTO multi_lab_approvals (booking_request_id, lab_id, status)
          VALUES (?, ?, ?)
        `, [bookingId, labId, 'pending'])
      }
    }

    // Send email notification to lab staff
    try {
      // Get lab names - handle multi-lab
      let labNamesText = ''
      let labIdsForEmail = isMultiLab ? labsToBook : [lab_id]
      
      const labNamesResult = await db.query(
        `SELECT name FROM labs WHERE id IN (${labIdsForEmail.map(() => '?').join(',')}) ORDER BY code`,
        labIdsForEmail
      )
      labNamesText = labNamesResult.rows.map((l: any) => l.name).join(', ')
      
      const details = await db.query(
        `SELECT u.name as requester_name, u.salutation as requester_salutation
         FROM users u
         WHERE u.id = ?`,
        [user.userId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        
        // Format requester name with salutation
        let formattedRequesterName = req.requester_name
        if (req.requester_salutation && req.requester_salutation !== 'none') {
          const salutationMap: Record<string, string> = {
            'prof': 'Prof.',
            'dr': 'Dr.',
            'mr': 'Mr.',
            'mrs': 'Mrs.'
          }
          const salutation = salutationMap[req.requester_salutation.toLowerCase()] || ''
          formattedRequesterName = salutation ? `${salutation} ${req.requester_name}` : req.requester_name
        }
        
        // Get lab staff email, name, and salutation for ALL selected labs (only head staff per lab)
        const labStaff = await db.query(
          `SELECT u.email, u.name, u.salutation, l.name as lab_name, l.id as lab_id
           FROM labs l
           JOIN users u ON l.staff_id = u.id
           WHERE u.role = 'lab_staff' AND l.id IN (${labIdsForEmail.map(() => '?').join(',')})`,
          labIdsForEmail
        )
        
        if (labStaff.rows.length > 0) {
          // Send to each lab's head staff member
          for (const staff of labStaff.rows) {
            const emailData = emailTemplates.labBookingCreated({
              requesterName: formattedRequesterName,
              requesterRole: 'Others',
              labName: labNamesText, // Show all labs in multi-lab booking
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

    // Log the activity for each lab
    const userInfo = await getUserInfoForLogging(user.userId)
    const createdBooking = await db.query('SELECT * FROM booking_requests WHERE id = ?', [result.insertId])
    
    if (createdBooking.rows.length > 0) {
      const labIdsToLog = isMultiLab ? labsToBook : [lab_id]
      
      // Create separate log entry for each lab in multi-lab booking
      for (const labId of labIdsToLog) {
        logLabBookingActivity({
          bookingId: Number(result.insertId),
          labId: Number(labId),
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: userInfo?.role || null,
          action: "created",
          actionDescription: `Others booking created for lab ${labId}`,
          bookingSnapshot: createdBooking.rows[0],
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        }).catch(err => console.error(`Activity logging failed for lab ${labId}:`, err))
      }
    }

    return NextResponse.json({ success: true, message: "Booking request submitted", id: result.insertId })
  } catch (error) {
    console.error("Others booking create error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
