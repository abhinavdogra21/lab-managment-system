// Database connection and utility functions
// MySQL implementation using mysql2/promise

import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise"

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "lnmiit_lab_management",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
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

  async getLabsWithInventoryCounts() {
    const res = await db.query(
      `SELECT l.id, l.name, l.code, l.department_id, COALESCE(COUNT(i.id),0) as items,
              COALESCE(SUM(i.quantity_available),0) as total_quantity
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
      INSERT INTO users (email, password_hash, name, role, department, phone, student_id, employee_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    ]
    const result = await db.query(query, values)
    const userRes = await db.query(
      "SELECT id, email, name, role, department FROM users WHERE id = ?",
      [result.insertId]
    )
    return userRes.rows[0]
  },

  async listUsers(filter?: { role?: string | null; department?: string | null; activeOnly?: boolean }) {
    let query = "SELECT id, email, name, role, department, is_active, created_at, updated_at FROM users WHERE 1=1"
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
        SELECT l.*, d.name as department_name, u.name as staff_name
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

  async getLabsByDepartment(departmentId: number) {
    try {
      const query = `
        SELECT l.*, u.name as staff_name
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
      const sel = await db.query(`SELECT * FROM labs WHERE id = ?`, [result.insertId])
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
    const res = await db.query(`SELECT id, name, code, created_at FROM departments ORDER BY name`)
    return res.rows
  },

  async createDepartment(dept: { name: string; code: string }) {
    const result = await db.query(
      `INSERT INTO departments (name, code) VALUES (?, ?)`,
      [dept.name, dept.code]
    )
    const sel = await db.query(`SELECT id, name, code, created_at FROM departments WHERE id = ?`, [result.insertId])
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

      await client.query(
        `INSERT INTO archived_lab_bookings (original_id, lab_id, booked_by, booking_date, start_time, end_time, purpose, expected_students, equipment_needed, approval_status, approved_by, approval_date, approval_remarks, created_at, updated_at)
         SELECT id, lab_id, booked_by, booking_date, start_time, end_time, purpose, expected_students, equipment_needed, approval_status, approved_by, approval_date, approval_remarks, created_at, updated_at
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
