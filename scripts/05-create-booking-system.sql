-- Create booking_requests table for student lab booking requests
CREATE TABLE IF NOT EXISTS booking_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    lab_id INT NOT NULL,
    faculty_id INT NOT NULL COMMENT 'Faculty supervisor for the booking',
    date DATE NOT NULL COMMENT 'Date of the lab booking',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT NOT NULL COMMENT 'Purpose of the lab booking',
    remarks TEXT COMMENT 'Additional remarks from student',
    
    -- Approval workflow status
    status ENUM('pending', 'faculty_approved', 'staff_approved', 'hod_approved', 'rejected') DEFAULT 'pending',
    
    -- Approval remarks from each level
    faculty_remarks TEXT COMMENT 'Remarks from faculty supervisor',
    faculty_approved_at TIMESTAMP NULL,
    faculty_approved_by INT NULL COMMENT 'Faculty user ID who approved',
    
    staff_remarks TEXT COMMENT 'Remarks from lab staff',
    staff_approved_at TIMESTAMP NULL,
    staff_approved_by INT NULL COMMENT 'Lab staff user ID who approved',
    
    hod_remarks TEXT COMMENT 'Remarks from HOD',
    hod_approved_at TIMESTAMP NULL,
    hod_approved_by INT NULL COMMENT 'HOD user ID who approved',
    
    -- Rejection details
    rejected_at TIMESTAMP NULL,
    rejected_by INT NULL COMMENT 'User ID who rejected',
    rejection_reason TEXT COMMENT 'Reason for rejection',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (hod_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_student_date (student_id, date),
    INDEX idx_lab_date (lab_id, date),
    INDEX idx_faculty_status (faculty_id, status),
    INDEX idx_status_created (status, created_at),
    INDEX idx_date_range (date, start_time, end_time)
);

-- Create notifications table for dashboard and email notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'User who should receive the notification',
    type ENUM('booking_request', 'booking_approved', 'booking_rejected', 'booking_reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_booking_id INT NULL COMMENT 'Related booking request ID',
    
    -- Notification status
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_booking_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
    
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_email_pending (is_email_sent, created_at)
);

-- Create approval_timeline table for tracking the approval process
CREATE TABLE IF NOT EXISTS approval_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_request_id INT NOT NULL,
    step_name ENUM('submitted', 'faculty_review', 'faculty_approved', 'staff_review', 'staff_approved', 'hod_review', 'hod_approved', 'rejected') NOT NULL,
    step_status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
    completed_at TIMESTAMP NULL,
    completed_by INT NULL COMMENT 'User ID who completed this step',
    remarks TEXT COMMENT 'Remarks for this step',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_booking_step (booking_request_id, step_name),
    INDEX idx_step_status (step_name, step_status)
);

-- Insert initial approval timeline steps for tracking
DELIMITER //
CREATE TRIGGER after_booking_request_insert 
AFTER INSERT ON booking_requests
FOR EACH ROW
BEGIN
    -- Create initial timeline steps
    INSERT INTO approval_timeline (booking_request_id, step_name, step_status, created_at) VALUES
    (NEW.id, 'submitted', 'completed', NOW()),
    (NEW.id, 'faculty_review', 'pending', NOW()),
    (NEW.id, 'staff_review', 'pending', NOW()),
    (NEW.id, 'hod_review', 'pending', NOW());
    
    -- Create notification for faculty supervisor
    INSERT INTO notifications (user_id, type, title, message, related_booking_id, created_at) VALUES
    (NEW.faculty_id, 'booking_request', 'New Lab Booking Request', 
     CONCAT('New lab booking request from student requires your approval'), NEW.id, NOW());
END//
DELIMITER ;

-- Add indexes for better performance on large datasets
ALTER TABLE booking_requests ADD INDEX idx_composite_search (status, date, lab_id);
ALTER TABLE notifications ADD INDEX idx_type_read (type, is_read, created_at);
