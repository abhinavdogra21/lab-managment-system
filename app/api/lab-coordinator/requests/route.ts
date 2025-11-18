import { type NextRequest, NextResponse } from "next/server"
import { dbOperations, Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_coordinator", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const db = Database.getInstance()

    // For lab coordinators, get their department(s) by lab_coordinator_id
    let departmentIds: number[] = []
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE lab_coordinator_id = ?`,
        [Number(user.userId)]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        return NextResponse.json({ requests: [], total: 0 })
      }
    }

    // Get requests that need Lab Coordinator or HOD approval from the user's department
    // Only show requests where Lab Coordinator is the actual approver
    let query = `
      SELECT DISTINCT
        br.id,
        br.booking_date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.status,
        br.created_at,
        br.requested_by,
        br.faculty_supervisor_id,
        br.faculty_remarks,
        br.lab_staff_remarks,
        br.hod_remarks,
        br.faculty_approved_at,
        br.lab_staff_approved_at,
        br.lab_staff_approved_by,
        br.hod_approved_at,
        br.is_multi_lab,
        br.lab_ids,
        br.responsible_person_name,
        br.responsible_person_email,
        s.name as student_name,
        s.email as student_email,
        s.role as requester_role,
        f.name as faculty_name,
        l.name as lab_name,
        ls.name as lab_staff_name,
        d.highest_approval_authority
      FROM booking_requests br
      JOIN users s ON br.requested_by = s.id
      LEFT JOIN users f ON br.faculty_supervisor_id = f.id
      LEFT JOIN users ls ON br.lab_staff_approved_by = ls.id
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
    `

    const params: any[] = []

    // Add department filter for non-admin users
    if (user.role !== 'admin') {
      query += ` WHERE d.id IN (${departmentIds.map(() => '?').join(',')})`
      params.push(...departmentIds)
      // IMPORTANT: Only show requests where Lab Coordinator should approve
      query += ` AND d.highest_approval_authority = 'lab_coordinator' AND d.lab_coordinator_id IS NOT NULL`
    } else {
      query += ` WHERE 1=1`
    }

    if (status && status !== 'all') {
      if (status === 'rejected') {
        // For rejected status, only show requests rejected BY HOD/Lab Coordinator
        query += ` AND br.status = 'rejected' AND br.hod_approved_by IS NOT NULL`
      } else {
        // specific status requested
        query += ` AND br.status = ?`
        params.push(status)
      }
    } else if (status === 'all') {
      // For 'all' status, only show requests that reached HOD/Lab Coordinator level
      query += ` AND (br.status = 'pending_hod' OR br.status = 'approved' OR (br.status = 'rejected' AND br.hod_approved_by IS NOT NULL))`
    } else {
      // Default: show requests waiting for HOD/Lab Coordinator approval when no status provided
      query += ` AND br.status = 'pending_hod'`
    }

    query += ` ORDER BY br.created_at DESC LIMIT 50`

    const result = await db.query(query, params)
    
    // Fetch multi-lab approval details for multi-lab bookings
    const requestsWithMultiLabData = await Promise.all(
      result.rows.map(async (request: any) => {
        if (request.is_multi_lab) {
          // Fetch multi-lab approvals with remarks and timestamps
          const approvalsResult = await db.query(
            `SELECT 
              mla.lab_id,
              mla.status,
              mla.lab_staff_approved_by,
              mla.lab_staff_approved_at,
              mla.lab_staff_remarks,
              mla.hod_approved_by,
              l.name as lab_name,
              ls.name as lab_staff_name
            FROM multi_lab_approvals mla
            LEFT JOIN labs l ON l.id = mla.lab_id
            LEFT JOIN users ls ON ls.id = mla.lab_staff_approved_by
            WHERE mla.booking_request_id = ?`,
            [request.id]
          )
          
          // Fetch responsible persons
          const responsiblePersonsResult = await db.query(
            `SELECT lab_id, name, email
            FROM multi_lab_responsible_persons
            WHERE booking_request_id = ?`,
            [request.id]
          )
          
          // Merge responsible person data into approvals
          const approvalsWithResponsiblePerson = approvalsResult.rows.map((approval: any) => {
            const responsiblePerson = responsiblePersonsResult.rows.find((rp: any) => rp.lab_id === approval.lab_id)
            return {
              ...approval,
              responsible_person_name: responsiblePerson?.name || null,
              responsible_person_email: responsiblePerson?.email || null
            }
          })
          
          return {
            ...request,
            multi_lab_approvals: approvalsWithResponsiblePerson
          }
        }
        return request
      })
    )
    
    return NextResponse.json({ 
      requests: requestsWithMultiLabData,
      total: requestsWithMultiLabData.length
    })
  } catch (error) {
    console.error("Error fetching Lab Coordinator requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
