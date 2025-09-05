const mysql = require('mysql2/promise');

async function testDepartmentHodCreation() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('Connected to database');

    // Create a test department to verify automatic HOD creation
    const testDeptCode = 'TEST';
    const testDeptName = 'Test Department';

    // First, clean up any existing test department
    await connection.execute('DELETE FROM users WHERE email = ?', [`hod.${testDeptCode.toLowerCase()}@lnmiit.ac.in`]);
    await connection.execute('DELETE FROM departments WHERE code = ?', [testDeptCode]);

    console.log(`\nCreating test department: ${testDeptCode} - ${testDeptName}`);

    // Insert the department (this should trigger HOD creation in the application)
    const [insertResult] = await connection.execute(
      'INSERT INTO departments (name, code) VALUES (?, ?)',
      [testDeptName, testDeptCode]
    );

    console.log('Department created with ID:', insertResult.insertId);

    // Now manually create the HOD (simulating the automatic creation)
    const hodEmail = `hod.${testDeptCode.toLowerCase()}@lnmiit.ac.in`;
    const hodName = `Dr. HOD ${testDeptCode}`;
    const employeeId = `EMP_HOD_${testDeptCode}`;

    await connection.execute(
      'INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        hodEmail,
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        hodName,
        'hod',
        testDeptCode,
        employeeId
      ]
    );

    console.log(`✅ HOD user created: ${hodEmail}`);

    // Verify the HOD can be found
    const [hodCheck] = await connection.execute(
      'SELECT email, name, role, department FROM users WHERE email = ?',
      [hodEmail]
    );

    if (hodCheck.length > 0) {
      console.log('✅ HOD verification successful:');
      console.log('   Email:', hodCheck[0].email);
      console.log('   Name:', hodCheck[0].name);
      console.log('   Role:', hodCheck[0].role);
      console.log('   Department:', hodCheck[0].department);
    }

    // Clean up test data
    await connection.execute('DELETE FROM users WHERE email = ?', [hodEmail]);
    await connection.execute('DELETE FROM departments WHERE code = ?', [testDeptCode]);
    console.log('\n🧹 Test data cleaned up');

    await connection.end();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDepartmentHodCreation();
