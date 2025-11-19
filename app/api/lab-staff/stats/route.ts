/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET() {
  try {
    const db = Database.getInstance()

    // Get various counts for lab staff dashboard
    const queries = await Promise.all([
      // Pending lab staff approvals
      db.query("SELECT COUNT(*) as count FROM booking_requests WHERE status = 'pending_lab_staff'"),
      
      // Total requests approved by lab staff this month
      db.query(`
        SELECT COUNT(*) as count 
        FROM booking_requests 
        WHERE staff_approved_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND status IN ('pending_hod', 'approved')
      `),
      
      // Total requests rejected by lab staff this month
      db.query(`
        SELECT COUNT(*) as count 
        FROM booking_requests 
        WHERE staff_approved_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND status = 'rejected'
        AND rejected_by IS NOT NULL
      `),
      
      // Recent activity - requests processed in last 7 days
      db.query(`
        SELECT COUNT(*) as count 
        FROM booking_requests 
        WHERE staff_approved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `)
    ])

    const stats = {
      pendingApprovals: queries[0].rows[0].count,
      approvedThisMonth: queries[1].rows[0].count,
      rejectedThisMonth: queries[2].rows[0].count,
      recentActivity: queries[3].rows[0].count
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error("Error fetching lab staff stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
