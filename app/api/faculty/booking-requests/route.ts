/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const db = Database.getInstance()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
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
      // Check single-lab bookings
      const singleLabConflict = await db.query(
        `SELECT id FROM booking_requests 
         WHERE lab_id = ? AND booking_date = ? 
           AND is_multi_lab = 0
           AND status IN ('pending_faculty','pending_lab_staff','pending_hod','approved')
           AND (start_time < ? AND end_time > ?)`,
        [labId, booking_date, end_time, start_time]
      )
      
      // Check multi-lab bookings where this specific lab is NOT rejected
      const multiLabConflict = await db.query(
        `SELECT br.id 
         FROM booking_requests br
         JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id
         WHERE br.booking_date = ? 
           AND br.is_multi_lab = 1
           AND mla.lab_id = ?
           AND mla.status != 'rejected'
           AND mla.status != 'withdrawn'
           AND br.status IN ('pending_lab_staff','pending_hod','approved')
           AND (br.start_time < ? AND br.end_time > ?)`,
        [booking_date, labId, end_time, start_time]
      )
      
      if (singleLabConflict.rows.length > 0 || multiLabConflict.rows.length > 0) {
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

    // Insert request: faculty requests go directly to lab staff
    // For single-lab: store responsible person directly in booking_requests table
    // For multi-lab: leave those fields null and use multi_lab_responsible_persons table
    const singleLabResponsible = !isMultiLab && responsible_persons.length > 0 ? responsible_persons[0] : null
    
    const result = await db.query(
      `INSERT INTO booking_requests (request_type, requested_by, lab_id, faculty_supervisor_id, booking_date, start_time, end_time, purpose, status, is_multi_lab, lab_ids, responsible_person_name, responsible_person_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lab_booking',
        user.userId,
        isMultiLab ? labsToBook[0] : lab_id,
        user.userId,
        booking_date,
        start_time,
        end_time,
        purpose,
        'pending_lab_staff',
        isMultiLab ? 1 : 0,
        isMultiLab ? JSON.stringify(labsToBook) : null,
        singleLabResponsible ? singleLabResponsible.name.trim() : null,
        singleLabResponsible ? singleLabResponsible.email.trim().toLowerCase() : null
      ]
    )

    const bookingId = result.insertId

    // Store responsible persons in multi_lab_responsible_persons table (for multi-lab only)
    if (isMultiLab) {
      for (const rp of responsible_persons) {
        await db.query(`
          INSERT INTO multi_lab_responsible_persons (booking_request_id, lab_id, name, email)
          VALUES (?, ?, ?, ?)
        `, [bookingId, rp.lab_id, rp.name.trim(), rp.email.trim().toLowerCase()])
      }
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
        `SELECT u.name as faculty_name, u.salutation as faculty_salutation
         FROM users u
         WHERE u.id = ?`,
        [user.userId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        
        // Get head lab staff for ALL selected labs (only head staff per lab)
        // Also get the highest_approval_authority from departments
        const labStaff = await db.query(
          `SELECT u.email, u.name, u.salutation, l.name as lab_name, l.id as lab_id, d.highest_approval_authority
           FROM labs l
           JOIN users u ON l.staff_id = u.id
           JOIN departments d ON l.department_id = d.id
           WHERE u.role = 'lab_staff' AND l.id IN (${labIdsForEmail.map(() => '?').join(',')})`,
          labIdsForEmail
        )
        
        if (labStaff.rows.length > 0) {
          // For multi-lab bookings, use the highest authority across all labs
          // Priority: hod > lab_coordinator > null
          let highestAuthority: 'hod' | 'lab_coordinator' | null = null
          for (const staff of labStaff.rows) {
            const authority = staff.highest_approval_authority as 'hod' | 'lab_coordinator' | null
            if (authority === 'hod') {
              highestAuthority = 'hod'
              break // HOD is the highest, no need to check further
            }
            if (authority === 'lab_coordinator' && !highestAuthority) {
              highestAuthority = 'lab_coordinator'
            }
          }
          
          // Send to each lab's head staff member with all labs shown
          for (const staff of labStaff.rows) {
            const emailData = emailTemplates.labBookingCreated({
              requesterName: req.faculty_name,
              requesterSalutation: req.faculty_salutation,
              requesterRole: 'Faculty',
              labName: labNamesText, // Show all labs in multi-lab booking
              bookingDate: booking_date,
              startTime: start_time,
              endTime: end_time,
              purpose: purpose,
              requestId: result.insertId!,
              recipientName: staff.name,
              recipientSalutation: staff.salutation,
              highestApprovalAuthority: highestAuthority,
              recipientRole: 'lab_staff'
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
    const createdBooking = await db.query('SELECT * FROM booking_requests WHERE id = ?', [bookingId])
    
    if (createdBooking.rows.length > 0) {
      const labIdsToLog = isMultiLab ? labsToBook : [lab_id]
      
      // Create separate log entry for each lab in multi-lab booking
      for (const labId of labIdsToLog) {
        logLabBookingActivity({
          bookingId: Number(bookingId),
          labId: Number(labId),
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: userInfo?.role || null,
          action: "created",
          actionDescription: `Faculty booking created for lab ${labId}`,
          bookingSnapshot: createdBooking.rows[0],
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        }).catch(err => console.error(`Activity logging failed for lab ${labId}:`, err))
      }
    }

    return NextResponse.json({ success: true, message: "Booking request submitted", id: result.insertId })
  } catch (error) {
    console.error("Faculty booking create error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      console.log('DELETE: Authorization failed')
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("id")
    console.log('DELETE: Booking ID:', bookingId)

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Get booking details with requester info
    const bookingResult = await db.query(
      `SELECT br.*, 
              u.name as requester_name, 
              u.email as requester_email,
              u.salutation as requester_salutation,
              faculty.name as faculty_name,
              faculty.email as faculty_email
       FROM booking_requests br
       JOIN users u ON br.requested_by = u.id
       LEFT JOIN users faculty ON br.faculty_supervisor_id = faculty.id
       WHERE br.id = ?`,
      [bookingId]
    )

    if (bookingResult.rows.length === 0) {
      console.log('DELETE: Booking not found')
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingResult.rows[0]
    console.log('DELETE: Booking status:', booking.status, 'Requester:', booking.requested_by, 'User:', user.userId)

    // Only the requester can withdraw their booking
    if (Number(booking.requested_by) !== Number(user.userId)) {
      console.log('DELETE: User not authorized to withdraw this booking')
      return NextResponse.json({ error: "You can only withdraw your own bookings" }, { status: 403 })
    }

    // Check if booking can be withdrawn
    if (booking.status === "rejected") {
      return NextResponse.json({ error: "Cannot withdraw a rejected booking" }, { status: 400 })
    }

    if (booking.status === "withdrawn") {
      return NextResponse.json({ error: "Booking already withdrawn" }, { status: 400 })
    }

    console.log('DELETE: Updating booking to withdrawn status')
    
    // For multi-lab bookings, withdraw all remaining active labs
    if (booking.is_multi_lab) {
      // Withdraw all labs that are not already withdrawn/rejected
      await db.query(
        `UPDATE multi_lab_approvals 
         SET status = 'withdrawn' 
         WHERE booking_request_id = ? 
         AND status NOT IN ('withdrawn', 'rejected')`,
        [bookingId]
      )
      
      // Check if all labs are now withdrawn/rejected
      const statusCheck = await db.query(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn_count,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
         FROM multi_lab_approvals 
         WHERE booking_request_id = ?`,
        [bookingId]
      )
      
      const stats = statusCheck.rows[0]
      const inactiveLabs = stats.withdrawn_count + stats.rejected_count
      
      // Only mark entire booking as withdrawn if ALL labs are withdrawn/rejected
      if (inactiveLabs >= stats.total) {
        await db.query(
          `UPDATE booking_requests SET status = 'withdrawn', withdrawn_at = NOW() WHERE id = ?`,
          [bookingId]
        )
      }
    } else {
      // Single lab booking - just mark as withdrawn
      await db.query(
        `UPDATE booking_requests SET status = 'withdrawn', withdrawn_at = NOW() WHERE id = ?`,
        [bookingId]
      )
    }

    // Determine who should receive withdrawal notification emails
    const emailRecipients = []
    const emailsSent = new Set() // Track emails to avoid duplicates

    // Always notify the requester
    emailRecipients.push({
      email: booking.requester_email,
      name: booking.requester_name,
      salutation: booking.requester_salutation,
      role: "Requester",
      isRequester: true
    })
    emailsSent.add(booking.requester_email)

    // For multi-lab bookings, get all lab names
    let labNames = ""
    if (booking.is_multi_lab) {
      let labIds: number[] = []
      if (Buffer.isBuffer(booking.lab_ids)) {
        labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
      } else if (typeof booking.lab_ids === 'string') {
        labIds = JSON.parse(booking.lab_ids)
      } else if (Array.isArray(booking.lab_ids)) {
        labIds = booking.lab_ids
      }
      
      if (labIds.length > 0) {
        const labResults = await db.query(
          `SELECT name FROM labs WHERE id IN (${labIds.map(() => "?").join(",")})`,
          labIds
        )
        labNames = labResults.rows.map((lab: any) => lab.name).join(", ")
      }
    } else {
      const labResult = await db.query("SELECT name FROM labs WHERE id = ?", [booking.lab_id])
      labNames = labResult.rows[0]?.name || "Unknown Lab"
    }

    // DON'T notify faculty if status is pending_lab_staff (faculty hasn't seen it yet)
    // Only notify faculty if they have already approved (status is pending_hod or approved)
    if ((booking.status === "pending_hod" || booking.status === "approved") && booking.faculty_email && !emailsSent.has(booking.faculty_email)) {
      // Get faculty salutation
      const facultyResult = await db.query(
        `SELECT salutation FROM users WHERE email = ?`,
        [booking.faculty_email]
      )
      const facultySalutation = facultyResult.rows[0]?.salutation || null
      
      emailRecipients.push({
        email: booking.faculty_email,
        name: booking.faculty_name,
        salutation: facultySalutation,
        role: "Faculty Approver",
        isRequester: false
      })
      emailsSent.add(booking.faculty_email)
    }

    // Notify lab staff if the request was in their queue (pending_lab_staff, pending_hod, or approved)
    if (["pending_lab_staff", "pending_hod", "approved"].includes(booking.status)) {
      if (booking.is_multi_lab) {
        // For multi-lab bookings, notify HEAD lab staff for each lab
        let labIds: number[] = []
        if (Buffer.isBuffer(booking.lab_ids)) {
          labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
        } else if (typeof booking.lab_ids === 'string') {
          labIds = JSON.parse(booking.lab_ids)
        } else if (Array.isArray(booking.lab_ids)) {
          labIds = booking.lab_ids
        }
        
        for (const labId of labIds) {
          // Get only the primary/head lab staff from labs table
          const primaryStaffResult = await db.query(
            `SELECT u.email, u.name, u.salutation, l.name as lab_name
             FROM labs l
             JOIN users u ON l.staff_id = u.id
             WHERE l.id = ?`,
            [labId]
          )
          
          for (const staff of primaryStaffResult.rows) {
            if (!emailsSent.has(staff.email)) {
              emailsSent.add(staff.email)
              emailRecipients.push({
                email: staff.email,
                name: staff.name,
                salutation: staff.salutation,
                role: `Lab Staff (${staff.lab_name})`,
                isRequester: false
              })
            }
          }
        }
      } else {
        // For single lab bookings, notify only HEAD lab staff
        const primaryStaffResult = await db.query(
          `SELECT u.email, u.name, u.salutation, l.name as lab_name
           FROM labs l
           JOIN users u ON l.staff_id = u.id
           WHERE l.id = ?`,
          [booking.lab_id]
        )
        
        for (const staff of primaryStaffResult.rows) {
          if (!emailsSent.has(staff.email)) {
            emailsSent.add(staff.email)
            emailRecipients.push({
              email: staff.email,
              name: staff.name,
              salutation: staff.salutation,
              role: `Lab Staff (${staff.lab_name})`,
              isRequester: false
            })
          }
        }
      }
    }

    // Notify HOD/Lab Coordinator if they have already approved (status is approved)
    if (booking.status === "approved" && booking.hod_approved_by) {
      const hodResult = await db.query(
        `SELECT u.email, u.name, u.salutation, u.role 
         FROM users u 
         WHERE u.id = ?`,
        [booking.hod_approved_by]
      )
      
      if (hodResult.rows.length > 0 && !emailsSent.has(hodResult.rows[0].email)) {
        const hod = hodResult.rows[0]
        emailsSent.add(hod.email)
        emailRecipients.push({
          email: hod.email,
          name: hod.name,
          salutation: hod.salutation,
          role: hod.role === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD',
          isRequester: false
        })
      }
    }

    // Send withdrawal notification emails
    for (const recipient of emailRecipients) {
      const formatName = (name: string, salutation: string | null | undefined) => {
        if (!salutation || salutation === 'none') return name
        const salutationMap: Record<string, string> = {
          'prof': 'Prof.',
          'dr': 'Dr.',
          'mr': 'Mr.',
          'mrs': 'Mrs.'
        }
        return `${salutationMap[salutation] || ''} ${name}`.trim()
      }
      
      const salutation = recipient.name
        ? `Dear ${formatName(recipient.name, recipient.salutation)},`
        : `Dear ${recipient.role},`

      const mainMessage = recipient.isRequester
        ? `<p>Your lab booking request has been <strong>successfully withdrawn</strong>.</p>`
        : `<p>A lab booking request has been <strong>withdrawn</strong> by the requester.</p>`

      const footerMessage = recipient.isRequester
        ? `<p>Your booking has been cancelled. If you need to book the lab again, please submit a new request.</p>`
        : `<p>This booking request has been withdrawn and no further action is required from you.</p>`

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Lab Booking Request Withdrawn</h2>
            </div>
            <div class="content">
              <p>${salutation}</p>
              ${mainMessage}
              
              <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Lab(s):</strong> ${labNames}</p>
                <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>Purpose:</strong> ${booking.purpose}</p>
                <p><strong>Requester:</strong> ${booking.requester_name} (${booking.requester_email})</p>
              </div>

              ${footerMessage}
            </div>
            <div class="footer">
              <p>Lab Management System - The LNM Institute of Information Technology, Jaipur</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: recipient.email,
        subject: "Lab Booking Request Withdrawn",
        html: emailHtml
      }).catch(err => console.error(`Failed to send withdrawal email to ${recipient.email}:`, err))
    }

    // Log the withdrawal activity
    const userInfo = await getUserInfoForLogging(user.userId)
    let labIdsToLog: number[] = []
    if (booking.is_multi_lab) {
      if (Buffer.isBuffer(booking.lab_ids)) {
        labIdsToLog = JSON.parse(booking.lab_ids.toString('utf-8'))
      } else if (typeof booking.lab_ids === 'string') {
        labIdsToLog = JSON.parse(booking.lab_ids)
      } else if (Array.isArray(booking.lab_ids)) {
        labIdsToLog = booking.lab_ids
      }
    } else {
      labIdsToLog = [booking.lab_id]
    }
    
    for (const labId of labIdsToLog) {
      logLabBookingActivity({
        bookingId: Number(bookingId),
        labId: Number(labId),
        actorUserId: userInfo?.userId || null,
        actorName: userInfo?.name || null,
        actorEmail: userInfo?.email || null,
        actorRole: userInfo?.role || null,
        action: "withdrawn",
        actionDescription: `Booking withdrawn by faculty requester`,
        bookingSnapshot: booking,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      }).catch(err => console.error(`Activity logging failed for lab ${labId}:`, err))
    }

    return NextResponse.json({ 
      success: true, 
      message: "Booking request withdrawn successfully" 
    })
  } catch (error) {
    console.error("Faculty booking withdrawal error:", error)
    return NextResponse.json({ error: "Failed to withdraw booking" }, { status: 500 })
  }
}
