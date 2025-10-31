/*
  Seed lab components from an Excel file into the `components` table.
  Usage examples:
    pnpm seed:components --file "public/Computer Lab Equipment Details (1).xlsx" --lab CP1
    node scripts/seed-components-from-excel.js --file path/to/file.xlsx --lab CP1

  Notes:
  - Looks up lab by code or name (case-insensitive); fails if not found.
  - Creates `components` table if missing.
  - Maps common Excel headers to fields: name, category, model, condition, total, available.
  - If a component with same name (+ optional model) exists in that lab, it updates quantities; otherwise inserts a new row.
*/

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const XLSX = require('xlsx')

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

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--file') { args.file = argv[++i] }
    else if (a === '--lab') { args.lab = argv[++i] }
    else if (a === '--sheet') { args.sheet = argv[++i] }
    else if (a === '--dry-run') { args.dryRun = true }
  }
  return args
}

function normalizeHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function mapCondition(val) {
  const s = String(val || '').toLowerCase().trim()
  if (!s) return 'working'
  if (s.includes('consum')) return 'consumable'
  if (s.includes('dead') || s.includes('damag') || s.includes('not work') || s.includes('fault')) return 'dead'
  return 'working'
}

function toInt(n, def = 0) {
  const v = Math.max(0, parseInt(String(n).replace(/[^0-9-]/g, ''), 10))
  return Number.isFinite(v) ? v : def
}

async function ensureSchema(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NULL,
    model VARCHAR(255) NULL,
    condition_status ENUM('working','dead','consumable') NOT NULL DEFAULT 'working',
    quantity_total INT NOT NULL DEFAULT 0,
    quantity_available INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (lab_id)
  )`)
}

async function getLabId(conn, labIdentifier) {
  // Try code match, then exact name, then name LIKE
  const [byCode] = await conn.query(`SELECT id FROM labs WHERE LOWER(code) = LOWER(?) LIMIT 1`, [labIdentifier])
  if (byCode.length) return byCode[0].id
  const [byName] = await conn.query(`SELECT id FROM labs WHERE LOWER(name) = LOWER(?) LIMIT 1`, [labIdentifier])
  if (byName.length) return byName[0].id
  const [byLike] = await conn.query(`SELECT id FROM labs WHERE name LIKE ? LIMIT 1`, [`%${labIdentifier}%`])
  if (byLike.length) return byLike[0].id
  return null
}

function mapRow(row, headerMap) {
  const get = (keys, def = '') => {
    for (const k of keys) {
      if (k && k in row && row[k] != null && String(row[k]).trim() !== '') return row[k]
    }
    return def
  }

  const name = get(headerMap.name)
  const category = get(headerMap.category, null)
  const model = get(headerMap.model, null)
  const condition = get(headerMap.condition, 'working')
  const total = get(headerMap.total, '')
  const available = get(headerMap.available, '')

  return {
    name: name ? String(name).trim() : '',
    category: category ? String(category).trim() : null,
    model: model ? String(model).trim() : null,
    condition_status: mapCondition(condition),
    quantity_total: total !== '' ? toInt(total, 0) : (available !== '' ? toInt(available, 0) : 0),
    quantity_available: available !== '' ? toInt(available, 0) : (total !== '' ? toInt(total, 0) : 0),
  }
}

function buildHeaderMap(headers) {
  // Candidate header substrings for each logical field
  const candidates = {
    name: ['item name', 'name', 'equipment', 'component', 'device', 'product'],
    category: ['category', 'type', 'group'],
    model: ['model', 'make', 'brand', 'version'],
    condition: ['condition', 'status', 'state'],
    total: ['total', 'quantity', 'qty', 'count', 'no. of', 'nos'],
    available: ['available', 'in stock', 'stock']
  }
  const map = { name: [], category: [], model: [], condition: [], total: [], available: [] }
  for (const h of headers) {
    const n = normalizeHeader(h)
    if (!n) continue
    for (const [key, list] of Object.entries(candidates)) {
      if (list.some(s => n.includes(s))) {
        map[key].push(h)
      }
    }
  }
  // Ensure name has at least the first header as fallback
  if (map.name.length === 0 && headers.length > 0) map.name.push(headers[0])
  return map
}

async function upsertComponent(conn, labId, item) {
  // Try to find by (lab_id, name, model)
  const [rows] = await conn.query(
    `SELECT id, quantity_total, quantity_available FROM components WHERE lab_id = ? AND name = ? AND (model <=> ?) LIMIT 1`,
    [labId, item.name, item.model]
  )
  if (rows.length) {
    const existing = rows[0]
    // Update totals; keep available in sync but not exceeding total
    const newTotal = Math.max(existing.quantity_total, item.quantity_total)
    let newAvail = Math.max(existing.quantity_available, item.quantity_available)
    newAvail = Math.min(newAvail, newTotal)
    await conn.query(
      `UPDATE components SET category = COALESCE(?, category), model = COALESCE(?, model), condition_status = ?, quantity_total = ?, quantity_available = ?, updated_at = NOW() WHERE id = ?`,
      [item.category, item.model, item.condition_status, newTotal, newAvail, existing.id]
    )
    return { action: 'updated', id: existing.id }
  } else {
    const [res] = await conn.query(
      `INSERT INTO components (lab_id, name, category, model, condition_status, quantity_total, quantity_available) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [labId, item.name, item.category, item.model, item.condition_status, item.quantity_total, item.quantity_available]
    )
    return { action: 'inserted', id: res.insertId }
  }
}

async function main() {
  loadDotEnvLocal()
  const args = parseArgs(process.argv)
  const file = args.file || path.resolve(process.cwd(), 'public/Computer Lab Equipment Details (1).xlsx')
  const labIdent = args.lab || 'CP1'
  const sheetName = args.sheet // optional

  if (!fs.existsSync(file)) {
    console.error(`[seed-components] Excel file not found: ${file}`)
    process.exit(1)
  }

  console.log(`[seed-components] Reading: ${file}`)
  const workbook = XLSX.readFile(file)
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]]
  if (!sheet) {
    console.error(`[seed-components] Sheet not found: ${sheetName}`)
    process.exit(1)
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) {
    console.error(`[seed-components] No rows in sheet.`)
    process.exit(1)
  }
  const headers = Object.keys(rows[0])
  const headerMap = buildHeaderMap(headers)

  const host = process.env.DB_HOST || 'localhost'
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10)
  const database = process.env.DB_NAME || 'lnmiit_lab_management'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''
  console.log(`[seed-components] Connecting to MySQL ${user}@${host}:${port}/${database}`)
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true })
  try {
    await ensureSchema(conn)
    const labId = await getLabId(conn, labIdent)
    if (!labId) {
      console.error(`[seed-components] Lab not found for identifier: ${labIdent}. Please create the lab first (code or name containing "${labIdent}").`)
      process.exit(1)
    }
    console.log(`[seed-components] Target lab_id=${labId}`)

    let inserted = 0, updated = 0, skipped = 0
    for (const row of rows) {
      const item = mapRow(row, headerMap)
      if (!item.name) { skipped++; continue }
      if (args.dryRun) { continue }
      const { action } = await upsertComponent(conn, labId, item)
      if (action === 'inserted') inserted++
      else updated++
    }
    console.log(`[seed-components] Done. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('[seed-components] failed:', err && err.message ? err.message : err)
  process.exit(1)
})
