/**
 * Script to set password "123" for all users using SHA256 (legacy format)
 * Usage: node set-all-passwords-sha256.js
 */

const mysql = require('mysql2/promise')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
  
  return env
}

function hashPasswordSHA256(password) {
  return crypto.createHash("sha256").update(password).digest("hex")
}

async function setAllPasswords() {
  const password = '123'
  const env = loadEnv()
  
  console.log('🔐 Setting password "123" for all users using SHA256...')
  
  // Hash the password using SHA256
  const passwordHash = hashPasswordSHA256(password)
  console.log(`✅ Password hashed (SHA256): ${passwordHash}`)
  
  // Connect to database
  const connection = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'lnmiit_lab_management',
  })
  
  console.log('📦 Connected to database')
  
  try {
    // Get count of users
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM users'
    )
    const totalUsers = countResult[0].count
    console.log(`👥 Found ${totalUsers} users`)
    
    // Update all users
    const [result] = await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE 1=1',
      [passwordHash]
    )
    
    console.log(`✅ Updated ${result.affectedRows} users`)
    
    // Show sample users
    const [users] = await connection.query(
      'SELECT id, email, name, role FROM users LIMIT 10'
    )
    
    console.log('\n📋 Sample users (first 10):')
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Role: ${user.role}`)
    })
    
    console.log('\n✅ All users can now login with password: 123')
    console.log('📝 Password hash format: SHA256 (legacy)')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await connection.end()
    console.log('👋 Database connection closed')
  }
}

// Run the script
setAllPasswords()
  .then(() => {
    console.log('\n🎉 Success! All passwords have been set to "123" using SHA256')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
