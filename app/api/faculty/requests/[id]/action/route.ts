import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"
import { isSmtpConfigured, sendMail } from "@/lib/email"

const db = Database.getInstance()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Await params in Next.js 15
    const { id: paramId } = await params
    const id = Number(paramId)
    const body = await request.json()
    const { action, remarks } = body as { action: 'approve' | 'reject', remarks?: string }
    if (!id || !action) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // Ensure faculty owns this request and it's pending_faculty
    const reqRes = await db.query(`SELECT * FROM booking_requests WHERE id = ? AND faculty_supervisor_id = ? AND status = 'pending_faculty'`, [id, user.userId])
    const req = reqRes.rows?.[0]
    if (!req) return NextResponse.json({ error: 'Request not found or not actionable' }, { status: 404 })

    if (action === 'approve') {
      await db.query(
        `UPDATE booking_requests SET status = 'pending_lab_staff', faculty_remarks = ?, faculty_approved_by = ?, faculty_approved_at = NOW() WHERE id = ?`,
        [remarks || null, user.userId, id]
      )

      // Notify next approver? (lab staff assignment unknown). For now, notify student.
      try {
        const smtp = isSmtpConfigured()
        if (smtp.configured) {
          const stu = await db.query(`SELECT email, name FROM users WHERE id = ?`, [req.requested_by])
          const lab = await db.query(`SELECT name FROM labs WHERE id = ?`, [req.lab_id])
          const to = stu.rows?.[0]?.email
          if (to) {
            await sendMail({
              to,
              subject: 'Your lab booking request progressed to Lab Staff',
              html: `<p>Hi ${stu.rows?.[0]?.name || 'Student'},</p><p>Your request for ${lab.rows?.[0]?.name || 'Lab'} on ${req.booking_date} ${req.start_time}-${req.end_time} has been approved by faculty and moved to Lab Staff for review.</p>`
            })
          }
        }
      } catch (e) {
        console.warn('Email notify skipped:', (e as any)?.message || e)
      }

    } else if (action === 'reject') {
      await db.query(
        `UPDATE booking_requests SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW(), faculty_remarks = ? WHERE id = ?`,
        [remarks || 'Rejected by faculty', user.userId, remarks || null, id]
      )

      // Notify student about rejection
      try {
        const smtp = isSmtpConfigured()
        if (smtp.configured) {
          const stu = await db.query(`SELECT email, name FROM users WHERE id = ?`, [req.requested_by])
          const to = stu.rows?.[0]?.email
          if (to) {
            await sendMail({
              to,
              subject: 'Your lab booking request was rejected',
              html: `<p>Hi ${stu.rows?.[0]?.name || 'Student'},</p><p>Your request was rejected by faculty.</p><p>Remarks: ${remarks || 'No remarks provided'}</p>`
            })
          }
        }
      } catch (e) {
        console.warn('Email notify skipped:', (e as any)?.message || e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to take action on request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
