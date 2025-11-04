/**
 * Activity Logger - Separate logging system that preserves history
 * even when users or bookings are deleted
 */

import { db } from "./database"

// ============================================
// Lab Booking Activity Logger
// ============================================

export interface LabBookingActivityLog {
  bookingId: number | null
  labId: number | null
  actorUserId: number | null
  actorName: string | null
  actorEmail: string | null
  actorRole: 'student' | 'faculty' | 'lab_staff' | 'hod' | 'admin' | 'others' | 'non_teaching' | null
  action: string
  actionDescription?: string | null
  bookingSnapshot?: any
  changesMade?: any
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logLabBookingActivity(log: LabBookingActivityLog) {
  try {
    const query = `
      INSERT INTO lab_booking_activity_logs (
        booking_id, lab_id, actor_user_id, actor_name, actor_email, actor_role,
        action, action_description, booking_snapshot, changes_made, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      log.bookingId,
      log.labId,
      log.actorUserId,
      log.actorName,
      log.actorEmail,
      log.actorRole,
      log.action,
      log.actionDescription || null,
      log.bookingSnapshot ? JSON.stringify(log.bookingSnapshot) : null,
      log.changesMade ? JSON.stringify(log.changesMade) : null,
      log.ipAddress || null,
      log.userAgent || null,
    ]
    
    await db.query(query, values)
  } catch (error) {
    console.error("Failed to log lab booking activity:", error)
    // Don't throw - logging failure shouldn't break the main operation
  }
}

export async function getLabBookingActivityLogs(params: {
  bookingId?: number
  labId?: number
  actorUserId?: number
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const where: string[] = ["1=1"]
  const values: any[] = []

  if (params.bookingId) {
    where.push("booking_id = ?")
    values.push(params.bookingId)
  }
  if (params.labId) {
    where.push("lab_id = ?")
    values.push(params.labId)
  }
  if (params.actorUserId) {
    where.push("actor_user_id = ?")
    values.push(params.actorUserId)
  }
  if (params.action) {
    where.push("action = ?")
    values.push(params.action)
  }
  if (params.startDate) {
    where.push("created_at >= ?")
    values.push(params.startDate)
  }
  if (params.endDate) {
    where.push("created_at <= ?")
    values.push(params.endDate)
  }

  const limit = Math.max(1, Math.min(1000, params.limit || 100))
  const offset = Math.max(0, params.offset || 0)

  const query = `
    SELECT 
      id, booking_id, lab_id, actor_user_id, actor_name, actor_email, actor_role,
      action, action_description, booking_snapshot, changes_made, ip_address, user_agent, created_at
    FROM lab_booking_activity_logs
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await db.query(query, values)
  return result.rows.map((row: any) => ({
    ...row,
    bookingSnapshot: row.booking_snapshot && typeof row.booking_snapshot === 'string' 
      ? JSON.parse(row.booking_snapshot) 
      : row.booking_snapshot,
    changesMade: row.changes_made && typeof row.changes_made === 'string'
      ? JSON.parse(row.changes_made)
      : row.changes_made,
  }))
}

// Get lab booking activity logs for HoD dashboard (filtered by department's labs)
export async function getLabBookingActivityLogsForDepartment(params: {
  departmentId: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const where: string[] = ["l.department_id = ?"]
  const values: any[] = [params.departmentId]

  if (params.startDate) {
    where.push("lba.created_at >= ?")
    values.push(params.startDate)
  }
  if (params.endDate) {
    where.push("lba.created_at <= ?")
    values.push(params.endDate)
  }

  const limit = Math.max(1, Math.min(1000, params.limit || 100))
  const offset = Math.max(0, params.offset || 0)

  const query = `
    SELECT 
      lba.id, lba.booking_id, lba.lab_id, lba.actor_user_id, lba.actor_name, 
      lba.actor_email, lba.actor_role, lba.action, lba.action_description, 
      lba.booking_snapshot, lba.changes_made, lba.ip_address, lba.user_agent, lba.created_at,
      l.name as lab_name, l.code as lab_code
    FROM lab_booking_activity_logs lba
    LEFT JOIN labs l ON lba.lab_id = l.id
    WHERE ${where.join(" AND ")}
    ORDER BY lba.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await db.query(query, values)
  return result.rows.map((row: any) => ({
    ...row,
    bookingSnapshot: row.booking_snapshot && typeof row.booking_snapshot === 'string'
      ? JSON.parse(row.booking_snapshot)
      : row.booking_snapshot,
    changesMade: row.changes_made && typeof row.changes_made === 'string'
      ? JSON.parse(row.changes_made)
      : row.changes_made,
  }))
}

// ============================================
// Component Activity Logger
// ============================================

export interface ComponentActivityLog {
  entityType: "component_request" | "component_loan"
  entityId: number | null
  labId: number | null
  actorUserId: number | null
  actorName: string | null
  actorEmail: string | null
  actorRole: 'student' | 'faculty' | 'lab_staff' | 'hod' | 'admin' | 'others' | 'non_teaching' | null
  action: string
  actionDescription?: string | null
  entitySnapshot?: any
  changesMade?: any
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logComponentActivity(log: ComponentActivityLog) {
  try {
    const query = `
      INSERT INTO component_activity_logs (
        entity_type, entity_id, lab_id, actor_user_id, actor_name, actor_email, actor_role,
        action, action_description, entity_snapshot, changes_made, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      log.entityType,
      log.entityId,
      log.labId,
      log.actorUserId,
      log.actorName,
      log.actorEmail,
      log.actorRole,
      log.action,
      log.actionDescription || null,
      log.entitySnapshot ? JSON.stringify(log.entitySnapshot) : null,
      log.changesMade ? JSON.stringify(log.changesMade) : null,
      log.ipAddress || null,
      log.userAgent || null,
    ]
    
    await db.query(query, values)
  } catch (error) {
    console.error("Failed to log component activity:", error)
    // Don't throw - logging failure shouldn't break the main operation
  }
}

export async function getComponentActivityLogs(params: {
  entityType?: "component_request" | "component_loan"
  entityId?: number
  labId?: number
  actorUserId?: number
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const where: string[] = ["1=1"]
  const values: any[] = []

  if (params.entityType) {
    where.push("entity_type = ?")
    values.push(params.entityType)
  }
  if (params.entityId) {
    where.push("entity_id = ?")
    values.push(params.entityId)
  }
  if (params.labId) {
    where.push("lab_id = ?")
    values.push(params.labId)
  }
  if (params.actorUserId) {
    where.push("actor_user_id = ?")
    values.push(params.actorUserId)
  }
  if (params.action) {
    where.push("action = ?")
    values.push(params.action)
  }
  if (params.startDate) {
    where.push("created_at >= ?")
    values.push(params.startDate)
  }
  if (params.endDate) {
    where.push("created_at <= ?")
    values.push(params.endDate)
  }

  const limit = Math.max(1, Math.min(1000, params.limit || 100))
  const offset = Math.max(0, params.offset || 0)

  const query = `
    SELECT 
      id, entity_type, entity_id, lab_id, actor_user_id, actor_name, actor_email, actor_role,
      action, action_description, entity_snapshot, changes_made, ip_address, user_agent, created_at
    FROM component_activity_logs
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await db.query(query, values)
  return result.rows.map((row: any) => ({
    ...row,
    entitySnapshot: row.entity_snapshot && typeof row.entity_snapshot === 'string'
      ? JSON.parse(row.entity_snapshot)
      : row.entity_snapshot,
    changesMade: row.changes_made && typeof row.changes_made === 'string'
      ? JSON.parse(row.changes_made)
      : row.changes_made,
  }))
}

// Get component activity logs for HoD dashboard (filtered by department's labs)
export async function getComponentActivityLogsForDepartment(params: {
  departmentId: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const where: string[] = ["l.department_id = ?"]
  const values: any[] = [params.departmentId]

  if (params.startDate) {
    where.push("ca.created_at >= ?")
    values.push(params.startDate)
  }
  if (params.endDate) {
    where.push("ca.created_at <= ?")
    values.push(params.endDate)
  }

  const limit = Math.max(1, Math.min(1000, params.limit || 100))
  const offset = Math.max(0, params.offset || 0)

  const query = `
    SELECT 
      ca.id, ca.entity_type, ca.entity_id, ca.lab_id, ca.actor_user_id, 
      ca.actor_name, ca.actor_email, ca.actor_role, ca.action, ca.action_description, 
      ca.entity_snapshot, ca.changes_made, ca.ip_address, ca.user_agent, ca.created_at,
      l.name as lab_name, l.code as lab_code
    FROM component_activity_logs ca
    LEFT JOIN labs l ON ca.lab_id = l.id
    WHERE ${where.join(" AND ")}
    ORDER BY ca.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await db.query(query, values)
  return result.rows.map((row: any) => ({
    ...row,
    entitySnapshot: row.entity_snapshot && typeof row.entity_snapshot === 'string'
      ? JSON.parse(row.entity_snapshot)
      : row.entity_snapshot,
    changesMade: row.changes_made && typeof row.changes_made === 'string'
      ? JSON.parse(row.changes_made)
      : row.changes_made,
  }))
}

// ============================================
// Combined Activity Logs for Dashboard
// ============================================

export async function getAllActivityLogsForDepartment(params: {
  departmentId: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const limit = Math.max(1, Math.min(1000, params.limit || 100))
  const offset = Math.max(0, params.offset || 0)

  // Get both lab booking and component activities
  const [labBookingLogs, componentLogs] = await Promise.all([
    getLabBookingActivityLogsForDepartment({ ...params, limit: limit * 2 }),
    getComponentActivityLogsForDepartment({ ...params, limit: limit * 2 }),
  ])

  // Combine and sort by created_at
  const allLogs = [
    ...labBookingLogs.map(log => ({ ...log, logType: 'lab_booking' as const })),
    ...componentLogs.map(log => ({ ...log, logType: 'component' as const })),
  ].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return dateB - dateA // Descending order
  })

  // Apply pagination to combined results
  return allLogs.slice(offset, offset + limit)
}

// ============================================
// Helper function to get user info for logging
// ============================================

export async function getUserInfoForLogging(userId: number) {
  try {
    const result = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId]
    )
    const user = result.rows[0]
    if (!user) return null
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    console.error("Failed to get user info for logging:", error)
    return null
  }
}
