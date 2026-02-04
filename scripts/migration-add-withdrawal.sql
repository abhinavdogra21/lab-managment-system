-- Migration: Add withdrawal functionality to booking_requests
-- Date: 2025
-- Description: Adds withdrawn_at timestamp and updates status enum to include 'withdrawn'
-- Status: ALREADY APPLIED - Database already has these columns

-- Note: This migration has already been applied to the database.
-- The following changes are already present:
-- 1. Status enum includes 'withdrawn' value
-- 2. withdrawn_at timestamp column exists
-- 3. Index on withdrawn_at exists

-- If you need to apply this to a fresh database, uncomment the following:

/*
-- Add withdrawn status to the status enum
ALTER TABLE `booking_requests` 
MODIFY COLUMN `status` ENUM(
  'pending_faculty',
  'pending_lab_staff',
  'pending_hod',
  'approved',
  'rejected',
  'withdrawn'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_faculty';

-- Add withdrawn_at timestamp column
ALTER TABLE `booking_requests` 
ADD COLUMN `withdrawn_at` TIMESTAMP NULL DEFAULT NULL AFTER `updated_at`;

-- Add index for better query performance on withdrawn bookings
ALTER TABLE `booking_requests`
ADD INDEX `idx_booking_withdrawn` (`withdrawn_at`);
*/
