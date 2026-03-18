import { Database } from '../lib/database'

async function run() {
  try {
    const db = Database.getInstance()
    console.log("Executing ALTER TABLE to update ENUM...")
    await db.query(`
      ALTER TABLE booking_reminders 
      MODIFY COLUMN reminder_type ENUM('1_hour_before','1_day_before','on_day') DEFAULT '1_hour_before'
    `)
    console.log("✅ Successfully updated reminder_type ENUM to accept '1_hour_before'")
    process.exit(0)
  } catch (error) {
    console.error("❌ Failed:", error)
    process.exit(1)
  }
}

run()
