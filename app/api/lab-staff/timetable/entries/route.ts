/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uid = Number(user.userId)

    // Get labs assigned to this lab staff member
    const labsQuery = `
      (
        SELECT l.id FROM labs l WHERE l.staff_id = ?
      )
      UNION
      (
        SELECT l.id FROM lab_staff_assignments la
        JOIN labs l ON l.id = la.lab_id
        WHERE la.staff_id = ?
      )
    `
    const labsResult = await db.query(labsQuery, [uid, uid])
    const assignedLabIds = labsResult.rows.map((row: any) => row.id)

    if (assignedLabIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        entries: [] 
      })
    }

    // Get timetable entries only for assigned labs
    const labIdsPlaceholder = assignedLabIds.map(() => '?').join(',')
    
    const query = `
      SELECT 
        id, 
        lab_id, 
        day_of_week, 
        time_slot_start, 
        time_slot_end, 
        notes, 
        is_active
      FROM timetable_entries
      WHERE lab_id IN (${labIdsPlaceholder})
      AND is_active = 1
      ORDER BY day_of_week, time_slot_start
    `
    
    const result = await db.query(query, assignedLabIds)
    
    return NextResponse.json({
      success: true,
      entries: result.rows
    })
  } catch (error: any) {
    console.error("Failed to fetch timetable entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch timetable entries" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uid = Number(user.userId)
    const body = await request.json()
    const { lab_id, day_of_week, time_slot_start, time_slot_end, notes } = body

    // Validate required fields
    if (!lab_id || day_of_week === undefined || !time_slot_start || !time_slot_end) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify user is head staff of this lab
    const labsQuery = `
      SELECT l.staff_id FROM labs l WHERE l.id = ?
    `
    const accessCheck = await db.query(labsQuery, [lab_id])
    
    if (accessCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      )
    }

    // Only head staff (staff_id) can create entries
    if (accessCheck.rows[0].staff_id !== uid) {
      return NextResponse.json(
        { error: "Only head lab staff can create timetable entries" },
        { status: 403 }
      )
    }

    // Check for conflicts
    const conflictQuery = `
      SELECT id FROM timetable_entries
      WHERE lab_id = ? 
      AND day_of_week = ?
      AND is_active = 1
      AND (
        (time_slot_start < ? AND time_slot_end > ?)
        OR (time_slot_start < ? AND time_slot_end > ?)
        OR (time_slot_start >= ? AND time_slot_end <= ?)
      )
    `
    const conflicts = await db.query(conflictQuery, [
      lab_id,
      day_of_week,
      time_slot_end,
      time_slot_start,
      time_slot_end,
      time_slot_start,
      time_slot_start,
      time_slot_end
    ])

    if (conflicts.rows.length > 0) {
      return NextResponse.json(
        { error: "Time slot conflicts with existing entry" },
        { status: 409 }
      )
    }

    // Insert new entry
    const insertQuery = `
      INSERT INTO timetable_entries 
      (lab_id, day_of_week, time_slot_start, time_slot_end, notes, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `
    const result = await db.query(insertQuery, [
      lab_id,
      day_of_week,
      time_slot_start,
      time_slot_end,
      notes || null
    ])

    return NextResponse.json({
      success: true,
      message: "Timetable entry created",
      id: result.insertId
    })
  } catch (error: any) {
    console.error("Failed to create timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to create timetable entry" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uid = Number(user.userId)
    const body = await request.json()
    const { id, lab_id, day_of_week, time_slot_start, time_slot_end, notes } = body

    if (!id || !lab_id || day_of_week === undefined || !time_slot_start || !time_slot_end) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify user is head staff of this lab
    const labsQuery = `
      SELECT l.staff_id FROM labs l WHERE l.id = ?
    `
    const accessCheck = await db.query(labsQuery, [lab_id])
    
    if (accessCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      )
    }

    // Only head staff (staff_id) can update entries
    if (accessCheck.rows[0].staff_id !== uid) {
      return NextResponse.json(
        { error: "Only head lab staff can update timetable entries" },
        { status: 403 }
      )
    }

    // Check for conflicts (excluding current entry)
    const conflictQuery = `
      SELECT id FROM timetable_entries
      WHERE lab_id = ? 
      AND day_of_week = ?
      AND id != ?
      AND is_active = 1
      AND (
        (time_slot_start < ? AND time_slot_end > ?)
        OR (time_slot_start < ? AND time_slot_end > ?)
        OR (time_slot_start >= ? AND time_slot_end <= ?)
      )
    `
    const conflicts = await db.query(conflictQuery, [
      lab_id,
      day_of_week,
      id,
      time_slot_end,
      time_slot_start,
      time_slot_end,
      time_slot_start,
      time_slot_start,
      time_slot_end
    ])

    if (conflicts.rows.length > 0) {
      return NextResponse.json(
        { error: "Time slot conflicts with existing entry" },
        { status: 409 }
      )
    }

    // Update entry
    const updateQuery = `
      UPDATE timetable_entries
      SET lab_id = ?, day_of_week = ?, time_slot_start = ?, 
          time_slot_end = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `
    await db.query(updateQuery, [
      lab_id,
      day_of_week,
      time_slot_start,
      time_slot_end,
      notes || null,
      id
    ])

    return NextResponse.json({
      success: true,
      message: "Timetable entry updated"
    })
  } catch (error: any) {
    console.error("Failed to update timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to update timetable entry" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uid = Number(user.userId)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      )
    }

    // Get the entry to check lab access
    const entryQuery = `SELECT lab_id FROM timetable_entries WHERE id = ?`
    const entryResult = await db.query(entryQuery, [id])
    
    if (entryResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      )
    }

    const lab_id = entryResult.rows[0].lab_id

    // Verify user is head staff of this lab
    const labsQuery = `
      SELECT l.staff_id FROM labs l WHERE l.id = ?
    `
    const accessCheck = await db.query(labsQuery, [lab_id])
    
    if (accessCheck.rows.length === 0 || accessCheck.rows[0].staff_id !== uid) {
      return NextResponse.json(
        { error: "Only head lab staff can delete timetable entries" },
        { status: 403 }
      )
    }

    // Delete entry
    const deleteQuery = `DELETE FROM timetable_entries WHERE id = ?`
    await db.query(deleteQuery, [id])

    return NextResponse.json({
      success: true,
      message: "Timetable entry deleted"
    })
  } catch (error: any) {
    console.error("Failed to delete timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to delete timetable entry" },
      { status: 500 }
    )
  }
}
