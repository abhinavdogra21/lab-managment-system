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
        cal.id as log_id,
        cal.entity_id,
        cal.entity_type,
        cal.action,
        cal.actor_name,
        cal.actor_email,
        cal.actor_role,
        cal.entity_snapshot,
        cal.created_at,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_name')) as requester_name,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_email')) as requester_email,
        JSON_UNQUOTE(JSON_EXTRACT(cal.entity_snapshot, '$.requester_role')) as requester_role,
        JSON_EXTRACT(cal.entity_snapshot, '$.requester_id') as requester_id,
        JSON_EXTRACT(cal.entity_snapshot, '$.mentor_faculty_id') as mentor_faculty_id
      FROM component_activity_logs cal
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by source
    if (source === 'own') {
      // Own logs: component requests where I (faculty) am the requester
      sql += ` AND JSON_EXTRACT(cal.entity_snapshot, '$.requester_id') = ?`;
      params.push(user.userId);
    } else if (source === 'mentees') {
      // Mentee logs: component requests where I was the mentor faculty (for student/mentee requests)
      sql += ` AND JSON_EXTRACT(cal.entity_snapshot, '$.mentor_faculty_id') = ?`;
      sql += ` AND JSON_EXTRACT(cal.entity_snapshot, '$.requester_id') != ?`;
      params.push(user.userId, user.userId);
    } else {
      // 'all' - show both own and mentees
      sql += ` AND (
        JSON_EXTRACT(cal.entity_snapshot, '$.requester_id') = ? OR
        JSON_EXTRACT(cal.entity_snapshot, '$.mentor_faculty_id') = ?
      )`;
      params.push(user.userId, user.userId);
    }

    // Date filters
    if (startDate) {
      sql += ` AND DATE(cal.created_at) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND DATE(cal.created_at) <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY cal.created_at DESC`;

    const result = await db.query(sql, params);
    const logs = result.rows;

    // Process logs to extract items from snapshot
    const processedLogs = logs.map((log: any) => {
      const snapshot = typeof log.entity_snapshot === 'string' 
        ? JSON.parse(log.entity_snapshot) 
        : log.entity_snapshot;

      return {
        ...log,
        requester_name: log.requester_name || 'Unknown',
        requester_email: log.requester_email || 'N/A',
        requester_role: log.requester_role || 'student',
        requester_salutation: snapshot?.requester_salutation || 'none',
        items: snapshot?.items || [],
        lab_name: snapshot?.lab_name || 'Unknown Lab',
        purpose: snapshot?.purpose || '',
        issued_at: snapshot?.issued_at || log.created_at,
        return_date: snapshot?.return_date || null,
        returned_at: snapshot?.returned_at || null,
        actual_return_date: snapshot?.actual_return_date || null,
        faculty_name: snapshot?.faculty_name || null,
        faculty_salutation: snapshot?.faculty_salutation || 'none',
        faculty_approved_at: snapshot?.faculty_approved_at || null,
        lab_staff_name: snapshot?.lab_staff_name || null,
        lab_staff_salutation: snapshot?.lab_staff_salutation || 'none',
        lab_staff_approved_at: snapshot?.lab_staff_approved_at || null,
        lab_coordinator_name: snapshot?.lab_coordinator_name || null,
        lab_coordinator_salutation: snapshot?.lab_coordinator_salutation || 'none',
        lab_coordinator_approved_at: snapshot?.lab_coordinator_approved_at || null,
        hod_name: snapshot?.hod_name || null,
        hod_salutation: snapshot?.hod_salutation || 'none',
        hod_approved_at: snapshot?.hod_approved_at || null,
        highest_approval_authority: snapshot?.highest_approval_authority || 'hod',
        final_approver_role: snapshot?.final_approver_role || null,
      };
    });

    return NextResponse.json(processedLogs);
  } catch (error) {
    console.error('Error fetching component logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch component logs' },
      { status: 500 }
    );
  }
}
