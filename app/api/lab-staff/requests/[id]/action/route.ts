/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, remarks } = await request.json()
    const db = Database.getInstance()

    // Authenticate user
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }
    const userId = user.userId

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      )
    }

    // Get the request details with department info to determine next approval level
    // For multi-lab bookings, also check if there are any pending labs in multi_lab_approvals
    const requestResult = await db.query(
      `SELECT br.*, l.department_id, d.highest_approval_authority 
       FROM booking_requests br
       LEFT JOIN labs l ON br.lab_id = l.id
       LEFT JOIN departments d ON l.department_id = d.id
       WHERE br.id = ? 
       AND (
         br.status = 'pending_lab_staff' 
         OR (br.is_multi_lab = 1 AND br.status != 'approved' AND br.status != 'rejected')
       )`,
      [id]
    )

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Request not found or not pending lab staff approval" },
        { status: 404 }
      )
    }

    const bookingRequest = requestResult.rows[0]
    
    // For multi-lab bookings, verify there are actually pending labs to approve
    if (bookingRequest.is_multi_lab === 1 || bookingRequest.is_multi_lab === true) {
      const pendingCheck = await db.query(
        `SELECT COUNT(*) as pending_count 
         FROM multi_lab_approvals 
         WHERE booking_request_id = ? AND status = 'pending'`,
        [id]
      )
      
      if (Number(pendingCheck.rows[0].pending_count) === 0) {
        return NextResponse.json(
          { success: false, error: "No pending labs to approve for this booking" },
          { status: 400 }
        )
      }
    }
    const isMultiLab = bookingRequest.is_multi_lab === 1 || bookingRequest.is_multi_lab === true
    const highestAuthority = bookingRequest.highest_approval_authority

    // For multi-lab bookings, check which specific lab this staff is approving
    let targetLabId = bookingRequest.lab_id
    if (isMultiLab && bookingRequest.lab_ids) {
      // Parse lab_ids JSON - handle Buffer/String/Array formats
      let labIds: number[] = []
      if (Array.isArray(bookingRequest.lab_ids)) {
        labIds = bookingRequest.lab_ids
      } else if (Buffer.isBuffer(bookingRequest.lab_ids)) {
        labIds = JSON.parse(bookingRequest.lab_ids.toString('utf-8'))
      } else if (typeof bookingRequest.lab_ids === 'string') {
        labIds = JSON.parse(bookingRequest.lab_ids)
      }
      
      // Check if this staff is the HEAD lab staff for ANY of the labs in this booking
      const staffLabs = await db.query(
        `SELECT l.id FROM labs l 
         WHERE l.id IN (${labIds.map(() => '?').join(',')})
         AND l.staff_id = ?`,
        [...labIds, userId]
      )
      
      if (staffLabs.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Not authorized. Only head lab staff can approve multi-lab bookings." },
          { status: 403 }
        )
      }
      
      // For multi-lab, we'll update the specific lab's approval status
      targetLabId = staffLabs.rows[0].id
    } else {
      // Single lab authorization check - must be head lab staff
      const labAuth = await db.query(
        `SELECT l.staff_id AS head_staff_id FROM labs l WHERE l.id = ?`,
        [bookingRequest.lab_id]
      )
      
      if (labAuth.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Lab not found" }, { status: 404 })
      }
      
      const authRow = labAuth.rows[0]
      if (!authRow.head_staff_id || Number(authRow.head_staff_id) !== Number(userId)) {
        return NextResponse.json({ 
          success: false, 
          error: "Not authorized. Only head lab staff can approve bookings." 
        }, { status: 403 })
      }
    }

    // Update the request based on action
    let newStatus: string
    let updateQuery: string
    let updateParams: any[]

    if (action === 'approve') {
      if (isMultiLab) {
        // Update specific lab's approval status in multi_lab_approvals
        await db.query(`
          UPDATE multi_lab_approvals
          SET status = 'approved_by_lab_staff',
              lab_staff_approved_by = ?,
              lab_staff_approved_at = NOW(),
              lab_staff_remarks = ?
          WHERE booking_request_id = ? AND lab_id = ?
        `, [userId, remarks || null, id, targetLabId])
        
        // Check if ALL lab staff have made their decisions (no pending labs, excluding withdrawn)
        const approvalStatus = await db.query(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved,
                 SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                 SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                 SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn
          FROM multi_lab_approvals
          WHERE booking_request_id = ?
        `, [id])
        
        const total = Number(approvalStatus.rows[0].total)
        const approved = Number(approvalStatus.rows[0].approved || 0)
        const rejected = Number(approvalStatus.rows[0].rejected || 0)
        const pending = Number(approvalStatus.rows[0].pending || 0)
        const withdrawn = Number(approvalStatus.rows[0].withdrawn || 0)
        const activeLabs = total - withdrawn // Only count non-withdrawn labs
        const allDecided = (pending === 0) // All lab staff have made their decisions (withdrawn doesn't count as pending)
        
        console.log(`Multi-lab approval check: ${approved} approved, ${rejected} rejected, ${pending} pending, ${withdrawn} withdrawn out of ${total} total (${activeLabs} active)`)
        
        // If all active labs are withdrawn or rejected, mark as withdrawn
        if (activeLabs === 0 || (approved === 0 && activeLabs === (rejected + withdrawn))) {
          newStatus = 'withdrawn'
          updateQuery = `
            UPDATE booking_requests 
            SET status = ?, 
                withdrawn_at = NOW()
            WHERE id = ?
          `
          updateParams = [newStatus, id]
          console.log(`All labs withdrawn or rejected! Marking booking ${id} as withdrawn`)
        } else if (allDecided && approved > 0) {
          // All lab staff made decisions AND at least one lab approved
          // Move to pending_hod status (applies to both HOD and Lab Coordinator)
          newStatus = 'pending_hod'
          updateQuery = `
            UPDATE booking_requests 
            SET status = ?, 
                lab_staff_approved_at = NOW(),
                lab_staff_approved_by = ?
            WHERE id = ?
          `
          updateParams = [newStatus, userId, id]
          console.log(`All lab staff decided and at least one approved! Moving booking ${id} to ${newStatus} status (highest authority: ${highestAuthority})`)
        } else if (allDecided && approved === 0) {
          // All lab staff decided but none approved (all rejected) - reject entire booking
          newStatus = 'rejected'
          updateQuery = `
            UPDATE booking_requests 
            SET 
              status = ?,
              rejected_at = NOW(),
              rejected_by = ?,
              rejection_reason = ?
            WHERE id = ?
          `
          updateParams = [newStatus, userId, 'All labs rejected by lab staff', id]
          console.log(`All labs rejected! Marking booking ${id} as rejected`)
        } else {
          // Still waiting for other lab staff approvals
          newStatus = 'pending_lab_staff'
          updateQuery = `SELECT 1` // No-op
          updateParams = []
        }
      } else {
        // Single lab approval - move to pending_hod (applies to both HOD and Lab Coordinator)
        newStatus = 'pending_hod'
        updateQuery = `
          UPDATE booking_requests 
          SET 
            status = ?,
            lab_staff_approved_at = NOW(),
            lab_staff_approved_by = ?,
            lab_staff_remarks = ?
          WHERE id = ?
        `
        updateParams = [newStatus, userId, remarks || null, id]
      }
    } else {
      // Reject the request
      
      if (isMultiLab) {
        // Only reject the specific lab, not the entire booking
        await db.query(`
          UPDATE multi_lab_approvals
          SET status = 'rejected', 
              lab_staff_approved_by = ?,
              lab_staff_approved_at = NOW(),
              lab_staff_remarks = ?
          WHERE booking_request_id = ? AND lab_id = ?
        `, [userId, remarks || null, id, targetLabId])
        
        // Check if ALL lab staff have made their decisions (no pending labs)
        const rejectionCheck = await db.query(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                 SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved,
                 SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                 SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn
          FROM multi_lab_approvals
          WHERE booking_request_id = ?
        `, [id])
        
        const total = Number(rejectionCheck.rows[0].total)
        const rejected = Number(rejectionCheck.rows[0].rejected || 0)
        const approved = Number(rejectionCheck.rows[0].approved || 0)
        const pending = Number(rejectionCheck.rows[0].pending || 0)
        const withdrawn = Number(rejectionCheck.rows[0].withdrawn || 0)
        const allDecided = (pending === 0) // All lab staff have made their decisions
        const activeLabs = total - withdrawn // Labs that are not withdrawn
        
        console.log(`Multi-lab rejection: ${approved} approved, ${rejected} rejected, ${pending} pending, ${withdrawn} withdrawn out of ${total} total`)
        
        if (allDecided && approved > 0) {
          // All lab staff made decisions AND at least one lab approved
          // Determine next status based on highest approval authority
          if (highestAuthority === 'lab_coordinator') {
            newStatus = 'approved' // Lab coordinator approves automatically if set as highest authority
          } else {
            newStatus = 'pending_hod' // Default to HOD approval
          }
          updateQuery = `
            UPDATE booking_requests 
            SET status = ?, 
                lab_staff_approved_at = NOW(),
                lab_staff_approved_by = ?
            WHERE id = ?
          `
          updateParams = [newStatus, userId, id]
          console.log(`All lab staff decided and at least one approved! Moving booking ${id} to ${newStatus} status`)
        } else if (allDecided && approved === 0 && (rejected + withdrawn) >= total) {
          // All lab staff decided but none approved
          // Check if any active labs were rejected (not just all withdrawn)
          if (rejected > 0) {
            // At least one lab was rejected - reject entire booking
            newStatus = 'rejected'
            updateQuery = `
              UPDATE booking_requests 
              SET 
                status = ?,
                rejected_at = NOW(),
                rejected_by = ?,
                rejection_reason = ?
              WHERE id = ?
            `
            updateParams = [newStatus, userId, 'All active labs rejected by lab staff', id]
            console.log(`All active labs rejected! Marking booking ${id} as rejected`)
          } else {
            // All labs are withdrawn, none rejected - mark as withdrawn
            newStatus = 'withdrawn'
            updateQuery = `
              UPDATE booking_requests 
              SET status = ?, withdrawn_at = NOW()
              WHERE id = ?
            `
            updateParams = [newStatus, id]
            console.log(`All labs withdrawn! Marking booking ${id} as withdrawn`)
          }
        } else {
          // Still waiting for other lab staff approvals
          newStatus = 'pending_lab_staff'
          updateQuery = `SELECT 1` // No-op
          updateParams = []
        }
      } else {
        // Single lab rejection - reject entire booking
        newStatus = 'rejected'
        updateQuery = `
          UPDATE booking_requests 
          SET 
            status = ?,
            lab_staff_approved_at = NOW(),
            lab_staff_approved_by = ?,
            lab_staff_remarks = ?,
            rejected_at = NOW(),
            rejected_by = ?,
            rejection_reason = ?
          WHERE id = ?
        `
        updateParams = [newStatus, userId, remarks || null, userId, remarks || 'Rejected by lab staff', id]
      }
    }

    if (updateParams.length > 0) {
      await db.query(updateQuery, updateParams)
    }

    // Log the activity with enriched booking data
    const userInfo = await getUserInfoForLogging(userId)
    
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
        ls.email as lab_staff_email,
        lc.name as lab_coordinator_name,
        lc.salutation as lab_coordinator_salutation,
        hod.name as hod_name,
        hod.salutation as hod_salutation,
        d.highest_approval_authority,
        br.lab_staff_approved_at,
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
        bookingId: Number(id),
        labId: bookingRequest.lab_id,
        actorUserId: userInfo?.userId || null,
        actorName: userInfo?.name || null,
        actorEmail: userInfo?.email || null,
        actorRole: userInfo?.role || null,
        action: action === 'approve' ? 'approved_by_lab_staff' : 'rejected_by_lab_staff',
        actionDescription: action === 'approve'
          ? `Approved booking request${remarks ? ': ' + remarks : ''}`
          : `Rejected booking request: ${remarks}`,
        bookingSnapshot: enrichedBooking.rows[0],
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      }).catch(err => console.error("Activity logging failed:", err))
    }

    // Get updated request details for response and emails
    const updatedResult = await db.query(
      `SELECT 
        br.*,
        u.name as student_name,
        u.email as student_email,
        u.salutation as student_salutation,
        u.role as requester_role,
        l.name as lab_name,
        f.name as faculty_name,
        staff.name as staff_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users staff ON br.lab_staff_approved_by = staff.id
      WHERE br.id = ?`,
      [id]
    )

    const updatedRequest = updatedResult.rows[0]

    // Helper to format role for display
    const formatRole = (role: string) => {
      if (role === 'lab_staff') return 'Lab Staff'
      return role.charAt(0).toUpperCase() + role.slice(1)
    }

    // Send email notifications
    try {
      if (action === 'approve') {
        // For multi-lab, get lab name that was just approved
        let approvedLabName = updatedRequest.lab_name
        if (isMultiLab) {
          const labInfo = await db.query(
            'SELECT name FROM labs WHERE id = ?',
            [targetLabId]
          )
          if (labInfo.rows.length > 0) {
            approvedLabName = labInfo.rows[0].name
          }
        }

        // Email to student with salutation
        let nextStep: string
        if (isMultiLab) {
          // Check how many labs still pending
          const pendingLabs = await db.query(`
            SELECT COUNT(*) as pending_count
            FROM multi_lab_approvals
            WHERE booking_request_id = ? AND status = 'pending'
          `, [id])
          
          const pendingCount = pendingLabs.rows[0].pending_count
          
          if (pendingCount > 0) {
            nextStep = `Lab ${approvedLabName} approved. Waiting for approval from ${pendingCount} more lab(s).`
          } else {
            nextStep = 'All labs approved! Your request is now pending HoD approval.'
          }
        } else {
          nextStep = 'Your request is now pending HoD approval'
        }

        // DO NOT email student when lab staff approves - only email HOD
        // Student will only be notified when final HOD approval is done

        // Only send HOD email when ALL labs approved (for multi-lab) or immediately (for single lab)
        const shouldNotifyHOD = !isMultiLab || newStatus === 'pending_hod'
        
        if (shouldNotifyHOD) {
          // Email to HOD or Lab Coordinator based on department's highest_approval_authority
          const approver = await db.query(
            `SELECT 
               CASE 
                 WHEN d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL 
                 THEN coord.email
                 ELSE d.hod_email
               END as email,
               CASE 
                 WHEN d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL 
                 THEN coord.name
                 ELSE hod.name
               END as name,
               CASE 
                 WHEN d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL 
                 THEN coord.salutation
                 ELSE hod.salutation
               END as salutation,
               CASE 
                 WHEN d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL 
                 THEN coord.department
                 ELSE hod.department
               END as department,
               d.name as department_name,
               d.highest_approval_authority,
               CASE 
                 WHEN d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL 
                 THEN 'Lab Coordinator'
                 ELSE 'HOD'
               END as approver_role
             FROM labs l
             JOIN departments d ON l.department_id = d.id
             LEFT JOIN users hod ON d.hod_id = hod.id
             LEFT JOIN users coord ON d.lab_coordinator_id = coord.id
             WHERE l.id = ?
             LIMIT 1`,
            [updatedRequest.lab_id]
          )
          
          if (approver.rows.length > 0 && approver.rows[0].email) {
            // Format requester name with salutation
            let formattedRequesterName = updatedRequest.student_name
            if (updatedRequest.student_salutation && updatedRequest.student_salutation !== 'none') {
              const salutationMap: { [key: string]: string } = {
                'prof': 'Prof.',
                'dr': 'Dr.',
                'mr': 'Mr.',
                'mrs': 'Mrs.'
              }
              const salutation = salutationMap[updatedRequest.student_salutation.toLowerCase()] || ''
              formattedRequesterName = salutation ? `${salutation} ${updatedRequest.student_name}` : updatedRequest.student_name
            }

            // For multi-lab, get all lab names
            let labDetails = updatedRequest.lab_name
            if (isMultiLab && bookingRequest.lab_ids) {
              // Parse lab_ids JSON - handle Buffer/String/Array formats
              let labIds: number[] = []
              if (Array.isArray(bookingRequest.lab_ids)) {
                labIds = bookingRequest.lab_ids
              } else if (Buffer.isBuffer(bookingRequest.lab_ids)) {
                labIds = JSON.parse(bookingRequest.lab_ids.toString('utf-8'))
              } else if (typeof bookingRequest.lab_ids === 'string') {
                labIds = JSON.parse(bookingRequest.lab_ids)
              }
              
              const labs = await db.query(
                `SELECT name FROM labs WHERE id IN (${labIds.map(() => '?').join(',')}) ORDER BY code`,
                labIds
              )
              labDetails = labs.rows.map((l: any) => l.name).join(', ')
            }

            const approverEmailData = emailTemplates.labBookingCreated({
              requesterName: formattedRequesterName,
              requesterRole: formatRole(updatedRequest.requester_role),
              labName: isMultiLab ? `Multiple Labs (${labDetails})` : updatedRequest.lab_name,
              bookingDate: updatedRequest.booking_date,
              startTime: updatedRequest.start_time,
              endTime: updatedRequest.end_time,
              purpose: updatedRequest.purpose || 'Not specified',
              requestId: Number(id),
              recipientName: approver.rows[0].name,
              recipientSalutation: approver.rows[0].salutation,
              recipientRole: approver.rows[0].highest_approval_authority === 'lab_coordinator' ? 'lab_coordinator' : 'hod'
            })

            await sendEmail({
              to: approver.rows[0].email,
              ...approverEmailData
            }).catch(err => console.error('Email send failed:', err))
          }
        }
      } else {
        // Rejection - email requester about the rejected lab
        // For multi-lab: always email about individual lab rejection
        // For single lab: email about full rejection
        
        // Get the lab name that was rejected
        let labDetails = updatedRequest.lab_name
        if (isMultiLab) {
          // For multi-lab, show the specific rejected lab
          const rejectedLabInfo = await db.query(
            'SELECT name FROM labs WHERE id = ?',
            [targetLabId]
          )
          if (rejectedLabInfo.rows.length > 0) {
            labDetails = rejectedLabInfo.rows[0].name
          }
        }

        // Email to requester for rejection with salutation
        const emailData = emailTemplates.labBookingRejected({
          requesterName: updatedRequest.student_name,
          requesterSalutation: updatedRequest.student_salutation,
          requesterRole: updatedRequest.requester_role === 'student' ? 'student' : updatedRequest.requester_role === 'faculty' ? 'faculty' : 'others',
          labName: labDetails,
          bookingDate: updatedRequest.booking_date,
          startTime: updatedRequest.start_time,
          endTime: updatedRequest.end_time,
          requestId: Number(id),
          reason: remarks || 'No reason provided',
          rejectedBy: updatedRequest.staff_name || 'Lab Staff'
        })

        await sendEmail({
          to: updatedRequest.student_email,
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
        
        // If requester has a faculty supervisor and status reached beyond pending_faculty, notify them too
        // BUT only if faculty email is different from student email (avoid duplicate)
        if (updatedRequest.faculty_name && updatedRequest.booking_date) {
          const facultyResult = await db.query(
            'SELECT email, salutation FROM users WHERE id = ?',
            [updatedRequest.faculty_supervisor_id]
          )
          
          if (facultyResult.rows.length > 0 && facultyResult.rows[0].email !== updatedRequest.student_email) {
            const facultyEmailData = emailTemplates.labBookingRejected({
              requesterName: facultyResult.rows[0].name || updatedRequest.faculty_name,
              requesterSalutation: facultyResult.rows[0].salutation,
              requesterRole: 'faculty',
              labName: labDetails,
              bookingDate: updatedRequest.booking_date,
              startTime: updatedRequest.start_time,
              endTime: updatedRequest.end_time,
              requestId: Number(id),
              reason: remarks || 'No reason provided',
              rejectedBy: updatedRequest.staff_name || 'Lab Staff'
            })

            await sendEmail({
              to: facultyResult.rows[0].email,
              ...facultyEmailData
            }).catch(err => console.error('Faculty email send failed:', err))
          }
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action}d successfully`,
      request: updatedRequest,
      newStatus
    })

  } catch (error) {
    console.error("Error processing lab staff action:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 }
    )
  }
}
