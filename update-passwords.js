const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function updateHodPasswords() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('Connected to database');

    // For testing purposes, let's set all user passwords to "123"
    const testPassword = '123';
    const testPasswordHash = crypto.createHash('sha256').update(testPassword).digest('hex');
    
    console.log('Setting all user passwords to "123" for testing...');
    
    // Update all users to have password "123"
    const [updateResult] = await connection.execute(
      'UPDATE users SET password_hash = ?',
      [testPasswordHash]
    );
    
    console.log(`✅ Updated ${updateResult.affectedRows} user passwords to "123"`);

    // Show all HOD users
    const [hods] = await connection.execute(
      'SELECT email, name, department, password_hash FROM users WHERE role = ? ORDER BY department',
      ['hod']
    );

    console.log('\n📋 All HOD users:');
    console.log('-'.repeat(80));
    hods.forEach((hod, index) => {
      const hasPassword = hod.password_hash ? '✅ Has Password' : '❌ No Password';
      console.log(`${(index + 1).toString().padStart(2)}. ${hod.email.padEnd(30)} | ${hod.department.padEnd(8)} | ${hasPassword}`);
    });

    console.log('\n🔐 Security Implementation Options:');
    console.log('1. Current: All users have password "123" for testing');
    console.log('2. Secure: Set password_hash to NULL and require forgot password flow');
    console.log('3. You can now choose which approach to use');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateHodPasswords();
