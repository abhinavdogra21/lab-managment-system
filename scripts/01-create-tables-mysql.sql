-- MySQL schema for LNMIIT Lab Management

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(120) NOT NULL,
  role ENUM('admin','hod','faculty','lab_staff','tnp','student') NOT NULL,
  department VARCHAR(100),
  phone VARCHAR(20),
  student_id VARCHAR(50),
  employee_id VARCHAR(50),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  department_id INT,
  staff_id INT NULL,
  capacity INT DEFAULT 30,
  location VARCHAR(120),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (staff_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  booked_by INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  expected_students INT NULL,
  equipment_needed TEXT NULL,
  approval_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id),
  FOREIGN KEY (booked_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity_available INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT NULL,
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
