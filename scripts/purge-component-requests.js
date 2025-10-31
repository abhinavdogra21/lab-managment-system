#!/usr/bin/env node
// Deletes all component request data (requests and items). Use with caution.
// Standalone JS using mysql2/promise to avoid TS imports.

const mysql = require('mysql2/promise')

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'lnmiit_lab_management',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Abhin@v21dogr@',
    waitForConnections: true,
    connectionLimit: 2,
  }
  let pool
  try {
    pool = mysql.createPool(config)
    console.log('Connecting to DB:', config.host, config.database)
    // Quick sanity: check tables exist
    const [tables] = await pool.query("SHOW TABLES LIKE 'component_requests'")
    if (!Array.isArray(tables) || tables.length === 0) {
      console.warn('Table component_requests not found; proceeding may be a no-op')
    }
    console.log('Purging component_request_items...')
    await pool.query('DELETE FROM component_request_items')
    console.log('Purging component_requests...')
    await pool.query('DELETE FROM component_requests')
    console.log('✅ Done. All component requests and items have been deleted.')
  } catch (e) {
    console.error('❌ Failed to purge component requests:', e?.message || e)
    process.exitCode = 1
  } finally {
    if (pool) await pool.end()
  }
}

main()
