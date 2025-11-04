-- Migrate all approved bookings to activity logs
-- This creates activity log entries for all approved bookings

INSERT INTO lab_booking_activity_logs (
  booking_id,
  lab_id,
  actor_user_id,
  actor_name,
  actor_email,
  actor_role,
  action,
  action_description,
  booking_snapshot,
  changes_made,
  ip_address,
  user_agent,
  created_at
)
SELECT 
  br.id as booking_id,
  br.lab_id,
  hod_approver.id as actor_user_id,
  hod_approver.name as actor_name,
  hod_approver.email as actor_email,
  hod_approver.role as actor_role,
  'approved_by_hod' as action,
  CONCAT('Approved booking for ', l.name, ' on ', DATE_FORMAT(br.booking_date, '%Y-%m-%d'), ' from ', br.start_time, ' to ', br.end_time) as action_description,
  JSON_OBJECT(
    'id', br.id,
    'lab_id', br.lab_id,
    'lab_name', l.name,
    'requested_by', br.requested_by,
    'requester_name', requester.name,
    'requester_email', requester.email,
    'booking_date', br.booking_date,
    'start_time', br.start_time,
    'end_time', br.end_time,
    'purpose', br.purpose,
    'status', br.status,
    'faculty_supervisor_id', br.faculty_supervisor_id,
    'faculty_name', faculty.name,
    'created_at', br.created_at,
    'hod_approved_at', br.hod_approved_at,
    'hod_remarks', br.hod_remarks
  ) as booking_snapshot,
  NULL as changes_made,
  NULL as ip_address,
  NULL as user_agent,
  COALESCE(br.hod_approved_at, br.updated_at, br.created_at) as created_at
FROM booking_requests br
JOIN labs l ON l.id = br.lab_id
JOIN users requester ON requester.id = br.requested_by
LEFT JOIN users faculty ON faculty.id = br.faculty_supervisor_id
LEFT JOIN users hod_approver ON hod_approver.id = br.hod_approved_by
WHERE br.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM lab_booking_activity_logs lbal 
    WHERE lbal.booking_id = br.id 
    AND lbal.action = 'approved_by_hod'
  )
ORDER BY br.hod_approved_at;
