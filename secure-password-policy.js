const mysql = require('mysql2/promise');

async function implementSecurePasswordPolicy() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('🔐 Implementing Secure Password Policy');
    console.log('=====================================\n');

    // Option 1: Keep admin accounts with passwords for system access
    console.log('Step 1: Keeping admin accounts with passwords for system access...');
    const adminCount = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );
    console.log(`✅ ${adminCount[0][0].count} admin accounts will keep their passwords\n`);

    // Option 2: Remove passwords from all HOD accounts (they must use forgot password)
    console.log('Step 2: Removing passwords from HOD accounts (secure approach)...');
    const [hodUpdate] = await connection.execute(
      'UPDATE users SET password_hash = NULL WHERE role = ?',
      ['hod']
    );
    console.log(`✅ Removed passwords from ${hodUpdate.affectedRows} HOD accounts\n`);

    // Option 3: Remove passwords from faculty, lab_staff, student accounts
    console.log('Step 3: Removing passwords from other user types...');
    const [otherUpdate] = await connection.execute(
      'UPDATE users SET password_hash = NULL WHERE role IN (?, ?, ?, ?)',
      ['faculty', 'lab_staff', 'student', 'tnp']
    );
    console.log(`✅ Removed passwords from ${otherUpdate.affectedRows} other accounts\n`);

    // Show summary
    console.log('📊 Security Summary:');
    console.log('-'.repeat(50));
    
    const roles = ['admin', 'hod', 'faculty', 'lab_staff', 'student', 'tnp'];
    for (const role of roles) {
      const [withPassword] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND password_hash IS NOT NULL',
        [role]
      );
      const [withoutPassword] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND password_hash IS NULL',
        [role]
      );
      
      const hasPass = withPassword[0][0].count;
      const noPass = withoutPassword[0][0].count;
      const total = hasPass + noPass;
      
      console.log(`${role.toUpperCase().padEnd(12)} | Total: ${total.toString().padStart(2)} | With Password: ${hasPass.toString().padStart(2)} | Must Reset: ${noPass.toString().padStart(2)}`);
    }

    console.log('\n🔒 Security Benefits:');
    console.log('• No default passwords in the system');
    console.log('• Users must set their own secure passwords');
    console.log('• Forgot password flow ensures email verification');
    console.log('• Reduces risk of credential stuffing attacks');
    
    console.log('\n📝 Next Steps for Users:');
    console.log('1. Users visit the login page');
    console.log('2. Click "Forgot Password"');
    console.log('3. Enter their email address');
    console.log('4. Check email for reset link');
    console.log('5. Set their secure password');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

implementSecurePasswordPolicy();
