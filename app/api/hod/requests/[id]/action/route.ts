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
      SELECT br.*, l.department_id, d.name as dept_name, d.highest_approval_authority, d.hod_id, d.lab_coordinator_id
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
        const isHOD = Number(booking.hod_id) === Number(user.userId)
        if (!isHOD && !isLabCoordinator) {
          return NextResponse.json({ 
            error: "Only the HOD can approve this request." 
          }, { status: 403 })
        }
      }
    }
    
    if (booking.status !== 'pending_hod') {
      return NextResponse.json({ error: "Request is not pending HOD approval" }, { status: 400 })
    }

    // Update the booking status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    let updateQuery: string
    let updateParams: any[]
    
    if (action === 'approve') {
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, requestId]
    } else {
      // For rejection, also set rejected_by and rejected_at
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?,
            rejected_by = ?, rejected_at = NOW(), rejection_reason = ?
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, user.userId, remarks || 'Rejected by HOD', requestId]
    }
    
    await db.query(updateQuery, updateParams)

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    // Get complete booking details with requester, lab, and faculty info with salutations
    const bookingDetails = await db.query(`
      SELECT 
        br.*,
        u.name as requester_name,
        u.email as requester_email,
        u.role as requester_role,
        l.name as lab_name,
        l.code as lab_code,
        CASE 
          WHEN faculty.salutation IS NOT NULL 
          THEN CONCAT(UPPER(faculty.salutation), '. ', faculty.name)
          ELSE faculty.name
        END as faculty_name,
        faculty.email as faculty_email,
        CASE 
          WHEN lab_staff.salutation IS NOT NULL 
          THEN CONCAT(UPPER(lab_staff.salutation), '. ', lab_staff.name)
          ELSE lab_staff.name
        END as lab_staff_name,
        lab_staff.email as lab_staff_email,
        CASE 
          WHEN hod.salutation IS NOT NULL 
          THEN CONCAT(UPPER(hod.salutation), '. ', hod.name)
          ELSE hod.name
        END as hod_name,
        hod.email as hod_email
      FROM booking_requests br
      LEFT JOIN users u ON u.id = br.requested_by
      LEFT JOIN labs l ON l.id = br.lab_id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users faculty ON faculty.id = br.faculty_supervisor_id
      LEFT JOIN users lab_staff ON lab_staff.id = br.lab_staff_approved_by
      LEFT JOIN users hod ON hod.id = d.hod_id
      WHERE br.id = ?
    `, [requestId])
    
    if (bookingDetails.rows.length > 0) {
      // Determine the actual approver role based on user's role and department settings
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

    // Send email notification to student
    try {
      const studentDetails = await db.query(
        `SELECT u.name as student_name, u.email as student_email, u.salutation as student_salutation,
                l.name as lab_name,
                br.booking_date, br.start_time, br.end_time,
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
        
        // Determine the actual approver role for display
        const isLabCoordinator = user.role === 'lab_coordinator' || 
                                 (booking.highest_approval_authority === 'lab_coordinator' && 
                                  booking.lab_coordinator_id === user.userId)
        const approverRoleDisplay = isLabCoordinator ? 'Lab Coordinator' : 'HoD'
        
        if (action === 'approve') {
          const emailData = emailTemplates.labBookingApproved({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            labName: student.lab_name,
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
        } else {
          const emailData = emailTemplates.labBookingRejected({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            labName: student.lab_name,
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
