import mysql from 'mysql2/promise';

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Abhin@v21dogr@',
    database: 'lnmiit_lab_management'
  });

  const now = new Date();
  
  // Set start time to 30 mins from now so it falls between now and 1 hour from now
  const targetTime = new Date(now.getTime() + 30 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const startTime = targetTime.toTimeString().slice(0, 8);
  const endTime = new Date(targetTime.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 8);

  // Get first user and lab
  const [users] = await db.query('SELECT * FROM users LIMIT 1');
  const [labs] = await db.query('SELECT * FROM labs LIMIT 1');
  
  if (!users.length || !labs.length) {
    console.log("No users or labs found");
    process.exit(1);
  }

  const user = users[0];
  const lab = labs[0];

  // 1. Insert a booking request for within 1 hour
  const [bookingRes] = await db.query(`
    INSERT INTO booking_requests 
    (request_type, requested_by, lab_id, booking_date, start_time, end_time, purpose, status, responsible_person_name, responsible_person_email)
    VALUES ('lab_booking', ?, ?, ?, ?, ?, 'Test cron reminder', 'approved', 'Test Responsible', 'testresp@lnmiit.ac.in')
  `, [user.id, lab.id, today, startTime, endTime]);

  console.log('✅ Inserted mock booking request ID:', bookingRes.insertId);

  // 2. Insert an upcoming component loan due today
  const [loanRes] = await db.query(`
    INSERT INTO component_loans
    (lab_id, requester_id, initiator_role, purpose, status, due_date)
    VALUES (?, ?, 'student', 'Test loan reminder', 'issued', ?)
  `, [lab.id, user.id, today]);

  console.log('✅ Inserted mock component loan ID (Due Today):', loanRes.insertId);

  // 3. Insert an overdue component loan (due yesterday)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [overdueRes] = await db.query(`
    INSERT INTO component_loans
    (lab_id, requester_id, initiator_role, purpose, status, due_date)
    VALUES (?, ?, 'student', 'Test overdue loan reminder', 'issued', ?)
  `, [lab.id, user.id, yesterday]);

  console.log('✅ Inserted mock component loan ID (Overdue):', overdueRes.insertId);

  await db.end();
}

run().catch(console.error);
