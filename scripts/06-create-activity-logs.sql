-- Activity Logs System - Separate tables to preserve logs even when users/bookings are deleted
-- This prevents cascade deletion of logs when users or bookings are removed

-- ============================================
-- Lab Booking Activity Logs
-- ============================================
-- Stores all actions related to lab bookings (create, approve, reject, cancel, update)
-- Preserves user information at the time of action to maintain historical accuracy
CREATE TABLE IF NOT EXISTS lab_booking_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Booking reference (nullable since booking might be deleted)
  booking_id INT NULL,
  lab_id INT NULL,
  
  -- User information (stored as values, not FKs, to preserve history)
  actor_user_id INT NULL,
  actor_name VARCHAR(255) NULL,
  actor_email VARCHAR(255) NULL,
  actor_role ENUM('student','faculty','lab_staff','hod','admin','others','non_teaching') NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- 'created', 'approved', 'rejected', 'cancelled', 'updated', 'deleted'
  action_description TEXT NULL,
  
  -- Booking snapshot at time of action (for historical reference)
  booking_snapshot JSON NULL,
  
  -- Changes made (for update actions)
  changes_made JSON NULL,
  
  -- Request metadata
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_lab_booking_logs_booking (booking_id),
  INDEX idx_lab_booking_logs_lab (lab_id),
  INDEX idx_lab_booking_logs_actor (actor_user_id),
  INDEX idx_lab_booking_logs_action (action),
  INDEX idx_lab_booking_logs_created (created_at)
) ENGINE=InnoDB COMMENT='Activity logs for lab bookings - preserves history even after deletions';

-- ============================================
-- Component Booking/Request Activity Logs
-- ============================================
-- Stores all actions related to component requests and loans
CREATE TABLE IF NOT EXISTS component_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Request/Loan reference (nullable since it might be deleted)
  entity_type ENUM('component_request', 'component_loan') NOT NULL,
  entity_id INT NULL,
  lab_id INT NULL,
  
  -- User information (stored as values, not FKs, to preserve history)
  actor_user_id INT NULL,
  actor_name VARCHAR(255) NULL,
  actor_email VARCHAR(255) NULL,
  actor_role ENUM('student','faculty','lab_staff','hod','admin','others','non_teaching') NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- 'created', 'faculty_approved', 'lab_staff_approved', 'hod_approved', 'rejected', 'issued', 'returned', 'cancelled', 'extension_requested', 'extension_approved', etc.
  action_description TEXT NULL,
  
  -- Entity snapshot at time of action (for historical reference)
  entity_snapshot JSON NULL,
  
  -- Changes made (for update actions)
  changes_made JSON NULL,
  
  -- Request metadata
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_component_logs_entity (entity_type, entity_id),
  INDEX idx_component_logs_lab (lab_id),
  INDEX idx_component_logs_actor (actor_user_id),
  INDEX idx_component_logs_action (action),
  INDEX idx_component_logs_created (created_at)
) ENGINE=InnoDB COMMENT='Activity logs for component requests and loans - preserves history even after deletions';

-- ============================================
-- HoD Dashboard Activity Logs View
-- ============================================
-- Create a view to easily query all activities in HoD's department
-- This combines lab bookings and component activities for easy dashboard display

-- Note: This is a helper view - the actual queries will be done in the application layer
-- to allow for pagination and filtering, but this shows the structure

-- ============================================
-- Migration helper: Optionally populate initial data from existing system_logs
-- ============================================
-- If you want to migrate existing logs, uncomment and run this after creating the tables:

/*
-- Migrate lab booking logs
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
  ip_address,
  user_agent,
  created_at
)
SELECT 
  sl.entity_id as booking_id,
  lb.lab_id,
  sl.user_id as actor_user_id,
  u.name as actor_name,
  u.email as actor_email,
  u.role as actor_role,
  sl.action,
  sl.details->>'$.description' as action_description,
  sl.details as booking_snapshot,
  sl.ip_address,
  sl.user_agent,
  sl.created_at
FROM system_logs sl
LEFT JOIN users u ON sl.user_id = u.id
LEFT JOIN lab_bookings lb ON sl.entity_id = lb.id
WHERE sl.entity_type = 'lab_booking'
  AND sl.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH); -- Last 6 months only

-- Migrate component request/loan logs
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
  ip_address,
  user_agent,
  created_at
)
SELECT 
  CASE 
    WHEN sl.entity_type = 'component_request' THEN 'component_request'
    WHEN sl.entity_type = 'component_loan' THEN 'component_loan'
  END as entity_type,
  sl.entity_id,
  COALESCE(cr.lab_id, cl.lab_id) as lab_id,
  sl.user_id as actor_user_id,
  u.name as actor_name,
  u.email as actor_email,
  u.role as actor_role,
  sl.action,
  sl.details->>'$.description' as action_description,
  sl.details as entity_snapshot,
  sl.ip_address,
  sl.user_agent,
  sl.created_at
FROM system_logs sl
LEFT JOIN users u ON sl.user_id = u.id
LEFT JOIN component_requests cr ON sl.entity_type = 'component_request' AND sl.entity_id = cr.id
LEFT JOIN component_loans cl ON sl.entity_type = 'component_loan' AND sl.entity_id = cl.id
WHERE sl.entity_type IN ('component_request', 'component_loan')
  AND sl.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH); -- Last 6 months only
*/
