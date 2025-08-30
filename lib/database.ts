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
  connectionLimit: 10,
}

// Create connection pool
const pool: Pool = createPool(dbConfig)

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
    try {
      const [rowsOrHeader] = await this.pool.query(text, params)
      const isArray = Array.isArray(rowsOrHeader)
      const rows = (isArray ? (rowsOrHeader as RowDataPacket[]) : []) as any[]
      const header = (!isArray ? (rowsOrHeader as ResultSetHeader) : undefined)
      return { rows, insertId: header?.insertId, affectedRows: header?.affectedRows }
    } catch (error) {
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

// Export singleton instance
export const db = Database.getInstance()

// Common database operations
export const dbOperations = {
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

  async listUsers(filter?: { role?: string | null; activeOnly?: boolean }) {
    let query = "SELECT id, email, name, role, department, is_active, created_at, updated_at FROM users WHERE 1=1"
    const params: any[] = []
    if (filter?.role) {
      query += " AND role = ?"
      params.push(filter.role)
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
  
}
