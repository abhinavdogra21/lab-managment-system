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
    if (!user || !hasRole(user, ["lab_coordinator", "admin"])) {
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

    // For lab coordinators, get their department(s) by lab_coordinator_id
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
        [Number(user.userId)]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ error: "No department found for this Lab Coordinator" }, { status: 403 })
      }
    }

    // First, verify the request exists and is in the correct state
    let checkQuery = `
      SELECT br.*, l.department_id, d.name as dept_name, d.highest_approval_authority, d.lab_coordinator_id
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
    
    // CRITICAL: Verify this department actually uses Lab Coordinator approval
    if (user.role !== 'admin') {
      if (booking.highest_approval_authority !== 'lab_coordinator') {
        return NextResponse.json({ 
          error: "This department uses HOD approval, not Lab Coordinator approval" 
        }, { status: 403 })
      }
      if (!booking.lab_coordinator_id) {
        return NextResponse.json({ 
          error: "No Lab Coordinator assigned to this department" 
        }, { status: 403 })
      }
    }
    
    if (booking.status !== 'pending_hod') {
      return NextResponse.json({ error: "Request is not pending approval" }, { status: 400 })
    }

    // Update the booking status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    let updateQuery: string
    let updateParams: any[]
    
    if (action === 'approve') {
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?, final_approver_role = 'lab_coordinator'
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, requestId]
    } else {
      // For rejection, also set rejected_by and rejected_at
      updateQuery = `
        UPDATE booking_requests 
        SET status = ?, hod_approved_at = NOW(), hod_approved_by = ?, hod_remarks = ?,
            rejected_by = ?, rejected_at = NOW(), rejection_reason = ?, final_approver_role = 'lab_coordinator'
        WHERE id = ?
      `
      updateParams = [newStatus, user.userId, remarks || null, user.userId, remarks || 'Rejected by Lab Coordinator', requestId]
    }
    
    await db.query(updateQuery, updateParams)

    // Log the activity
    const userInfo = await getUserInfoForLogging(user.userId)
    
    // Handle multi-lab bookings - create separate activity logs for each lab
    const isMultiLab = booking.is_multi_lab === 1 || booking.is_multi_lab === true
    const labIds = isMultiLab && booking.lab_ids ? JSON.parse(booking.lab_ids) : [booking.lab_id]
    
    for (const labId of labIds) {
      // Get complete booking details with lab-specific info
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
          mla.lab_staff_approved_by,
          lab_staff.name as lab_staff_name,
          lab_staff.salutation as lab_staff_salutation,
          lab_staff.email as lab_staff_email,
          coordinator.name as lab_coordinator_name,
          coordinator.salutation as lab_coordinator_salutation,
          coordinator.email as lab_coordinator_email,
          hod.name as hod_name,
          hod.salutation as hod_salutation,
          hod.email as hod_email,
          rp.name as responsible_person_name,
          rp.email as responsible_person_email
        FROM booking_requests br
        LEFT JOIN users u ON u.id = br.requested_by
        LEFT JOIN labs l ON l.id = ?
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN multi_lab_approvals mla ON mla.booking_request_id = br.id AND mla.lab_id = ?
        LEFT JOIN users faculty ON faculty.id = br.faculty_supervisor_id
        LEFT JOIN users lab_staff ON lab_staff.id = mla.lab_staff_approved_by
        LEFT JOIN users coordinator ON coordinator.id = d.lab_coordinator_id
        LEFT JOIN users hod ON hod.id = d.hod_id
        LEFT JOIN multi_lab_responsible_persons rp ON rp.booking_request_id = br.id AND rp.lab_id = ?
        WHERE br.id = ?
      `, [labId, labId, labId, requestId])
      
      if (bookingDetails.rows.length > 0) {
        logLabBookingActivity({
          bookingId: requestId,
          labId: Number(labId),
          actorUserId: userInfo?.userId || null,
          actorName: userInfo?.name || null,
          actorEmail: userInfo?.email || null,
          actorRole: 'lab_coordinator' as any,
          action: action === 'approve' ? 'approved_by_lab_coordinator' : 'rejected_by_lab_coordinator',
          actionDescription: action === 'approve' 
            ? `Approved booking request by Lab Coordinator${remarks ? ': ' + remarks : ''}`
            : `Rejected booking request by Lab Coordinator: ${remarks}`,
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
                l.name as lab_name,
                br.booking_date, br.start_time, br.end_time,
                coordinator.name as coordinator_name
         FROM booking_requests br
         JOIN users u ON u.id = br.requested_by
         JOIN labs l ON l.id = br.lab_id
         JOIN users coordinator ON coordinator.id = ?
         WHERE br.id = ?`,
        [user.userId, requestId]
      )

      if (studentDetails.rows.length > 0) {
        const student = studentDetails.rows[0]
        
        if (action === 'approve') {
          const emailData = emailTemplates.labBookingApproved({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            requesterRole: student.requester_role === 'student' ? 'student' : student.requester_role === 'faculty' ? 'faculty' : 'others',
            labName: student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            approverRole: 'Lab Coordinator',
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
            requesterRole: student.requester_role === 'student' ? 'student' : student.requester_role === 'faculty' ? 'faculty' : 'others',
            labName: student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            reason: remarks || 'No reason provided',
            rejectedBy: student.coordinator_name || 'Lab Coordinator'
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
    console.error("Error processing Lab Coordinator action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
