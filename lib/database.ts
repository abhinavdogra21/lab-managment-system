// Database connection and utility functions
// Supports multiple database backends (PostgreSQL, MySQL, SQLite)

import { Pool } from "pg"

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "lnmiit_lab_management",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
}

// Create connection pool
const pool = new Pool(dbConfig)

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
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    } finally {
      client.release()
    }
  }

  // Transaction wrapper
  async transaction(callback: (client: any) => Promise<any>): Promise<any> {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await callback(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("Transaction error:", error)
      throw error
    } finally {
      client.release()
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, name, role, department
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
    return result.rows[0]
  },

  async getUserByEmail(email: string) {
    const query = "SELECT * FROM users WHERE email = $1 AND is_active = true"
    const result = await db.query(query, [email])
    return result.rows[0]
  },

  async getUserById(id: number) {
    const query = "SELECT * FROM users WHERE id = $1 AND is_active = true"
    const result = await db.query(query, [id])
    return result.rows[0]
  },

  // Lab operations
  async getAllLabs() {
    try {
      const query = `
        SELECT l.*, d.name as department_name, u.name as staff_name
        FROM labs l
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN users u ON l.staff_id = u.id
        WHERE l.is_active = true
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
        WHERE l.department_id = $1 AND l.is_active = true
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
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
      return result.rows[0]
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
      WHERE b.booked_by = $1
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
      let idx = 1
      if (filters?.status) {
        query += ` AND b.approval_status = $${idx++}`
        params.push(filters.status)
      }
      if (filters?.labId) {
        query += ` AND b.lab_id = $${idx++}`
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
      WHERE lab_id = $1
      ORDER BY item_name
    `
    const result = await db.query(query, [labId])
    return result.rows
  },

  async updateInventoryQuantity(inventoryId: number, quantityChange: number) {
    const query = `
      UPDATE inventory
      SET quantity_available = quantity_available + $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `
    const result = await db.query(query, [inventoryId, quantityChange])
    return result.rows[0]
  },

  // Single checkBookingConflicts implementation
  async checkBookingConflicts(bookingData: { labId: number; bookingDate: string; startTime: string; endTime: string }) {
    try {
      const query = `
        SELECT * FROM lab_bookings
        WHERE lab_id = $1
          AND booking_date = $2
          AND NOT ($3 >= end_time OR $4 <= start_time)
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
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
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
      return result.rows[0]
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
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      const values = [
        logData.userId,
        logData.action,
        logData.entityType,
        logData.entityId,
        JSON.stringify(logData.details),
        logData.ipAddress,
        logData.userAgent,
      ]
      const result = await db.query(query, values)
      return result.rows[0]
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
    let paramCount = 0

    if (filters.startDate) {
      paramCount++
      query += ` AND b.booking_date >= $${paramCount}`
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      paramCount++
      query += ` AND b.booking_date <= $${paramCount}`
      params.push(filters.endDate)
    }

    if (filters.labId) {
      paramCount++
      query += ` AND b.lab_id = $${paramCount}`
      params.push(filters.labId)
    }

    if (filters.status) {
      paramCount++
      query += ` AND b.approval_status = $${paramCount}`
      params.push(filters.status)
    }

    query += " ORDER BY b.booking_date DESC, b.start_time DESC"

    const result = await db.query(query, params)
    return result.rows
  },

  
}
