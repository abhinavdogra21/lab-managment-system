/**
 * Script to check a specific user's password
 * Usage: node check-user-password.js
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

function verifyPassword(password, storedHash) {
  if (!storedHash || storedHash === 'NULL') return false
  const [salt, hash] = storedHash.split(":")
  const verifyHash = crypto.scryptSync(password, salt, 64)
  return hash === verifyHash.toString("hex")
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64)
  return salt + ":" + hash.toString("hex")
}

async function checkUserPassword() {
  const email = '23ucs507@lnmiit.ac.in'
  const password = '123'
  const env = loadEnv()
  
  console.log(`🔍 Checking user: ${email}`)
  
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
    // Check if user exists
    const [users] = await connection.query(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = ?',
      [email]
    )
    
    if (users.length === 0) {
      console.log('❌ User not found!')
      return
    }
    
    const user = users[0]
    console.log('\n👤 User details:')
    console.log(`  - ID: ${user.id}`)
    console.log(`  - Email: ${user.email}`)
    console.log(`  - Name: ${user.name}`)
    console.log(`  - Role: ${user.role}`)
    console.log(`  - Active: ${user.is_active ? 'Yes' : 'No'}`)
    console.log(`  - Password Hash: ${user.password_hash ? user.password_hash.substring(0, 50) + '...' : 'NULL'}`)
    
    if (!user.password_hash) {
      console.log('\n⚠️  User has no password set!')
      console.log('🔧 Setting password to "123"...')
      
      const newHash = hashPassword(password)
      await connection.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newHash, user.id]
      )
      
      console.log('✅ Password set successfully!')
    } else {
      const isValid = verifyPassword(password, user.password_hash)
      console.log(`\n🔐 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
      
      if (!isValid) {
        console.log('🔧 Updating password to "123"...')
        const newHash = hashPassword(password)
        await connection.query(
          'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
          [newHash, user.id]
        )
        console.log('✅ Password updated successfully!')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await connection.end()
    console.log('\n👋 Database connection closed')
  }
}

// Run the script
checkUserPassword()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
