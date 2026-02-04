/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "lab_coordinator", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requestId = parseInt((await params).id)
    const { action, remarks } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (action === 'reject' && (!remarks || remarks.trim() === '')) {
      return NextResponse.json({ error: "Remarks are required for rejection" }, { status: 400 })
    }

    const db = Database.getInstance()

    // For non-admin users, get their department(s)
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      if (user.role === 'lab_coordinator') {
        // Lab Coordinator: get departments where they are assigned
        const depRes = await db.query(
          `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
          [Number(user.userId)]
        )
        departmentIds = depRes.rows.map((d: any) => Number(d.id))
        
        if (departmentIds.length === 0) {
          return NextResponse.json({ error: "No department found for this Lab Coordinator" }, { status: 403 })
        }
      } else {
        // HOD: get departments by hod_id or hod_email
        const depRes = await db.query(
          `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
          [Number(user.userId), String(user.email || '')]
        )
        departmentIds = depRes.rows.map((d: any) => Number(d.id))
        
        if (departmentIds.length === 0) {
          return NextResponse.json({ error: "No department found for this HOD" }, { status: 403 })
        }
      }
    }

    // First, verify the request exists and is in the correct state
    let checkQuery = `
      SELECT br.*, l.department_id, d.name as dept_name, d.highest_approval_authority, 
             d.hod_id, d.hod_email, d.lab_coordinator_id
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE br.id = ?
    `
    
    const checkParams: any[] = [requestId]
    
    // Add department filter for non-admin users
    if (user.role !== 'admin') {
      checkQuery += ` AND d.id IN (${departmentIds.map(() => '?').join(',')})`
      checkParams.push(...departmentIds)
    }
    
    const checkResult = await db.query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found or not in your department" }, { status: 404 })
    }

    const booking = checkResult.rows[0]
    
    // CRITICAL: Verify user has permission to approve/reject based on highest_approval_authority
    if (user.role !== 'admin') {
      const isLabCoordinator = user.role === 'lab_coordinator' || Number(booking.lab_coordinator_id) === Number(user.userId)
      
      if (booking.highest_approval_authority === 'lab_coordinator') {
        // Lab Coordinator authority - only Lab Coordinator can approve
        if (!isLabCoordinator) {
          return NextResponse.json({ 
            error: "Only the Lab Coordinator can approve this request." 
          }, { status: 403 })
        }
      } else {
        // HOD authority - only HOD can approve
        // Check both hod_id and hod_email (in case of duplicate accounts)
        const isHOD = Number(booking.hod_id) === Number(user.userId) || 
                      (booking.hod_email && String(booking.hod_email).toLowerCase() === String(user.email || '').toLowerCase())
        if (!isHOD && !isLabCoordinator) {
          return NextResponse.json({ 
            error: "Only the HOD can approve this request." 
          }, { status: 403 })
        }
      }
    }
    
    // For multi-lab bookings, also check if there are any labs pending HOD approval
    const isMultiLab = booking.is_multi_lab === 1 || booking.is_multi_lab === true
    
    if (booking.status !== 'pending_hod') {
      // For multi-lab, check if there are actually any labs pending approval
      if (isMultiLab) {
        const pendingCheck = await db.query(
          `SELECT COUNT(*) as pending_count 
           FROM multi_lab_approvals 
           WHERE booking_request_id = ? AND status = 'approved_by_lab_staff'`,
          [requestId]
        )
        
        if (Number(pendingCheck.rows[0].pending_count) === 0) {
          return NextResponse.json({ error: "Request is not pending HOD approval" }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: "Request is not pending HOD approval" }, { status: 400 })
      }
    }

    // For multi-lab bookings, verify at least one lab has been approved by lab staff
    // HOD can only approve the labs that lab staff approved (rejected labs stay rejected)
    
    if (isMultiLab) {
      const allApprovals = await db.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved,
               SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn
        FROM multi_lab_approvals
        WHERE booking_request_id = ?
      `, [requestId])
      
      const total = Number(allApprovals.rows[0].total)
      const approved = Number(allApprovals.rows[0].approved || 0)
      const withdrawn = Number(allApprovals.rows[0].withdrawn || 0)
      const activeLabs = total - withdrawn
      
      if (approved === 0) {
        return NextResponse.json({ 
          error: `Cannot approve: No labs have been approved by Lab Staff (all rejected or withdrawn)` 
        }, { status: 400 })
      }
      
      // Note: HOD will approve only the labs that were approved by lab staff
      // Rejected labs remain rejected
    }

    // Update the booking status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    // Determine who is approving: lab_coordinator or hod
    const isLabCoordinator = user.role === 'lab_coordinator' || Number(booking.lab_coordinator_id) === Number(user.userId)
    const approverRole = (isLabCoordinator && booking.highest_approval_authority === 'lab_coordinator') 
      ? 'lab_coordinator' 
      : 'hod'
    
    let updateQuery: string
    let updateParams: any[]
    
    if (action === 'approve') {
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?, final_approver_role = ?
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, approverRole, requestId]
      
      // For multi-lab bookings, only approve labs that were approved by lab staff
      // Rejected labs remain rejected - explicitly exclude them for safety
      if (isMultiLab) {
        await db.query(`
          UPDATE multi_lab_approvals
          SET status = 'approved',
              hod_approved_by = ?,
              hod_approved_at = NOW()
          WHERE booking_request_id = ?
            AND status = 'approved_by_lab_staff'
            AND status != 'rejected'
            AND status != 'withdrawn'
        `, [user.userId, requestId])
      }
    } else {
      // For rejection, also set rejected_by and rejected_at
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?,
            rejected_by = ?, rejected_at = NOW(), rejection_reason = ?, final_approver_role = ?
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, user.userId, remarks || 'Rejected by HOD', approverRole, requestId]
      
      // For multi-lab bookings, reject only the labs that were approved by lab staff
      // Already rejected labs remain as-is - explicitly exclude them for safety
      if (isMultiLab) {
        await db.query(`
          UPDATE multi_lab_approvals
          SET status = 'rejected',
              hod_approved_by = ?,
              hod_approved_at = NOW()
          WHERE booking_request_id = ?
            AND status = 'approved_by_lab_staff'
            AND status != 'rejected'
            AND status != 'withdrawn'
        `, [user.userId, requestId])
      }
    }
    
    await db.query(updateQuery, updateParams)

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    
    // For multi-lab bookings, create separate log entries for each lab
    if (isMultiLab && booking.lab_ids) {
      // Parse lab_ids
      let labIds: number[] = []
      if (Array.isArray(booking.lab_ids)) {
        labIds = booking.lab_ids
      } else if (Buffer.isBuffer(booking.lab_ids)) {
        labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
      } else if (typeof booking.lab_ids === 'string') {
        labIds = JSON.parse(booking.lab_ids)
      }
      
      // Get details for each lab with their specific approvers
      for (const labId of labIds) {
        const bookingDetails = await db.query(`
          SELECT 
            br.*,
            u.name as requester_name,
            u.salutation as requester_salutation,
            u.email as requester_email,
            u.role as requester_role,
            l.name as lab_name,
            l.code as lab_code,
            d.highest_approval_authority,
            faculty.name as faculty_name,
            faculty.salutation as faculty_salutation,
            faculty.email as faculty_email,
            mla.lab_staff_approved_by as lab_staff_id,
            mla.status as individual_lab_status,
            lab_staff.name as lab_staff_name,
            lab_staff.salutation as lab_staff_salutation,
            lab_staff.email as lab_staff_email,
            lc.name as lab_coordinator_name,
            lc.salutation as lab_coordinator_salutation,
            lc.email as lab_coordinator_email,
            hod.name as hod_name,
            hod.salutation as hod_salutation,
            hod.email as hod_email,
            rp.name as responsible_person_name,
            rp.email as responsible_person_email
          FROM booking_requests br
          LEFT JOIN users u ON u.id = br.requested_by
          LEFT JOIN labs l ON l.id = ?
          LEFT JOIN departments d ON l.department_id = d.id
          LEFT JOIN users faculty ON faculty.id = br.faculty_supervisor_id
          LEFT JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id AND mla.lab_id = ?
          LEFT JOIN users lab_staff ON lab_staff.id = mla.lab_staff_approved_by
          LEFT JOIN users lc ON lc.id = d.lab_coordinator_id
          LEFT JOIN users hod ON hod.id = d.hod_id
          LEFT JOIN multi_lab_responsible_persons rp ON rp.booking_request_id = br.id AND rp.lab_id = ?
          WHERE br.id = ?
        `, [labId, labId, labId, requestId])
        
        if (bookingDetails.rows.length > 0) {
          const individualLabStatus = bookingDetails.rows[0].individual_lab_status
          
          // Skip logging for rejected labs - they already have rejection log entry
          if (individualLabStatus === 'rejected') {
            continue
          }
          
          const isLabCoordinator = user.role === 'lab_coordinator' || 
                                   (booking.highest_approval_authority === 'lab_coordinator' && 
                                    booking.lab_coordinator_id === user.userId)
          const approverRoleForLog = isLabCoordinator ? 'lab_coordinator' : 'hod'
          const actionLabel = action === 'approve' 
            ? (isLabCoordinator ? 'approved_by_lab_coordinator' : 'approved_by_hod')
            : (isLabCoordinator ? 'rejected_by_lab_coordinator' : 'rejected_by_hod')
          
          logLabBookingActivity({
            bookingId: requestId,
            labId: labId,
            actorUserId: userInfo?.userId || null,
            actorName: userInfo?.name || null,
            actorEmail: userInfo?.email || null,
            actorRole: approverRoleForLog as any,
            action: actionLabel,
            actionDescription: action === 'approve' 
              ? `Approved multi-lab booking for ${bookingDetails.rows[0].lab_name}${remarks ? ': ' + remarks : ''}`
              : `Rejected multi-lab booking for ${bookingDetails.rows[0].lab_name}: ${remarks}`,
            bookingSnapshot: bookingDetails.rows[0],
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
            userAgent: request.headers.get("user-agent") || null,
          }).catch(err => console.error(`Activity logging failed for lab ${labId}:`, err))
        }
      }
    } else {
      // Single lab booking - create one log entry
      const bookingDetails = await db.query(`
        SELECT 
          br.*,
          u.name as requester_name,
          u.salutation as requester_salutation,
          u.email as requester_email,
          u.role as requester_role,
          l.name as lab_name,
          l.code as lab_code,
          d.highest_approval_authority,
          faculty.name as faculty_name,
          faculty.salutation as faculty_salutation,
          faculty.email as faculty_email,
          lab_staff.name as lab_staff_name,
          lab_staff.salutation as lab_staff_salutation,
          lab_staff.email as lab_staff_email,
          lc.name as lab_coordinator_name,
          lc.salutation as lab_coordinator_salutation,
          lc.email as lab_coordinator_email,
          hod.name as hod_name,
          hod.salutation as hod_salutation,
          hod.email as hod_email
        FROM booking_requests br
        LEFT JOIN users u ON u.id = br.requested_by
        LEFT JOIN labs l ON l.id = br.lab_id
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN users faculty ON faculty.id = br.faculty_supervisor_id
        LEFT JOIN users lab_staff ON lab_staff.id = br.lab_staff_approved_by
        LEFT JOIN users lc ON lc.id = d.lab_coordinator_id
        LEFT JOIN users hod ON hod.id = d.hod_id
        WHERE br.id = ?
      `, [requestId])
      
      if (bookingDetails.rows.length > 0) {
        const isLabCoordinator = user.role === 'lab_coordinator' || 
                                 (booking.highest_approval_authority === 'lab_coordinator' && 
                                  booking.lab_coordinator_id === user.userId)
        const approverRoleForLog = isLabCoordinator ? 'lab_coordinator' : 'hod'
        const actionLabel = action === 'approve' 
          ? (isLabCoordinator ? 'approved_by_lab_coordinator' : 'approved_by_hod')
          : (isLabCoordinator ? 'rejected_by_lab_coordinator' : 'rejected_by_hod')
        
        logLabBookingActivity({
          bookingId: requestId,
          labId: booking.lab_id,
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: approverRoleForLog as any,
          action: actionLabel,
          actionDescription: action === 'approve' 
            ? `Approved booking request${remarks ? ': ' + remarks : ''}`
            : `Rejected booking request: ${remarks}`,
          bookingSnapshot: bookingDetails.rows[0],
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        }).catch(err => console.error("Activity logging failed:", err))
      }
    }

    // Send email notification to student
    try {
      const studentDetails = await db.query(
        `SELECT u.name as student_name, u.email as student_email, u.salutation as student_salutation,
                u.role as requester_role,
                l.name as lab_name,
                br.booking_date, br.start_time, br.end_time, br.purpose, br.is_multi_lab, br.lab_ids,
                hod.name as hod_name
         FROM booking_requests br
         JOIN users u ON u.id = br.requested_by
         JOIN labs l ON l.id = br.lab_id
         JOIN users hod ON hod.id = ?
         WHERE br.id = ?`,
        [user.userId, requestId]
      )

      if (studentDetails.rows.length > 0) {
        const student = studentDetails.rows[0]
        
        // For multi-lab, get only APPROVED lab names
        let labDetails = student.lab_name
        if (isMultiLab && booking.lab_ids) {
          // Get only the approved labs
          const approvedLabs = await db.query(`
            SELECT l.name 
            FROM labs l
            JOIN multi_lab_approvals mla ON l.id = mla.lab_id
            WHERE mla.booking_request_id = ?
              AND mla.status = 'approved'
          `, [requestId])
          
          if (approvedLabs.rows.length > 0) {
            labDetails = approvedLabs.rows.map((l: any) => l.name).join(', ')
          }
        }
        
        // Determine the actual approver role for display
        const isLabCoordinator = user.role === 'lab_coordinator' || 
                                 (booking.highest_approval_authority === 'lab_coordinator' && 
                                  booking.lab_coordinator_id === user.userId)
        const approverRoleDisplay = isLabCoordinator ? 'Lab Coordinator' : 'HoD'
        
        if (action === 'approve') {
          const emailData = emailTemplates.labBookingApproved({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            requesterRole: student.requester_role === 'student' ? 'student' : student.requester_role === 'faculty' ? 'faculty' : 'others',
            labName: isMultiLab ? `Multiple Labs (${labDetails})` : student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            approverRole: approverRoleDisplay,
            nextStep: undefined // Final approval
          })

          await sendEmail({
            to: student.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
          
          // Send confirmation emails to responsible persons for APPROVED labs only
          if (isMultiLab || booking.responsible_person_name) {
            const responsiblePersons = await db.query(`
              SELECT rp.name, rp.email, l.name as lab_name, l.id as lab_id,
                     u.name as lab_staff_name, u.salutation as lab_staff_salutation,
                     mla.status as lab_status
              FROM multi_lab_responsible_persons rp
              JOIN labs l ON rp.lab_id = l.id
              LEFT JOIN users u ON l.staff_id = u.id
              LEFT JOIN multi_lab_approvals mla ON mla.booking_request_id = rp.booking_request_id AND mla.lab_id = rp.lab_id
              WHERE rp.booking_request_id = ?
                AND mla.status = 'approved'
            `, [requestId])
            
            // If no multi-lab entries but has responsible person (old single-lab bookings)
            if (responsiblePersons.rows.length === 0 && booking.responsible_person_name) {
              responsiblePersons.rows.push({
                name: booking.responsible_person_name,
                email: booking.responsible_person_email,
                lab_name: student.lab_name
              })
            }
            
            // Format requester name with salutation
            let formattedRequesterName = student.student_name
            if (student.student_salutation && student.student_salutation !== 'none') {
              const salutationMap: { [key: string]: string } = {
                'prof': 'Prof.',
                'dr': 'Dr.',
                'mr': 'Mr.',
                'mrs': 'Mrs.'
              }
              const salutation = salutationMap[student.student_salutation.toLowerCase()] || ''
              formattedRequesterName = salutation ? `${salutation} ${student.student_name}` : student.student_name
            }
            
            // Format requester role
            const formatRole = (role: string) => {
              const roleMap: { [key: string]: string } = {
                'student': 'Student',
                'faculty': 'Faculty',
                'others': 'Others/TnP',
                'lab_staff': 'Lab Staff',
                'hod': 'HOD',
                'lab_coordinator': 'Lab Coordinator',
                'admin': 'Admin'
              }
              return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1)
            }
            
            for (const person of responsiblePersons.rows) {
              // Format lab staff name with salutation
              let labStaffContact = `Lab staff for ${person.lab_name}`
              if (person.lab_staff_name) {
                const salutationMap: { [key: string]: string } = {
                  'prof': 'Prof.',
                  'dr': 'Dr.',
                  'mr': 'Mr.',
                  'mrs': 'Mrs.'
                }
                const salutation = person.lab_staff_salutation ? salutationMap[person.lab_staff_salutation.toLowerCase()] || '' : ''
                labStaffContact = salutation ? `${salutation} ${person.lab_staff_name}` : person.lab_staff_name
              }
              
              await sendEmail({
                to: person.email,
                subject: `Lab Booking Confirmed - You are responsible for ${person.lab_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a73e8;">Lab Booking Confirmed</h2>
                    
                    <p>Dear ${person.name},</p>
                    
                    <p>You have been designated as the <strong>person responsible</strong> for the following lab booking:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1a73e8; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Lab:</strong> ${person.lab_name}</p>
                      <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(student.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p style="margin: 5px 0;"><strong>Time:</strong> ${student.start_time} - ${student.end_time}</p>
                      <p style="margin: 5px 0;"><strong>Booked by:</strong> ${formattedRequesterName} (${formatRole(student.requester_role)})</p>
                      <p style="margin: 5px 0;"><strong>Email:</strong> ${student.student_email}</p>
                      <p style="margin: 5px 0;"><strong>Purpose:</strong> ${student.purpose || 'Not specified'}</p>
                    </div>
                    
                    <h3 style="color: #1a73e8;">Your Responsibilities:</h3>
                    <ul style="line-height: 1.8;">
                      <li>Ensure the lab is used according to the stated purpose</li>
                      <li>Be present during the booking time or coordinate with the lab staff</li>
                      <li>Report any issues or damages to lab staff immediately</li>
                      <li>Ensure the lab is properly cleaned and equipment is returned after use</li>
                    </ul>
                    
                    <p style="background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
                      <strong>⏰ Reminder:</strong> You will receive a reminder 2 hours before the booking starts.
                    </p>
                    
                    <p>If you have any questions or concerns, please contact:</p>
                    <ul>
                      <li>The person who made the booking: ${student.student_email}</li>
                      <li>${labStaffContact} (Head Lab Staff for ${person.lab_name})</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #666; font-size: 12px;">
                      This is an automated notification from the Lab Management System. 
                      Please do not reply to this email.
                    </p>
                  </div>
                `
              }).catch(err => console.error(`Failed to send email to responsible person ${person.email}:`, err))
            }
          }
        } else {
          // Rejection email
          const emailData = emailTemplates.labBookingRejected({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            requesterRole: student.requester_role === 'student' ? 'student' : student.requester_role === 'faculty' ? 'faculty' : 'others',
            labName: isMultiLab ? `Multiple Labs (${labDetails})` : student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            reason: remarks || 'No reason provided',
            rejectedBy: approverRoleDisplay
          })

          await sendEmail({
            to: student.student_email,
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
    }

    const actionText = action === 'approve' ? 'approved' : 'rejected'
    
    return NextResponse.json({
      success: true,
      message: `Request has been ${actionText} successfully`
    })

  } catch (error) {
    console.error("Error processing HOD action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
