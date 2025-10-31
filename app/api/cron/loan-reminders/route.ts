import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
// Email sending temporarily disabled; keep import commented for future enablement
// import { sendMail, isSmtpConfigured } from "@/lib/email"

const db = Database.getInstance()

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS component_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    requester_id INT NOT NULL,
    initiator_role ENUM('student','faculty') NOT NULL,
    purpose VARCHAR(1000) NULL,
    status ENUM('pending_lab_staff','issued','return_requested','returned','rejected') NOT NULL DEFAULT 'pending_lab_staff',
    due_date DATE NOT NULL,
    issued_at DATETIME NULL,
    returned_at DATETIME NULL,
    lab_staff_approver_id INT NULL,
    lab_staff_remarks VARCHAR(1000) NULL,
    extension_requested_due_date DATE NULL,
    extension_requested_reason VARCHAR(1000) NULL,
    extension_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
    delay_days INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)
}

export async function GET(_req: NextRequest) {
  try {
    await ensureSchema()
    // Upcoming due: due in 1 day or today; Overdue: past today and not returned
    const upcoming = await db.query(
      `SELECT l.*, u.email, u.name FROM component_loans l JOIN users u ON u.id = l.requester_id
       WHERE l.status = 'issued' AND (DATEDIFF(l.due_date, CURDATE()) BETWEEN 0 AND 1)`
    )
    const overdue = await db.query(
      `SELECT l.*, u.email, u.name, GREATEST(DATEDIFF(CURDATE(), l.due_date), 0) AS days_overdue
       FROM component_loans l JOIN users u ON u.id = l.requester_id
       WHERE l.status = 'issued' AND l.due_date < CURDATE()`
    )

    // Portal notifications (email temporarily disabled)
    let notificationsCreated = 0
    for (const row of upcoming.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`,
        [Number(row.requester_id), 'Component return due', `Your component loan #${row.id} is due by ${row.due_date}.`, 'warning']
      )
      notificationsCreated++
    }
    for (const row of overdue.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`,
        [Number(row.requester_id), 'Component return overdue', `Your component loan #${row.id} is overdue by ${row.days_overdue} day(s). Please return it.`, 'error']
      )
      notificationsCreated++
    }

    // Email disabled for now
    // const smtp = isSmtpConfigured(); if (smtp.configured) { /* sendMail(...) */ }

    return NextResponse.json({ upcoming: upcoming.rows.length, overdue: overdue.rows.length, notificationsCreated })
  } catch (e) {
    console.error("loan reminders error:", e)
    return NextResponse.json({ error: "Failed to run reminders" }, { status: 500 })
  }
}
