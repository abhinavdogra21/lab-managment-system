import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

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
    
    // Get booking requests with timeline information
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
    `, [studentId])

    // Transform data to include timeline information
    const bookingsWithTimeline = result.rows.map((booking: any) => {
      const timeline = []
      
      // Determine who rejected (if rejected)
      const isRejected = booking.status === 'rejected'
      const rejectedByFaculty = isRejected && booking.faculty_approved_at && !booking.lab_staff_approved_at && !booking.hod_approved_at
      const rejectedByLabStaff = isRejected && booking.lab_staff_approved_at && !booking.hod_approved_at
      const rejectedByHOD = isRejected && booking.hod_approved_at
      
      // Faculty approval step
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
          step_status: rejectedByFaculty ? 'rejected' : 'completed',
          completed_at: booking.faculty_approved_at,
          completed_by: booking.faculty_approved_by,
          remarks: booking.faculty_remarks,
          user_name: booking.faculty_approver_name || booking.faculty_name
        })
      }
      
      // Lab staff approval step
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
      
      // HOD/Lab Coordinator approval step
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

      return {
        id: booking.id,
        lab_name: booking.lab_name,
        faculty_name: booking.faculty_name,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        purpose: booking.purpose,
        status: booking.status,
        created_at: booking.created_at,
        highest_approval_authority: booking.highest_approval_authority,
        timeline
      }
    })

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
