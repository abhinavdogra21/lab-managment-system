import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const entryId = parseInt(id)
    const body = await request.json()
    const {
      lab_id,
      day_of_week,
      time_slot_start,
      time_slot_end,
      notes,
      is_active = true
    } = body

    // Validate required fields and ranges
    if (lab_id == null || time_slot_start == null || time_slot_end == null || day_of_week == null) {
      return NextResponse.json(
        { error: "Lab, day, start time, and end time are required" },
        { status: 400 }
      )
    }
    if (!Number.isInteger(lab_id) || lab_id <= 0) {
      return NextResponse.json(
        { error: "Valid lab is required" },
        { status: 400 }
      )
    }
    if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: "Valid day of week is required" },
        { status: 400 }
      )
    }
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/
    if (typeof time_slot_start !== 'string' || typeof time_slot_end !== 'string' ||
        !timeRegex.test(time_slot_start) || !timeRegex.test(time_slot_end)) {
      return NextResponse.json(
        { error: "Time must be in HH:MM or HH:MM:SS format" },
        { status: 400 }
      )
    }
    const startHHMM = time_slot_start.substring(0,5)
    const endHHMM = time_slot_end.substring(0,5)
    if (startHHMM >= endHHMM) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

  // Normalize to HH:MM:SS for DB comparisons
  const normStart = time_slot_start.length === 5 ? `${time_slot_start}:00` : time_slot_start
  const normEnd = time_slot_end.length === 5 ? `${time_slot_end}:00` : time_slot_end

    // Check for time conflicts for the same lab (excluding current entry)
    const conflictCheck = await db.query(
      `SELECT te.*, l.name as lab_name, l.code as lab_code 
       FROM timetable_entries te
       LEFT JOIN labs l ON te.lab_id = l.id
       WHERE te.lab_id = ? AND te.day_of_week = ? 
       AND (
         (? < te.time_slot_end AND ? > te.time_slot_start)
       )
       AND te.is_active = true AND te.id != ?`,
  [lab_id, day_of_week, normStart, normEnd, entryId]
    )

    if (conflictCheck.rows.length > 0) {
      const conflict = conflictCheck.rows[0]
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return NextResponse.json(
        { 
          error: `Time slot conflict! ${conflict.lab_name || 'Lab'} is already scheduled on ${dayNames[day_of_week]} from ${conflict.time_slot_start.substring(0,5)} to ${conflict.time_slot_end.substring(0,5)}. Please choose a different time slot.` 
        },
        { status: 400 }
      )
    }

    const result = await db.query(
      `UPDATE timetable_entries SET 
        lab_id = ?, day_of_week = ?, time_slot_start = ?, time_slot_end = ?,
        notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
  [lab_id, day_of_week, normStart, normEnd, notes, is_active, entryId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    // Fetch the updated entry with joins
    const entry = await db.query(
      `SELECT 
        te.*,
        l.name as lab_name,
        l.code as lab_code
      FROM timetable_entries te
      LEFT JOIN labs l ON te.lab_id = l.id
      WHERE te.id = ?`,
      [entryId]
    )

    return NextResponse.json({ entry: entry.rows[0] })
  } catch (error) {
    console.error("Error updating timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to update timetable entry" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const entryId = parseInt(id)

    const result = await db.query(
      `DELETE FROM timetable_entries WHERE id = ?`,
      [entryId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to delete timetable entry" },
      { status: 500 }
    )
  }
}
