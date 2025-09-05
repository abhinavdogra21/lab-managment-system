-- Migration to simplify timetable_entries table
-- Remove unnecessary columns and keep only essential fields

USE lnmiit_lab_management;

-- Check and remove foreign key constraint if exists
SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'fk_timetable_entries_faculty' 
    AND TABLE_NAME = 'timetable_entries' 
    AND TABLE_SCHEMA = 'lnmiit_lab_management');

SET @sql = IF(@constraint_exists > 0, 'ALTER TABLE timetable_entries DROP FOREIGN KEY fk_timetable_entries_faculty', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and remove index if exists
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE INDEX_NAME = 'idx_timetable_entries_faculty' 
    AND TABLE_NAME = 'timetable_entries' 
    AND TABLE_SCHEMA = 'lnmiit_lab_management');

SET @sql = IF(@index_exists > 0, 'DROP INDEX idx_timetable_entries_faculty ON timetable_entries', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop unnecessary columns (using separate statements for better error handling)
ALTER TABLE timetable_entries DROP COLUMN subject_code;
ALTER TABLE timetable_entries DROP COLUMN subject_name;
ALTER TABLE timetable_entries DROP COLUMN faculty_id;
ALTER TABLE timetable_entries DROP COLUMN batch;
ALTER TABLE timetable_entries DROP COLUMN semester;
ALTER TABLE timetable_entries DROP COLUMN section;
ALTER TABLE timetable_entries DROP COLUMN student_count;

-- Update existing notes to be more descriptive if they were empty
UPDATE timetable_entries 
SET notes = 'Lab session' 
WHERE notes IS NULL OR notes = '' OR TRIM(notes) = '';
