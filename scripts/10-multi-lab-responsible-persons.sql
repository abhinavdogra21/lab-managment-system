-- Migration: Add unique person responsible for each lab in multi-lab bookings
-- Date: November 15, 2025

-- Create table to store person responsible for each lab in a multi-lab booking
CREATE TABLE IF NOT EXISTS multi_lab_responsible_persons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_request_id INT NOT NULL,
  lab_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (lab_id) REFERENCES labs(id),
  
  UNIQUE KEY unique_booking_lab (booking_request_id, lab_id),
  INDEX idx_booking_id (booking_request_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE multi_lab_responsible_persons 
COMMENT = 'Stores person responsible for each individual lab in multi-lab bookings';
