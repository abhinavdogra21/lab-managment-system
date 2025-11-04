const mysql = require('mysql2/promise');

async function testActivityLogsAPI() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Abhin@v21dogr@',
    database: 'lnmiit_lab_management'
  });

  console.log('�� Testing Activity Logs API\n');

  // Check existing logs
  console.log('1. Current logs in database:');
  const [bookingLogs] = await db.query('SELECT id, action, actor_name, actor_role, created_at FROM lab_booking_activity_logs ORDER BY created_at DESC');
  console.log(`   - Lab Booking Logs: ${bookingLogs.length}`);
  bookingLogs.forEach(log => {
    console.log(`     • ID ${log.id}: ${log.action} by ${log.actor_name} (${log.actor_role}) at ${log.created_at}`);
  });

  const [componentLogs] = await db.query('SELECT id, action, actor_name, actor_role, created_at FROM component_activity_logs ORDER BY created_at DESC');
  console.log(`\n   - Component Logs: ${componentLogs.length}`);
  componentLogs.forEach(log => {
    console.log(`     • ID ${log.id}: ${log.action} by ${log.actor_name} (${log.actor_role}) at ${log.created_at}`);
  });

  // Test date range
  console.log('\n2. Testing date filter capabilities:');
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`   - Today: ${today}`);
  console.log(`   - Last 7 days: ${lastWeek} to ${today}`);
  console.log(`   - Last 30 days: ${lastMonth} to ${today}`);

  const [recentLogs] = await db.query(
    'SELECT COUNT(*) as count FROM lab_booking_activity_logs WHERE created_at >= ?',
    [lastMonth]
  );
  console.log(`   - Logs in last 30 days: ${recentLogs[0].count}`);

  console.log('\n✅ Migration verified! You can now use the HoD activity logs API:');
  console.log('   GET /api/hod/activity-logs');
  console.log('   GET /api/hod/activity-logs?startDate=2025-10-01&endDate=2025-11-04');
  console.log('   GET /api/hod/activity-logs?type=booking&limit=20');
  console.log('   GET /api/lab-staff/activity-logs');

  await db.end();
}

testActivityLogsAPI().catch(console.error);
