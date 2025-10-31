#!/usr/bin/env node
// Deletes all component loans data. Use with caution.
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
    console.log('Purging component_loan_items...')
    await pool.query('DELETE FROM component_loan_items')
    console.log('Purging component_loans...')
    await pool.query('DELETE FROM component_loans')
    console.log('✅ Done. All component loans and loan items have been deleted.')
  } catch (e) {
    console.error('❌ Failed to purge component loans:', e?.message || e)
    process.exitCode = 1
  } finally {
    if (pool) await pool.end()
  }
}

main()
