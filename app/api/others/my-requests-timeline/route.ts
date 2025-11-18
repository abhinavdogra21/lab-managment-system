import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["others", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Get booking requests with timeline information
    const result = await db.query(`
      SELECT 
        br.id,
        l.name as lab_name,
        br.booking_date as date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.created_at,
        br.requested_by,
        br.faculty_supervisor_id,
        br.lab_staff_remarks,
        br.lab_staff_approved_at,
        br.hod_remarks,
        br.hod_approved_at,
        br.rejection_reason,
        br.rejected_at,
        br.is_multi_lab,
        br.lab_ids,
        br.responsible_person_name,
        br.responsible_person_email,
        d.highest_approval_authority,
        s.name as staff_approver_name,
        h.name as hod_approver_name,
        lc.name as lab_coordinator_approver_name
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      LEFT JOIN users lc ON d.lab_coordinator_id = lc.id
      WHERE br.requested_by = ? AND br.request_type = 'lab_booking'
      ORDER BY br.created_at DESC
    `, [user.userId])

    // Transform data to include timeline information
    const bookingsWithTimeline = await Promise.all(result.rows.map(async (booking: any) => {
      // Fetch multi-lab approval data if applicable
      let multiLabApprovals = null
      if (booking.is_multi_lab === 1 || booking.is_multi_lab === true) {
        const approvalData = await db.query(`
          SELECT 
            mla.lab_id,
            l.name as lab_name,
            l.code as lab_code,
            mla.status,
            mla.lab_staff_approved_at,
            mla.lab_staff_approved_by,
            ls.name as lab_staff_name,
            ls.salutation as lab_staff_salutation,
            mla.lab_staff_remarks,
            mla.hod_approved_at,
            mla.hod_approved_by,
            h.name as hod_name,
            h.salutation as hod_salutation,
            mla.hod_remarks,
            mlrp.name as responsible_person_name,
            mlrp.email as responsible_person_email
          FROM multi_lab_approvals mla
          JOIN labs l ON mla.lab_id = l.id
          LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
          LEFT JOIN users h ON mla.hod_approved_by = h.id
          LEFT JOIN multi_lab_responsible_persons mlrp ON (mlrp.booking_request_id = mla.booking_request_id AND mlrp.lab_id = mla.lab_id)
          WHERE mla.booking_request_id = ?
          ORDER BY l.code
        `, [booking.id])
        multiLabApprovals = approvalData.rows
      }
      
      const timeline = []
      
      // Determine who rejected (if rejected)
      const isRejected = booking.status === 'rejected'
      const rejectedByLabStaff = isRejected && booking.lab_staff_approved_at && !booking.hod_approved_at
      const rejectedByHOD = isRejected && booking.hod_approved_at
      
      // Lab staff approval step (TnP goes directly to lab staff, no faculty step)
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
        // If rejected by lab staff, show as rejected, otherwise completed
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: rejectedByLabStaff ? 'rejected' : 'completed',
          completed_at: booking.lab_staff_approved_at,
          completed_by: booking.lab_staff_approved_by,
          remarks: booking.lab_staff_remarks,
          user_name: booking.staff_approver_name
        })
      }
      
      // HOD/Lab Coordinator approval step
      const approvalAuthorityLabel = booking.highest_approval_authority === 'lab_coordinator' 
        ? 'Lab Coordinator Approval' 
        : 'HOD Approval'
      
      const finalApproverName = booking.highest_approval_authority === 'lab_coordinator'
        ? booking.lab_coordinator_approver_name
        : booking.hod_approver_name
      
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
        // If rejected by HOD/Lab Coordinator, show as rejected, otherwise completed
        timeline.push({
          step_name: approvalAuthorityLabel,
          step_status: rejectedByHOD ? 'rejected' : 'completed',
          completed_at: booking.hod_approved_at,
          completed_by: booking.hod_approved_by,
          remarks: booking.hod_remarks,
          user_name: finalApproverName
        })
      }

      return {
        id: booking.id,
        lab_name: booking.lab_name,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        purpose: booking.purpose,
        status: booking.status,
        created_at: booking.created_at,
        requested_by: booking.requested_by,
        faculty_supervisor_id: booking.faculty_supervisor_id,
        is_multi_lab: booking.is_multi_lab,
        multi_lab_approvals: multiLabApprovals,
        highest_approval_authority: booking.highest_approval_authority,
        timeline
      }
    }))

    return NextResponse.json({ 
      success: true,
      requests: bookingsWithTimeline
    })
  } catch (error) {
    console.error("Failed to fetch booking timeline:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking timeline" },
      { status: 500 }
    )
  }
}
