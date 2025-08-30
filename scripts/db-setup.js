/*
  MySQL setup helper: applies schema, indexes, archival tables, and optional seed data.
  Reads env from process.env and .env.local if present.
*/
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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    })
  } catch { /* ignore */ }
}

async function run() {
  loadDotEnvLocal()

  const host = process.env.DB_HOST || 'localhost'
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10)
  const database = process.env.DB_NAME || 'lnmiit_lab_management'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''

  console.log(`[db-setup] Connecting to MySQL ${user}@${host}:${port}/${database}`)
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true })
  try {
    // Lightweight migrations to align older DBs with current schema before applying seed
  async function ensureColumn(table, column, ddl) {
      const [rows] = await conn.query(
        `SELECT COUNT(1) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      )
      if (rows[0].cnt === 0) {
        console.log(`[db-setup] altering ${table}: ADD COLUMN ${column}`)
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
      }
    }

    // departments.code (nullable + unique)
    try {
      await ensureColumn('departments', 'code', 'VARCHAR(10) NULL')
  await ensureColumn('departments', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
      await conn.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_code ON departments(code)`) // MySQL 8.0+ supports IF NOT EXISTS on index? if not, ignore error
    } catch (e) {
      // Fallback if IF NOT EXISTS not supported
      try { await conn.query(`CREATE UNIQUE INDEX idx_departments_code ON departments(code)`) } catch (_) {}
    }

    // inventory columns required by seed
  try { await ensureColumn('inventory', 'lab_id', 'INT NULL') } catch (_) {}
    try { await ensureColumn('inventory', 'item_code', 'VARCHAR(100) NULL') } catch (_) {}
    try { await ensureColumn('inventory', 'category', 'VARCHAR(100) NULL') } catch (_) {}
    try { await ensureColumn('inventory', 'quantity_total', 'INT NOT NULL DEFAULT 1') } catch (_) {}
  try { await ensureColumn('inventory', 'quantity_available', 'INT NOT NULL DEFAULT 1') } catch (_) {}
  try { await ensureColumn('inventory', 'condition', "ENUM('excellent','good','fair','poor','damaged') DEFAULT 'good'") } catch (_) {}

    // Determine if we should run seed (only when users table is empty)
    let runSeed = true
    try {
      const [u] = await conn.query('SELECT COUNT(1) AS c FROM users')
      if (u[0] && u[0].c > 0) runSeed = false
    } catch (_) {
      // table may not exist yet; allow seed to run
      runSeed = true
    }

    const sqlFiles = [
      'scripts/01-create-tables-mysql.sql',
      'scripts/02-add-indexes-mysql.sql',
      'scripts/03-archival-tables-mysql.sql',
      // seed last (optional)
      ...(runSeed ? ['scripts/02-seed-data.sql'] : []),
    ]

    for (const rel of sqlFiles) {
      const abs = path.resolve(process.cwd(), rel)
      if (!fs.existsSync(abs)) {
        console.log(`[db-setup] skip (not found): ${rel}`)
        continue
      }
      const sql = fs.readFileSync(abs, 'utf8')
      console.log(`[db-setup] applying: ${rel}`)
      // Execute as-is; ensure your SQL files are valid for MySQL dialect
      await conn.query(sql)
      console.log(`[db-setup] done: ${rel}`)
    }

    console.log('[db-setup] completed successfully')
  } finally {
    await conn.end()
  }
}

run().catch((err) => {
  console.error('[db-setup] failed:', err && err.message ? err.message : err)
  process.exit(1)
})
