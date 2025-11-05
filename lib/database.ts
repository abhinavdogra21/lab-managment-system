// Database connection and utility functions
// MySQL implementation using mysql2/promise

import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise"

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "lnmiit_lab_management",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Abhin@v21dogr@",
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_POOL_LIMIT || "5"),
  queueLimit: 0,
}

// Create connection pool (cache on globalThis to survive HMR in dev)
const globalForDb = globalThis as unknown as {
  __mysqlPool?: Pool
  __dbInstance?: Database
}

const pool: Pool = globalForDb.__mysqlPool ?? createPool(dbConfig)
if (!globalForDb.__mysqlPool) {
  globalForDb.__mysqlPool = pool
}

// Database connection wrapper
export class Database {
  private static instance: Database
  private pool: Pool

  private constructor() {
    this.pool = pool
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  // Execute query with parameters
  async query(text: string, params?: any[]): Promise<{ rows: any[]; insertId?: number; affectedRows?: number }> {
    const attempt = async () => {
      const [rowsOrHeader] = await this.pool.query(text, params)
      const isArray = Array.isArray(rowsOrHeader)
      const rows = (isArray ? (rowsOrHeader as RowDataPacket[]) : []) as any[]
      const header = (!isArray ? (rowsOrHeader as ResultSetHeader) : undefined)
      return { rows, insertId: header?.insertId, affectedRows: header?.affectedRows }
    }
    try {
      return await attempt()
    } catch (error: any) {
      // Handle Too many connections with a short backoff retry once
      const msg = String(error?.code || error?.message || "")
      if (msg === "ER_CON_COUNT_ERROR") {
        await new Promise((r) => setTimeout(r, 100))
        return await attempt()
      }
      console.error("Database query error:", error)
      throw error
    }
  }

  // Transaction wrapper
  async transaction(callback: (client: { query: (sql: string, params?: any[]) => Promise<{ rows: any[]; insertId?: number; affectedRows?: number }> }) => Promise<any>): Promise<any> {
    const conn: PoolConnection = await this.pool.getConnection()
    try {
      await conn.beginTransaction()
      const client = {
        query: async (sql: string, params?: any[]) => {
          const [rowsOrHeader] = await conn.query(sql, params)
          const isArray = Array.isArray(rowsOrHeader)
          const rows = (isArray ? (rowsOrHeader as RowDataPacket[]) : []) as any[]
          const header = (!isArray ? (rowsOrHeader as ResultSetHeader) : undefined)
          return { rows, insertId: header?.insertId, affectedRows: header?.affectedRows }
        },
      }
      const result = await callback(client)
      await conn.commit()
      return result
    } catch (error) {
      await conn.rollback()
      console.error("Transaction error:", error)
      throw error
    } finally {
      conn.release()
    }
  }

  // Close all connections
  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Export singleton instance (also cache on globalThis)
export const db: Database = globalForDb.__dbInstance ?? Database.getInstance()
if (!globalForDb.__dbInstance) {
  globalForDb.__dbInstance = db
}

// Common database operations
export const dbOperations = {
  // Internal helper: get user regardless of is_active
  async getUserByIdAny(id: number) {
    const res = await db.query(`SELECT * FROM users WHERE id = ?`, [id])
    return res.rows[0]
  },

  // Hard delete user with archival snapshot and retention trimming
  async hardDeleteUserWithArchive(userId: number) {
    return db.transaction(async (client) => {
      const sel = await client.query(`SELECT * FROM users WHERE id = ?`, [userId])
      const u = sel.rows[0]
      if (!u) throw new Error('User not found')
      // Block hard delete if user has active or pending obligations
      const activeBookings = await client.query(
        `SELECT COUNT(*) AS c FROM lab_bookings 
         WHERE booked_by = ? AND approval_status IN ('pending','approved') AND booking_date >= CURDATE()`,
        [userId]
      )
      if (Number(activeBookings.rows?.[0]?.c || 0) > 0) {
        throw new Error('Cannot delete: user has active or pending bookings')
      }
      const activeIssues = await client.query(
        `SELECT COUNT(*) AS c FROM item_issues 
         WHERE issued_to = ? AND status IN ('issued','overdue','lost')`,
        [userId]
      )
      if (Number(activeIssues.rows?.[0]?.c || 0) > 0) {
        throw new Error('Cannot delete: user has active or overdue item issues')
      }
      // Archive snapshot
      const ins = await client.query(
        `INSERT INTO archived_users (original_user_id, email, password_hash, name, role, department, phone, student_id, employee_id, was_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.email, u.password_hash || null, u.name, u.role, u.department || null, u.phone || null, u.student_id || null, u.employee_id || null, Number(u.is_active ?? 0) === 1, u.created_at || null, u.updated_at || null]
      )
      const archiveId = ins.insertId
      // Archive dependent records which will be deleted via cascade
      // Build column-safe copy for lab_bookings based on existing columns
      const lbColsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'lab_bookings'`
      )
      const lbCols = new Set((lbColsRes.rows || []).map((r: any) => String(r.column_name || r.COLUMN_NAME)))
      const hasLbApprovalDate = lbCols.has('approval_date')
      const hasLbApprovalRemarks = lbCols.has('approval_remarks')
      const hasLbCreatedAt = lbCols.has('created_at')
      const hasLbUpdatedAt = lbCols.has('updated_at')
      const lbSelectParts = [
        'id',
        'lab_id',
        'booked_by',
        'booking_date',
        'start_time',
        'end_time',
        'purpose',
        'expected_students',
        'equipment_needed',
        'approval_status',
        'approved_by',
        hasLbApprovalDate ? 'approval_date' : 'NULL AS approval_date',
        hasLbApprovalRemarks ? 'approval_remarks' : 'NULL AS approval_remarks',
        hasLbCreatedAt ? 'created_at' : 'NOW() AS created_at',
        hasLbUpdatedAt ? 'updated_at' : (hasLbCreatedAt ? 'created_at AS updated_at' : 'NOW() AS updated_at'),
      ].join(', ')
      await client.query(
        `INSERT INTO archived_lab_bookings (original_id, lab_id, booked_by, booking_date, start_time, end_time, purpose, expected_students, equipment_needed, approval_status, approved_by, approval_date, approval_remarks, created_at, updated_at)
         SELECT ${lbSelectParts} FROM lab_bookings WHERE booked_by = ?`,
        [userId]
      )
      await client.query(
        `INSERT INTO archived_attendance (original_id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at)
         SELECT id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at
         FROM attendance WHERE student_id = ?`,
        [userId]
      )
      await client.query(
        `INSERT INTO archived_marks (original_id, student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at)
         SELECT id, student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
         FROM marks WHERE student_id = ?`,
        [userId]
      )
      
      // Delete password_resets first to avoid foreign key constraint
      await client.query(`DELETE FROM password_resets WHERE user_id = ?`, [userId])
      
      // Delete user (cascades will apply per FK definitions)
      await client.query(`DELETE FROM users WHERE id = ?`, [userId])

      // Retention cap for archived_users
      const maxArchived = Number.parseInt(process.env.MAX_ARCHIVED_USERS || '5000', 10)
      if (Number.isFinite(maxArchived) && maxArchived > 0) {
        const cnt = await client.query(`SELECT COUNT(*) AS c FROM archived_users`)
        const c = Number(cnt.rows?.[0]?.c || 0)
        if (c > maxArchived) {
          const delCount = c - maxArchived
          await client.query(`DELETE FROM archived_users ORDER BY archived_at ASC LIMIT ${delCount}`)
        }
      }

      return { deleted: 1, archiveId }
    })
  },
  // Admin metrics and helpers
  async getCounts() {
    const users = await db.query(`SELECT COUNT(*) as c FROM users WHERE is_active = 1`)
    const labs = await db.query(`SELECT COUNT(*) as c FROM labs WHERE is_active = 1`)
    return { totalUsers: Number(users.rows[0]?.c || 0), activeLabs: Number(labs.rows[0]?.c || 0) }
  },

  async getDbUptimeSeconds() {
    try {
      // Try performance_schema first
      const res = await db.query(
        `SELECT VARIABLE_VALUE as val FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime'`
      )
      if (res.rows[0]?.val != null) return Number(res.rows[0].val)
    } catch {}
    try {
      const res2 = await db.query(`SHOW GLOBAL STATUS LIKE 'Uptime'`)
      // mysql2 returns rows with columns Variable_name, Value
      const row = res2.rows[0]
      if (row && (row.Value || row.value)) return Number(row.Value || row.value)
    } catch {}
    return 0
  },

  async getDbSizeMB() {
    try {
      const res = await db.query(
        `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
         FROM information_schema.tables WHERE table_schema = DATABASE()`
      )
      return Number(res.rows[0]?.size_mb || 0)
    } catch {
      return 0
    }
  },

  async getRecentLogs(limit = 10) {
    const res = await db.query(
      `SELECT id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at
       FROM system_logs ORDER BY created_at DESC LIMIT ${Math.max(1, Math.min(200, limit))}`
    )
    return res.rows
  },

  async getRecentBookings(limit = 10) {
    const lim = Math.max(1, Math.min(100, limit))
    const res = await db.query(
      `SELECT b.id, b.booking_date, b.start_time, b.end_time, b.purpose, b.approval_status,
              l.name AS lab_name, u.name AS user_name, u.email AS user_email, b.created_at
       FROM lab_bookings b
       LEFT JOIN labs l ON l.id = b.lab_id
       LEFT JOIN users u ON u.id = b.booked_by
       ORDER BY b.created_at DESC
       LIMIT ${lim}`
    )
    return res.rows
  },

  async getMostActiveLabsThisWeek(limit = 5) {
    const lim = Math.max(1, Math.min(10, limit))
    const res = await db.query(
      `SELECT l.id, l.name AS lab, COUNT(*) AS count
       FROM lab_bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE YEARWEEK(b.booking_date, 1) = YEARWEEK(CURDATE(), 1)
       GROUP BY l.id, l.name
       ORDER BY count DESC
       LIMIT ${lim}`
    )
    return res.rows
  },

  async getRecentlyAddedNonStudentUsers(limit = 8) {
    const lim = Math.max(1, Math.min(20, limit))
    const res = await db.query(
      `SELECT id, name, email, role, department, created_at
       FROM users
       WHERE role <> 'student'
       ORDER BY created_at DESC
       LIMIT ${lim}`
    )
    return res.rows
  },

  async getPendingApprovalsCount() {
    const res = await db.query(`SELECT COUNT(*) AS c FROM lab_bookings WHERE approval_status = 'pending'`)
    return Number(res.rows[0]?.c || 0)
  },

  async getErrorSparkline(days = 14) {
    const d = Math.max(7, Math.min(60, days))
    // Count logs per day and error-like logs per day
    const errors = await db.query(
      `SELECT DATE(created_at) as d, COUNT(*) as c
       FROM system_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND (LOWER(action) LIKE '%error%' OR LOWER(entity_type) LIKE '%error%')
       GROUP BY DATE(created_at)
       ORDER BY d`,
      [d]
    )
    const totals = await db.query(
      `SELECT DATE(created_at) as d, COUNT(*) as c
       FROM system_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY d`,
      [d]
    )
    const mapErr = new Map<string, number>(errors.rows.map((r: any) => [String(r.d).slice(0, 10), Number(r.c)]))
    const mapTot = new Map<string, number>(totals.rows.map((r: any) => [String(r.d).slice(0, 10), Number(r.c)]))
    // produce array oldest->newest of rates 0..1 length d
    const out: number[] = []
    for (let i = d - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      const e = mapErr.get(key) || 0
      const t = mapTot.get(key) || 0
      out.push(t > 0 ? e / t : 0)
    }
    return out
  },

  async getSystemLogs(params: { from?: string; to?: string; action?: string | null; entityType?: string | null; userId?: number | null; limit?: number }) {
    const where: string[] = ["1=1"]
    const values: any[] = []
    if (params.from) { where.push("s.created_at >= ?"); values.push(params.from) }
    if (params.to) { where.push("s.created_at <= ?"); values.push(params.to) }
    if (params.action) { where.push("s.action = ?"); values.push(params.action) }
    if (params.entityType) { where.push("s.entity_type = ?"); values.push(params.entityType) }
    if (params.userId) { where.push("s.user_id = ?"); values.push(params.userId) }
    const lim = Math.max(1, Math.min(10000, params.limit ?? 5000))
    const sql = `
      SELECT s.id, s.user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             s.action, s.entity_type, s.entity_id, s.details, s.ip_address, s.user_agent, s.created_at
      FROM system_logs s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.created_at DESC
      LIMIT ${lim}
    `
    const res = await db.query(sql, values)
    return res.rows
  },

  async getLabsWithInventoryCounts() {
    const res = await db.query(
      `SELECT 
         l.id, l.name, l.code, l.department_id,
         COALESCE(COUNT(i.id),0) as items,
         COALESCE(SUM(i.quantity_available),0) as total_quantity,
         (
           SELECT GROUP_CONCAT(u2.id ORDER BY u2.name SEPARATOR ',')
           FROM lab_staff_assignments la
           JOIN users u2 ON u2.id = la.staff_id
           WHERE la.lab_id = l.id
         ) AS staff_ids_csv,
         (
           SELECT GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ')
           FROM lab_staff_assignments la
           JOIN users u2 ON u2.id = la.staff_id
           WHERE la.lab_id = l.id
         ) AS staff_names_csv
       FROM labs l
       LEFT JOIN inventory i ON i.lab_id = l.id
       WHERE l.is_active = 1
       GROUP BY l.id, l.name, l.code, l.department_id
       ORDER BY l.name`
    )
    return res.rows
  },
  // User operations
  async createUser(userData: any) {
    const query = `
      INSERT INTO users (email, password_hash, name, role, department, phone, student_id, employee_id, salutation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      userData.email,
      userData.passwordHash,
      userData.name,
      userData.role,
      userData.department,
      userData.phone,
      userData.studentId,
      userData.employeeId,
      userData.salutation || 'none',
    ]
    const result = await db.query(query, values)
    const userRes = await db.query(
      "SELECT id, email, name, role, department, salutation FROM users WHERE id = ?",
      [result.insertId]
    )
    return userRes.rows[0]
  },

  async listUsers(filter?: { role?: string | null; department?: string | null; activeOnly?: boolean }) {
    let query = "SELECT id, email, name, role, department, salutation, is_active, created_at, updated_at FROM users WHERE 1=1"
    const params: any[] = []
    if (filter?.role) {
      query += " AND role = ?"
      params.push(filter.role)
    }
    if (filter?.department) {
      query += " AND department = ?"
      params.push(filter.department)
    }
    if (filter?.activeOnly !== false) {
      query += " AND is_active = 1"
    }
    query += " ORDER BY created_at DESC"
    const res = await db.query(query, params)
    return res.rows
  },

  async getUserByEmail(email: string) {
  const query = "SELECT * FROM users WHERE email = ? AND is_active = 1"
    const result = await db.query(query, [email])
    return result.rows[0]
  },

  async getUserById(id: number) {
    const query = "SELECT * FROM users WHERE id = ? AND is_active = 1"
    const result = await db.query(query, [id])
    return result.rows[0]
  },

  async deleteUserSoft(id: number) {
    await db.query("UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?", [id])
    const res = await db.query("SELECT id, email, is_active FROM users WHERE id = ?", [id])
    return res.rows[0]
  },

  async updateUser(id: number, fields: { department?: string | null; role?: string | null; name?: string | null; email?: string | null; salutation?: string | null }) {
    const allowed: Record<string, any> = {}
    if (fields.department !== undefined) allowed.department = fields.department
    if (fields.role !== undefined) allowed.role = fields.role
    if (fields.name !== undefined) allowed.name = fields.name
    if (fields.email !== undefined) allowed.email = fields.email
    if (fields.salutation !== undefined) allowed.salutation = fields.salutation
    const keys = Object.keys(allowed)
    if (keys.length === 0) {
      const sel = await db.query(`SELECT id, email, name, role, department, salutation FROM users WHERE id = ?`, [id])
      return sel.rows[0]
    }
    const sets = keys.map((k) => `${k} = ?`).join(", ")
    const values = keys.map((k) => allowed[k])
    await db.query(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = ?`, [...values, id])
    const sel = await db.query(`SELECT id, email, name, role, department, salutation FROM users WHERE id = ?`, [id])
    return sel.rows[0]
  },

  // Bulk create students (skip duplicates)
  async bulkCreateStudents(rows: Array<{ name: string; studentId: string; department?: string | null }>) {
    if (!rows || rows.length === 0) return { created: 0, reactivated: 0, skipped: 0, total: 0, users: [] as any[] }
    // Normalize inputs and construct lowercase emails for consistency
    const prepared = rows
      .map((r) => {
        const name = String(r.name || '').toUpperCase().trim()
        const studentIdRaw = String(r.studentId || '').trim()
        const studentId = studentIdRaw
        const email = `${studentId.toLowerCase()}@lnmiit.ac.in`
        return { name, studentId, email, department: r.department ?? null }
      })
      .filter((r) => r.name && r.studentId)

    const emails = prepared.map((r) => r.email)
    // Find existing by email (active and inactive)
    const placeholders = emails.map(() => '?').join(',')
    const existing = emails.length
      ? await db.query(`SELECT id, email, is_active FROM users WHERE email IN (${placeholders})`, emails)
      : { rows: [] as any[] }
    const existingMap = new Map<string, { id: number; email: string; is_active: number }>(
      (existing.rows || []).map((r: any) => [String(r.email).toLowerCase(), { id: Number(r.id), email: String(r.email).toLowerCase(), is_active: Number(r.is_active ?? 0) }])
    )

    const toReactivate = prepared.filter((r) => {
      const ex = existingMap.get(r.email)
      return ex && ex.is_active === 0
    })
    const toInsert = prepared.filter((r) => !existingMap.has(r.email))
    const activeDuplicates = prepared.filter((r) => {
      const ex = existingMap.get(r.email)
      return !!ex && ex.is_active === 1
    })

    let reactivated = 0
    let created = 0
    let collectedUsers: any[] = []

    // Reactivate inactive matches
    if (toReactivate.length > 0) {
      for (const r of toReactivate) {
        try {
          await db.query(
            `UPDATE users SET is_active = 1, name = ?, role = 'student', department = ?, student_id = ?, updated_at = NOW() WHERE email = ?`,
            [r.name, r.department ?? null, r.studentId, r.email]
          )
          reactivated++
        } catch (e) {
          // Ignore single-row failure and let duplicates be handled as skipped
        }
      }
      const reactivateEmails = toReactivate.map((r) => r.email)
      const selPlaceR = reactivateEmails.map(() => '?').join(',')
      const selR = await db.query(
        `SELECT id, name, email, role, department, is_active, created_at FROM users WHERE email IN (${selPlaceR})`,
        reactivateEmails
      )
      collectedUsers.push(...selR.rows)
    }

    // Insert new ones
    if (toInsert.length > 0) {
      const values: any[] = []
      const tuples = toInsert
        .map((r) => {
          values.push(r.email, null, r.name, 'student', r.department ?? null, null, r.studentId, null)
          return '(?, ?, ?, ?, ?, ?, ?, ?)'
        })
        .join(',')
      const sql = `INSERT INTO users (email, password_hash, name, role, department, phone, student_id, employee_id) VALUES ${tuples}`
      const res = await db.query(sql, values)
      created = Number(res.affectedRows || 0)
      const insertedEmails = toInsert.map((r) => r.email)
      const selPlace = insertedEmails.map(() => '?').join(',')
      const sel = await db.query(
        `SELECT id, name, email, role, department, is_active, created_at FROM users WHERE email IN (${selPlace})`,
        insertedEmails
      )
      collectedUsers.push(...sel.rows)
    }

    const skipped = activeDuplicates.length
    return { created, reactivated, skipped, total: prepared.length, users: collectedUsers }
  },

  // Password reset operations
  async upsertPasswordReset(userId: number, token: string, expiresAt: string) {
    // Invalidate existing tokens for user and insert new
    return db.transaction(async (client) => {
      await client.query("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [userId])
      const result = await client.query(
  `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE))`,
    [userId, token]
      )
      const selectRes = await client.query(
        `SELECT id, user_id, token, expires_at, created_at FROM password_resets WHERE id = ?`,
        [result.insertId]
      )
      return selectRes.rows[0]
    })
  },
  
  async getPasswordResetByToken(token: string) {
    const result = await db.query(
      `SELECT pr.*, u.email, u.id AS user_id
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = ?`,
      [token]
    )
    return result.rows[0]
  },

  async markPasswordResetUsed(id: number) {
    await db.query(
      `UPDATE password_resets SET used_at = NOW() WHERE id = ?`,
      [id]
    )
    const res = await db.query(`SELECT * FROM password_resets WHERE id = ?`, [id])
    return res.rows[0]
  },

  async updateUserPassword(userId: number, passwordHash: string) {
    await db.query(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [passwordHash, userId]
    )
    const res = await db.query(`SELECT id, email, updated_at FROM users WHERE id = ?`, [userId])
    return res.rows[0]
  },

  // Lab operations
  async getAllLabs() {
    try {
      const query = `
        SELECT l.*, d.name as department_name, u.name as staff_name,
          (
            SELECT GROUP_CONCAT(u2.id ORDER BY u2.name SEPARATOR ',')
            FROM lab_staff_assignments la
            JOIN users u2 ON u2.id = la.staff_id
            WHERE la.lab_id = l.id
          ) AS staff_ids_csv,
          (
            SELECT GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ')
            FROM lab_staff_assignments la
            JOIN users u2 ON u2.id = la.staff_id
            WHERE la.lab_id = l.id
          ) AS staff_names_csv
        FROM labs l
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN users u ON l.staff_id = u.id
  WHERE l.is_active = 1
        ORDER BY l.name
      `
      const result = await db.query(query)
      return result.rows
    } catch (e) {
      console.warn("getAllLabs fallback (DB not ready):", e)
      return [
        { id: 1, name: "CP1", code: "CP1", department_id: 1, staff_id: null, capacity: 40, location: "Block A" },
        { id: 2, name: "CP2", code: "CP2", department_id: 1, staff_id: null, capacity: 40, location: "Block A" },
      ]
    }
  },
  
  // Update lab details (name, code, capacity, location, staff)
  async updateLab(id: number, fields: { name?: string; code?: string; capacity?: number | null; location?: string | null; staffId?: number | null }) {
    return db.transaction(async (client) => {
      const allowed: Record<string, any> = {}
      if (fields.name !== undefined) allowed.name = fields.name
      if (fields.code !== undefined) allowed.code = fields.code
      if (fields.capacity !== undefined) allowed.capacity = fields.capacity
      if (fields.location !== undefined) allowed.location = fields.location
      if (fields.staffId !== undefined) {
        if (fields.staffId !== null) {
          const u = await client.query(`SELECT id, role FROM users WHERE id = ? AND is_active = 1`, [fields.staffId])
          const ur = u.rows[0]
          if (!ur) throw new Error("User not found")
          if (String(ur.role) !== 'lab_staff') throw new Error("User is not lab staff")
        }
        allowed.staff_id = fields.staffId
      }
      const keys = Object.keys(allowed)
      if (keys.length === 0) {
        const sel0 = await client.query(`SELECT * FROM labs WHERE id = ?`, [id])
        return sel0.rows[0]
      }
      const sets = keys.map((k) => `${k} = ?`).join(", ")
      const values = keys.map((k) => allowed[k])
      await client.query(`UPDATE labs SET ${sets} WHERE id = ?`, [...values, id])
      const sel = await client.query(
        `SELECT l.*, d.name AS department_name, u.name AS staff_name
         FROM labs l
         LEFT JOIN departments d ON l.department_id = d.id
         LEFT JOIN users u ON l.staff_id = u.id
         WHERE l.id = ?`,
        [id]
      )
      return sel.rows[0]
    })
  },

  async getLabsByDepartment(departmentId: number) {
    try {
      const query = `
        SELECT l.*, u.name as staff_name,
          (
            SELECT GROUP_CONCAT(u2.id ORDER BY u2.name SEPARATOR ',')
            FROM lab_staff_assignments la
            JOIN users u2 ON u2.id = la.staff_id
            WHERE la.lab_id = l.id
          ) AS staff_ids_csv,
          (
            SELECT GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ')
            FROM lab_staff_assignments la
            JOIN users u2 ON u2.id = la.staff_id
            WHERE la.lab_id = l.id
          ) AS staff_names_csv
        FROM labs l
        LEFT JOIN users u ON l.staff_id = u.id
        WHERE l.department_id = ? AND l.is_active = 1
        ORDER BY l.name
      `
      const result = await db.query(query, [departmentId])
      return result.rows
    } catch (e) {
      console.warn("getLabsByDepartment fallback (DB not ready):", e)
      return [
        { id: 1, name: "CP1", code: "CP1", department_id: departmentId, staff_id: null, capacity: 40 },
      ]
    }
  },

  // Booking operations
  

  async createBooking(bookingData: any) {
    try {
      const query = `
        INSERT INTO lab_bookings (lab_id, booked_by, booking_date, start_time, end_time, purpose, expected_students, equipment_needed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      const values = [
        bookingData.labId,
        bookingData.bookedBy,
        bookingData.bookingDate,
        bookingData.startTime,
        bookingData.endTime,
        bookingData.purpose,
        bookingData.expectedStudents,
        bookingData.equipmentNeeded,
      ]
      const result = await db.query(query, values)
      const sel = await db.query(`SELECT * FROM lab_bookings WHERE id = ?`, [result.insertId])
      return sel.rows[0]
    } catch (e) {
      console.warn("createBooking fallback (DB not ready):", e)
      return {
        id: Math.floor(Math.random() * 100000),
        lab_id: bookingData.labId,
        booked_by: bookingData.bookedBy,
        booking_date: bookingData.bookingDate,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        purpose: bookingData.purpose,
        approval_status: "pending",
        created_at: new Date().toISOString(),
      }
    }
  },

  

  async getBookingsByUser(userId: number) {
    const query = `
      SELECT b.*, l.name as lab_name, l.location
      FROM lab_bookings b
      JOIN labs l ON b.lab_id = l.id
      WHERE b.booked_by = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
    `
    const result = await db.query(query, [userId])
    return result.rows
  },

  // Fetch all bookings with optional filters (admin/hod)
  async getAllBookings(filters: { status?: string | null; labId?: string | null }) {
    try {
      let query = `
        SELECT b.*, l.name as lab_name, l.location
        FROM lab_bookings b
        JOIN labs l ON b.lab_id = l.id
        WHERE 1=1
      `
      const params: any[] = []
      if (filters?.status) {
        query += ` AND b.approval_status = ?`
        params.push(filters.status)
      }
      if (filters?.labId) {
        query += ` AND b.lab_id = ?`
        params.push(Number.parseInt(filters.labId))
      }
      query += " ORDER BY b.booking_date DESC, b.start_time DESC"
      const result = await db.query(query, params)
      return result.rows
    } catch (e) {
      console.warn("getAllBookings fallback (DB not ready):", e)
      return []
    }
  },

  // Analytics aggregations
  async getBookingDailyCounts(startDate: string, endDate: string) {
    const res = await db.query(
      `SELECT booking_date AS day, COUNT(*) AS total
       FROM lab_bookings
       WHERE booking_date BETWEEN ? AND ?
       GROUP BY booking_date
       ORDER BY booking_date`,
      [startDate, endDate]
    )
    return res.rows
  },

  async getBookingStatusDistribution(startDate: string, endDate: string) {
    const res = await db.query(
      `SELECT approval_status AS status, COUNT(*) AS count
       FROM lab_bookings
       WHERE booking_date BETWEEN ? AND ?
       GROUP BY approval_status`,
      [startDate, endDate]
    )
    return res.rows
  },

  async getBookingsByDepartment(startDate: string, endDate: string) {
    const res = await db.query(
      `SELECT COALESCE(d.name, 'Unassigned') AS department, COUNT(*) AS count
       FROM lab_bookings b
       JOIN labs l ON b.lab_id = l.id
       LEFT JOIN departments d ON l.department_id = d.id
       WHERE b.booking_date BETWEEN ? AND ?
       GROUP BY COALESCE(d.name, 'Unassigned')
       ORDER BY count DESC`,
      [startDate, endDate]
    )
    return res.rows
  },

  async getTopLabsByBookings(startDate: string, endDate: string, limit = 5) {
    const lim = Math.max(1, Math.min(20, limit))
    const res = await db.query(
      `SELECT l.name AS lab, COUNT(*) AS count
       FROM lab_bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.booking_date BETWEEN ? AND ?
       GROUP BY l.id, l.name
       ORDER BY count DESC
       LIMIT ${lim}`,
      [startDate, endDate]
    )
    return res.rows
  },

  async getUniqueBookersCount(startDate: string, endDate: string) {
    const res = await db.query(
      `SELECT COUNT(DISTINCT booked_by) AS c
       FROM lab_bookings
       WHERE booking_date BETWEEN ? AND ?`,
      [startDate, endDate]
    )
    return Number(res.rows[0]?.c || 0)
  },

  async getPendingApprovalsCountInRange(startDate: string, endDate: string) {
    const res = await db.query(
      `SELECT COUNT(*) AS c
       FROM lab_bookings
       WHERE approval_status = 'pending' AND booking_date BETWEEN ? AND ?`,
      [startDate, endDate]
    )
    return Number(res.rows[0]?.c || 0)
  },

  async getTotalHoursBooked(startDate: string, endDate: string) {
    // Sum duration in hours across bookings
    const res = await db.query(
      `SELECT ROUND(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))) / 3600, 2) AS hours
       FROM lab_bookings
       WHERE booking_date BETWEEN ? AND ?`,
      [startDate, endDate]
    )
    return Number(res.rows[0]?.hours || 0)
  },

  // Inventory operations
  async getInventoryByLab(labId: number) {
    const query = `
      SELECT * FROM inventory
      WHERE lab_id = ?
      ORDER BY item_name
    `
    const result = await db.query(query, [labId])
    return result.rows
  },

  async updateInventoryQuantity(inventoryId: number, quantityChange: number) {
    const query = `
      UPDATE inventory
      SET quantity_available = quantity_available + ?,
          updated_at = NOW()
      WHERE id = ?
    `
    await db.query(query, [quantityChange, inventoryId])
    const res = await db.query(`SELECT * FROM inventory WHERE id = ?`, [inventoryId])
    return res.rows[0]
  },

  // Single checkBookingConflicts implementation
  async checkBookingConflicts(bookingData: { labId: number; bookingDate: string; startTime: string; endTime: string }) {
    try {
      const query = `
        SELECT * FROM lab_bookings
        WHERE lab_id = ?
          AND booking_date = ?
          AND NOT (? >= end_time OR ? <= start_time)
          AND approval_status IN ('pending','approved')
      `
      const params = [
        bookingData.labId,
        bookingData.bookingDate,
        bookingData.startTime,
        bookingData.endTime,
      ]
      const result = await db.query(query, params)
      return result.rows
    } catch (e) {
      console.warn("checkBookingConflicts fallback (DB not ready):", e)
      return []
    }
  },

  // Keep a single createLab implementation
  async createLab(labData: any) {
    try {
      const query = `
        INSERT INTO labs (name, code, department_id, staff_id, capacity, location)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      const values = [
        labData.name,
        labData.code,
        labData.departmentId,
        labData.staffId || null,
        labData.capacity || 30,
        labData.location || null,
      ]
      const result = await db.query(query, values)
      const sel = await db.query(
        `SELECT l.*, d.name as department_name 
         FROM labs l 
         LEFT JOIN departments d ON l.department_id = d.id 
         WHERE l.id = ?`, 
        [result.insertId]
      )
      return sel.rows[0]
    } catch (e) {
      console.warn("createLab fallback (DB not ready):", e)
      return {
        id: Math.floor(Math.random() * 100000),
        name: labData.name,
        code: labData.code,
        department_id: labData.departmentId,
        staff_id: labData.staffId || null,
        capacity: labData.capacity || 30,
        location: labData.location || null,
        is_active: true,
      }
    }
  },

  // Cascade delete a lab and all related records
  async deleteLabCascade(labId: number) {
    return db.transaction(async (client) => {
      // Collect inventory ids for this lab
      const inv = await client.query(`SELECT id FROM inventory WHERE lab_id = ?`, [labId])
      const inventoryIds: number[] = inv.rows.map((r: any) => r.id)
      if (inventoryIds.length > 0) {
        const invPlace = inventoryIds.map(() => '?').join(',')
        await client.query(`DELETE FROM item_issues WHERE inventory_id IN (${invPlace})`, inventoryIds)
      }
      // Delete dependent rows referencing this lab
      await client.query(`DELETE FROM lab_bookings WHERE lab_id = ?`, [labId])
      await client.query(`DELETE FROM attendance WHERE lab_id = ?`, [labId])
      await client.query(`DELETE FROM marks WHERE lab_id = ?`, [labId])
      await client.query(`DELETE FROM inventory WHERE lab_id = ?`, [labId])
      // Optional: remove logs specifically tied to this lab entity
      await client.query(`DELETE FROM system_logs WHERE entity_type = 'lab' AND entity_id = ?`, [labId])
      // Finally delete the lab
      const del = await client.query(`DELETE FROM labs WHERE id = ?`, [labId])
      return { deleted: del.affectedRows || 0 }
    })
  },

  // Logging operations
  async createLog(logData: any) {
    try {
      const query = `
        INSERT INTO system_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      const values = [
        logData.userId,
        logData.action,
        logData.entityType,
        logData.entityId,
        JSON.stringify(logData.details || null),
        logData.ipAddress,
        logData.userAgent,
      ]
      const result = await db.query(query, values)
      const sel = await db.query(`SELECT * FROM system_logs WHERE id = ?`, [result.insertId])
      return sel.rows[0]
    } catch (e) {
      console.warn("createLog fallback (DB not ready):", e)
      return { id: Math.floor(Math.random() * 100000), timestamp: new Date().toISOString(), ...logData }
    }
  },

  async getLogById(id: number) {
    const res = await db.query(`SELECT * FROM system_logs WHERE id = ?`, [id])
    return res.rows[0]
  },

  async undoLogAction(log: any, actorUserId: number) {
  // Undo has been disabled at API level; keep code for potential future use
    // Parse details if string
    let details: any = null
    try { details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details } catch { details = log.details }
    const action = String(log.action)
    const type = String(log.entity_type)
    const id = Number(log.entity_id)

    if (action === 'SET_DEPARTMENT_HOD' && type === 'department') {
      await this.setDepartmentHod(id, null)
      await this.createLog({ userId: actorUserId, action: 'UNDO_SET_DEPARTMENT_HOD', entityType: 'department', entityId: id, details: { fromLogId: log.id }, ipAddress: 'local', userAgent: 'undo' })
      return { undone: true }
    }
    if (action === 'SET_LAB_STAFF' && type === 'lab') {
      await this.replaceLabStaff(id, [])
      await this.createLog({ userId: actorUserId, action: 'UNDO_SET_LAB_STAFF', entityType: 'lab', entityId: id, details: { fromLogId: log.id }, ipAddress: 'local', userAgent: 'undo' })
      return { undone: true }
    }
    if (action === 'CREATE_LAB' && type === 'lab') {
      await this.deleteLabCascade(id)
      await this.createLog({ userId: actorUserId, action: 'UNDO_CREATE_LAB', entityType: 'lab', entityId: id, details: { fromLogId: log.id }, ipAddress: 'local', userAgent: 'undo' })
      return { undone: true }
    }
    if (action === 'CREATE_DEPARTMENT' && type === 'department') {
      // Only allow if department has no labs to avoid destructive cascade unexpectedly
      const hasLabs = await db.query(`SELECT COUNT(1) AS c FROM labs WHERE department_id = ?`, [id])
      if (Number(hasLabs.rows?.[0]?.c || 0) > 0) throw new Error('Cannot undo: department already has labs')
      await this.deleteDepartmentCascade(id)
      await this.createLog({ userId: actorUserId, action: 'UNDO_CREATE_DEPARTMENT', entityType: 'department', entityId: id, details: { fromLogId: log.id }, ipAddress: 'local', userAgent: 'undo' })
      return { undone: true }
    }

    if (action === 'DELETE_USER' && type === 'user') {
      // Recover from snapshot
      const snap = (details && (details.snapshot || details.user)) || null
      if (!snap) throw new Error('No snapshot to restore user')
      // Try to restore softly deleted user: if record exists by id, just set is_active=1 and restore fields
      const existing = await db.query(`SELECT id, email FROM users WHERE id = ?`, [Number(snap.id)])
      if (existing.rows[0]) {
        await db.query(`UPDATE users SET is_active = 1, email = ?, name = ?, role = ?, department = ?, updated_at = NOW() WHERE id = ?`, [snap.email, snap.name, snap.role, snap.department || null, Number(snap.id)])
      } else {
        // If id is gone (rare), recreate; guard against email duplicate
        const emailDup = await db.query(`SELECT id FROM users WHERE email = ?`, [snap.email])
        if (emailDup.rows[0]) throw new Error('Cannot undo: email already in use')
        await db.query(`INSERT INTO users (id, email, password_hash, name, role, department, phone, student_id, employee_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`, [
          Number(snap.id), snap.email, snap.password_hash || null, snap.name || 'User', snap.role || 'student', snap.department || null, snap.phone || null, snap.student_id || null, snap.employee_id || null,
        ])
      }
      await this.createLog({ userId: actorUserId, action: 'UNDO_DELETE_USER', entityType: 'user', entityId: Number(snap.id), details: { fromLogId: log.id }, ipAddress: 'local', userAgent: 'undo' })
      return { undone: true }
    }

    if (action === 'HARD_DELETE_USER' && type === 'user') {
      // Restore from archived_users by archiveId if provided
      let details: any = null
      try { details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details } catch { details = log.details }
      const archiveId = details?.archiveId
      if (!archiveId) throw new Error('No archiveId to restore')
      const ar = await db.query(`SELECT * FROM archived_users WHERE id = ?`, [Number(archiveId)])
      const row = ar.rows[0]
      if (!row) throw new Error('Archived snapshot not found')
      // Choose an available email; if taken, derive a unique restore email
      const ensureUniqueEmail = async (baseEmail: string) => {
        const exists = async (em: string) => {
          const q = await db.query(`SELECT id FROM users WHERE email = ?`, [em])
          return !!q.rows[0]
        }
        if (!(await exists(baseEmail))) return baseEmail
        const at = baseEmail.indexOf('@')
        const local = at > 0 ? baseEmail.slice(0, at) : baseEmail
        const domain = at > 0 ? baseEmail.slice(at + 1) : ''
        const candidates = [
          `${local}+restored@${domain}`,
          `${local}+restored${archiveId}@${domain}`,
          `${local}+restored${Date.now()}@${domain}`,
        ]
        for (const c of candidates) {
          if (!(await exists(c))) return c
        }
        // As last resort, append random suffix
        const rand = Math.random().toString(36).slice(2, 8)
        const fallback = `${local}+restored${rand}@${domain}`
        return fallback
      }
      const restoreEmail = await ensureUniqueEmail(String(row.email))
      // Try to restore with original id; if fails due to PK collision, restore with new id
      try {
        await db.query(
          `INSERT INTO users (id, email, password_hash, name, role, department, phone, student_id, employee_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.original_user_id, restoreEmail, row.password_hash || null, row.name, row.role, row.department || null, row.phone || null, row.student_id || null, row.employee_id || null, row.was_active ? 1 : 0, row.created_at || null, row.updated_at || null]
        )
        const restoredId = Number(row.original_user_id)
        // Restore dependent records for this user
        // Restore lab_bookings dynamically based on target columns
        const rLbColsRes = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'lab_bookings'`
        )
        const rLbCols = new Set((rLbColsRes.rows || []).map((r: any) => String(r.column_name || r.COLUMN_NAME)))
        const tgtCols: string[] = ['lab_id','booked_by','booking_date','start_time','end_time','purpose','expected_students','equipment_needed','approval_status','approved_by']
        const selParts: string[] = [
          'lab_id',
          '?',
          'booking_date',
          'start_time',
          'end_time',
          'purpose',
          'expected_students',
          'equipment_needed',
          'approval_status',
          'CASE WHEN approved_by = ? THEN ? ELSE approved_by END',
        ]
        if (rLbCols.has('approval_date')) { tgtCols.push('approval_date'); selParts.push('approval_date') }
        if (rLbCols.has('approval_remarks')) { tgtCols.push('approval_remarks'); selParts.push('approval_remarks') }
        if (rLbCols.has('created_at')) { tgtCols.push('created_at'); selParts.push('created_at') }
        if (rLbCols.has('updated_at')) { tgtCols.push('updated_at'); selParts.push('updated_at') }
        const sqlIns = `INSERT INTO lab_bookings (${tgtCols.join(', ')}) SELECT ${selParts.join(', ')} FROM archived_lab_bookings WHERE booked_by = ?`
        await db.query(sqlIns, [restoredId, row.original_user_id, restoredId, row.original_user_id])
        await db.query(
          `INSERT INTO attendance (lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at)
           SELECT lab_id, ?, faculty_id, attendance_date, time_slot, status, remarks, created_at
           FROM archived_attendance WHERE student_id = ?`,
          [restoredId, row.original_user_id]
        )
        await db.query(
          `INSERT INTO marks (student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at)
           SELECT ?, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
           FROM archived_marks WHERE student_id = ?`,
          [restoredId, row.original_user_id]
        )
        await this.createLog({ userId: actorUserId, action: 'UNDO_HARD_DELETE_USER', entityType: 'user', entityId: restoredId, details: { fromLogId: log.id, archiveId, restoredEmail: restoreEmail, restoredDependencies: true }, ipAddress: 'local', userAgent: 'undo' })
        return { undone: true, userId: restoredId }
      } catch (e: any) {
        const code = String(e?.code || '')
        if (code !== 'ER_DUP_ENTRY') throw e
        const restoreEmail2 = await ensureUniqueEmail(restoreEmail)
        const ins = await db.query(
          `INSERT INTO users (email, password_hash, name, role, department, phone, student_id, employee_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [restoreEmail2, row.password_hash || null, row.name, row.role, row.department || null, row.phone || null, row.student_id || null, row.employee_id || null, row.was_active ? 1 : 0, row.created_at || null, row.updated_at || null]
        )
        const restoredId = Number(ins.insertId)
        // Restore dependent records with new id
        const rLbColsRes2 = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'lab_bookings'`
        )
        const rLbCols2 = new Set((rLbColsRes2.rows || []).map((r: any) => String(r.column_name || r.COLUMN_NAME)))
        const tgtCols2: string[] = ['lab_id','booked_by','booking_date','start_time','end_time','purpose','expected_students','equipment_needed','approval_status','approved_by']
        const selParts2: string[] = [
          'lab_id',
          '?',
          'booking_date',
          'start_time',
          'end_time',
          'purpose',
          'expected_students',
          'equipment_needed',
          'approval_status',
          'CASE WHEN approved_by = ? THEN ? ELSE approved_by END',
        ]
        if (rLbCols2.has('approval_date')) { tgtCols2.push('approval_date'); selParts2.push('approval_date') }
        if (rLbCols2.has('approval_remarks')) { tgtCols2.push('approval_remarks'); selParts2.push('approval_remarks') }
        if (rLbCols2.has('created_at')) { tgtCols2.push('created_at'); selParts2.push('created_at') }
        if (rLbCols2.has('updated_at')) { tgtCols2.push('updated_at'); selParts2.push('updated_at') }
        const sqlIns2 = `INSERT INTO lab_bookings (${tgtCols2.join(', ')}) SELECT ${selParts2.join(', ')} FROM archived_lab_bookings WHERE booked_by = ?`
        await db.query(sqlIns2, [restoredId, row.original_user_id, restoredId, row.original_user_id])
        await db.query(
          `INSERT INTO attendance (lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at)
           SELECT lab_id, ?, faculty_id, attendance_date, time_slot, status, remarks, created_at
           FROM archived_attendance WHERE student_id = ?`,
          [restoredId, row.original_user_id]
        )
        await db.query(
          `INSERT INTO marks (student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at)
           SELECT ?, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
           FROM archived_marks WHERE student_id = ?`,
          [restoredId, row.original_user_id]
        )
        await this.createLog({ userId: actorUserId, action: 'UNDO_HARD_DELETE_USER', entityType: 'user', entityId: restoredId, details: { fromLogId: log.id, archiveId, restoredWithNewId: true, restoredEmail: restoreEmail2, restoredDependencies: true }, ipAddress: 'local', userAgent: 'undo' })
        return { undone: true, userId: restoredId }
      }
    }

  throw new Error('Undo not supported for this action')
  },

  // Report operations
  async getBookingReport(filters: any) {
    let query = `
      SELECT 
        b.*,
        l.name as lab_name,
        l.location,
        u1.name as booked_by_name,
        u1.email as booked_by_email,
        u2.name as approved_by_name,
        d.name as department_name
      FROM lab_bookings b
      JOIN labs l ON b.lab_id = l.id
      JOIN users u1 ON b.booked_by = u1.id
      LEFT JOIN users u2 ON b.approved_by = u2.id
      JOIN departments d ON l.department_id = d.id
      WHERE 1=1
    `

    const params: any[] = []

    if (filters.startDate) {
  query += ` AND b.booking_date >= ?`
  params.push(filters.startDate)
    }

    if (filters.endDate) {
  query += ` AND b.booking_date <= ?`
  params.push(filters.endDate)
    }

    if (filters.labId) {
  query += ` AND b.lab_id = ?`
  params.push(filters.labId)
    }

    if (filters.status) {
  query += ` AND b.approval_status = ?`
  params.push(filters.status)
    }

    query += " ORDER BY b.booking_date DESC, b.start_time DESC"

    const result = await db.query(query, params)
    return result.rows
  },

  // Departments
  async listDepartments() {
    // Decide query based on schema introspection to avoid error logs
    const hasColRes = await db.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'departments' AND column_name = 'hod_email'`
    )
    const hasHodEmail = Array.isArray(hasColRes.rows) && hasColRes.rows[0] && Number(hasColRes.rows[0].cnt) > 0
    const select = hasHodEmail
      ? `SELECT d.id, d.name, d.code, d.hod_id, d.hod_email, u.name AS hod_name, d.created_at FROM departments d LEFT JOIN users u ON u.id = d.hod_id ORDER BY d.name`
      : `SELECT d.id, d.name, d.code, d.hod_id, NULL AS hod_email, u.name AS hod_name, d.created_at FROM departments d LEFT JOIN users u ON u.id = d.hod_id ORDER BY d.name`
    const res = await db.query(select)
    return res.rows
  },

  // Lightweight, idempotent migrations for critical columns
  async runLightMigrations() {
    // Check if departments.hod_email exists and add only if missing (avoid noisy duplicate errors)
    const colRes = await db.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'departments' AND column_name = 'hod_email'`
    )
    const hasHodEmail = Array.isArray(colRes.rows) && colRes.rows[0] && Number(colRes.rows[0].cnt) > 0
    if (!hasHodEmail) {
      try {
        await db.query(`ALTER TABLE departments ADD COLUMN hod_email VARCHAR(255) NULL`)
      } catch (e: any) {
        // Ignore duplicate column errors due to concurrent migration attempts
        const code = String(e?.code || e?.message || "")
        if (code !== 'ER_DUP_FIELDNAME' && !/duplicate column/i.test(String(e?.sqlMessage || e?.message || ''))) {
          throw e
        }
      }
      return { ok: true, updated: true }
    }
    return { ok: true, updated: false }
  },

  async createDepartment(dept: { name: string; code: string; hodEmail?: string | null }) {
    // Introspect schema to handle deployments missing hod_email column
    const colRes = await db.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'departments' AND column_name = 'hod_email'`
    )
    const hasHodEmail = Array.isArray(colRes.rows) && colRes.rows[0] && Number(colRes.rows[0].cnt) > 0
    
    // If HOD email is provided, check if user exists, if not create one
    if (dept.hodEmail) {
      const existingUser = await this.getUserByEmail(dept.hodEmail)
      if (!existingUser) {
        // Create HOD user account - they'll set password via forgot password
        // Extract name from email (e.g., john.doe@lnmiit.ac.in -> John Doe)
        const emailUsername = dept.hodEmail.split('@')[0]
        const nameParts = emailUsername.split('.').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        const hodName = nameParts.join(' ') || 'HOD'
        
        await this.createUser({
          email: dept.hodEmail,
          passwordHash: null, // User will set password via forgot password flow
          name: hodName,
          role: 'hod',
          department: dept.name,
          phone: null,
          studentId: null,
          employeeId: null,
          salutation: 'none',
        })
      }
    }
    
    let insert
    if (hasHodEmail) {
      insert = await db.query(
        `INSERT INTO departments (name, code, hod_email) VALUES (?, ?, ?)`,
        [dept.name, dept.code, dept.hodEmail || null]
      )
    } else {
      insert = await db.query(
        `INSERT INTO departments (name, code) VALUES (?, ?)`,
        [dept.name, dept.code]
      )
    }
    const sel = await db.query(
      hasHodEmail
        ? `SELECT id, name, code, hod_email, created_at FROM departments WHERE id = ?`
        : `SELECT id, name, code, NULL AS hod_email, created_at FROM departments WHERE id = ?`,
      [insert.insertId]
    )
    return sel.rows[0]
  },

  async updateDepartment(id: number, fields: { name?: string; code?: string; hodEmail?: string | null }) {
    // Introspect schema to see if hod_email is present
    const colRes = await db.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'departments' AND column_name = 'hod_email'`
    )
    const hasHodEmail = Array.isArray(colRes.rows) && colRes.rows[0] && Number(colRes.rows[0].cnt) > 0

    // If HOD email is being updated and it's a new email, create user if doesn't exist
    if (fields.hodEmail && hasHodEmail) {
      const existingUser = await this.getUserByEmail(fields.hodEmail)
      if (!existingUser) {
        // Get department name for the new HOD user
        const deptRes = await db.query(`SELECT name FROM departments WHERE id = ?`, [id])
        const deptName = deptRes.rows[0]?.name || fields.name || 'Unknown Department'
        
        // Create HOD user account
        const emailUsername = fields.hodEmail.split('@')[0]
        const nameParts = emailUsername.split('.').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        const hodName = nameParts.join(' ') || 'HOD'
        
        await this.createUser({
          email: fields.hodEmail,
          passwordHash: null, // User will set password via forgot password flow
          name: hodName,
          role: 'hod',
          department: deptName,
          phone: null,
          studentId: null,
          employeeId: null,
          salutation: 'none',
        })
      }
    }

    const allowed: Record<string, any> = {}
    if (fields.name !== undefined) allowed.name = fields.name
    if (fields.code !== undefined) allowed.code = fields.code
    if (fields.hodEmail !== undefined && hasHodEmail) allowed.hod_email = fields.hodEmail
    const keys = Object.keys(allowed)
    if (keys.length === 0) {
      const sel0 = await db.query(
        hasHodEmail
          ? `SELECT id, name, code, hod_id, hod_email FROM departments WHERE id = ?`
          : `SELECT id, name, code, hod_id, NULL AS hod_email FROM departments WHERE id = ?`,
        [id]
      )
      return sel0.rows[0]
    }
    const sets = keys.map((k) => `${k} = ?`).join(", ")
    const values = keys.map((k) => allowed[k])
    await db.query(`UPDATE departments SET ${sets} WHERE id = ?`, [...values, id])
    const sel = await db.query(
      hasHodEmail
        ? `SELECT id, name, code, hod_id, hod_email FROM departments WHERE id = ?`
        : `SELECT id, name, code, hod_id, NULL AS hod_email FROM departments WHERE id = ?`,
      [id]
    )
    return sel.rows[0]
  },

  async deleteDepartmentCascade(departmentId: number) {
    return db.transaction(async (client) => {
      // Find labs in this department
      const labsRes = await client.query(`SELECT id FROM labs WHERE department_id = ?`, [departmentId])
      const labIds: number[] = labsRes.rows.map((r: any) => r.id)
      // For each lab, perform the same cascade as deleteLabCascade but within this transaction
      for (const labId of labIds) {
        const inv = await client.query(`SELECT id FROM inventory WHERE lab_id = ?`, [labId])
        const inventoryIds: number[] = inv.rows.map((r: any) => r.id)
        if (inventoryIds.length > 0) {
          const invPlace = inventoryIds.map(() => '?').join(',')
          await client.query(`DELETE FROM item_issues WHERE inventory_id IN (${invPlace})`, inventoryIds)
        }
        await client.query(`DELETE FROM lab_bookings WHERE lab_id = ?`, [labId])
        await client.query(`DELETE FROM attendance WHERE lab_id = ?`, [labId])
        await client.query(`DELETE FROM marks WHERE lab_id = ?`, [labId])
        await client.query(`DELETE FROM inventory WHERE lab_id = ?`, [labId])
        await client.query(`DELETE FROM system_logs WHERE entity_type = 'lab' AND entity_id = ?`, [labId])
        await client.query(`DELETE FROM labs WHERE id = ?`, [labId])
      }
      // Finally delete the department
      const delDept = await client.query(`DELETE FROM departments WHERE id = ?`, [departmentId])
      return { deletedLabs: labIds.length, deletedDepartment: delDept.affectedRows || 0 }
    })
  },

  // Assignments
  async setLabStaff(labId: number, staffId: number | null) {
    return db.transaction(async (client) => {
      // Ensure lab exists
      const labRes = await client.query(`SELECT id FROM labs WHERE id = ?`, [labId])
      if (!labRes.rows[0]) throw new Error("Lab not found")
      if (staffId != null) {
        // Ensure user exists and is lab_staff
        const u = await client.query(`SELECT id, role FROM users WHERE id = ? AND is_active = 1`, [staffId])
        const ur = u.rows[0]
        if (!ur) throw new Error("User not found")
        if (String(ur.role) !== 'lab_staff') throw new Error("User is not lab staff")
      }
      await client.query(`UPDATE labs SET staff_id = ? WHERE id = ?`, [staffId, labId])
      const sel = await client.query(
        `SELECT l.*, d.name AS department_name, u.name AS staff_name,
                (
                  SELECT GROUP_CONCAT(u2.id ORDER BY u2.name SEPARATOR ',')
                  FROM lab_staff_assignments la
                  JOIN users u2 ON u2.id = la.staff_id
                  WHERE la.lab_id = l.id
                ) AS staff_ids_csv,
                (
                  SELECT GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ')
                  FROM lab_staff_assignments la
                  JOIN users u2 ON u2.id = la.staff_id
                  WHERE la.lab_id = l.id
                ) AS staff_names_csv
         FROM labs l
         LEFT JOIN departments d ON l.department_id = d.id
         LEFT JOIN users u ON l.staff_id = u.id
         WHERE l.id = ?`,
        [labId]
      )
      return sel.rows[0]
    })
  },

  // Many-to-many lab staff assignments
  async listLabStaff(labId: number) {
    const res = await db.query(
      `SELECT u.id, u.name, u.email
       FROM lab_staff_assignments la
       JOIN users u ON u.id = la.staff_id
       WHERE la.lab_id = ?
       ORDER BY u.name`,
      [labId]
    )
    return res.rows
  },

  async replaceLabStaff(labId: number, staffIds: number[]) {
    return db.transaction(async (client) => {
      // Ensure lab exists
      const labRes = await client.query(`SELECT id FROM labs WHERE id = ?`, [labId])
      if (!labRes.rows[0]) throw new Error("Lab not found")
      // Validate all users
      if (staffIds.length > 0) {
        const placeholders = staffIds.map(() => '?').join(',')
        const u = await client.query(
          `SELECT id, role FROM users WHERE id IN (${placeholders}) AND is_active = 1`,
          staffIds
        )
        const rolesOk = u.rows.every((r: any) => String(r.role) === 'lab_staff')
        if (!rolesOk || u.rows.length !== staffIds.length) throw new Error('Invalid lab staff selection')
      }
      await client.query(`DELETE FROM lab_staff_assignments WHERE lab_id = ?`, [labId])
      for (const sid of staffIds) {
        await client.query(`INSERT INTO lab_staff_assignments (lab_id, staff_id) VALUES (?, ?)`, [labId, sid])
      }
      const list = await client.query(
        `SELECT u.id, u.name, u.email
         FROM lab_staff_assignments la JOIN users u ON u.id = la.staff_id
         WHERE la.lab_id = ? ORDER BY u.name`,
        [labId]
      )
      return list.rows
    })
  },

  async setDepartmentHod(departmentId: number, hodId: number | null) {
    return db.transaction(async (client) => {
      // Ensure department exists
      const d = await client.query(`SELECT id, code, hod_email FROM departments WHERE id = ?`, [departmentId])
      const dep = d.rows[0]
      if (!dep) throw new Error("Department not found")
      
      if (hodId != null) {
        const u = await client.query(`SELECT id, role, name, salutation FROM users WHERE id = ? AND is_active = 1`, [hodId])
        const ur = u.rows[0]
        if (!ur) throw new Error("User not found")
        if (String(ur.role) !== 'faculty') throw new Error("User must be a faculty member to be assigned as HOD")
        // Ensure this user is not already HOD of another department
        const existing = await client.query(`SELECT id FROM departments WHERE hod_id = ? AND id <> ?`, [hodId, departmentId])
        if (existing.rows[0]) throw new Error('This user is already assigned as HOD of another department')
        
        // Update the HOD user account name and salutation to match the assigned faculty member
        if (dep.hod_email) {
          await client.query(
            `UPDATE users SET name = ?, salutation = ? WHERE email = ? AND role = 'hod'`,
            [ur.name, ur.salutation, dep.hod_email]
          )
        }
      }
      
      await client.query(`UPDATE departments SET hod_id = ? WHERE id = ?`, [hodId, departmentId])
      const sel = await client.query(
        `SELECT d.id, d.name, d.code, d.hod_id, u.name AS hod_name, d.hod_email
         FROM departments d
         LEFT JOIN users u ON u.id = d.hod_id
         WHERE d.id = ?`,
        [departmentId]
      )
      return sel.rows[0]
    })
  },

  async getUserHistory(userId: number) {
    // Bookings made by the user
    const bookings = await db.query(
      `SELECT b.*, l.name as lab_name, l.location
       FROM lab_bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.booked_by = ?
       ORDER BY b.created_at DESC, b.booking_date DESC`,
      [userId]
    )
    // Actions in system logs
    const logs = await db.query(
      `SELECT id, action, entity_type, entity_id, details, created_at
       FROM system_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    )
    return { bookings: bookings.rows, logs: logs.rows }
  },
  
  // Archive and purge all student users created more than 6 months ago
  async archiveAndPurgeStudentsOlderThanSixMonths() {
    // Compute cutoff date once on DB side
    const cutoffRes = await db.query(`SELECT DATE_SUB(NOW(), INTERVAL 6 MONTH) AS cutoff`)
    const cutoff = cutoffRes.rows[0]?.cutoff

    return db.transaction(async (client) => {
      // Fetch target students
      const studentsRes = await client.query(
        `SELECT * FROM users WHERE role = 'student' AND created_at < ?`,
        [cutoff]
      )
      const students = studentsRes.rows

      if (!students || students.length === 0) {
        return { archived: 0, deleted: 0 }
      }

      const studentIds: number[] = students.map((u: any) => u.id)
      const inPlaceholders = studentIds.map(() => '?').join(',')

      // Archive related entities first
      // Lab bookings made by these students
      await client.query(
        `INSERT INTO archived_lab_bookings (
            original_id, lab_id, booked_by, booking_date, start_time, end_time, purpose,
            expected_students, equipment_needed, approval_status, approved_by, approval_date,
            approval_remarks, created_at, updated_at
         )
         SELECT id, lab_id, booked_by, booking_date, start_time, end_time, purpose,
                expected_students, equipment_needed, approval_status, approved_by, approval_date,
                approval_remarks, created_at, updated_at
         FROM lab_bookings WHERE booked_by IN (${inPlaceholders})`,
        studentIds
      )

      // Attendance of these students
      await client.query(
        `INSERT INTO archived_attendance (
            original_id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at
         )
         SELECT id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at
         FROM attendance WHERE student_id IN (${inPlaceholders})`,
        studentIds
      )

      // Marks of these students
      await client.query(
        `INSERT INTO archived_marks (
            original_id, student_id, lab_id, faculty_id, assessment_type, assessment_name,
            marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
         )
         SELECT id, student_id, lab_id, faculty_id, assessment_type, assessment_name,
                marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
         FROM marks WHERE student_id IN (${inPlaceholders})`,
        studentIds
      )

      // Item issues issued to these students
      await client.query(
        `INSERT INTO archived_item_issues (
            original_id, inventory_id, issued_to, issued_by, issue_date, expected_return_date,
            actual_return_date, quantity_issued, purpose, status, return_condition, remarks, created_at
         )
         SELECT id, inventory_id, issued_to, issued_by, issue_date, expected_return_date,
                actual_return_date, quantity_issued, purpose, status, return_condition, remarks, created_at
         FROM item_issues WHERE issued_to IN (${inPlaceholders})`,
        studentIds
      )

      // System logs created by these students
      await client.query(
        `INSERT INTO archived_system_logs (
            original_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, timestamp
         )
         SELECT id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at
         FROM system_logs WHERE user_id IN (${inPlaceholders})`,
        studentIds
      )

      // Archive the user records themselves
      await client.query(
        `INSERT INTO archived_users (
            original_user_id, email, password_hash, name, role, department, phone,
            student_id, employee_id, was_active, created_at, updated_at
         )
         SELECT id, email, password_hash, name, role, department, phone,
                student_id, employee_id, is_active, created_at, updated_at
         FROM users WHERE id IN (${inPlaceholders})`,
        studentIds
      )

      // Delete child records
      await client.query(`DELETE FROM lab_bookings WHERE booked_by IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM attendance WHERE student_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM marks WHERE student_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM item_issues WHERE issued_to IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM system_logs WHERE user_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM password_resets WHERE user_id IN (${inPlaceholders})`, studentIds)

      // Finally delete users
      await client.query(`DELETE FROM users WHERE id IN (${inPlaceholders})`, studentIds)

      return { archived: students.length, deleted: students.length }
    })
  },
  
  // Archive and purge ALL student users (no date filter)
  async archiveAndPurgeAllStudents() {
    return db.transaction(async (client) => {
      const studentsRes = await client.query(`SELECT * FROM users WHERE role = 'student'`)
      const students = studentsRes.rows
      if (!students || students.length === 0) return { archived: 0, deleted: 0 }
      const studentIds: number[] = students.map((u: any) => u.id)
      const inPlaceholders = studentIds.map(() => '?').join(',')

      // Introspect lab_bookings columns to handle older schemas gracefully
      const colsRes = await client.query(
        `SELECT LOWER(column_name) AS column_name
         FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'lab_bookings'`
      )
      const cols = new Set<string>((colsRes.rows || []).map((r: any) => String(r.column_name)))
      const has = (c: string) => cols.has(c.toLowerCase())

      const selectFields = [
        'id',
        'lab_id',
        'booked_by',
        'booking_date',
        'start_time',
        'end_time',
        'purpose',
        has('expected_students') ? 'expected_students' : 'NULL AS expected_students',
        has('equipment_needed') ? 'equipment_needed' : 'NULL AS equipment_needed',
        has('approval_status') ? 'approval_status' : 'NULL AS approval_status',
        has('approved_by') ? 'approved_by' : 'NULL AS approved_by',
        has('approval_date') ? 'approval_date' : 'NULL AS approval_date',
        has('approval_remarks') ? 'approval_remarks' : 'NULL AS approval_remarks',
        has('created_at') ? 'created_at' : 'NOW() AS created_at',
        has('updated_at') ? 'updated_at' : 'NOW() AS updated_at',
      ]
      const selectSql = selectFields.join(', ')

      await client.query(
        `INSERT INTO archived_lab_bookings (
            original_id, lab_id, booked_by, booking_date, start_time, end_time, purpose,
            expected_students, equipment_needed, approval_status, approved_by, approval_date, approval_remarks,
            created_at, updated_at
         )
         SELECT ${selectSql}
         FROM lab_bookings WHERE booked_by IN (${inPlaceholders})`,
        studentIds
      )
      await client.query(
        `INSERT INTO archived_attendance (original_id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at)
         SELECT id, lab_id, student_id, faculty_id, attendance_date, time_slot, status, remarks, created_at
         FROM attendance WHERE student_id IN (${inPlaceholders})`,
        studentIds
      )
      await client.query(
        `INSERT INTO archived_marks (original_id, student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at)
         SELECT id, student_id, lab_id, faculty_id, assessment_type, assessment_name, marks_obtained, total_marks, assessment_date, academic_year, semester, remarks, created_at
         FROM marks WHERE student_id IN (${inPlaceholders})`,
        studentIds
      )
      await client.query(
        `INSERT INTO archived_item_issues (original_id, inventory_id, issued_to, issued_by, issue_date, expected_return_date, actual_return_date, quantity_issued, purpose, status, return_condition, remarks, created_at)
         SELECT id, inventory_id, issued_to, issued_by, issue_date, expected_return_date, actual_return_date, quantity_issued, purpose, status, return_condition, remarks, created_at
         FROM item_issues WHERE issued_to IN (${inPlaceholders})`,
        studentIds
      )
      await client.query(
        `INSERT INTO archived_system_logs (original_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, timestamp)
         SELECT id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at
         FROM system_logs WHERE user_id IN (${inPlaceholders})`,
        studentIds
      )
      await client.query(
        `INSERT INTO archived_users (original_user_id, email, password_hash, name, role, department, phone, student_id, employee_id, was_active, created_at, updated_at)
         SELECT id, email, password_hash, name, role, department, phone, student_id, employee_id, is_active, created_at, updated_at
         FROM users WHERE id IN (${inPlaceholders})`,
        studentIds
      )

      await client.query(`DELETE FROM lab_bookings WHERE booked_by IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM attendance WHERE student_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM marks WHERE student_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM item_issues WHERE issued_to IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM system_logs WHERE user_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM password_resets WHERE user_id IN (${inPlaceholders})`, studentIds)
      await client.query(`DELETE FROM users WHERE id IN (${inPlaceholders})`, studentIds)

      return { archived: students.length, deleted: students.length }
    })
  },
  
}
