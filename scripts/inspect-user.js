/* Local dev helper: inspect a user row by email and print key fields */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

function loadDotEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return
    const content = fs.readFileSync(envPath, 'utf8')
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!m) return
      const key = m[1]
      let val = m[2]
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    })
  } catch {}
}

async function main() {
  loadDotEnvLocal()
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node scripts/inspect-user.js <email>')
    process.exit(1)
  }
  const host = process.env.DB_HOST || 'localhost'
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10)
  const database = process.env.DB_NAME || 'lnmiit_lab_management'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    const [rows] = await conn.query('SELECT id, email, role, password_hash, updated_at FROM users WHERE email = ?', [email])
    console.log(rows)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
