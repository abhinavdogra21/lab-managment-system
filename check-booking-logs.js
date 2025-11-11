/**
 * Script to check booking logs and faculty associations
 * Usage: node check-booking-logs.js
 */

const mysql = require('mysql2/promise')
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

async function checkBookingLogs() {
  const env = loadEnv()
  
  console.log('🔍 Checking booking logs for faculty...')
  
  // Connect to database
  const connection = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'lnmiit_lab_management',
  })
  
  console.log('📦 Connected to database\n')
  
  try {
    // Get Preeti Singh's user info
    const [preeti] = await connection.query(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      ['preeti@lnmiit.ac.in']
    )
    
    if (preeti.length === 0) {
      console.log('❌ Preeti Singh not found!')
      return
    }
    
    console.log('👤 Faculty User:')
    console.log(`  - ID: ${preeti[0].id}`)
    console.log(`  - Name: ${preeti[0].name}`)
    console.log(`  - Email: ${preeti[0].email}\n`)
    
    // Check all booking logs
    const [allLogs] = await connection.query(`
      SELECT 
        id, booking_id, action, 
        JSON_EXTRACT(booking_snapshot, '$.requester_name') as requester_name,
        JSON_EXTRACT(booking_snapshot, '$.faculty_name') as faculty_name,
        JSON_EXTRACT(booking_snapshot, '$.lab_name') as lab_name,
        JSON_EXTRACT(booking_snapshot, '$.purpose') as purpose,
        JSON_EXTRACT(booking_snapshot, '$.booking_date') as booking_date,
        created_at
      FROM lab_booking_activity_logs
      WHERE action = 'approved_by_hod'
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    console.log('📋 Recent approved booking logs:')
    console.log('='.repeat(80))
    allLogs.forEach((log, i) => {
      console.log(`\n${i + 1}. Log ID: ${log.id}`)
      console.log(`   Booking ID: ${log.booking_id}`)
      console.log(`   Requester: ${log.requester_name}`)
      console.log(`   Faculty: ${log.faculty_name}`)
      console.log(`   Lab: ${log.lab_name}`)
      console.log(`   Purpose: ${log.purpose}`)
      console.log(`   Date: ${log.booking_date}`)
      console.log(`   Created: ${log.created_at}`)
    })
    
    // Check if Preeti's name matches any logs
    console.log('\n\n🔍 Checking logs that should be visible to Preeti Singh...')
    const [preetiLogs] = await connection.query(`
      SELECT 
        id, booking_id, action,
        JSON_UNQUOTE(JSON_EXTRACT(booking_snapshot, '$.faculty_name')) as faculty_name
      FROM lab_booking_activity_logs
      WHERE action = 'approved_by_hod'
      AND JSON_UNQUOTE(JSON_EXTRACT(booking_snapshot, '$.faculty_name')) = ?
    `, [preeti[0].name])
    
    console.log(`\n📊 Found ${preetiLogs.length} logs where faculty_name matches "${preeti[0].name}"`)
    
    if (preetiLogs.length === 0) {
      console.log('\n⚠️  No logs found! Checking what faculty names are in the system...')
      
      const [distinctFaculty] = await connection.query(`
        SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(booking_snapshot, '$.faculty_name')) as faculty_name
        FROM lab_booking_activity_logs
        WHERE action = 'approved_by_hod'
        AND JSON_EXTRACT(booking_snapshot, '$.faculty_name') IS NOT NULL
      `)
      
      console.log('\n📋 Faculty names in booking logs:')
      distinctFaculty.forEach(row => {
        console.log(`   - "${row.faculty_name}"`)
      })
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
checkBookingLogs()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
