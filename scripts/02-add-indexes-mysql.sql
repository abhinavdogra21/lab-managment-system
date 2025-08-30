-- Idempotent index creation for MySQL 8
-- Uses information_schema + prepared statements to avoid duplicate errors

-- Helper pattern:
-- SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='T' AND index_name='IDX');
-- SET @sql := IF(@exists=0, 'CREATE INDEX IDX ON T(col)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- users(email)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='users' AND index_name='idx_users_email');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_users_email ON users(email)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- users(role)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='users' AND index_name='idx_users_role');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_users_role ON users(role)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- users(is_active)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='users' AND index_name='idx_users_active');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_users_active ON users(is_active)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- labs(is_active)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='labs' AND index_name='idx_labs_is_active');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_labs_is_active ON labs(is_active)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- labs(department_id)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='labs' AND index_name='idx_labs_department_id');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_labs_department_id ON labs(department_id)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- inventory(item_name)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='inventory' AND index_name='idx_inventory_item_name');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_inventory_item_name ON inventory(item_name)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- inventory(lab_id)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='inventory' AND index_name='idx_inventory_lab');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_inventory_lab ON inventory(lab_id)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- lab_bookings(lab_id, booking_date)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='lab_bookings' AND index_name='idx_lab_bookings_lab_date');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_lab_bookings_lab_date ON lab_bookings(lab_id, booking_date)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- lab_bookings(start_time, end_time)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='lab_bookings' AND index_name='idx_lab_bookings_time');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_lab_bookings_time ON lab_bookings(start_time, end_time)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- lab_bookings(approval_status)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='lab_bookings' AND index_name='idx_lab_bookings_status');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_lab_bookings_status ON lab_bookings(approval_status)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- attendance(attendance_date)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='attendance' AND index_name='idx_attendance_date');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_attendance_date ON attendance(attendance_date)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- system_logs(created_at)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='system_logs' AND index_name='idx_system_logs_created_at');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_system_logs_created_at ON system_logs(created_at)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- password_resets(token)
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='password_resets' AND index_name='idx_password_resets_token');
SET @sql := IF(@exists=0, 'CREATE UNIQUE INDEX idx_password_resets_token ON password_resets(token)', 'DO 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
