-- LNMIIT Lab Management System Database Schema
-- Create all necessary tables for the college lab management system

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'faculty', 'lab_staff', 'hod', 'admin', 'tnp')),
    department VARCHAR(100),
    phone VARCHAR(20),
    student_id VARCHAR(50), -- For students
    employee_id VARCHAR(50), -- For staff/faculty
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    hod_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labs table
CREATE TABLE IF NOT EXISTS labs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    staff_id INTEGER REFERENCES users(id),
    capacity INTEGER DEFAULT 30,
    location VARCHAR(255),
    equipment_list TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table for lab equipment and items
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    lab_id INTEGER REFERENCES labs(id),
    category VARCHAR(100),
    quantity_total INTEGER DEFAULT 1,
    quantity_available INTEGER DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    purchase_date DATE,
    warranty_expiry DATE,
    cost DECIMAL(10,2),
    supplier VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item issues/returns tracking
CREATE TABLE IF NOT EXISTS item_issues (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id),
    issued_to INTEGER REFERENCES users(id),
    issued_by INTEGER REFERENCES users(id),
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATE,
    actual_return_date TIMESTAMP,
    quantity_issued INTEGER DEFAULT 1,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost', 'damaged')),
    return_condition VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab bookings table
CREATE TABLE IF NOT EXISTS lab_bookings (
    id SERIAL PRIMARY KEY,
    lab_id INTEGER REFERENCES labs(id),
    booked_by INTEGER REFERENCES users(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT NOT NULL,
    expected_students INTEGER,
    equipment_needed TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INTEGER REFERENCES users(id),
    approval_date TIMESTAMP,
    approval_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    lab_id INTEGER REFERENCES labs(id),
    student_id INTEGER REFERENCES users(id),
    faculty_id INTEGER REFERENCES users(id),
    attendance_date DATE NOT NULL,
    time_slot VARCHAR(50),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marks/grades tracking
CREATE TABLE IF NOT EXISTS marks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    lab_id INTEGER REFERENCES labs(id),
    faculty_id INTEGER REFERENCES users(id),
    assessment_type VARCHAR(100), -- 'lab_exam', 'assignment', 'project', etc.
    assessment_name VARCHAR(255),
    marks_obtained DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    assessment_date DATE,
    academic_year VARCHAR(20),
    semester VARCHAR(10),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System logs for audit trail
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100), -- 'booking', 'inventory', 'user', etc.
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic year configuration
CREATE TABLE IF NOT EXISTS year_config (
    id SERIAL PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_date ON lab_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_item_issues_status ON item_issues(status);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timetable entries for lab scheduling
CREATE TABLE IF NOT EXISTS timetable_entries (
    id SERIAL PRIMARY KEY,
    lab_id INTEGER REFERENCES labs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
    time_slot_start TIME NOT NULL,
    time_slot_end TIME NOT NULL,
    subject_code VARCHAR(50),
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id),
    batch VARCHAR(100), -- e.g., "CSE 3rd Year", "ECE 2nd Year"
    semester VARCHAR(20), -- e.g., "5th", "3rd"
    section VARCHAR(10), -- e.g., "A", "B", "C"
    student_count INTEGER DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no overlapping time slots for same lab and day
    CONSTRAINT unique_lab_day_time UNIQUE (lab_id, day_of_week, time_slot_start, time_slot_end)
);

-- Timetable templates for different academic years/semesters
CREATE TABLE IF NOT EXISTS timetable_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- e.g., "Odd Semester 2025", "Even Semester 2024"
    academic_year VARCHAR(20) NOT NULL, -- e.g., "2024-25"
    semester_type VARCHAR(10) NOT NULL CHECK (semester_type IN ('odd', 'even')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false, -- Only one template can be active at a time
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link timetable entries to templates
CREATE TABLE IF NOT EXISTS timetable_template_entries (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES timetable_templates(id) ON DELETE CASCADE,
    timetable_entry_id INTEGER REFERENCES timetable_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_template_entry UNIQUE (template_id, timetable_entry_id)
);

-- Special events/holidays that affect timetable
CREATE TABLE IF NOT EXISTS timetable_exceptions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('holiday', 'exam', 'event', 'lab_closure')),
    affects_all_labs BOOLEAN DEFAULT true,
    affected_lab_ids TEXT, -- JSON array of lab IDs if not all labs
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Timetable indexes for performance
CREATE INDEX IF NOT EXISTS idx_timetable_entries_lab_day ON timetable_entries(lab_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_faculty ON timetable_entries(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_time ON timetable_entries(time_slot_start, time_slot_end);
CREATE INDEX IF NOT EXISTS idx_timetable_templates_active ON timetable_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_timetable_exceptions_date ON timetable_exceptions(date);
