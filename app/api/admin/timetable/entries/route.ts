/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('lab_id')
    const dayOfWeek = searchParams.get('day_of_week')
    
    let sql = `
      SELECT 
        te.*,
        l.name as lab_name,
        l.code as lab_code
      FROM timetable_entries te
      LEFT JOIN labs l ON te.lab_id = l.id
      WHERE te.is_active = true
    `
    const params: any[] = []
    
    if (labId) {
      sql += " AND te.lab_id = ?"
      params.push(parseInt(labId))
    }
    
    if (dayOfWeek) {
      sql += " AND te.day_of_week = ?"
      params.push(parseInt(dayOfWeek))
    }
    
    sql += " ORDER BY te.day_of_week, te.time_slot_start"
    
    const entries = await db.query(sql, params)
    
    return NextResponse.json({ entries: entries.rows })
  } catch (error) {
    console.error("Error fetching timetable entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch timetable entries" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check for time conflicts for the same lab
    const conflictCheck = await db.query(
      `SELECT te.*, l.name as lab_name, l.code as lab_code 
       FROM timetable_entries te
       LEFT JOIN labs l ON te.lab_id = l.id
       WHERE te.lab_id = ? AND te.day_of_week = ? 
       AND (
         (? < te.time_slot_end AND ? > te.time_slot_start)
       )
       AND te.is_active = true`,
  [lab_id, day_of_week, normStart, normEnd]
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
      `INSERT INTO timetable_entries (
        lab_id, day_of_week, time_slot_start, time_slot_end, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [lab_id, day_of_week, normStart, normEnd, notes, is_active]
    )

    // Fetch the created entry with joins
    const entry = await db.query(
      `SELECT 
        te.*,
        l.name as lab_name,
        l.code as lab_code
      FROM timetable_entries te
      LEFT JOIN labs l ON te.lab_id = l.id
      WHERE te.id = ?`,
      [result.insertId]
    )

  return NextResponse.json({ entry: entry.rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to create timetable entry" },
      { status: 500 }
    )
  }
}
