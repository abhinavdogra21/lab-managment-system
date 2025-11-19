/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const db = Database.getInstance()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Await params in Next.js 15
    const { id: paramId } = await params
    const id = Number(paramId)
    const body = await request.json()
    const { action, remarks } = body as { action: 'approve' | 'reject', remarks?: string }
    if (!id || !action) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // Ensure faculty owns this request and it's pending_faculty
    const reqRes = await db.query(`SELECT * FROM booking_requests WHERE id = ? AND faculty_supervisor_id = ? AND status = 'pending_faculty'`, [id, user.userId])
    const req = reqRes.rows?.[0]
    if (!req) return NextResponse.json({ error: 'Request not found or not actionable' }, { status: 404 })

    if (action === 'approve') {
      await db.query(
        `UPDATE booking_requests SET status = 'pending_lab_staff', faculty_remarks = ?, faculty_approved_by = ?, faculty_approved_at = NOW() WHERE id = ?`,
        [remarks || null, user.userId, id]
      )

      // Log the activity with enriched booking data
      const userInfo = await getUserInfoForLogging(user.userId)
      
      // Fetch complete booking details with all related names for the snapshot
      const enrichedBooking = await db.query(
        `SELECT 
          br.*,
          l.name as lab_name,
          u.name as requester_name,
          u.salutation as requester_salutation,
          u.email as requester_email,
          u.role as requester_role,
          fac.name as faculty_name,
          fac.salutation as faculty_salutation,
          fac.email as faculty_email,
          ls.name as lab_staff_name,
          ls.salutation as lab_staff_salutation,
          lc.name as lab_coordinator_name,
          lc.salutation as lab_coordinator_salutation,
          hod.name as hod_name,
          hod.salutation as hod_salutation,
          d.highest_approval_authority,
          br.faculty_approved_at,
          br.final_approver_role
        FROM booking_requests br
        JOIN labs l ON br.lab_id = l.id
        JOIN users u ON br.requested_by = u.id
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN users fac ON br.faculty_supervisor_id = fac.id
        LEFT JOIN users ls ON br.lab_staff_approved_by = ls.id
        LEFT JOIN users lc ON d.lab_coordinator_id = lc.id AND d.highest_approval_authority = 'lab_coordinator'
        LEFT JOIN users hod ON d.hod_id = hod.id AND d.highest_approval_authority = 'hod'
        WHERE br.id = ?`,
        [id]
      )
      
      if (enrichedBooking.rows.length > 0) {
        logLabBookingActivity({
          bookingId: id,
          labId: req.lab_id,
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: userInfo?.role || null,
          action: 'approved_by_faculty',
          actionDescription: `Approved booking request${remarks ? ': ' + remarks : ''}`,
          bookingSnapshot: enrichedBooking.rows[0],
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }

      // Send email notification to student and lab staff
      try {
        const details = await db.query(
          `SELECT u.name as student_name, u.email as student_email, u.salutation as student_salutation,
                  l.name as lab_name, l.id as lab_id,
                  br.booking_date, br.start_time, br.end_time, br.is_multi_lab, br.lab_ids
           FROM booking_requests br
           JOIN users u ON u.id = br.requested_by
           JOIN labs l ON l.id = br.lab_id
           WHERE br.id = ?`,
          [id]
        )

        if (details.rows.length > 0) {
          const booking = details.rows[0]
          
          // Handle multi-lab bookings - get all lab names
          let labNamesText = booking.lab_name
          let labIds = [booking.lab_id]
          
          if ((booking.is_multi_lab === 1 || booking.is_multi_lab === true) && booking.lab_ids) {
            try {
              // Parse lab_ids (handle Buffer/String/Array)
              if (Array.isArray(booking.lab_ids)) {
                labIds = booking.lab_ids
              } else if (Buffer.isBuffer(booking.lab_ids)) {
                labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
              } else if (typeof booking.lab_ids === 'string') {
                labIds = JSON.parse(booking.lab_ids)
              }
              
              // Get all lab names
              const labNamesResult = await db.query(
                `SELECT name FROM labs WHERE id IN (${labIds.map(() => '?').join(',')}) ORDER BY code`,
                labIds
              )
              labNamesText = labNamesResult.rows.map((l: any) => l.name).join(', ')
            } catch (e) {
              console.error('Error parsing multi-lab data for email:', e)
            }
          }
          
          // DO NOT email student when faculty approves - only email lab staff
          // Student will only be notified when final HOD approval is done

          // Email to lab staff of ALL selected labs (only head lab staff per lab)
          const labStaff = await db.query(
            `SELECT u.email, u.name, u.salutation, l.name as lab_name, l.id as lab_id
             FROM labs l
             JOIN users u ON l.staff_id = u.id
             WHERE u.role = 'lab_staff' AND l.id IN (${labIds.map(() => '?').join(',')})`,
            labIds
          )
          
          if (labStaff.rows.length > 0) {
            // Send to each lab's head staff member
            for (const staff of labStaff.rows) {
              const labStaffEmailData = emailTemplates.labBookingCreated({
                requesterName: booking.student_name,
                requesterRole: 'Student',
                labName: labNamesText, // Show all labs in multi-lab booking
                bookingDate: booking.booking_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                purpose: req.purpose || 'Not specified',
                requestId: id,
                recipientName: staff.name,
                recipientSalutation: staff.salutation
              })

              await sendEmail({
                to: [staff.email],
                ...labStaffEmailData
              }).catch(err => console.error('Lab staff email send failed:', err))
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send approval notification:', emailError)
      }

    } else if (action === 'reject') {
      await db.query(
        `UPDATE booking_requests SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW(), 
         faculty_remarks = ?, faculty_approved_by = ?, faculty_approved_at = NOW() WHERE id = ?`,
        [remarks || 'Rejected by faculty', user.userId, remarks || null, user.userId, id]
      )

      // Log the activity
      const userInfo = await getUserInfoForLogging(user.userId)
      const updatedBooking = await db.query('SELECT * FROM booking_requests WHERE id = ?', [id])
      if (updatedBooking.rows.length > 0) {
        logLabBookingActivity({
          bookingId: id,
          labId: req.lab_id,
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: userInfo?.role || null,
          action: 'rejected_by_faculty',
          actionDescription: `Rejected booking request: ${remarks || 'No reason provided'}`,
          bookingSnapshot: updatedBooking.rows[0],
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }

      // Send email notification to student
      try {
        const details = await db.query(
          `SELECT u.name as student_name, u.email as student_email, u.salutation as student_salutation,
                  l.name as lab_name,
                  br.booking_date, br.start_time, br.end_time, br.is_multi_lab, br.lab_ids,
                  f.name as faculty_name
           FROM booking_requests br
           JOIN users u ON u.id = br.requested_by
           JOIN labs l ON l.id = br.lab_id
           JOIN users f ON f.id = br.faculty_supervisor_id
           WHERE br.id = ?`,
          [id]
        )

        if (details.rows.length > 0) {
          const booking = details.rows[0]
          
          // Handle multi-lab bookings - get all lab names
          let labNamesText = booking.lab_name
          
          if ((booking.is_multi_lab === 1 || booking.is_multi_lab === true) && booking.lab_ids) {
            try {
              // Parse lab_ids
              let labIds: number[]
              if (Array.isArray(booking.lab_ids)) {
                labIds = booking.lab_ids
              } else if (Buffer.isBuffer(booking.lab_ids)) {
                labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
              } else if (typeof booking.lab_ids === 'string') {
                labIds = JSON.parse(booking.lab_ids)
              } else {
                labIds = []
              }
              
              if (labIds.length > 0) {
                // Get all lab names
                const labNamesResult = await db.query(
                  `SELECT name FROM labs WHERE id IN (${labIds.map(() => '?').join(',')}) ORDER BY code`,
                  labIds
                )
                labNamesText = labNamesResult.rows.map((l: any) => l.name).join(', ')
              }
            } catch (e) {
              console.error('Error parsing multi-lab data for rejection email:', e)
            }
          }
          
          const emailData = emailTemplates.labBookingRejected({
            requesterName: booking.student_name,
            requesterSalutation: booking.student_salutation,
            requesterRole: 'student',
            labName: labNamesText,
            bookingDate: booking.booking_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            requestId: id,
            reason: remarks || 'No reason provided',
            rejectedBy: booking.faculty_name
          })

          await sendEmail({
            to: booking.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      } catch (emailError) {
        console.error('Failed to send rejection notification:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to take action on request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
