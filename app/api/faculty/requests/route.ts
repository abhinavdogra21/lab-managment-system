import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending_faculty'

    let whereClause = 'WHERE br.faculty_supervisor_id = ? AND br.request_type = \'lab_booking\''
    let params: any[] = [user.userId]

    if (status !== 'all') {
      whereClause += ' AND br.status = ?'
      params.push(status)
    }

    const result = await db.query(`
      SELECT 
        br.id,
        br.requested_by,
        stu.name as student_name,
        stu.email as student_email,
        br.lab_id,
        l.name as lab_name,
        br.booking_date,
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
        h.name as hod_approver_name
      FROM booking_requests br
      LEFT JOIN users stu ON br.requested_by = stu.id
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_approved_by = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      ${whereClause}
      ORDER BY br.created_at DESC
    `, params)

    // Transform data to include timeline information (same as student API)
    const requestsWithTimeline = result.rows.map((request: any) => {
      const timeline = []
      
      // Faculty approval step
      if (request.faculty_approved_at) {
        timeline.push({
          step_name: 'Faculty Approval',
          step_status: 'completed',
          completed_at: request.faculty_approved_at,
          completed_by: request.faculty_approved_by,
          remarks: request.faculty_remarks,
          user_name: request.faculty_approver_name
        })
      } else if (request.status === 'pending_faculty') {
        timeline.push({
          step_name: 'Faculty Approval',
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: null
        })
      }
      
      // Lab staff approval step
      if (request.lab_staff_approved_at) {
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: 'completed',
          completed_at: request.lab_staff_approved_at,
          completed_by: request.lab_staff_approved_by,
          remarks: request.lab_staff_remarks,
          user_name: request.staff_approver_name
        })
      } else if (request.status === 'pending_lab_staff') {
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: 'pending',
          completed_at: null,
        })
      } else if (request.status === 'pending_lab_staff') {
        timeline.push({
          step_name: 'Lab Staff Approval',
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: null
        })
      }
      
      // HOD approval step
      if (request.hod_approved_at) {
        timeline.push({
          step_name: 'HOD Approval',
          step_status: 'completed',
          completed_at: request.hod_approved_at,
          completed_by: request.hod_approved_by,
          remarks: request.hod_remarks,
          user_name: request.hod_approver_name
        })
      } else if (request.status === 'pending_hod') {
        timeline.push({
          step_name: 'HOD Approval',
          step_status: 'pending',
          completed_at: null,
          completed_by: null,
          remarks: null,
          user_name: null
        })
      }
      
      // Rejection step
      if (request.status === 'rejected') {
        timeline.push({
          step_name: 'Rejected',
          step_status: 'completed',
          completed_at: request.rejected_at,
          completed_by: request.rejected_by,
          remarks: request.rejection_reason,
          user_name: null
        })
      }

      return {
        ...request,
        timeline
      }
    })

    return NextResponse.json({ success: true, requests: requestsWithTimeline })
  } catch (error) {
    console.error('Failed to fetch faculty requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
