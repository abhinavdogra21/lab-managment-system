/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["hod", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const db = Database.getInstance()

    // For non-admin HODs, get their department(s) by hod_id or hod_email
    let departmentIds: number[] = []
    let departmentFilter = ''
    let deptParams: any[] = []
    
    if (user.role !== 'admin') {
      const depRes = await db.query(
        `SELECT id FROM departments WHERE hod_id = ? OR LOWER(hod_email) = LOWER(?)`,
        [Number(user.userId), String(user.email || '')]
      )
      departmentIds = depRes.rows.map((d: any) => Number(d.id))
      
      if (departmentIds.length === 0) {
        // No departments found, return zeros
        return NextResponse.json({
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          departmentLabs: 0,
          activeFaculty: 0,
          monthlyBookings: 0
        })
      }
      
      departmentFilter = `d.id IN (${departmentIds.map(() => '?').join(',')})`
      deptParams = departmentIds
    } else {
      departmentFilter = '1=1'
      deptParams = []
    }

    // Get pending requests count for HOD's department
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE ${departmentFilter} AND br.status = 'pending_hod'
    `
    const pendingResult = await db.query(pendingQuery, deptParams)
    const pending = pendingResult.rows[0]?.count || 0

    // Get total approved requests this month
    const approvedQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE ${departmentFilter} AND br.status = 'approved' 
      AND MONTH(br.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(br.created_at) = YEAR(CURRENT_DATE())
    `
    const approvedResult = await db.query(approvedQuery, deptParams)
    const approved = approvedResult.rows[0]?.count || 0

    // Get total rejected requests this month
    const rejectedQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE ${departmentFilter} AND br.status = 'rejected'
      AND MONTH(br.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(br.created_at) = YEAR(CURRENT_DATE())
    `
    const rejectedResult = await db.query(rejectedQuery, deptParams)
    const rejected = rejectedResult.rows[0]?.count || 0

    // Get department labs count
    const labsQuery = `
      SELECT COUNT(*) as count
      FROM labs l
      JOIN departments d ON l.department_id = d.id
      WHERE ${departmentFilter}
    `
    const labsResult = await db.query(labsQuery, deptParams)
    const departmentLabs = labsResult.rows[0]?.count || 0

    // Get active faculty count in department
    let activeFaculty = 0
    if (user.role !== 'admin' && departmentIds.length > 0) {
      // For faculty, we need to use department name from users table
      const deptNames = await db.query(
        `SELECT name FROM departments WHERE id IN (${departmentIds.map(() => '?').join(',')})`,
        departmentIds
      )
      const deptNamesList = deptNames.rows.map((d: any) => d.name)
      
      if (deptNamesList.length > 0) {
        const facultyQuery = `
          SELECT COUNT(*) as count
          FROM users
          WHERE role = 'faculty' AND department IN (${deptNamesList.map(() => '?').join(',')})
        `
        const facultyResult = await db.query(facultyQuery, deptNamesList)
        activeFaculty = facultyResult.rows[0]?.count || 0
      }
    } else if (user.role === 'admin') {
      const facultyQuery = `SELECT COUNT(*) as count FROM users WHERE role = 'faculty'`
      const facultyResult = await db.query(facultyQuery, [])
      activeFaculty = facultyResult.rows[0]?.count || 0
    }

    // Get monthly bookings count
    const monthlyQuery = `
      SELECT COUNT(*) as count
      FROM booking_requests br
      JOIN labs l ON br.lab_id = l.id
      JOIN departments d ON l.department_id = d.id
      WHERE ${departmentFilter}
      AND MONTH(br.booking_date) = MONTH(CURRENT_DATE())
      AND YEAR(br.booking_date) = YEAR(CURRENT_DATE())
    `
    const monthlyResult = await db.query(monthlyQuery, deptParams)
    const monthlyBookings = monthlyResult.rows[0]?.count || 0

    return NextResponse.json({
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
      departmentLabs,
      activeFaculty,
      monthlyBookings
    })
  } catch (error) {
    console.error("Error fetching HOD analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
