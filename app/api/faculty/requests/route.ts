/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

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
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim())
        whereClause += ` AND br.status IN (${statuses.map(() => '?').join(',')})`
        params.push(...statuses)
      } else {
        whereClause += ' AND br.status = ?'
        params.push(status)
      }
    }

    const result = await db.query(`
      SELECT 
        br.id,
        br.requested_by,
        stu.name as student_name,
        stu.salutation as student_salutation,
        stu.email as student_email,
        br.lab_id,
        l.name as lab_name,
        l.department_id,
        d.highest_approval_authority,
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
        br.is_multi_lab,
        br.lab_ids,
        br.responsible_person_name,
        br.responsible_person_email,
        f.name as faculty_approver_name,
        s.name as staff_approver_name,
        h.name as hod_approver_name
      FROM booking_requests br
      LEFT JOIN users stu ON br.requested_by = stu.id
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON d.id = l.department_id
      LEFT JOIN users f ON br.faculty_approved_by = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      ${whereClause}
      ORDER BY br.created_at DESC
    `, params)

    // Transform data to include timeline and multi-lab information
    const requestsWithTimeline = await Promise.all(result.rows.map(async (request: any) => {
      // Handle multi-lab bookings - get all lab names and approvals
      let labNames = request.lab_name
      let multiLabApprovals: any[] = []
      
      if ((request.is_multi_lab === 1 || request.is_multi_lab === true) && request.lab_ids) {
        try {
          // Handle different formats of lab_ids
          let labIds: number[]
          if (Array.isArray(request.lab_ids)) {
            labIds = request.lab_ids
          } else if (Buffer.isBuffer(request.lab_ids)) {
            labIds = JSON.parse(request.lab_ids.toString('utf-8'))
          } else if (typeof request.lab_ids === 'string') {
            labIds = JSON.parse(request.lab_ids)
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
                mla.hod_approved_at,
                mla.hod_approved_by,
                mlrp.name as responsible_person_name,
                mlrp.email as responsible_person_email,
                l.name as lab_name,
                l.code as lab_code,
                ls.name as lab_staff_name,
                h.name as hod_name
              FROM multi_lab_approvals mla
              JOIN labs l ON mla.lab_id = l.id
              LEFT JOIN multi_lab_responsible_persons mlrp ON (mlrp.booking_request_id = mla.booking_request_id AND mlrp.lab_id = mla.lab_id)
              LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
              LEFT JOIN users h ON mla.hod_approved_by = h.id
              WHERE mla.booking_request_id = ?
              ORDER BY l.code
            `, [request.id])
            
            multiLabApprovals = approvalsResult.rows
          }
        } catch (e) {
          console.error('Error parsing multi-lab data for faculty requests:', e)
        }
      }
      
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
      
      // HOD/Lab Coordinator approval step (dynamic based on department settings)
      const approvalAuthorityLabel = request.highest_approval_authority === 'lab_coordinator'
        ? 'Lab Coordinator Approval'
        : 'HOD Approval'
      
      if (request.hod_approved_at) {
        timeline.push({
          step_name: approvalAuthorityLabel,
          step_status: 'completed',
          completed_at: request.hod_approved_at,
          completed_by: request.hod_approved_by,
          remarks: request.hod_remarks,
          user_name: request.hod_approver_name
        })
      } else if (request.status === 'pending_hod') {
        timeline.push({
          step_name: approvalAuthorityLabel,
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
        lab_name: labNames,
        is_multi_lab: request.is_multi_lab,
        multi_lab_approvals: multiLabApprovals,
        lab_staff_name: request.staff_approver_name,
        hod_name: request.hod_approver_name,
        timeline
      }
    }))

    return NextResponse.json({ success: true, requests: requestsWithTimeline })
  } catch (error) {
    console.error('Failed to fetch faculty requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
