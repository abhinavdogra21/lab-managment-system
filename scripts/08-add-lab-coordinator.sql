-- Add lab coordinator support to departments
-- This allows departments to have a lab coordinator as highest approval authority instead of HOD

-- Add highest_approval_authority column (default to 'hod' for existing departments)
ALTER TABLE departments 
ADD COLUMN highest_approval_authority ENUM('hod', 'lab_coordinator') DEFAULT 'hod' AFTER hod_email;

-- Add lab_coordinator_id column (references users table)
ALTER TABLE departments 
ADD COLUMN lab_coordinator_id INT NULL AFTER highest_approval_authority,
ADD CONSTRAINT fk_dept_lab_coordinator FOREIGN KEY (lab_coordinator_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for faster lookups
ALTER TABLE departments ADD INDEX idx_lab_coordinator_id (lab_coordinator_id);

-- Update booking_requests to track who approved at final stage
ALTER TABLE booking_requests 
ADD COLUMN final_approver_role ENUM('hod', 'lab_coordinator') NULL AFTER hod_approved_at;

-- Update component_requests to track who approved at final stage
ALTER TABLE component_requests 
ADD COLUMN final_approver_role ENUM('hod', 'lab_coordinator') NULL AFTER hod_approved_at;

SELECT 'Lab Coordinator schema updates completed successfully!' as status;
