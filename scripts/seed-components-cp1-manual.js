/*
  Manual seed of CP1 components from an inline list based on the data you provided.

  Usage:
    pnpm seed:components:cp1:manual

  Notes:
  - Looks up lab by code or exact/like name ("CP1").
  - Ensures `components` table exists.
  - Upserts by (lab_id, name, model) to avoid duplicates on re-run.
  - For the special line "DHT22 && LDR" with quantity "50,50", it splits into two records.
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    })
  } catch {}
}

function normCond(v) {
  const s = String(v || '').toLowerCase()
  if (s.includes('consum')) return 'consumable'
  if (s.includes('dead')) return 'dead'
  return 'working'
}

function toInt(v, def = 0) {
  if (v == null) return def
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10)
  return Number.isFinite(n) ? Math.max(0, n) : def
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

async function getLabId(conn, ident) {
  const [byCode] = await conn.query(`SELECT id FROM labs WHERE LOWER(code) = LOWER(?) LIMIT 1`, [ident])
  if (byCode.length) return byCode[0].id
  const [byName] = await conn.query(`SELECT id FROM labs WHERE LOWER(name) = LOWER(?) LIMIT 1`, [ident])
  if (byName.length) return byName[0].id
  const [byLike] = await conn.query(`SELECT id FROM labs WHERE name LIKE ? LIMIT 1`, [`%${ident}%`])
  if (byLike.length) return byLike[0].id
  return null
}

async function upsert(conn, labId, item) {
  const [rows] = await conn.query(
    `SELECT id, quantity_total, quantity_available FROM components WHERE lab_id = ? AND name = ? AND (model <=> ?) LIMIT 1`,
    [labId, item.name, item.model]
  )
  if (rows.length) {
    const ex = rows[0]
    const newTotal = Math.max(ex.quantity_total, item.quantity_total)
    let newAvail = Math.max(ex.quantity_available, item.quantity_available)
    newAvail = Math.min(newAvail, newTotal)
    await conn.query(
      `UPDATE components SET category = COALESCE(?, category), model = COALESCE(?, model), condition_status = ?, quantity_total = ?, quantity_available = ?, updated_at = NOW() WHERE id = ?`,
      [item.category || null, item.model || null, item.condition_status, newTotal, newAvail, ex.id]
    )
    return 'updated'
  } else {
    await conn.query(
      `INSERT INTO components (lab_id, name, category, model, condition_status, quantity_total, quantity_available) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [labId, item.name, item.category || null, item.model || null, item.condition_status, item.quantity_total, item.quantity_available]
    )
    return 'inserted'
  }
}

// Source data (subset can be adjusted). For entries with missing Make/Model, keep model null.
const RAW = [
  { name: 'Arduinio Mega', make: '-', model: '-', qty: '15', condition: 'Working', category: 'Development Boards' },
  { name: 'Sensor Kit', make: '-', model: '-', qty: '3', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Male to Female Bus', make: '-', model: '-', qty: '10', condition: 'Working', category: 'Wires and Cables' },
  { name: 'Female to Female Bus', make: '-', model: '-', qty: '10', condition: 'Working', category: 'Wires and Cables' },
  { name: 'Geared Motor', make: '-', model: '-', qty: '4', condition: 'Working', category: 'Actuator' },
  { name: 'Servo Motor', make: '-', model: '-', qty: '4', condition: 'Working', category: 'Actuator' },
  { name: 'Breadboard', make: '-', model: '-', qty: '15', condition: 'Working', category: 'Electronic Components' },
  { name: 'AC Power Adaptor', make: 'ODROID', model: 'XU4', qty: '1', condition: 'Working', category: 'Accessories' },
  { name: 'Quick Starter Kit with Raspberry PI3 (Board)', make: 'Raspberry', model: 'Pi 3', qty: '1', condition: 'Working', category: 'Development Boards' },
  { name: 'Odroid Wifi Modue 4', make: 'ODROID', model: 'Modue 4', qty: '1', condition: 'Working', category: 'Development Boards' },
  { name: 'Odroid XU4 Case Top Half & Base', make: '', model: '', qty: '1', condition: 'Working', category: 'Case' },
  { name: 'Raspberry Pi Model 3B+', make: '', model: '', qty: '15', condition: 'Working', category: 'Development Boards' },
  { name: 'Memory Card', make: 'Sandisk', model: '16 GB Class 10', qty: '15', condition: 'Working', category: 'Accessories' },
  { name: 'USB to Micro USB Cable', make: '', model: '', qty: '5', condition: 'Working', category: 'Wires and Cables' },
  { name: 'Case for Raspberry Pi Model 3B+', make: '', model: '', qty: '15', condition: 'Working', category: 'Case' },
  { name: 'Case for Arduino Mega 2560', make: '', model: '', qty: '30', condition: 'Working', category: 'Case' },
  { name: 'Battery', make: 'UPLUS', model: '12V/7.2AH', qty: '20', condition: 'Working', category: 'Electronic Components' },
  { name: 'LED', make: '', model: '', qty: '100', condition: 'Consumable', category: 'Electronic Components' },
  // Row 19: DHT22 && LDR with qty "50,50" handled below in runtime (split into two items)
  { name: 'DHT22 && LDR', make: '', model: '', qty: '50,50', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Servo Motor', make: '', model: '', qty: '10', condition: 'Working', category: 'Actuator' },
  { name: 'Arduino Mega 2560', make: '', model: '', qty: '5', condition: 'Working', category: 'Development Boards' },
  { name: 'Buzzer', make: 'ION', model: 'PCB Type B-20', qty: '20', condition: 'Working', category: 'Electronic Components' },
  { name: 'Memory Card Reader', make: 'QHMPL', model: '5588', qty: '3', condition: 'Working', category: 'Accessories' },
  { name: 'Arduino Wifi Module', make: '', model: '8266-1', qty: '3', condition: 'Working', category: 'Development Boards' },
  { name: 'Arduino Bluetooth', make: '', model: 'HC-05', qty: '3', condition: 'Working', category: 'Development Boards' },
  { name: 'Arduino Zigbee Module', make: 'XBEE', model: '2SC', qty: '1', condition: 'Working', category: 'Development Boards' },
  { name: 'RainDrops Sensor Module', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Infrared Sensor Switch', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Micro DC Water Pump', make: '', model: '', qty: '1', condition: 'Working', category: 'Actuator' },
  { name: 'UltraSonic Sensor', make: '', model: '', qty: '3', condition: 'Working', category: 'Sensor Modules' },
  { name: 'ESP8266', make: '', model: '', qty: '6', condition: 'Working', category: 'Development Boards' },
  { name: 'Pressure Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Alochol Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'PIR Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'ADC 0808/0809', make: '', model: '', qty: '1', condition: 'Working', category: 'Electronic Components' },
  { name: 'RFID', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Sound Detection', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'LCD Display', make: '', model: '', qty: '1', condition: 'Working', category: 'Electronic Components' },
  { name: 'PiezoElectric Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'XBEE Shield', make: '', model: '', qty: '3', condition: 'Working', category: 'Development Boards' },
  { name: 'Gyroseope', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'NODEMCU', make: '', model: '', qty: '2', condition: 'Working', category: 'Development Boards' },
  { name: 'GPS Module', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Bluetooth HC05', make: '', model: '', qty: '1', condition: 'Working', category: 'Wireless Modules' },
  { name: 'Solar Cel', make: '', model: '', qty: '1', condition: 'Working', category: 'Electronic Components' },
  { name: 'MPU 6050', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'USB MicroPhone', make: '', model: '', qty: '1', condition: 'Working', category: 'Accessories' },
  { name: 'Soil Moisture Sensors', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'MQ135(Gas Sensor)', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'accelerometer', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Current Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Voltage Sensor', make: '', model: '', qty: '1', condition: 'Working', category: 'Sensor Modules' },
  { name: 'Magnifier', make: 'Schubert', model: '', qty: '3', condition: 'Working', category: 'Accessories' },
  { name: 'Raspberry Pi', make: 'Raspberry', model: 'Pi4 Model B 4GB', qty: '1', condition: 'Working', category: 'Development Boards' },
  { name: 'Micro USB Cable', make: '', model: '', qty: '7', condition: 'Working', category: 'Wires and Cables' },
  { name: 'LED ASSORTMENT KIT with Resistor Pack', make: '', model: '', qty: '4', condition: 'Consumable', category: 'Electronic Components' },
  { name: 'Jumper Wires Male to Male', make: '', model: '', qty: '10', condition: 'Consumable', category: 'Wires and Cables' },
  { name: 'Jumper Wires Male to Female', make: '', model: '', qty: '20', condition: 'Consumable', category: 'Wires and Cables' },
  { name: 'Micro SD Card Reader', make: '', model: '', qty: '20', condition: 'Working', category: 'Accessories' },
  { name: 'Memory Card', make: 'SanDisk', model: 'Class 10', qty: '1', condition: 'Working', category: 'Accessories' },
  { name: 'Resistor Assortment Kit', make: '', model: '', qty: '1', condition: 'Consumable', category: 'Electronic Components' },
  { name: 'Capacitor Assortment Kit', make: '', model: '', qty: '1', condition: 'Consumable', category: 'Electronic Components' },
  { name: 'BJT Transistors Assortment Kit', make: '', model: '', qty: '1', condition: 'Consumable', category: 'Electronic Components' },
  { name: 'NODEMCU Board', make: '', model: '', qty: '4', condition: 'Working', category: 'Development Boards' },
  { name: 'Ultra Sonic Sensor', make: '', model: '', qty: '10', condition: 'working', category: 'Sensor Modules' },
  { name: 'NodeMCU', make: '', model: '', qty: '2', condition: 'working', category: 'Development Boards' },
  { name: 'Force Sensor', make: '', model: '', qty: '2', condition: 'working', category: 'Sensor Modules' },
  { name: 'NodeMCU', make: '', model: '', qty: '1', condition: 'working', category: 'Development Boards' },
  { name: 'Eye Blink', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Single Car Relay', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'GPS Module', make: '', model: '', qty: '1', condition: 'working', category: 'GPS Modules' },
  { name: '9 Volt Battery CAP', make: '', model: '', qty: '1', condition: 'working', category: 'Electronic Components' },
  { name: 'Relay Module', make: '', model: '', qty: '1', condition: 'working', category: 'Electronic Components' },
  { name: 'Gas Sensor Module', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'PIR Sensor Module', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'RFID Reader/Writer RC522 SPI S50 with RFID Card and Tag', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Xbee USB Adapter', make: '', model: '', qty: '1', condition: 'working', category: 'Development Boards' },
  { name: 'RFID Reader/Writer', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'RFID Reader with cable', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Weight Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Soil Moisture Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'PIR Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Heart Rate Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'GPS Module', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'RFID Reader/Writer', make: '', model: '', qty: '2', condition: 'working', category: 'Sensor Modules' },
  { name: 'Soil Moisture Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'xcluma MAX30100 Heart Rate Pulse Oximetry Sensor Module', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
  { name: 'Techleads Lcd Alphanumeric Display And Iic/I2C Serial Interface', make: '', model: '', qty: '1', condition: 'working', category: 'Electronic Components' },
  { name: 'Heart Rate Sensor', make: '', model: '', qty: '1', condition: 'working', category: 'Sensor Modules' },
]

function expandSpecialCases(items) {
  const out = []
  for (const r of items) {
    if (r.name.includes('DHT22') && r.name.includes('LDR') && String(r.qty).includes(',')) {
      const parts = String(r.qty).split(',').map(s => toInt(s.trim(), 0))
      out.push({ ...r, name: 'DHT22', qty: parts[0] || 0 })
      out.push({ ...r, name: 'LDR', qty: parts[1] || 0 })
    } else {
      out.push(r)
    }
  }
  return out
}

function parseArgs(argv){
  const args = {}
  for (let i=2;i<argv.length;i++){
    const a = argv[i]
    if (a === '--lab') args.lab = argv[++i]
  }
  return args
}

async function main() {
  loadDotEnvLocal()
  const args = parseArgs(process.argv)
  const host = process.env.DB_HOST || 'localhost'
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10)
  const database = process.env.DB_NAME || 'lnmiit_lab_management'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true })
  try {
    await ensureSchema(conn)
    const labIdent = args.lab || 'CP1'
    const labId = await getLabId(conn, labIdent)
    if (!labId) {
      console.error(`[seed-cp1-manual] Lab not found for identifier ${labIdent}. Create it or pass --lab <codeOrName>.`)
      process.exit(1)
    }
    const items = expandSpecialCases(RAW)
    let inserted = 0, updated = 0, skipped = 0
    for (const r of items) {
      const name = String(r.name || '').trim()
      const qty = toInt(r.qty, 0)
      if (!name || qty <= 0) { skipped++; continue }
      const model = [r.make, r.model].filter(Boolean).map(String).map(s => s.trim()).filter(s => s && s !== '-' ).join(' ').trim() || null
      const item = {
        name,
        category: r.category || null,
        model,
        condition_status: normCond(r.condition),
        quantity_total: qty,
        quantity_available: qty,
      }
      const res = await upsert(conn, labId, item)
      if (res === 'inserted') inserted++; else updated++
    }
    console.log(`[seed-cp1-manual] Done. Inserted=${inserted}, Updated=${updated}, Skipped=${skipped}`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('[seed-cp1-manual] failed:', e?.message || e)
  process.exit(1)
})
