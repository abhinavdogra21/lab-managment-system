-- LNMIIT Lab Management System - Initial Data
-- Insert sample data for testing and initial setup

-- Insert departments
INSERT INTO departments (name, code) VALUES
('Computer Science & Engineering', 'CSE'),
('Electronics & Communication Engineering', 'ECE'),
('Mechanical Engineering', 'ME'),
('Civil Engineering', 'CE'),
('Mathematics', 'MATH'),
('Physics', 'PHY'),
('Chemistry', 'CHEM');

-- Insert sample admin user (password: admin123)
-- password_hash uses SHA-256 so it works with current login verifier
INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES
('admin@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Administrator', 'admin', 'IT', 'EMP001');

-- Insert sample HOD users
INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES
('hod.cse@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Dr. Rajesh Kumar', 'hod', 'CSE', 'EMP002'),
('hod.ece@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Dr. Priya Sharma', 'hod', 'ECE', 'EMP003');

-- Insert sample faculty users
INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES
('faculty1@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Prof. Amit Singh', 'faculty', 'CSE', 'EMP004'),
('faculty2@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Dr. Neha Gupta', 'faculty', 'ECE', 'EMP005');

-- Insert sample lab staff users
INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES
('labstaff1@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Mr. Suresh Patel', 'lab_staff', 'CSE', 'EMP006'),
('labstaff2@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Ms. Kavita Jain', 'lab_staff', 'ECE', 'EMP007');

-- Insert sample student users
INSERT INTO users (email, password_hash, name, role, department, student_id) VALUES
('21ucs001@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Rahul Agarwal', 'student', 'CSE', '21UCS001'),
('21uec001@lnmiit.ac.in', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Priyanka Mehta', 'student', 'ECE', '21UEC001');

-- Insert sample labs
INSERT INTO labs (name, code, department_id, staff_id, capacity, location) VALUES
('Computer Programming Lab', 'CSE-LAB-01', 1, 6, 40, 'Block A, Ground Floor'),
('Data Structures Lab', 'CSE-LAB-02', 1, 6, 35, 'Block A, First Floor'),
('Digital Electronics Lab', 'ECE-LAB-01', 2, 7, 30, 'Block B, Ground Floor'),
('Communication Systems Lab', 'ECE-LAB-02', 2, 7, 25, 'Block B, First Floor');

-- Insert sample inventory items
INSERT INTO inventory (item_name, item_code, lab_id, category, quantity_total, quantity_available, condition) VALUES
('Desktop Computer', 'CSE-PC-001', 1, 'Computer', 40, 38, 'good'),
('Arduino Uno', 'ECE-ARD-001', 3, 'Microcontroller', 50, 45, 'excellent'),
('Oscilloscope', 'ECE-OSC-001', 4, 'Measurement', 10, 9, 'good'),
('Breadboard', 'ECE-BB-001', 3, 'Prototyping', 100, 95, 'good');

-- Insert current academic year
INSERT INTO year_config (academic_year, financial_year, start_date, end_date, is_current) VALUES
('2024-25', '2024-25', '2024-07-01', '2025-06-30', 1);

-- Update department HODs
UPDATE departments SET hod_id = 2 WHERE code = 'CSE';
UPDATE departments SET hod_id = 3 WHERE code = 'ECE';
