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
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const requestId = parseInt(id)

    // Verify this is the faculty's own request and it's issued
    const result = await db.query(
      `SELECT id, status, requester_id, issued_at, returned_at, return_requested_at
       FROM component_requests
       WHERE id = ? AND initiator_role = 'faculty'`,
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

    if (existing.return_requested_at) {
      return NextResponse.json({ error: 'Return already requested' }, { status: 400 })
    }

    // Mark return as requested
    await db.query(
      `UPDATE component_requests
       SET return_requested_at = NOW()
       WHERE id = ?`,
      [requestId]
    )

    // Send email to lab staff
    try {
      const details = await db.query(
        `SELECT r.*, l.name as lab_name,
                u.name as requester_name,
                ls.email as lab_staff_email
         FROM component_requests r
         JOIN labs l ON l.id = r.lab_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users ls ON ls.id = l.staff_id
         WHERE r.id = ?`,
        [requestId]
      )

      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.returnRequested({
          requesterName: req.requester_name,
          requesterRole: 'Faculty',
          labName: req.lab_name,
          requestId: requestId
        })

        await sendEmail({
          to: [req.lab_staff_email],
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send return notification:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error requesting return:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to request return' },
      { status: 500 }
    )
  }
}
