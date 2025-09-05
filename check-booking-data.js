const mysql = require('mysql2/promise');

async function checkBookingData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Abhin@v21dogr@',
    database: process.env.DB_NAME || 'lnmiit_lab_management',
    port: process.env.DB_PORT || 3306
  });
  
  try {
    console.log('=== Checking booking_requests table ===');
    const [bookingRequests] = await connection.query('SELECT * FROM booking_requests ORDER BY created_at DESC LIMIT 10');
    console.log(`Found ${bookingRequests.length} booking requests`);
    
    if (bookingRequests.length > 0) {
      console.log('Sample booking request:');
      console.log(JSON.stringify(bookingRequests[0], null, 2));
      
      console.log('\nStatus distribution:');
      const [statusCounts] = await connection.query(`
        SELECT status, COUNT(*) as count 
        FROM booking_requests 
        GROUP BY status
      `);
      console.log(statusCounts);
    }
    
    console.log('\n=== Checking labs table ===');
    const [labs] = await connection.query('SELECT l.*, d.code as dept_code FROM labs l JOIN departments d ON l.department_id = d.id');
    console.log(`Found ${labs.length} labs`);
    if (labs.length > 0) {
      console.log('Sample lab:');
      console.log(labs[0]);
    }
    
    console.log('\n=== Checking users by role ===');
    const [usersByRole] = await connection.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log(usersByRole);
    
    console.log('\n=== Checking for CSE department data ===');
    const [cseDept] = await connection.query("SELECT * FROM departments WHERE code = 'CSE'");
    console.log('CSE Department:', cseDept);
    
    const [cseLabs] = await connection.query(`
      SELECT l.*, d.code as dept_code 
      FROM labs l 
      JOIN departments d ON l.department_id = d.id 
      WHERE d.code = 'CSE'
    `);
    console.log(`CSE Labs: ${cseLabs.length}`);
    
    const [cseUsers] = await connection.query("SELECT id, name, email, role FROM users WHERE department = 'CSE'");
    console.log(`CSE Users: ${cseUsers.length}`);
    if (cseUsers.length > 0) {
      console.log('CSE Users:', cseUsers);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkBookingData();
