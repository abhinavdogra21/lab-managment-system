-- =====================================================
-- Multi-Lab Booking Feature - Database Schema Changes
-- Created: 2025-11-15
-- =====================================================

-- Step 1: Add Person Responsible fields to booking_requests
ALTER TABLE `booking_requests` 
ADD COLUMN `responsible_person_name` VARCHAR(255) DEFAULT NULL COMMENT 'Person responsible for the lab(s) during booking',
ADD COLUMN `responsible_person_email` VARCHAR(255) DEFAULT NULL COMMENT 'Email of responsible person (must end with @lnmiit.ac.in)',
ADD COLUMN `is_multi_lab` TINYINT(1) DEFAULT 0 COMMENT 'Flag to indicate if this is a multi-lab booking',
ADD COLUMN `lab_ids` JSON DEFAULT NULL COMMENT 'Array of lab IDs for multi-lab bookings: ["1", "2", "3"]';

-- Step 2: Create table for tracking multi-lab approvals
CREATE TABLE IF NOT EXISTS `multi_lab_approvals` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_request_id` INT NOT NULL COMMENT 'Reference to booking_requests table',
  `lab_id` INT NOT NULL COMMENT 'Individual lab in multi-lab booking',
  `lab_staff_id` INT DEFAULT NULL COMMENT 'Lab staff who approved for this lab',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `approved_at` DATETIME DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_multi_lab_booking` (`booking_request_id`),
  KEY `idx_multi_lab_lab` (`lab_id`),
  KEY `idx_multi_lab_staff` (`lab_staff_id`),
  KEY `idx_multi_lab_status` (`status`),
  CONSTRAINT `fk_multi_lab_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_multi_lab_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_multi_lab_staff` FOREIGN KEY (`lab_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks individual lab approvals in multi-lab booking requests';

-- Step 3: Create table for booking reminders
CREATE TABLE IF NOT EXISTS `booking_reminders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_request_id` INT NOT NULL,
  `reminder_type` ENUM('2_hours_before', '1_day_before', 'on_day') DEFAULT '2_hours_before',
  `scheduled_time` DATETIME NOT NULL COMMENT 'When the reminder should be sent',
  `sent_at` DATETIME DEFAULT NULL COMMENT 'When the reminder was actually sent',
  `status` ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  `recipients` JSON DEFAULT NULL COMMENT 'List of email addresses that received the reminder',
  `error_message` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reminder_booking` (`booking_request_id`),
  KEY `idx_reminder_scheduled` (`scheduled_time`, `status`),
  KEY `idx_reminder_status` (`status`),
  CONSTRAINT `fk_reminder_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores scheduled reminders for lab bookings (2 hours before slot)';

-- Step 4: Add index for efficient reminder queries
CREATE INDEX `idx_booking_date_time` ON `booking_requests` (`booking_date`, `start_time`, `status`);

-- Step 5: Create view for easy multi-lab booking queries
CREATE OR REPLACE VIEW `v_multi_lab_bookings` AS
SELECT 
    br.id AS booking_id,
    br.requested_by,
    br.booking_date,
    br.start_time,
    br.end_time,
    br.purpose,
    br.status,
    br.responsible_person_name,
    br.responsible_person_email,
    br.is_multi_lab,
    br.lab_ids,
    GROUP_CONCAT(
        CONCAT(l.name, ':', mla.status) 
        ORDER BY l.name 
        SEPARATOR ', '
    ) AS lab_approval_status,
    COUNT(CASE WHEN mla.status = 'approved' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN mla.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN mla.status = 'rejected' THEN 1 END) AS rejected_count,
    COUNT(mla.id) AS total_labs
FROM booking_requests br
LEFT JOIN multi_lab_approvals mla ON br.id = mla.booking_request_id
LEFT JOIN labs l ON mla.lab_id = l.id
WHERE br.is_multi_lab = 1
GROUP BY br.id;

-- Step 6: Add comment to existing tables for clarity
ALTER TABLE `booking_requests` 
COMMENT = 'Lab booking requests - supports both single and multi-lab bookings';

-- =====================================================
-- Migration Complete
-- =====================================================
-- To apply: mysql -u root -p lnmiit_lab_management < scripts/09-add-multi-lab-booking.sql
