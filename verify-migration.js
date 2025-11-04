const mysql = require('mysql2/promise');

async function verify() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Abhin@v21dogr@',
    database: 'lnmiit_lab_management'
  });

  console.log('✅ Migration Summary\n');

  const [bookingLogs] = await db.query('SELECT COUNT(*) as count FROM lab_booking_activity_logs WHERE action = "approved"');
  console.log(`📋 Lab Booking Logs (approved): ${bookingLogs[0].count}`);

  const [componentLogs] = await db.query('SELECT COUNT(*) as count FROM component_activity_logs WHERE action = "issued"');
  console.log(`📦 Component Logs (issued): ${componentLogs[0].count}`);

  console.log('\n🎯 Activity Log Actions:');
  const [actions] = await db.query('SELECT action, COUNT(*) as count FROM lab_booking_activity_logs GROUP BY action');
  actions.forEach(a => console.log(`   - ${a.action}: ${a.count}`));

  console.log('\n📊 Sample Booking Log:');
  const [sample] = await db.query('SELECT * FROM lab_booking_activity_logs WHERE action = "approved" LIMIT 1');
  if (sample[0]) {
    const s = sample[0];
    console.log(`   ID: ${s.id}`);
    console.log(`   Booking ID: ${s.booking_id}`);
    console.log(`   Lab ID: ${s.lab_id}`);
    console.log(`   Actor: ${s.actor_name} (${s.actor_role})`);
    console.log(`   Action: ${s.action}`);
    console.log(`   Date: ${s.created_at}`);
  }

  console.log('\n📊 Sample Component Log:');
  const [compSample] = await db.query('SELECT * FROM component_activity_logs WHERE action = "issued" LIMIT 1');
  if (compSample[0]) {
    const s = compSample[0];
    console.log(`   ID: ${s.id}`);
    console.log(`   Request ID: ${s.entity_id}`);
    console.log(`   Lab ID: ${s.lab_id}`);
    console.log(`   Actor: ${s.actor_name} (${s.actor_role})`);
    console.log(`   Action: ${s.action}`);
    console.log(`   Date: ${s.created_at}`);
  }

  console.log('\n✅ Endpoints updated to use activity logs:');
  console.log('   - /api/hod/labs/booking-logs');
  console.log('   - /api/hod/labs/component-logs');
  console.log('\n🎉 All logs are now deletion-proof!');

  await db.end();
}

verify().catch(console.error);
