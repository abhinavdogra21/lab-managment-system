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
    if (!user || !hasRole(user, ["hod", "admin"])) {
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

    // For non-admin HODs, get their department(s) by hod_id or hod_email
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
        [Number(user.userId), String(user.email || '')]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ error: "No department found for this HOD" }, { status: 403 })
      }
    }

    // First, verify the request exists and is in the correct state
    let checkQuery = `
      SELECT br.*, l.department_id, d.name as dept_name
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
      logLabBookingActivity({
        bookingId: requestId,
        labId: booking.lab_id,
        actorUserId: userInfo?.userId || null,
        actorName: userInfo?.name || null,
        actorEmail: userInfo?.email || null,
        actorRole: userInfo?.role || null,
        action: action === 'approve' ? 'approved_by_hod' : 'rejected_by_hod',
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
        
        if (action === 'approve') {
          const emailData = emailTemplates.labBookingApproved({
            requesterName: student.student_name,
            requesterSalutation: student.student_salutation,
            labName: student.lab_name,
            bookingDate: student.booking_date,
            startTime: student.start_time,
            endTime: student.end_time,
            requestId: requestId,
            approverRole: 'HoD',
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
            rejectedBy: student.hod_name || 'HoD'
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
