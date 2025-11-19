/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole } from '@/lib/auth'
import { Database } from '@/lib/database'
import { sendEmail, emailTemplates } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = Database.getInstance()
  
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'lab_staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { approved, remarks } = body

    const { id } = await params
    const requestId = parseInt(id)

    // Get the request
    const result = await db.query(
      `SELECT r.id, r.lab_id, r.extension_requested_at, r.extension_requested_until, r.issued_at, r.returned_at
       FROM component_requests r
       WHERE r.id = ?`,
      [requestId]
    )
    
    const existing = result.rows[0]

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (!existing.extension_requested_at) {
      return NextResponse.json({ error: 'No extension requested' }, { status: 400 })
    }

    if (!existing.issued_at || existing.returned_at) {
      return NextResponse.json({ error: 'Request not currently issued' }, { status: 400 })
    }

    if (approved) {
      // Approve extension - update return_date and clear extension fields
      await db.query(
        `UPDATE component_requests
         SET return_date = extension_requested_until,
             extension_approved_by = ?,
             extension_approved_at = NOW(),
             extension_requested_at = NULL,
             extension_requested_until = NULL,
             extension_remarks = NULL
         WHERE id = ?`,
        [user.userId, requestId]
      )

      // Send approval email to requester
      try {
        const details = await db.query(
          `SELECT r.*, l.name as lab_name,
                  u.name as requester_name, u.email as requester_email
           FROM component_requests r
           JOIN labs l ON l.id = r.lab_id
           JOIN users u ON u.id = r.requester_id
           WHERE r.id = ?`,
          [requestId]
        )

        if (details.rows.length > 0) {
          const req = details.rows[0]
          const emailData = emailTemplates.extensionApproved({
            requesterName: req.requester_name,
            labName: req.lab_name,
            requestId: requestId,
            newReturnDate: existing.extension_requested_until
          })

          await sendEmail({
            to: [req.requester_email],
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      } catch (emailError) {
        console.error('Failed to send extension approval notification:', emailError)
      }
    } else {
      // Reject extension - save rejection remarks, clear extension request
      await db.query(
        `UPDATE component_requests
         SET extension_requested_at = NULL,
             extension_requested_until = NULL,
             extension_remarks = ?
         WHERE id = ?`,
        [remarks || 'Extension request rejected', requestId]
      )

      // Send rejection email to requester
      try {
        const details = await db.query(
          `SELECT r.*, l.name as lab_name,
                  u.name as requester_name, u.email as requester_email
           FROM component_requests r
           JOIN labs l ON l.id = r.lab_id
           JOIN users u ON u.id = r.requester_id
           WHERE r.id = ?`,
          [requestId]
        )

        if (details.rows.length > 0) {
          const req = details.rows[0]
          const emailData = emailTemplates.extensionRejected({
            requesterName: req.requester_name,
            labName: req.lab_name,
            requestId: requestId,
            remarks: remarks || 'Extension request rejected'
          })

          await sendEmail({
            to: [req.requester_email],
            ...emailData
          }).catch(err => console.error('Email send failed:', err))
        }
      } catch (emailError) {
        console.error('Failed to send extension rejection notification:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error processing extension:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process extension' },
      { status: 500 }
    )
  }
}
