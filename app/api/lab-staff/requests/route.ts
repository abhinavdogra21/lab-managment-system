/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

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
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending_lab_staff"
    const db = Database.getInstance()

    // Get lab staff user ID from token
    const cookieStore = await import('next/headers').then(m => m.cookies())
    const token = cookieStore.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    let decoded, userId
    try {
      decoded = JSON.parse(decodeURIComponent(token))
      userId = decoded.userId
    } catch (err) {
      console.error('Lab Staff API: Invalid token format')
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

  // Get labs where this user is the HEAD lab staff
  const assignedLabsRes = await db.query("SELECT id FROM labs WHERE staff_id = ?", [userId])
  const assignedLabIds = assignedLabsRes.rows.map((row: any) => row.id)
  if (assignedLabIds.length === 0) {
    return NextResponse.json({ success: true, requests: [] })
  }

    // Build the main query with status filter
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
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status = ?)
        OR
        (br.is_multi_lab = 1 AND mla.status = 'pending' AND br.status NOT IN ('rejected', 'cancelled'))
      )`
      params.push("pending_lab_staff")
    } else if (status === "all") {
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
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status IN (?, ?))
        OR
        (br.is_multi_lab = 1 AND mla.status IN ('approved_by_lab_staff', 'approved') AND br.status NOT IN ('rejected', 'cancelled'))
      )`
      params.push("pending_hod", "approved")
    } else if (status === "rejected") {
      query += ` AND (
        (br.is_multi_lab = 0 AND br.status = ? AND br.lab_staff_approved_by IS NOT NULL)
        OR
        (br.is_multi_lab = 1 AND mla.status = 'rejected')
      )`
      params.push("rejected")
    }

    query += " ORDER BY br.created_at DESC"

    const result = await db.query(query, params)
    const requests = result.rows

    // ── BATCH: Collect all multi-lab booking IDs and fetch their data in ONE query each ──
    const multiLabBookingIds = requests
      .filter((b: any) => b.is_multi_lab === 1 || b.is_multi_lab === true)
      .map((b: any) => b.id)

    let allLabNames: any[] = []
    let allApprovals: any[] = []
    let allResponsiblePersons: any[] = []

    if (multiLabBookingIds.length > 0) {
      const ph = multiLabBookingIds.map(() => '?').join(',')

      // Collect all unique lab IDs from all multi-lab bookings
      const allLabIds = new Set<number>()
      for (const booking of requests) {
        if (booking.is_multi_lab === 1 || booking.is_multi_lab === true) {
          let labIds: number[] = []
          try {
            if (Array.isArray(booking.lab_ids)) labIds = booking.lab_ids
            else if (Buffer.isBuffer(booking.lab_ids)) labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
            else if (typeof booking.lab_ids === 'string') labIds = JSON.parse(booking.lab_ids)
          } catch {}
          labIds.forEach(id => allLabIds.add(id))
        }
      }

      if (allLabIds.size > 0) {
        const labPh = Array.from(allLabIds).map(() => '?').join(',')
        const labNamesRes = await db.query(
          `SELECT id, name, code FROM labs WHERE id IN (${labPh}) ORDER BY code`,
          Array.from(allLabIds)
        )
        allLabNames = labNamesRes.rows
      }

      // Batch fetch all approvals for all multi-lab bookings
      const [approvalsRes, rpRes] = await Promise.all([
        db.query(`
          SELECT mla.*, l.name as lab_name, l.code as lab_code,
                 ls.name as lab_staff_name, h.name as hod_name
          FROM multi_lab_approvals mla
          JOIN labs l ON mla.lab_id = l.id
          LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
          LEFT JOIN users h ON mla.hod_approved_by = h.id
          WHERE mla.booking_request_id IN (${ph})
          ORDER BY l.code
        `, multiLabBookingIds),
        db.query(`
          SELECT booking_request_id, lab_id, name, email
          FROM multi_lab_responsible_persons
          WHERE booking_request_id IN (${ph})
          ORDER BY lab_id
        `, multiLabBookingIds)
      ])
      allApprovals = approvalsRes.rows
      allResponsiblePersons = rpRes.rows
    }

    // Build lab name lookup
    const labNameMap = new Map<number, string>(allLabNames.map((l: any) => [l.id, l.name]))

    // ── Assemble results in memory (no more DB queries) ──
    const requestsWithTimeline = requests.map((request: any) => {
      if (request.is_multi_lab === 1 || request.is_multi_lab === true) {
        let labIds: number[] = []
        try {
          if (Array.isArray(request.lab_ids)) labIds = request.lab_ids
          else if (Buffer.isBuffer(request.lab_ids)) labIds = JSON.parse(request.lab_ids.toString('utf-8'))
          else if (typeof request.lab_ids === 'string') labIds = JSON.parse(request.lab_ids)
        } catch {}

        request.lab_names = labIds.map(id => labNameMap.get(id) || `Lab ${id}`).join(', ')

        // Filter approvals and RPs for this booking
        const bookingApprovals = allApprovals.filter((a: any) => a.booking_request_id === request.id)
        const bookingRPs = allResponsiblePersons.filter((rp: any) => rp.booking_request_id === request.id)

        request.multi_lab_approvals = bookingApprovals.map((approval: any) => {
          const responsible = bookingRPs.find((rp: any) => rp.lab_id === approval.lab_id)
          return {
            ...approval,
            responsible_person_name: responsible?.name,
            responsible_person_email: responsible?.email
          }
        })
      }

      // Build timeline (pure in-memory, no DB)
      const timeline: any[] = []

      timeline.push({
        step_name: 'Submission',
        step_status: 'completed',
        completed_at: request.created_at,
        completed_by: request.student_id,
        remarks: null,
        user_name: request.student_name
      })

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
          completed_at: null, completed_by: null, remarks: null, user_name: null
        })
      }

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
          completed_at: null, completed_by: null, remarks: null, user_name: null
        })
      }

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
          completed_at: null, completed_by: null, remarks: null, user_name: null
        })
      }

      return {
        ...request,
        student_name: formatRequesterName(request.student_name, request.requester_salutation),
        timeline
      }
    })

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
