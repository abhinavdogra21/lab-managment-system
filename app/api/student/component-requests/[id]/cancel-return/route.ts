import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Database } from '@/lib/database'

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

    const { id } = await params
    const requestId = parseInt(id)

    // Verify this is the student's own request and return was requested
    const result = await db.query(
      `SELECT id, status, requester_id, issued_at, returned_at, return_requested_at
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

    if (!existing.return_requested_at) {
      return NextResponse.json({ error: 'No return request to cancel' }, { status: 400 })
    }

    if (existing.returned_at) {
      return NextResponse.json({ error: 'Already returned' }, { status: 400 })
    }

    // Cancel the return request
    await db.query(
      `UPDATE component_requests
       SET return_requested_at = NULL
       WHERE id = ?`,
      [requestId]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error canceling return request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel return request' },
      { status: 500 }
    )
  }
}
