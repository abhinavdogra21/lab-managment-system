-- Fix multi-lab booking statuses where all lab staff have decided
-- This updates bookings that are stuck in "pending_lab_staff" status
-- even though all lab staff have made their decisions

-- Update bookings to pending_hod where:
-- 1. Currently pending_lab_staff
-- 2. Is a multi-lab booking
-- 3. All labs have been decided (no pending labs)
-- 4. At least one lab was approved
UPDATE booking_requests br
SET 
  status = 'pending_hod',
  lab_staff_approved_at = NOW()
WHERE 
  br.status = 'pending_lab_staff'
  AND br.is_multi_lab = 1
  AND NOT EXISTS (
    -- Check if there are any pending labs
    SELECT 1 FROM multi_lab_approvals mla
    WHERE mla.booking_request_id = br.id
    AND mla.status = 'pending'
  )
  AND EXISTS (
    -- Check if at least one lab was approved
    SELECT 1 FROM multi_lab_approvals mla
    WHERE mla.booking_request_id = br.id
    AND mla.status = 'approved_by_lab_staff'
  );

-- Update bookings to rejected where:
-- 1. Currently pending_lab_staff
-- 2. Is a multi-lab booking
-- 3. All labs have been decided (no pending labs)
-- 4. Zero labs were approved (all rejected)
UPDATE booking_requests br
SET 
  status = 'rejected',
  rejected_at = NOW(),
  rejection_reason = 'All labs rejected by lab staff'
WHERE 
  br.status = 'pending_lab_staff'
  AND br.is_multi_lab = 1
  AND NOT EXISTS (
    -- Check if there are any pending labs
    SELECT 1 FROM multi_lab_approvals mla
    WHERE mla.booking_request_id = br.id
    AND mla.status = 'pending'
  )
  AND NOT EXISTS (
    -- Check if any lab was approved
    SELECT 1 FROM multi_lab_approvals mla
    WHERE mla.booking_request_id = br.id
    AND mla.status = 'approved_by_lab_staff'
  );

-- Display the updated bookings
SELECT 
  br.id,
  br.status,
  br.is_multi_lab,
  br.booking_date,
  br.purpose,
  COUNT(mla.id) as total_labs,
  SUM(CASE WHEN mla.status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved_labs,
  SUM(CASE WHEN mla.status = 'rejected' THEN 1 ELSE 0 END) as rejected_labs,
  SUM(CASE WHEN mla.status = 'pending' THEN 1 ELSE 0 END) as pending_labs
FROM booking_requests br
LEFT JOIN multi_lab_approvals mla ON br.id = mla.booking_request_id
WHERE br.is_multi_lab = 1
GROUP BY br.id
ORDER BY br.created_at DESC;
