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

    // departments columns and indexes
    try {
  await ensureColumn('departments', 'hod_email', 'VARCHAR(255) NULL')
      await ensureColumn('departments', 'code', 'VARCHAR(10) NULL')
      await ensureColumn('departments', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
      await ensureColumn('departments', 'hod_id', 'INT NULL')
      // unique index on code
      try { await conn.query(`CREATE UNIQUE INDEX idx_departments_code ON departments(code)`) } catch (_) {}
      // index on hod_id
      try { await conn.query(`CREATE INDEX idx_departments_hod ON departments(hod_id)`) } catch (_) {}
      // add foreign key if missing
      const [fk] = await conn.query(
        `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'hod_id' AND REFERENCED_TABLE_NAME = 'users' AND REFERENCED_COLUMN_NAME = 'id'`
      )
      if (!fk[0]) {
        try { await conn.query(`ALTER TABLE departments ADD CONSTRAINT fk_departments_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL`) } catch (_) {}
      }
    } catch (e) {
      // ignore
    }

    // users: ensure salutation column exists
    try {
      await ensureColumn('users', 'salutation', "ENUM('prof','dr','mr','mrs','none') DEFAULT 'none'")
    } catch (_) {
      // ignore if fails
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

    // Backfill: copy any existing single staff assignments into the new junction table
    try {
      console.log('[db-setup] backfilling lab_staff_assignments from labs.staff_id ...')
      await conn.query(`
        INSERT IGNORE INTO lab_staff_assignments (lab_id, staff_id)
        SELECT id AS lab_id, staff_id FROM labs WHERE staff_id IS NOT NULL
      `)
      console.log('[db-setup] backfill complete')
    } catch (e) {
      console.log('[db-setup] backfill skipped or failed:', e && e.message ? e.message : e)
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
