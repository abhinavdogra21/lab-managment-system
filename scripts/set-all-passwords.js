#!/usr/bin/env node
const crypto = require('crypto');

async function setAllPasswords() {
  try {
    // Dynamic import for ES modules
    const { Database } = await import('../lib/database.js');
    const db = Database.getInstance();
    
    const newPassword = '123';
    
    // Generate salt and hash using scrypt
    const salt = crypto.randomBytes(32);
    const hash = crypto.scryptSync(newPassword, salt, 64);
    const passwordHash = salt.toString('hex') + ':' + hash.toString('hex');
    
    console.log('🔒 Setting password "123" for all users...');
    console.log('Generated hash:', passwordHash.substring(0, 32) + '...');
    
    // Get all users first
    const allUsers = await db.query('SELECT id, email, name, role FROM users');
    console.log(`\n📋 Found ${allUsers.rows.length} users:`);
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - ${user.role}`);
    });
    
    // Update all users with the same password hash
    const updateResult = await db.query(
      'UPDATE users SET password_hash = ?',
      [passwordHash]
    );
    
    console.log(`\n✅ Successfully updated ${updateResult.affectedRows} user passwords`);
    console.log('🔑 All users can now login with password: "123"');
    console.log('\n📝 Test login credentials:');
    console.log('• labstaff2@lnmiit.ac.in / 123');
    console.log('• admin@lnmiit.ac.in / 123');
    console.log('• faculty1@lnmiit.ac.in / 123');
    console.log('• etc...');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  }
  
  process.exit(0);
}

setAllPasswords();
