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
        br.is_multi_lab,
        br.lab_ids,
        f.name as faculty_approver_name,
        s.name as staff_approver_name,
        h.name as hod_approver_name,
        lc.name as lab_coordinator_approver_name,
        d.highest_approval_authority
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u ON br.faculty_supervisor_id = u.id
      LEFT JOIN users f ON br.faculty_approved_by = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      LEFT JOIN users lc ON d.lab_coordinator_id = lc.id
      WHERE br.requested_by = ? AND br.request_type = 'lab_booking'
      ORDER BY br.created_at DESC
    `, [studentId])

    // Transform data to include timeline information
    const bookingsWithTimeline = await Promise.all(result.rows.map(async (booking: any) => {
      const timeline = []
      
      // For multi-lab bookings, get all labs and their approval details
      let labNames = booking.lab_name
      let multiLabApprovals: any[] = []
      
      console.log(`Booking ${booking.id}: is_multi_lab=${booking.is_multi_lab}, lab_ids=${booking.lab_ids}, type=${typeof booking.lab_ids}`)
      
      // Check if multi-lab (handle both boolean and number 1)
      if ((booking.is_multi_lab === 1 || booking.is_multi_lab === true) && booking.lab_ids) {
        try {
          // Handle different formats of lab_ids (JSON column can return as array, string, or Buffer)
          let labIds: number[]
          
          if (Array.isArray(booking.lab_ids)) {
            // Already parsed as array
            labIds = booking.lab_ids
          } else if (Buffer.isBuffer(booking.lab_ids)) {
            // Buffer - convert to string then parse
            const labIdsStr = booking.lab_ids.toString('utf-8')
            labIds = JSON.parse(labIdsStr)
          } else if (typeof booking.lab_ids === 'string') {
            // String - parse as JSON
            labIds = JSON.parse(booking.lab_ids)
          } else {
            console.error(`Unexpected lab_ids type: ${typeof booking.lab_ids}`)
            labIds = []
          }
          
          console.log(`Booking ${booking.id}: Multi-lab with IDs:`, labIds)
          
          // Only proceed if we have valid lab IDs
          if (!labIds || labIds.length === 0) {
            console.error(`Booking ${booking.id}: No valid lab IDs found`)
            throw new Error('No valid lab IDs')
          }
          
          // Get all lab names
          const labNamesResult = await db.query(`
            SELECT id, name, code
            FROM labs
            WHERE id IN (${labIds.map(() => '?').join(',')})
            ORDER BY code
          `, labIds)
          
          labNames = labNamesResult.rows.map((l: any) => l.name).join(', ')
          console.log(`Booking ${booking.id}: Lab names:`, labNames)
          
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
              h.name as hod_name
            FROM multi_lab_approvals mla
            JOIN labs l ON mla.lab_id = l.id
            LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
            LEFT JOIN users h ON mla.hod_approved_by = h.id
            WHERE mla.booking_request_id = ?
            ORDER BY l.code
          `, [booking.id])
          
          multiLabApprovals = approvalsResult.rows
          console.log(`Booking ${booking.id}: Found ${multiLabApprovals.length} multi-lab approvals`)
          
          // Fetch responsible persons for each lab
          const responsiblePersonsResult = await db.query(`
            SELECT lab_id, name, email
            FROM multi_lab_responsible_persons
            WHERE booking_request_id = ?
            ORDER BY lab_id
          `, [booking.id])
          
          // Add responsible person to each approval
          multiLabApprovals = multiLabApprovals.map(approval => {
            const responsible = responsiblePersonsResult.rows.find((rp: any) => rp.lab_id === approval.lab_id)
            return {
              ...approval,
              responsible_person_name: responsible?.name,
              responsible_person_email: responsible?.email
            }
          })
        } catch (e) {
          console.error('Error parsing multi-lab data:', e)
        }
      } else {
        console.log(`Booking ${booking.id}: NOT multi-lab or no lab_ids`)
      }
      
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

    console.log('Returning bookings:', bookingsWithTimeline.map(b => ({ id: b.id, lab_name: b.lab_name, is_multi_lab: b.is_multi_lab })))

    return NextResponse.json({ 
      success: true,
      requests: bookingsWithTimeline
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    console.error("Failed to fetch booking timeline:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking timeline" },
      { status: 500 }
    )
  }
}
