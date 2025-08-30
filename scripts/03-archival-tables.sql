-- Archival tables for LNMIIT Lab Management (MySQL dialect)
-- Run once to initialize archive tables.

CREATE TABLE IF NOT EXISTS archived_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  phone VARCHAR(20),
  student_id VARCHAR(50),
  employee_id VARCHAR(50),
  was_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_lab_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
  lab_id INT,
  booked_by INT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  expected_students INT,
  equipment_needed TEXT,
  approval_status VARCHAR(50),
  approved_by INT,
  approval_date TIMESTAMP,
  approval_remarks TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
  lab_id INT,
  student_id INT,
  faculty_id INT,
  attendance_date DATE NOT NULL,
  time_slot VARCHAR(50),
  status VARCHAR(20),
  remarks TEXT,
  created_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
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
  created_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_item_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
  inventory_id INT,
  issued_to INT,
  issued_by INT,
  issue_date TIMESTAMP,
  expected_return_date DATE,
  actual_return_date TIMESTAMP,
  quantity_issued INT,
  purpose TEXT,
  status VARCHAR(50),
  return_condition VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
