import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyToken, hasRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user || !hasRole(user, ['faculty'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source') || 'all'; // 'all', 'own', 'mentees'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT 
        lbal.id as log_id,
        lbal.booking_id,
        lbal.action,
        lbal.booking_snapshot,
        lbal.created_at,
        JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by') as requested_by_id,
        JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_supervisor_id') as faculty_supervisor_id,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_name')),
          requester.name,
          'Unknown'
        ) as requester_name,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_email')),
          requester.email,
          ''
        ) as requester_email,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.requester_role')),
          requester.role,
          'student'
        ) as requester_role,
        labs.name as lab_name
      FROM lab_booking_activity_logs lbal
      LEFT JOIN users requester ON requester.id = JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by')
      LEFT JOIN labs ON labs.id = JSON_EXTRACT(lbal.booking_snapshot, '$.lab_id')
      WHERE lbal.action = 'approved_by_hod'
    `;

    const params: any[] = [];

    // Get faculty user's email for comparison (more reliable than name)
    const facultyUserRes = await db.query('SELECT email FROM users WHERE id = ?', [user.userId]);
    const facultyEmail = facultyUserRes.rows[0]?.email || '';

    // Filter by source
    if (source === 'own') {
      // Own logs: bookings where I (faculty) am the requester
      sql += ` AND JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by') = ?`;
      params.push(user.userId);
    } else if (source === 'mentees') {
      // Mentee logs: bookings where I was the approving faculty (for student/mentee bookings)
      // Match by faculty_email (more reliable than faculty_name which includes salutation)
      sql += ` AND JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_email')) = ?`;
      sql += ` AND JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by') != ?`;
      params.push(facultyEmail, user.userId);
    } else {
      // 'all' - show both own and where faculty approved
      sql += ` AND (
        JSON_EXTRACT(lbal.booking_snapshot, '$.requested_by') = ? OR
        JSON_UNQUOTE(JSON_EXTRACT(lbal.booking_snapshot, '$.faculty_email')) = ?
      )`;
      params.push(user.userId, facultyEmail);
    }

    // Date filters
    if (startDate) {
      sql += ` AND DATE(lbal.created_at) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND DATE(lbal.created_at) <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY lbal.created_at DESC`;

    const result = await db.query(sql, params);
    const logs = result.rows;

    // Process logs to extract booking details from snapshot
    const processedLogs = logs.map((log: any) => {
      const snapshot = typeof log.booking_snapshot === 'string'
        ? JSON.parse(log.booking_snapshot)
        : log.booking_snapshot;

      return {
        ...log,
        requester_name: log.requester_name || snapshot?.requester_name || 'Unknown',
        requester_email: log.requester_email || snapshot?.requester_email || '',
        requester_role: log.requester_role || snapshot?.requester_role || 'student',
        lab_name: log.lab_name || snapshot?.lab_name || 'Unknown Lab',
        purpose: snapshot?.purpose || '',
        booking_date: snapshot?.booking_date || null,
        start_time: snapshot?.start_time || null,
        end_time: snapshot?.end_time || null,
        status: snapshot?.status || 'approved',
        faculty_supervisor_name: snapshot?.faculty_name || null,
        faculty_approved_at: snapshot?.faculty_approved_at || null,
        lab_staff_name: snapshot?.lab_staff_name || null,
        lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
        hod_name: snapshot?.hod_name || null,
        hod_approved_at: snapshot?.hod_approved_at || log.created_at,
      };
    });

    return NextResponse.json(processedLogs);
  } catch (error) {
    console.error('Error fetching booking logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking logs' },
      { status: 500 }
    );
  }
}
