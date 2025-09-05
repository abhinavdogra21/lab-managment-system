const mysql = require('mysql2/promise');

async function checkHodLogin() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('🔍 Debugging HOD Login Issue');
    console.log('============================\n');

    // Check the specific HOD user
    const [hod] = await connection.execute(
      'SELECT id, email, name, role, department, password_hash FROM users WHERE email = ?',
      ['hod.cse@lnmiit.ac.in']
    );

    if (hod.length === 0) {
      console.log('❌ HOD user not found!');
      return;
    }

    const hodUser = hod[0];
    console.log('👤 HOD User Details:');
    console.log('ID:', hodUser.id);
    console.log('Email:', hodUser.email);
    console.log('Name:', hodUser.name);
    console.log('Role:', hodUser.role);
    console.log('Department:', hodUser.department);
    console.log('Has Password Hash:', !!hodUser.password_hash);
    
    if (hodUser.password_hash) {
      console.log('Password Hash:', hodUser.password_hash);
      
      // Check if it's the "123" hash
      const crypto = require('crypto');
      const testHash = crypto.createHash('sha256').update('123').digest('hex');
      const isTestPassword = hodUser.password_hash === testHash;
      console.log('Is "123" password:', isTestPassword);
    }

    console.log('\n🔍 Testing Login Process:');
    
    // Simulate the login API call
    const testLogin = {
      email: 'hod.cse@lnmiit.ac.in',
      password: '123',
      userRole: 'hod'
    };

    console.log('Test Login Data:', testLogin);
    
    // Check role normalization
    const normalizedRole = String(testLogin.userRole).replace(/-/g, "_");
    console.log('Normalized Role:', normalizedRole);
    console.log('User Role in DB:', hodUser.role);
    console.log('Role Match:', normalizedRole === hodUser.role);

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkHodLogin();
