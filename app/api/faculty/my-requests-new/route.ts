import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get booking requests raised by this faculty
    const result = await db.query(`
      SELECT 
        br.id,
        l.name as lab_name,
        u.name as faculty_name,
        br.booking_date as date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.created_at,
        br.is_multi_lab,
        br.lab_ids,
        br.faculty_remarks,
        br.faculty_approved_at,
        br.lab_staff_remarks,
        br.lab_staff_approved_at,
        br.hod_remarks,
        br.hod_approved_at,
        br.rejection_reason,
        br.rejected_at,
        f.name as faculty_approver_name,
        s.name as staff_approver_name,
        h.name as hod_approver_name,
        d.highest_approval_authority
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u ON br.faculty_supervisor_id = u.id
      LEFT JOIN users f ON br.faculty_approved_by = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      WHERE br.requested_by = ? AND br.request_type = 'lab_booking'
      ORDER BY br.created_at DESC
    `, [user.userId])

    const bookingsWithTimeline = await Promise.all(result.rows.map(async (booking: any) => {
      // Handle multi-lab bookings - get all lab names and approvals
      let labNames = booking.lab_name
      let multiLabApprovals: any[] = []
      
      if ((booking.is_multi_lab === 1 || booking.is_multi_lab === true) && booking.lab_ids) {
        try {
          // Handle different formats of lab_ids
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
          
          if (labIds && labIds.length > 0) {
            // Get all lab names
            const labNamesResult = await db.query(`
              SELECT id, name, code
              FROM labs
              WHERE id IN (${labIds.map(() => '?').join(',')})
              ORDER BY code
            `, labIds)
            
            labNames = labNamesResult.rows.map((l: any) => l.name).join(', ')
            
            // Get individual approval status for each lab
            const approvalsResult = await db.query(`
              SELECT 
                mla.lab_id,
                mla.status,
                mla.lab_staff_approved_at,
                mla.lab_staff_approved_by,
                mla.lab_staff_remarks,
                mla.hod_approved_at,
                mla.hod_approved_by,
                mla.hod_remarks,
                l.name as lab_name,
                l.code as lab_code,
                ls.name as lab_staff_name,
                ls.salutation as lab_staff_salutation,
                h.name as hod_name,
                h.salutation as hod_salutation
              FROM multi_lab_approvals mla
              JOIN labs l ON mla.lab_id = l.id
              LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
              LEFT JOIN users h ON mla.hod_approved_by = h.id
              WHERE mla.booking_request_id = ?
              ORDER BY l.code
            `, [booking.id])
            
            multiLabApprovals = approvalsResult.rows
          }
        } catch (e) {
          console.error('Error parsing multi-lab data for faculty requests:', e)
        }
      }
      
      const timeline: any[] = []
      
      // Check which stage rejected the request
      const rejectedByLabStaff = booking.status === 'rejected' && booking.lab_staff_approved_at && !booking.hod_approved_at
      const rejectedByHOD = booking.status === 'rejected' && booking.hod_approved_at

      // Faculty approval step (for faculty-initiated requests this may be auto or skipped)
      if (booking.status === 'pending_faculty') {
        timeline.push({
          step_name: 'Faculty Approval',
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: booking.faculty_name
        })
      } else if (booking.faculty_approved_at) {
        timeline.push({
          step_name: 'Faculty Approval',
          step_status: 'completed',
          completed_at: booking.faculty_approved_at,
          completed_by: booking.faculty_approved_by,
          remarks: booking.faculty_remarks,
          user_name: booking.faculty_approver_name || booking.faculty_name
        })
      }

      // Lab staff approval
      if (booking.status === 'pending_lab_staff') {
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: null
        })
      } else if (booking.lab_staff_approved_at) {
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: rejectedByLabStaff ? 'rejected' : 'completed',
          completed_at: booking.lab_staff_approved_at,
          completed_by: booking.lab_staff_approved_by,
          remarks: booking.lab_staff_remarks,
          user_name: booking.staff_approver_name
        })
      }

      // HOD/Lab Coordinator approval
      const approvalAuthorityLabel = booking.highest_approval_authority === 'lab_coordinator' 
        ? 'Lab Coordinator Approval' 
        : 'HOD Approval'
      
      if (booking.status === 'pending_hod') {
        timeline.push({
          step_name: approvalAuthorityLabel,
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: null
        })
      } else if (booking.hod_approved_at) {
        timeline.push({
          step_name: approvalAuthorityLabel,
          step_status: rejectedByHOD ? 'rejected' : 'completed',
          completed_at: booking.hod_approved_at,
          completed_by: booking.hod_approved_by,
          remarks: booking.hod_remarks,
          user_name: booking.hod_approver_name
        })
      }

      if (booking.status === 'rejected') {
        timeline.push({
          step_name: 'Rejected',
          step_status: 'completed',
          completed_at: booking.rejected_at,
          completed_by: booking.rejected_by,
          remarks: booking.rejection_reason,
          user_name: null
        })
      }

      return {
        id: booking.id,
        lab_name: labNames,
        faculty_name: booking.faculty_name,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        purpose: booking.purpose,
        status: booking.status,
        created_at: booking.created_at,
        highest_approval_authority: booking.highest_approval_authority,
        is_multi_lab: booking.is_multi_lab,
        multi_lab_approvals: multiLabApprovals,
        timeline
      }
    }))

    return NextResponse.json({ success: true, requests: bookingsWithTimeline })
  } catch (error) {
    console.error("Failed to fetch faculty booking timeline:", error)
    return NextResponse.json({ error: "Failed to fetch booking timeline" }, { status: 500 })
  }
}
