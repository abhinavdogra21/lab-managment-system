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

  // Get labs assigned to this staff
  const assignedLabsRes = await db.query("SELECT lab_id FROM lab_staff_assignments WHERE staff_id = ?", [userId])
  const assignedLabIds = assignedLabsRes.rows.map((row: any) => row.lab_id)
  console.log('Lab Staff API Debug:', { userId, assignedLabIds })
  if (assignedLabIds.length === 0) {
    return NextResponse.json({ success: true, requests: [] })
  }

    let query = `
      SELECT 
        br.*,
        u.name as student_name,
        u.email as student_email,
        u.role as requester_role,
        u.salutation as requester_salutation,
        l.name as lab_name,
        f.name as faculty_name,
        s.name as staff_approver_name,
        h.name as hod_approver_name
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      JOIN labs l ON br.lab_id = l.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users s ON br.lab_staff_approved_by = s.id
      LEFT JOIN users h ON br.hod_approved_by = h.id
      WHERE br.lab_id IN (${assignedLabIds.map(() => '?').join(',')})
        AND (l.staff_id IS NULL OR l.staff_id = ?)
    `
    const params: any[] = [...assignedLabIds, userId]

    if (status === "pending_lab_staff") {
      query += " AND br.status = ?"
      params.push("pending_lab_staff")
    } else if (status === "all") {
      query += " AND br.status IN (?, ?, ?, ?)"
      params.push("pending_lab_staff", "pending_hod", "approved", "rejected")
    } else if (status === "approved") {
      query += " AND br.status IN (?, ?)"
      params.push("pending_hod", "approved")
    } else if (status === "rejected") {
      query += " AND br.status = ?"
      params.push("rejected")
    }

    query += " ORDER BY br.created_at DESC"

    const result = await db.query(query, params)
  console.log('Lab Staff API Debug: requests found', result.rows.length)
    const requests = result.rows
  console.log('Lab Staff API Debug: requests found', requests.length)

    // Build timeline for each request
    const requestsWithTimeline = await Promise.all(
      requests.map(async (request: any) => {
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
