const mysql = require('mysql2/promise');

async function listAllHodCredentials() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('='.repeat(80));
    console.log('              LNMIIT LAB MANAGEMENT SYSTEM');
    console.log('                  HOD LOGIN CREDENTIALS');
    console.log('='.repeat(80));

    // Get all HOD users
    const [hods] = await connection.execute(
      'SELECT email, name, department FROM users WHERE role = ? ORDER BY department',
      ['hod']
    );

    console.log('\nAll HOD accounts (Password: admin123):');
    console.log('-'.repeat(80));
    
    hods.forEach((hod, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. Department: ${hod.department.padEnd(8)} | Email: ${hod.email.padEnd(30)} | Name: ${hod.name}`);
    });

    console.log('-'.repeat(80));
    console.log(`Total HOD accounts: ${hods.length}`);
    
    // Also show all departments
    const [departments] = await connection.execute('SELECT name, code FROM departments ORDER BY code');
    console.log('\nAll Departments:');
    console.log('-'.repeat(50));
    departments.forEach((dept, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${dept.code.padEnd(8)} - ${dept.name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('Note: All HOD accounts use the default password "admin123"');
    console.log('Users should change their passwords after first login.');
    console.log('='.repeat(80));

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listAllHodCredentials();
