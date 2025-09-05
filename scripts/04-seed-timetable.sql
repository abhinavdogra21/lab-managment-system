-- Seed data for timetable functionality demonstration
-- This script adds sample timetable entries based on the uploaded schedule

-- First, let's add some sample timetable entries
-- Monday Schedule
INSERT INTO timetable_entries (
  lab_id, day_of_week, time_slot_start, time_slot_end,
  subject_code, subject_name, faculty_id, batch, semester, section, student_count, is_active
) VALUES
-- CP1 (assuming lab_id = 1)
(1, 1, '08:00', '09:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 1, '09:00', '10:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 1, '10:00', '11:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 1, '13:00', '14:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 1st Year', '2nd', 'B', 25, true),
(1, 1, '14:00', '15:00', 'PPS', 'Programming Practice Session', 4, 'Various', 'Multiple', 'Multiple', 40, true),

-- CP2 (assuming lab_id = 2)  
(2, 1, '10:00', '11:00', 'DS', 'Data Structures', 2, 'MTech', '1st', 'A', 20, true),
(2, 1, '13:00', '14:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 1st Year', '2nd', 'B', 25, true),

-- CP3 (assuming lab_id = 3)
(3, 1, '09:00', '10:00', 'AI', 'Artificial Intelligence', 5, 'CSE 4th Year', '7th', 'A', 28, true),

-- CM/LnMDA (assuming lab_id = 4)
(4, 1, '09:00', '12:00', 'PPS', 'Programming Practice Session', 4, 'New Batch Late Admission', 'Various', 'Multiple', 35, true),
(4, 1, '14:00', '17:00', 'PPS', 'Programming Practice Session', 4, 'Advanced Batch', 'Multiple', 'Multiple', 30, true),

-- Tuesday Schedule
(1, 2, '10:00', '11:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 2, '13:00', '14:00', 'ADA', 'Algorithm Design and Analysis', 6, 'CSE 3rd Year', '5th', 'B', 28, true),

(2, 2, '09:00', '12:00', 'DBMS', 'Database Management Systems', 7, 'CSE 3rd Year', '5th', 'A', 32, true),
(2, 2, '13:00', '15:00', 'DBMS', 'Database Management Systems', 7, 'CSE 4th Year', '7th', 'B', 25, true),
(2, 2, '15:00', '17:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 2nd Year', '3rd', 'A', 30, true),

(3, 2, '09:00', '10:00', 'AI', 'Artificial Intelligence', 5, 'CSE 4th Year', '7th', 'A', 28, true),
(3, 2, '13:00', '14:00', 'DAA', 'Design and Analysis of Algorithms', 8, 'CSE 3rd Year', '5th', 'C', 26, true),

(4, 2, '09:00', '12:00', 'PPS', 'Programming Practice Session', 4, 'Advanced Practice', 'Multiple', 'Multiple', 35, true),
(4, 2, '13:00', '16:00', 'PPS', 'Programming Practice Session', 4, 'Regular Practice', 'Multiple', 'Multiple', 40, true),
(4, 2, '16:00', '17:00', 'GAN', 'General Academic Session', 9, 'MTech 2nd Year', '3rd', 'A', 15, true),

-- Wednesday Schedule  
(1, 3, '10:00', '11:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 3, '13:00', '14:00', 'CSA', 'Computer Systems Architecture', 10, 'CSE 2nd Year', '3rd', 'B', 32, true),

(2, 3, '09:00', '11:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 2nd Year', '3rd', 'A', 30, true),
(2, 3, '11:00', '13:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 2nd Year', '3rd', 'B', 28, true),
(2, 3, '15:00', '17:00', 'DBMS', 'Database Management Systems', 7, 'CSE 3rd Year', '5th', 'A', 30, true),

(3, 3, '09:00', '10:00', 'AI', 'Artificial Intelligence', 5, 'CSE 4th Year', '7th', 'A', 28, true),
(3, 3, '13:00', '14:00', 'DAA', 'Design and Analysis of Algorithms', 8, 'CSE 3rd Year', '5th', 'C', 26, true),

(4, 3, '09:00', '12:00', 'PPS', 'Programming Practice Session', 4, 'Morning Batch', 'Multiple', 'Multiple', 35, true),
(4, 3, '13:00', '16:00', 'PPS', 'Programming Practice Session', 4, 'Afternoon Batch', 'Multiple', 'Multiple', 40, true),
(4, 3, '16:00', '17:00', 'QML', 'Quality Management Lab', 11, 'MTech 2nd Year', '3rd', 'B', 12, true),

-- Thursday Schedule
(1, 4, '10:00', '11:00', 'CSE311', 'Data Structures Lab', 2, 'CSE 3rd Year', '5th', 'A', 30, true),
(1, 4, '13:00', '14:00', 'CNS', 'Computer Network Security', 12, 'CSE 4th Year', '7th', 'A', 25, true),

(2, 4, '09:00', '11:00', 'DBMS', 'Database Management Systems', 7, 'CSE 3rd Year', '5th', 'A', 32, true),
(2, 4, '11:00', '13:00', 'DBMS', 'Database Management Systems', 7, 'CSE 3rd Year', '5th', 'B', 30, true),
(2, 4, '15:00', '17:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 2nd Year', '3rd', 'A', 28, true),

(3, 4, '10:00', '11:00', 'DAA', 'Design and Analysis of Algorithms', 8, 'CSE 3rd Year', '5th', 'C', 26, true),
(3, 4, '13:00', '14:00', 'DAA', 'Design and Analysis of Algorithms', 8, 'CSE 3rd Year', '5th', 'D', 24, true),

(4, 4, '09:00', '12:00', 'PPS', 'Programming Practice Session', 4, 'Regular Batch', 'Multiple', 'Multiple', 35, true),
(4, 4, '13:00', '16:00', 'PPS', 'Programming Practice Session', 4, 'Advanced Batch', 'Multiple', 'Multiple', 40, true),

-- Friday Schedule
(1, 5, '10:00', '13:00', 'DAA', 'Design and Analysis of Algorithms', 8, 'CSE 3rd Year', '5th', 'All', 50, true),
(1, 5, '14:30', '16:30', 'IOT', 'Internet of Things', 13, 'MTech 1st Year', '2nd', 'A', 18, true),

(2, 5, '09:00', '11:00', 'OOP', 'Object Oriented Programming', 3, 'CSE 2nd Year', '3rd', 'A', 30, true),
(2, 5, '14:30', '16:30', 'DBMS', 'Database Management Systems', 7, 'CSE 4th Year', '7th', 'B', 22, true);

-- Create a sample timetable template for current semester
INSERT INTO timetable_templates (
  name, academic_year, semester_type, start_date, end_date, is_active, created_by
) VALUES (
  'Odd Semester 2025-26', '2025-26', 'odd', '2025-08-01', '2025-12-31', true, 1
);

-- Link all current entries to this template
INSERT INTO timetable_template_entries (template_id, timetable_entry_id)
SELECT 1, id FROM timetable_entries WHERE is_active = true;
