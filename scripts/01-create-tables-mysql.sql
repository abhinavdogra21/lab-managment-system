-- LNMIIT Lab Management - MySQL 8 Schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('student','faculty','lab_staff','hod','admin','tnp') NOT NULL,
  department VARCHAR(100),
  phone VARCHAR(20),
  student_id VARCHAR(50),
  employee_id VARCHAR(50),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  hod_email VARCHAR(255) NULL,
  hod_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_departments_hod (hod_id),
  CONSTRAINT fk_departments_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Labs
CREATE TABLE IF NOT EXISTS labs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  department_id INT,
  staff_id INT,
  capacity INT DEFAULT 30,
  location VARCHAR(255),
  equipment_list TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_labs_dept (department_id),
  INDEX idx_labs_staff (staff_id),
  CONSTRAINT fk_labs_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_labs_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lab ↔ Lab Staff (many-to-many)
CREATE TABLE IF NOT EXISTS lab_staff_assignments (
  lab_id INT NOT NULL,
  staff_id INT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lab_id, staff_id),
  CONSTRAINT fk_lsa_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  CONSTRAINT fk_lsa_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lsa_staff (staff_id)
) ENGINE=InnoDB;

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(100) NOT NULL UNIQUE,
  lab_id INT,
  category VARCHAR(100),
  quantity_total INT DEFAULT 1,
  quantity_available INT DEFAULT 1,
  `condition` ENUM('excellent','good','fair','poor','damaged') DEFAULT 'good',
  purchase_date DATE,
  warranty_expiry DATE,
  cost DECIMAL(10,2),
  supplier VARCHAR(255),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_inventory_lab (lab_id),
  CONSTRAINT fk_inventory_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Item issues/returns
CREATE TABLE IF NOT EXISTS item_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT,
  issued_to INT,
  issued_by INT,
  issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  expected_return_date DATE,
  actual_return_date DATETIME,
  quantity_issued INT DEFAULT 1,
  purpose TEXT,
  status ENUM('issued','returned','overdue','lost','damaged') DEFAULT 'issued',
  return_condition VARCHAR(50),
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_issues_inventory (inventory_id),
  INDEX idx_item_issues_issued_to (issued_to),
  INDEX idx_item_issues_status (status),
  CONSTRAINT fk_item_issues_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL,
  CONSTRAINT fk_item_issues_issued_to FOREIGN KEY (issued_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_item_issues_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lab bookings
CREATE TABLE IF NOT EXISTS lab_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT,
  booked_by INT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  expected_students INT,
  equipment_needed TEXT,
  approval_status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  approved_by INT,
  approval_date DATETIME,
  approval_remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lab_bookings_lab (lab_id),
  INDEX idx_lab_bookings_booked_by (booked_by),
  INDEX idx_lab_bookings_date (booking_date),
  CONSTRAINT fk_lab_bookings_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_bookings_booker FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_bookings_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT,
  student_id INT,
  faculty_id INT,
  attendance_date DATE NOT NULL,
  time_slot VARCHAR(50),
  status ENUM('present','absent','late') DEFAULT 'present',
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_lab (lab_id),
  INDEX idx_attendance_student (student_id),
  INDEX idx_attendance_date (attendance_date),
  CONSTRAINT fk_attendance_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Marks/grades
CREATE TABLE IF NOT EXISTS marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  lab_id INT,
  faculty_id INT,
  assessment_type VARCHAR(100),
  assessment_name VARCHAR(255),
  marks_obtained DECIMAL(5,2),
  total_marks DECIMAL(5,2),
  assessment_date DATE,
  academic_year VARCHAR(20),
  semester VARCHAR(10),
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_marks_student (student_id),
  INDEX idx_marks_lab (lab_id),
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL,
  CONSTRAINT fk_marks_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_system_logs_user (user_id),
  INDEX idx_system_logs_created_at (created_at),
  CONSTRAINT fk_system_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Academic year configuration
CREATE TABLE IF NOT EXISTS year_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL,
  financial_year VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','error','success') DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_user (user_id),
  INDEX idx_password_resets_token (token),
  INDEX idx_password_resets_expires (expires_at),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Timetable entries for lab scheduling
CREATE TABLE IF NOT EXISTS timetable_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  time_slot_start TIME NOT NULL,
  time_slot_end TIME NOT NULL,
  notes TEXT, -- Optional details about the lab session
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_timetable_entries_lab_day (lab_id, day_of_week),
  INDEX idx_timetable_entries_time (time_slot_start, time_slot_end),
  
  CONSTRAINT fk_timetable_entries_lab FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  
  -- Ensure no overlapping time slots for same lab and day
  UNIQUE KEY unique_lab_day_time (lab_id, day_of_week, time_slot_start, time_slot_end)
) ENGINE=InnoDB;

-- Timetable templates for different academic years/semesters
CREATE TABLE IF NOT EXISTS timetable_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL, -- e.g., "Odd Semester 2025", "Even Semester 2024"
  academic_year VARCHAR(20) NOT NULL, -- e.g., "2024-25"
  semester_type ENUM('odd', 'even') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 0, -- Only one template can be active at a time
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_timetable_templates_active (is_active),
  INDEX idx_timetable_templates_created_by (created_by),
  
  CONSTRAINT fk_timetable_templates_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Link timetable entries to templates
CREATE TABLE IF NOT EXISTS timetable_template_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  timetable_entry_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_template_entry (template_id, timetable_entry_id),
  
  CONSTRAINT fk_template_entries_template FOREIGN KEY (template_id) REFERENCES timetable_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_entries_entry FOREIGN KEY (timetable_entry_id) REFERENCES timetable_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Special events/holidays that affect timetable
CREATE TABLE IF NOT EXISTS timetable_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  exception_type ENUM('holiday', 'exam', 'event', 'lab_closure') NOT NULL,
  affects_all_labs TINYINT(1) DEFAULT 1,
  affected_lab_ids TEXT, -- JSON array of lab IDs if not all labs
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_timetable_exceptions_date (date),
  INDEX idx_timetable_exceptions_type (exception_type),
  
  CONSTRAINT fk_timetable_exceptions_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
