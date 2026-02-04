/**
 * Cron job to automatically fix multi-lab booking statuses
 * Runs periodically to fix bookings stuck in "pending_lab_staff" 
 * when all lab staff have made their decisions
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-123'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = Database.getInstance()

    // Find multi-lab bookings stuck in pending_lab_staff where all labs have been decided
    const stuckBookings = await db.query(`
      SELECT DISTINCT br.id, d.highest_approval_authority
      FROM booking_requests br
      LEFT JOIN labs l ON br.lab_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      WHERE 
        br.status = 'pending_lab_staff'
        AND br.is_multi_lab = 1
        AND NOT EXISTS (
          SELECT 1 FROM multi_lab_approvals mla
          WHERE mla.booking_request_id = br.id
          AND mla.status = 'pending'
        )
    `)

    let movedToHod = 0
    let movedToRejected = 0
    let movedToApproved = 0

    for (const booking of stuckBookings.rows) {
      const bookingId = booking.id
      const highestAuthority = booking.highest_approval_authority

      // Check if at least one lab was approved
      const approvalCheck = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved
        FROM multi_lab_approvals
        WHERE booking_request_id = ?
      `, [bookingId])

      const approved = Number(approvalCheck.rows[0].approved || 0)

      if (approved > 0) {
        // At least one approved - determine next status based on highest authority
        let nextStatus = 'pending_hod'
        if (highestAuthority === 'lab_coordinator') {
          nextStatus = 'approved' // Lab coordinator auto-approves
          movedToApproved++
        } else {
          movedToHod++
        }
        
        await db.query(`
          UPDATE booking_requests
          SET status = ?,
              lab_staff_approved_at = NOW()
          WHERE id = ?
        `, [nextStatus, bookingId])
        console.log(`[CRON] Fixed booking ${bookingId}: moved to ${nextStatus}`)
      } else {
        // All rejected - mark as rejected
        await db.query(`
          UPDATE booking_requests
          SET status = 'rejected',
              rejected_at = NOW(),
              rejection_reason = 'All labs rejected by lab staff'
          WHERE id = ?
        `, [bookingId])
        movedToRejected++
        console.log(`[CRON] Fixed booking ${bookingId}: marked as rejected`)
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      fixed: movedToHod + movedToRejected + movedToApproved,
      details: {
        movedToHod,
        movedToApproved,
        movedToRejected
      }
    }

    console.log('[CRON] Multi-lab status fix completed:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error("[CRON] Error fixing multi-lab statuses:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
