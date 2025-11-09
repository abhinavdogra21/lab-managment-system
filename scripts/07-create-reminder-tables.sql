-- Create tables for tracking reminder emails

-- Component request reminders (for tracking when reminders are sent for issued components)
CREATE TABLE IF NOT EXISTS component_request_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_by_id INT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES component_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_request_id (request_id),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Component loan reminders (for tracking when reminders are sent for issued loans)
CREATE TABLE IF NOT EXISTS component_loan_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_by_id INT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES component_loans(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_loan_id (loan_id),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
