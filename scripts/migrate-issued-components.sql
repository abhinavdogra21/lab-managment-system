-- Migrate all issued component requests to activity logs
-- This creates activity log entries for all approved and issued component requests

INSERT INTO component_activity_logs (
  entity_type,
  entity_id,
  lab_id,
  actor_user_id,
  actor_name,
  actor_email,
  actor_role,
  action,
  action_description,
  entity_snapshot,
  changes_made,
  ip_address,
  user_agent,
  created_at
)
SELECT 
  'component_request' as entity_type,
  cr.id as entity_id,
  cr.lab_id,
  hod_approver.id as actor_user_id,
  hod_approver.name as actor_name,
  hod_approver.email as actor_email,
  hod_approver.role as actor_role,
  'issued' as action,
  CONCAT('Components issued for ', l.name, ' - ', COALESCE(cr.purpose, 'lab work')) as action_description,
  JSON_OBJECT(
    'id', cr.id,
    'lab_id', cr.lab_id,
    'lab_name', l.name,
    'requester_id', cr.requester_id,
    'requester_name', requester.name,
    'requester_email', requester.email,
    'initiator_role', cr.initiator_role,
    'purpose', cr.purpose,
    'status', cr.status,
    'mentor_faculty_id', cr.mentor_faculty_id,
    'faculty_name', faculty.name,
    'return_date', cr.return_date,
    'issued_at', cr.issued_at,
    'created_at', cr.created_at,
    'items', (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'component_id', cri.component_id,
          'component_name', c.name,
          'quantity_requested', cri.quantity_requested
        )
      )
      FROM component_request_items cri
      JOIN components c ON c.id = cri.component_id
      WHERE cri.request_id = cr.id
    )
  ) as entity_snapshot,
  NULL as changes_made,
  NULL as ip_address,
  NULL as user_agent,
  COALESCE(cr.issued_at, cr.hod_approved_at, cr.updated_at, cr.created_at) as created_at
FROM component_requests cr
JOIN labs l ON l.id = cr.lab_id
JOIN users requester ON requester.id = cr.requester_id
LEFT JOIN users faculty ON faculty.id = cr.mentor_faculty_id
LEFT JOIN users hod_approver ON hod_approver.id = cr.hod_approver_id
WHERE cr.status = 'approved' 
  AND cr.issued_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM component_activity_logs cal 
    WHERE cal.entity_id = cr.id 
    AND cal.entity_type = 'component_request'
    AND cal.action = 'issued'
  )
ORDER BY cr.issued_at;
