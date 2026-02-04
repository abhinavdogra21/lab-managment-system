/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

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
        l.department_id,
        d.highest_approval_authority,
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
      LEFT JOIN departments d ON l.department_id = d.id
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
      // Check for conflicts with existing single-lab bookings
      const singleLabConflict = await db.query(`
        SELECT id FROM booking_requests 
        WHERE lab_id = ? 
        AND booking_date = ? 
        AND is_multi_lab = 0
        AND status IN ('pending_faculty', 'pending_lab_staff', 'pending_hod', 'approved')
        AND (start_time < ? AND end_time > ?)
      `, [labId, booking_date, end_time, start_time])

      // Check for conflicts with multi-lab bookings where this lab is NOT rejected
      const multiLabConflict = await db.query(`
        SELECT br.id 
        FROM booking_requests br
        JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id
        WHERE br.booking_date = ? 
        AND br.is_multi_lab = 1
        AND mla.lab_id = ?
        AND mla.status != 'rejected'
        AND mla.status != 'withdrawn'
        AND br.status IN ('pending_lab_staff','pending_hod','approved')
        AND (br.start_time < ? AND br.end_time > ?)
      `, [booking_date, labId, end_time, start_time])

      if (singleLabConflict.rows.length > 0 || multiLabConflict.rows.length > 0) {
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
    // For single-lab: store responsible person directly in booking_requests table
    // For multi-lab: leave those fields null and use multi_lab_responsible_persons table
    const singleLabResponsible = !isMultiLab && responsible_persons.length > 0 ? responsible_persons[0] : null
    
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
        lab_ids,
        responsible_person_name,
        responsible_person_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      isMultiLab ? JSON.stringify(labsToBook) : null,
      singleLabResponsible ? singleLabResponsible.name.trim() : null,
      singleLabResponsible ? singleLabResponsible.email.trim().toLowerCase() : null
    ])

    const bookingId = result.insertId

    // Store responsible persons in multi_lab_responsible_persons table (for multi-lab only)
    if (isMultiLab) {
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

// DELETE - Withdraw a booking request
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestId = searchParams.get('id')
    
    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    // Get booking request details
    const bookingResult = await db.query(`
      SELECT 
        br.*,
        l.name as lab_name,
        l.department_id,
        d.highest_approval_authority,
        requester.name as requester_name,
        requester.email as requester_email,
        requester.salutation as requester_salutation,
        requester.role as requester_role,
        faculty.name as faculty_name,
        faculty.email as faculty_email,
        faculty.salutation as faculty_salutation
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users requester ON br.requested_by = requester.id
      LEFT JOIN users faculty ON br.faculty_supervisor_id = faculty.id
      WHERE br.id = ?
    `, [requestId])

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 })
    }

    const booking = bookingResult.rows[0]

    // Check authorization - only requester can withdraw
    if (Number(booking.requested_by) !== Number(user.userId)) {
      return NextResponse.json({ error: "You can only withdraw your own requests" }, { status: 403 })
    }

    // Check if request can be withdrawn (not already rejected or withdrawn)
    if (booking.status === 'rejected' || booking.status === 'withdrawn') {
      return NextResponse.json({ 
        error: `Cannot withdraw a request that is ${booking.status}` 
      }, { status: 400 })
    }

    // For multi-lab bookings, withdraw all remaining active labs
    if (booking.is_multi_lab) {
      // Withdraw all labs that are not already withdrawn/rejected
      await db.query(
        `UPDATE multi_lab_approvals 
         SET status = 'withdrawn' 
         WHERE booking_request_id = ? 
         AND status NOT IN ('withdrawn', 'rejected')`,
        [requestId]
      )
      
      // Check if all labs are now withdrawn/rejected
      const statusCheck = await db.query(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn_count,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
         FROM multi_lab_approvals 
         WHERE booking_request_id = ?`,
        [requestId]
      )
      
      const stats = statusCheck.rows[0]
      const inactiveLabs = stats.withdrawn_count + stats.rejected_count
      
      // Only mark entire booking as withdrawn if ALL labs are withdrawn/rejected
      if (inactiveLabs >= stats.total) {
        await db.query(
          `UPDATE booking_requests SET status = 'withdrawn', withdrawn_at = NOW() WHERE id = ?`,
          [requestId]
        )
      }
    } else {
      // Single lab booking - just mark as withdrawn
      await db.query(`
        UPDATE booking_requests 
        SET status = 'withdrawn', 
            withdrawn_at = NOW()
        WHERE id = ?
      `, [requestId])
    }

    // Determine who to notify based on current status
    const emailRecipients: Array<{email: string, name: string, salutation?: string, role: string}> = []
    
    // Always notify the requester
    emailRecipients.push({
      email: booking.requester_email,
      name: booking.requester_name,
      salutation: booking.requester_salutation,
      role: booking.requester_role
    })

    // If faculty has seen it (status != pending_faculty), notify faculty
    if (booking.status !== 'pending_faculty' && booking.faculty_email) {
      emailRecipients.push({
        email: booking.faculty_email,
        name: booking.faculty_name,
        salutation: booking.faculty_salutation,
        role: 'faculty'
      })
    }

    // Use Set to track emails and prevent duplicates
    const emailsSent = new Set<string>()
    emailsSent.add(booking.requester_email) // Already added requester above

    // If lab staff has seen it (status = pending_lab_staff, pending_hod, or approved), notify lab staff
    if (['pending_lab_staff', 'pending_hod', 'approved'].includes(booking.status)) {
      // For multi-lab bookings, get head lab staff for each lab
      if (booking.is_multi_lab && booking.lab_ids) {
        let labIds: number[] = []
        if (Buffer.isBuffer(booking.lab_ids)) {
          labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
        } else if (typeof booking.lab_ids === 'string') {
          labIds = JSON.parse(booking.lab_ids)
        } else if (Array.isArray(booking.lab_ids)) {
          labIds = booking.lab_ids
        }

        // Only get head lab staff from labs.staff_id (not assistants from lab_staff_assignments)
        for (const labId of labIds) {
          const primaryStaffResult = await db.query(`
            SELECT u.email, u.name, u.salutation, l.name as lab_name
            FROM labs l
            JOIN users u ON l.staff_id = u.id
            WHERE l.id = ?
          `, [labId])

          if (primaryStaffResult.rows.length > 0) {
            const staff = primaryStaffResult.rows[0]
            if (!emailsSent.has(staff.email)) {
              emailsSent.add(staff.email)
              emailRecipients.push({
                email: staff.email,
                name: staff.name,
                salutation: staff.salutation,
                role: 'lab_staff'
              })
            }
          }
        }
      } else {
        // For single-lab booking, get head lab staff only
        const labStaffResult = await db.query(`
          SELECT u.email, u.name, u.salutation
          FROM labs l
          JOIN users u ON l.staff_id = u.id
          WHERE l.id = ?
        `, [booking.lab_id])

        if (labStaffResult.rows.length > 0) {
          const staff = labStaffResult.rows[0]
          if (!emailsSent.has(staff.email)) {
            emailsSent.add(staff.email)
            emailRecipients.push({
              email: staff.email,
              name: staff.name,
              salutation: staff.salutation,
              role: 'lab_staff'
            })
          }
        }
      }
    }

    // Notify HOD/Lab Coordinator if status is pending_hod or approved (they've already seen/approved it)
    if (['pending_hod', 'approved'].includes(booking.status)) {
      // Get the HOD or Lab Coordinator who approved (if approved) or is pending
      if (booking.hod_approved_by) {
        // Already approved - notify the approver
        const approverResult = await db.query(`
          SELECT u.email, u.name, u.salutation, u.role
          FROM users u
          WHERE u.id = ?
        `, [booking.hod_approved_by])
        
        if (approverResult.rows.length > 0) {
          const approver = approverResult.rows[0]
          if (!emailsSent.has(approver.email)) {
            emailsSent.add(approver.email)
            emailRecipients.push({
              email: approver.email,
              name: approver.name,
              salutation: approver.salutation,
              role: approver.role === 'lab_coordinator' ? 'lab_coordinator' : 'hod'
            })
          }
        }
      } else {
        // Still pending - notify the assigned HOD/Lab Coordinator
        const departmentResult = await db.query(`
          SELECT d.hod_id, d.lab_coordinator_id, d.highest_approval_authority
          FROM booking_requests br
          JOIN labs l ON br.lab_id = l.id
          JOIN departments d ON l.department_id = d.id
          WHERE br.id = ?
        `, [requestId])
        
        if (departmentResult.rows.length > 0) {
          const dept = departmentResult.rows[0]
          const approverId = dept.highest_approval_authority === 'lab_coordinator' 
            ? dept.lab_coordinator_id 
            : dept.hod_id
          
          if (approverId) {
            const approverResult = await db.query(`
              SELECT u.email, u.name, u.salutation, u.role
              FROM users u
              WHERE u.id = ?
            `, [approverId])
            
            if (approverResult.rows.length > 0) {
              const approver = approverResult.rows[0]
              if (!emailsSent.has(approver.email)) {
                emailsSent.add(approver.email)
                emailRecipients.push({
                  email: approver.email,
                  name: approver.name,
                  salutation: approver.salutation,
                  role: approver.role === 'lab_coordinator' ? 'lab_coordinator' : 'hod'
                })
              }
            }
          }
        }
      }
    }

    // Get lab names for email
    let labNamesText = booking.lab_name
    if (booking.is_multi_lab && booking.lab_ids) {
      let labIds: number[] = []
      if (Buffer.isBuffer(booking.lab_ids)) {
        labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
      } else if (typeof booking.lab_ids === 'string') {
        labIds = JSON.parse(booking.lab_ids)
      } else if (Array.isArray(booking.lab_ids)) {
        labIds = booking.lab_ids
      }

      if (labIds.length > 0) {
        const labNamesResult = await db.query(
          `SELECT name FROM labs WHERE id IN (${labIds.map(() => '?').join(',')})`,
          labIds
        )
        labNamesText = labNamesResult.rows.map((l: any) => l.name).join(', ')
      }
    }

    // Send withdrawal emails to all concerned parties
    for (const recipient of emailRecipients) {
      try {
        const emailHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Lab Booking Request Withdrawn</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
  </head>
  <body style="margin:0; padding:0; background:#eee; font-family: 'Roboto', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee; padding:40px; margin:0 auto;">
      <tbody>
        <tr>
          <td>
            <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background:#fff; max-width:550px; border:1px solid #ccc; margin:0 auto; border-radius:10px; overflow:hidden">
              <tbody style="border: solid 1px #034da2;">
                <tr style="background: #034da2;">
                  <td style="text-align:center; padding:20px;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Lab Booking Request Withdrawn</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px; text-align:left; font-size:14px;">
                    <p>Dear ${recipient.salutation && recipient.salutation !== 'none' ? 
                      ({'prof': 'Prof.', 'dr': 'Dr.', 'mr': 'Mr.', 'mrs': 'Mrs.'}[recipient.salutation] || '') + ' ' : ''}${recipient.name},</p>
                    <p><strong>${booking.requester_name}</strong> has withdrawn their lab booking request.</p>
                    <p><strong>Booking Details:</strong></p>
                    <ul style="color:#555;">
                      <li><strong>Lab(s):</strong> ${labNamesText}</li>
                      <li><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-IN', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}</li>
                      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
                      <li><strong>Purpose:</strong> ${booking.purpose}</li>
                    </ul>
                    <p style="color:#d97706; font-weight:600;">This request has been withdrawn and no further action is required.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px; padding-top:0; text-align:left; font-size:14px;">
                    <p>Best regards,</p>
                    <p><strong>Lab Management Team</strong><br/>
                    <strong>The LNM Institute of Information Technology</strong></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`

        await sendEmail({
          to: [recipient.email],
          subject: `Lab Booking Request Withdrawn - ${labNamesText}`,
          html: emailHtml
        }).catch(err => console.error(`Failed to send withdrawal email to ${recipient.email}:`, err))
      } catch (emailError) {
        console.error(`Email error for ${recipient.email}:`, emailError)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Booking request withdrawn successfully",
      notified: emailRecipients.length
    })
  } catch (error) {
    console.error("Failed to withdraw booking request:", error)
    return NextResponse.json(
      { error: "Failed to withdraw booking request" },
      { status: 500 }
    )
  }
}