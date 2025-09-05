const mysql = require('mysql2/promise');

async function checkDepartmentsAndHods() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('Connected to database');

    // Get all departments
    const [departments] = await connection.execute('SELECT id, name, code FROM departments ORDER BY code');
    console.log('All departments:');
    departments.forEach(dept => {
      console.log(`${dept.id}: ${dept.code} - ${dept.name}`);
    });

    console.log('\n--- Checking HOD users for each department ---');

    for (const dept of departments) {
      const hodEmail = `hod.${dept.code.toLowerCase()}@lnmiit.ac.in`;
      
      // Check if HOD exists for this department
      const [hodUsers] = await connection.execute(
        'SELECT id, email, name FROM users WHERE email = ? AND role = ?',
        [hodEmail, 'hod']
      );

      if (hodUsers.length > 0) {
        console.log(`✅ ${dept.code}: HOD exists - ${hodUsers[0].email}`);
      } else {
        console.log(`❌ ${dept.code}: HOD missing - ${hodEmail}`);
        
        // Create the missing HOD user
        const hodName = `Dr. HOD ${dept.code}`;
        const employeeId = `EMP_HOD_${dept.code}`;
        
        await connection.execute(
          'INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
          [
            hodEmail,
            '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
            hodName,
            'hod',
            dept.code,
            employeeId
          ]
        );
        console.log(`✅ Created HOD: ${hodEmail} - ${hodName}`);
      }
    }

    console.log('\n--- Final HOD users list ---');
    const [allHods] = await connection.execute(
      'SELECT email, name, department FROM users WHERE role = ? ORDER BY department',
      ['hod']
    );
    allHods.forEach(hod => {
      console.log(`${hod.department}: ${hod.email} - ${hod.name}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDepartmentsAndHods();
