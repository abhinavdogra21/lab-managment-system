-- Add non_teaching to users.role enum
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('student','faculty','lab_staff','non_teaching','hod','admin','tnp') NOT NULL;
