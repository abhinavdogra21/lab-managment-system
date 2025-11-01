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

    // Verify this is the faculty's own request and it's pending
    const result = await db.query(
      `SELECT id, status, requester_id, issued_at
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

    if (!existing.status.includes('pending')) {
      return NextResponse.json({ error: 'Can only withdraw pending requests' }, { status: 400 })
    }

    if (existing.issued_at) {
      return NextResponse.json({ error: 'Cannot withdraw issued requests' }, { status: 400 })
    }

    // Get request details before deletion for email
    const details = await db.query(
      `SELECT r.*, l.name as lab_name, l.email as lab_email,
              u.name as requester_name
       FROM component_requests r
       JOIN labs l ON l.id = r.lab_id
       JOIN users u ON u.id = r.requester_id
       WHERE r.id = ?`,
      [requestId]
    )

    // Delete the request and its items
    await db.query(`DELETE FROM component_request_items WHERE request_id = ?`, [requestId])
    await db.query(`DELETE FROM component_requests WHERE id = ?`, [requestId])

    // Notify lab staff
    try {
      if (details.rows.length > 0) {
        const req = details.rows[0]
        const emailData = emailTemplates.requestWithdrawn({
          requesterName: req.requester_name,
          requesterRole: 'Faculty',
          labName: req.lab_name,
          requestId: requestId,
          notifyEmail: req.lab_email,
          notifyRole: 'Lab Staff'
        })

        await sendEmail({
          to: [req.lab_email],
          ...emailData
        }).catch(err => console.error('Email send failed:', err))
      }
    } catch (emailError) {
      console.error('Failed to send withdrawal notification:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error withdrawing request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to withdraw request' },
      { status: 500 }
    )
  }
}
