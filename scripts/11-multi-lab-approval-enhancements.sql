-- Migration: Enhance multi_lab_approvals table for complete workflow
-- Date: November 15, 2025

USE lnmiit_lab_management;

-- Add columns to track individual lab staff and HOD approvals
ALTER TABLE multi_lab_approvals
ADD COLUMN lab_staff_approved_by INT NULL AFTER lab_staff_id,
ADD COLUMN lab_staff_approved_at DATETIME NULL AFTER lab_staff_approved_by,
ADD COLUMN lab_staff_remarks TEXT NULL AFTER lab_staff_approved_at,
ADD COLUMN hod_approved_by INT NULL AFTER lab_staff_remarks,
ADD COLUMN hod_approved_at DATETIME NULL AFTER hod_approved_by,
ADD COLUMN hod_remarks TEXT NULL AFTER hod_approved_at;

-- Add foreign keys for the new columns
ALTER TABLE multi_lab_approvals
ADD CONSTRAINT fk_lab_staff_approved_by 
  FOREIGN KEY (lab_staff_approved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE multi_lab_approvals
ADD CONSTRAINT fk_hod_approved_by 
  FOREIGN KEY (hod_approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update status enum to include more detailed statuses
ALTER TABLE multi_lab_approvals
MODIFY COLUMN status ENUM(
  'pending',
  'approved_by_lab_staff',
  'approved',
  'rejected'
) DEFAULT 'pending';

-- Add index for faster queries
CREATE INDEX idx_status_booking ON multi_lab_approvals(status, booking_request_id);

-- Add reminder_sent column to booking_requests for 2-hour reminders
ALTER TABLE booking_requests
ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0 AFTER status;

-- Add index for reminder queries
CREATE INDEX idx_reminder_query ON booking_requests(status, booking_date, start_time, reminder_sent);

-- Add comment to table
ALTER TABLE multi_lab_approvals 
COMMENT = 'Tracks individual lab approval status in multi-lab bookings with detailed approval chain';

SELECT 'Migration completed successfully!' as Status;
