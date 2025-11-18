import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

// Helper function to format requester name with salutation
function formatRequesterName(name: string, salutation: string | null): string {
  if (!salutation || salutation === 'none') {
    return name
  }
  
  const salutationMap: { [key: string]: string } = {
    'prof': 'Prof.',
    'dr': 'Dr.',
    'mr': 'Mr.',
    'mrs': 'Mrs.'
  }
  
  const formattedSalutation = salutationMap[salutation.toLowerCase()]
  return formattedSalutation ? `${formattedSalutation} ${name}` : name
}

export async function GET(request: NextRequest) {
  // ...existing code...
  // Debug logging will be placed after userId and assignedLabIds are defined
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending_lab_staff"
    const db = Database.getInstance()

    // Get lab staff user ID from token (reuse logic from action route)
    const cookieStore = await import('next/headers').then(m => m.cookies())
    const token = cookieStore.get('auth-token')?.value
    console.log('Lab Staff API Debug: raw token', token)
    if (!token) {
      console.error('Lab Staff API Debug: No auth-token cookie found')
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    let decoded, userId
    try {
      decoded = JSON.parse(decodeURIComponent(token))
      userId = decoded.userId
    } catch (err) {
      console.error('Lab Staff API Debug: Error decoding token', err, token)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

  // Get labs where this user is the HEAD lab staff (not just assigned)
  const assignedLabsRes = await db.query("SELECT id FROM labs WHERE staff_id = ?", [userId])
  const assignedLabIds = assignedLabsRes.rows.map((row: any) => row.id)
  console.log('Lab Staff API Debug:', { userId, assignedLabIds })
  if (assignedLabIds.length === 0) {
    return NextResponse.json({ success: true, requests: [] })
  }

    // First, get all bookings where this lab staff is involved
    // For single-lab: lab_id matches
    // For multi-lab: check multi_lab_approvals table
    let query = `
      SELECT DISTINCT
        br.*,
        u.name as student_name,
        u.email as student_email,
        u.role as requester_role,
        u.salutation as requester_salutation,
        l.name as lab_name,
        l.department_id,
        d.highest_approval_authority,
        f.name as faculty_name,
        f.salutation as faculty_salutation,
        s.name as staff_approver_name,
        h.name as hod_approver_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON d.id = l.department_id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      LEFT JOIN multi_lab_approvals mla ON (br.id = mla.booking_request_id AND mla.lab_id IN (${assignedLabIds.map(() => '?').join(',')}))
      WHERE (
        (br.is_multi_lab = 0 AND br.lab_id IN (${assignedLabIds.map(() => '?').join(',')}))
        OR
        (br.is_multi_lab = 1 AND mla.lab_id IN (${assignedLabIds.map(() => '?').join(',')}))
      )
    `
    const params: any[] = [...assignedLabIds, ...assignedLabIds, ...assignedLabIds]

    if (status === "pending_lab_staff") {
      // For single-lab: check booking_requests.status
      // For multi-lab: check if THIS specific lab's status in multi_lab_approvals is 'pending' AND overall status is NOT rejected
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status = ?)
        OR
        (br.is_multi_lab = 1 AND mla.status = 'pending' AND br.status NOT IN ('rejected', 'cancelled'))
      )`
      params.push("pending_lab_staff")
    } else if (status === "all") {
      // Lab staff should only see requests that reached them (not rejected by faculty before reaching lab staff)
      // For single-lab: show all statuses BUT only rejected ones where lab staff took action
      // For multi-lab: filter out overall rejected status
      query += ` AND (
        (br.is_multi_lab = 0 AND (
          br.status IN (?, ?, ?) 
          OR (br.status = ? AND br.lab_staff_approved_by IS NOT NULL)
        ))
        OR
        (br.is_multi_lab = 1 AND br.status NOT IN ('rejected', 'cancelled'))
      )`
      params.push("pending_lab_staff", "pending_hod", "approved", "rejected")
    } else if (status === "approved") {
      // For multi-lab: show only if THIS lab's status is 'approved_by_lab_staff' or 'approved' AND overall status is NOT rejected
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status IN (?, ?))
        OR
        (br.is_multi_lab = 1 AND mla.status IN ('approved_by_lab_staff', 'approved') AND br.status NOT IN ('rejected', 'cancelled'))
      )`
      params.push("pending_hod", "approved")
    } else if (status === "rejected") {
      // Lab staff should only see requests they rejected, not ones rejected by faculty
      // For single-lab: status='rejected' AND lab_staff_approved_by IS NOT NULL (meaning lab staff took action)
      // For multi-lab: mla.status='rejected' (this lab's approval was rejected by lab staff)
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status = ? AND br.lab_staff_approved_by IS NOT NULL)
        OR
        (br.is_multi_lab = 1 AND mla.status = 'rejected')
      )`
      params.push("rejected")
    }

    query += " ORDER BY br.created_at DESC"

    const result = await db.query(query, params)
  console.log('Lab Staff API Debug: requests found', result.rows.length)
    const requests = result.rows
  console.log('Lab Staff API Debug: requests found', requests.length)

    // Fetch multi-lab details for multi-lab bookings
    const requestsWithMultiLabData = await Promise.all(
      requests.map(async (booking: any) => {
        if (booking.is_multi_lab === 1 || booking.is_multi_lab === true) {
          // Parse lab_ids
          let labIds: number[] = []
          if (Array.isArray(booking.lab_ids)) {
            labIds = booking.lab_ids
          } else if (Buffer.isBuffer(booking.lab_ids)) {
            labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
          } else if (typeof booking.lab_ids === 'string') {
            labIds = JSON.parse(booking.lab_ids)
          }

          // Get all lab names
          if (labIds.length > 0) {
            const labNamesResult = await db.query(
              `SELECT id, name, code FROM labs WHERE id IN (${labIds.map(() => '?').join(',')}) ORDER BY code`,
              labIds
            )
            booking.lab_names = labNamesResult.rows.map((l: any) => l.name).join(', ')

            // Get multi-lab approval details
            const approvalsResult = await db.query(
              `SELECT mla.*, l.name as lab_name, l.code as lab_code,
                      ls.name as lab_staff_name, h.name as hod_name
               FROM multi_lab_approvals mla
               JOIN labs l ON mla.lab_id = l.id
               LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
               LEFT JOIN users h ON mla.hod_approved_by = h.id
               WHERE mla.booking_request_id = ?
               ORDER BY l.code`,
              [booking.id]
            )
            booking.multi_lab_approvals = approvalsResult.rows
            
            // Fetch responsible persons for each lab
            const responsiblePersonsResult = await db.query(
              `SELECT lab_id, name, email
               FROM multi_lab_responsible_persons
               WHERE booking_request_id = ?
               ORDER BY lab_id`,
              [booking.id]
            )
            
            // Add responsible person to each approval
            booking.multi_lab_approvals = booking.multi_lab_approvals.map((approval: any) => {
              const responsible = responsiblePersonsResult.rows.find((rp: any) => rp.lab_id === approval.lab_id)
              return {
                ...approval,
                responsible_person_name: responsible?.name,
                responsible_person_email: responsible?.email
              }
            })
          }
        }
        return booking
      })
    )

    // Build timeline for each request
    const requestsWithTimeline = await Promise.all(
      requestsWithMultiLabData.map(async (request: any) => {
        const timeline: any[] = []

        // Submission step
        timeline.push({
          step_name: 'Submission',
          step_status: 'completed',
          completed_at: request.created_at,
          completed_by: request.student_id,
          remarks: null,
          user_name: request.student_name
        })

        // Faculty approval step
        if (request.faculty_approved_at) {
          timeline.push({
            step_name: 'Faculty Approval',
            step_status: 'completed',
            completed_at: request.faculty_approved_at,
            completed_by: request.faculty_approved_by,
            remarks: request.faculty_remarks,
            user_name: request.faculty_name
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

        return {
          ...request,
          student_name: formatRequesterName(request.student_name, request.requester_salutation),
          timeline
        }
      })
    )

    return NextResponse.json({
      success: true,
      requests: requestsWithTimeline
    })

  } catch (error) {
    console.error("Error fetching lab staff requests:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    )
  }
}
