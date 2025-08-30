-- Recommended indexes for LNMIIT Lab Management (MySQL)

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Labs
CREATE INDEX IF NOT EXISTS idx_labs_department_id ON labs (department_id);

-- Lab bookings
CREATE INDEX IF NOT EXISTS idx_lab_bookings_lab_date ON lab_bookings (lab_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_time ON lab_bookings (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_status ON lab_bookings (approval_status);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_lab ON inventory (lab_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory (item_name);

-- Password resets
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets (token);

-- System logs
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs (created_at);
