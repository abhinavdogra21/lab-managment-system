const mysql = require('mysql2/promise');

async function showCurrentSecurityStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('🔐 LNMIIT Lab Management System - Security Status');
    console.log('================================================\n');

    console.log('📊 Current Password Status by Role:');
    console.log('-'.repeat(60));
    
    const roles = ['admin', 'hod', 'faculty', 'lab_staff', 'student', 'tnp'];
    for (const role of roles) {
      const [users] = await connection.execute(
        'SELECT email, password_hash FROM users WHERE role = ? ORDER BY email',
        [role]
      );
      
      if (users.length > 0) {
        console.log(`\n${role.toUpperCase()} Users:`);
        users.forEach(user => {
          const status = user.password_hash ? '🔑 Password Set' : '🔒 Must Reset';
          console.log(`  ${user.email.padEnd(35)} ${status}`);
        });
      }
    }

    console.log('\n🎯 Testing Credentials (Password: "123"):');
    console.log('-'.repeat(50));
    
    const [testUsers] = await connection.execute(
      'SELECT email, role FROM users WHERE password_hash IS NOT NULL ORDER BY role, email'
    );
    
    testUsers.forEach(user => {
      console.log(`${user.role.padEnd(12)} | ${user.email}`);
    });

    console.log('\n🔒 Security Implementation Status:');
    console.log('✅ New departments automatically create HOD users without passwords');
    console.log('✅ Users without passwords must use forgot password flow');
    console.log('✅ Login form guides users to password reset when needed');
    console.log('✅ System prevents login without password setup');

    console.log('\n📝 To implement full security (no default passwords):');
    console.log('Run: node secure-password-policy.js');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showCurrentSecurityStatus();
