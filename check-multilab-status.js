const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

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

async function checkMultiLabStatus() {
  const env = loadEnv()
  
  const connection = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'lnmiit_lab_management',
  })
  
  console.log('=== MULTI-LAB BOOKINGS ===\n')
  
  const [bookings] = await connection.query(`
    SELECT id, status, is_multi_lab, lab_ids, 
           faculty_approved_at, lab_staff_approved_at, hod_approved_at,
           DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date,
           start_time, end_time, purpose
    FROM booking_requests 
    WHERE is_multi_lab = 1
    ORDER BY id DESC 
    LIMIT 5
  `)
  
  for (const booking of bookings) {
    console.log(`\n📋 Booking ID: ${booking.id}`)
    console.log(`   Status: ${booking.status}`)
    console.log(`   Date: ${booking.booking_date} ${booking.start_time}-${booking.end_time}`)
    console.log(`   Purpose: ${booking.purpose}`)
    console.log(`   Faculty Approved: ${booking.faculty_approved_at || 'No'}`)
    console.log(`   Lab Staff Approved: ${booking.lab_staff_approved_at || 'No'}`)
    console.log(`   HOD Approved: ${booking.hod_approved_at || 'No'}`)
    
    // Get multi-lab approvals
    const [approvals] = await connection.query(`
      SELECT mla.lab_id, l.name as lab_name, l.code,
             mla.status, 
             mla.lab_staff_approved_at, 
             mla.hod_approved_at,
             ls.name as lab_staff_name,
             h.name as hod_name
      FROM multi_lab_approvals mla
      JOIN labs l ON mla.lab_id = l.id
      LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
      LEFT JOIN users h ON mla.hod_approved_by = h.id
      WHERE mla.booking_request_id = ?
      ORDER BY l.code
    `, [booking.id])
    
    console.log('\n   Individual Lab Approvals:')
    for (const approval of approvals) {
      console.log(`   • ${approval.lab_name} (${approval.code}):`)
      console.log(`     - Status: ${approval.status}`)
      console.log(`     - Lab Staff: ${approval.lab_staff_approved_at ? `✓ ${approval.lab_staff_name}` : '✗ Pending'}`)
      console.log(`     - HOD: ${approval.hod_approved_at ? `✓ ${approval.hod_name}` : '✗ Pending'}`)
    }
    
    // Check count
    const [count] = await connection.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM multi_lab_approvals
      WHERE booking_request_id = ?
    `, [booking.id])
    
    console.log(`\n   Summary: ${count[0].approved}/${count[0].total} labs approved by staff, ${count[0].pending} pending`)
    console.log('   ' + '='.repeat(70))
  }
  
  console.log('\n\n=== HOD USERS ===\n')
  const [hods] = await connection.query(`
    SELECT u.id, u.name, u.email, d.name as department
    FROM users u
    JOIN departments d ON u.id = d.hod_id
    WHERE u.role = 'hod'
  `)
  
  for (const hod of hods) {
    console.log(`${hod.name} (${hod.email}) - ${hod.department}`)
  }
  
  await connection.end()
}

checkMultiLabStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
