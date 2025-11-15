const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

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

async function sendHODNotification() {
  const env = loadEnv()
  
  const connection = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'lnmiit_lab_management',
  })
  
  console.log('Fetching booking 42 details...\n')
  
  const [bookings] = await connection.query(`
    SELECT 
      br.*,
      u.name as student_name,
      u.email as student_email,
      u.salutation as student_salutation,
      u.role as requester_role,
      d.hod_email,
      hod.name as hod_name,
      hod.salutation as hod_salutation
    FROM booking_requests br
    JOIN users u ON br.requested_by = u.id
    JOIN labs l ON br.lab_id = l.id
    JOIN departments d ON l.department_id = d.id
    LEFT JOIN users hod ON d.hod_id = hod.id
    WHERE br.id = 42
  `)
  
  if (bookings.length === 0) {
    console.log('Booking not found!')
    await connection.end()
    return
  }
  
  const booking = bookings[0]
  
  // Get lab names
  let labIds = JSON.parse(booking.lab_ids)
  const [labs] = await connection.query(
    `SELECT name FROM labs WHERE id IN (${labIds.map(() => '?').join(',')}) ORDER BY code`,
    labIds
  )
  const labNames = labs.map(l => l.name).join(', ')
  
  console.log('Booking Details:')
  console.log(`  Student: ${booking.student_name}`)
  console.log(`  Labs: ${labNames}`)
  console.log(`  Date: ${booking.booking_date}`)
  console.log(`  Time: ${booking.start_time} - ${booking.end_time}`)
  console.log(`  Purpose: ${booking.purpose}`)
  console.log(`\nHOD: ${booking.hod_name} (${booking.hod_email})\n`)
  
  // Check TESTING_MODE
  const testingMode = env.TESTING_MODE === 'true'
  const adminEmail = env.ADMIN_EMAIL
  
  const recipientEmail = testingMode ? adminEmail : booking.hod_email
  
  console.log(`Email will be sent to: ${recipientEmail} ${testingMode ? '(TESTING MODE)' : ''}\n`)
  
  // Create email
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || '587'),
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  })
  
  const emailHtml = `
    <h2>Lab Booking Request Requires Your Approval</h2>
    <p>Dear ${booking.hod_salutation ? booking.hod_salutation + ' ' : ''}${booking.hod_name},</p>
    <p>A multi-lab booking request has been approved by all lab staff and requires your approval:</p>
    <ul>
      <li><strong>Requester:</strong> ${booking.student_salutation ? booking.student_salutation + ' ' : ''}${booking.student_name} (${booking.requester_role})</li>
      <li><strong>Labs:</strong> ${labNames}</li>
      <li><strong>Date:</strong> ${booking.booking_date}</li>
      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
      <li><strong>Purpose:</strong> ${booking.purpose}</li>
      <li><strong>Request ID:</strong> #${booking.id}</li>
    </ul>
    <p>All lab staff have approved this request. Please review and take action.</p>
    <p><a href="${env.NEXT_PUBLIC_APP_URL}/hod/dashboard/approvals" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Request</a></p>
  `
  
  const info = await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `Lab Booking Request #${booking.id} - Pending Your Approval`,
    html: emailHtml,
  })
  
  console.log('✅ Email sent successfully!')
  console.log(`Message ID: ${info.messageId}`)
  
  await connection.end()
}

sendHODNotification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
