/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Database } from '@/lib/database'
import { sendEmail, emailTemplates } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = Database.getInstance()
  
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { new_return_date, reason } = body

    if (!new_return_date) {
      return NextResponse.json({ error: 'new_return_date is required' }, { status: 400 })
    }

    const { id } = await params
    const requestId = parseInt(id)

    // Verify this is the student's own request and it's issued
    const result = await db.query(
      `SELECT id, status, requester_id, issued_at, returned_at, return_date, extension_requested_at
       FROM component_requests
       WHERE id = ? AND initiator_role = 'student'`,
      [requestId]
    )
    
    const existing = result.rows[0]

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (existing.requester_id !== user.userId) {
      return NextResponse.json({ error: 'Not your request' }, { status: 403 })
    }

    if (!existing.issued_at) {
      return NextResponse.json({ error: 'Components not issued yet' }, { status: 400 })
    }

    if (existing.returned_at) {
      return NextResponse.json({ error: 'Already returned' }, { status: 400 })
    }

    if (existing.extension_requested_at) {
      return NextResponse.json({ error: 'Extension already requested' }, { status: 400 })
    }

    // Request extension
    await db.query(
      `UPDATE component_requests
       SET extension_requested_at = NOW(),
           extension_requested_until = ?,
           extension_remarks = ?
       WHERE id = ?`,
      [new_return_date, reason || null, requestId]
    )

    // Send email to lab staff
    try {
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name,
                ls.email as lab_staff_email,
                ls.name as lab_staff_name,
                ls.salutation as lab_staff_salutation
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users ls ON ls.id = l.staff_id
         WHERE r.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.extensionRequested({
          requesterName: req.requester_name,
          requesterRole: 'Student',
          labName: req.lab_name,
          requestId: requestId,
          currentReturnDate: req.return_date,
          requestedReturnDate: new_return_date,
          reason: reason || 'No reason provided',
          labStaffName: req.lab_staff_name,
          labStaffSalutation: req.lab_staff_salutation
        })

        await sendEmail({
          to: [req.lab_staff_email],
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send extension request notification:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error requesting extension:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to request extension' },
      { status: 500 }
    )
  }
}
