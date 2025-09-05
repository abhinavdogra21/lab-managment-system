import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const templates = await db.query(
      `SELECT 
        tt.*,
        u.name as created_by_name
      FROM timetable_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      ORDER BY tt.is_active DESC, tt.created_at DESC`
    )
    
    return NextResponse.json({ templates: templates.rows })
  } catch (error) {
    console.error("Error fetching timetable templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch timetable templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      academic_year,
      semester_type,
      start_date,
      end_date,
      is_active = false,
      created_by
    } = body

    // Validate required fields
    if (!name || !academic_year || !semester_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // If setting as active, deactivate all other templates
    if (is_active) {
      await db.query(
        `UPDATE timetable_templates SET is_active = false`
      )
    }

    const result = await db.query(
      `INSERT INTO timetable_templates (
        name, academic_year, semester_type, start_date, end_date, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, academic_year, semester_type, start_date, end_date, is_active, created_by]
    )

    // Fetch the created template
    const template = await db.query(
      `SELECT 
        tt.*,
        u.name as created_by_name
      FROM timetable_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?`,
      [result.insertId]
    )

    return NextResponse.json({ template: template.rows[0] })
  } catch (error) {
    console.error("Error creating timetable template:", error)
    return NextResponse.json(
      { error: "Failed to create timetable template" },
      { status: 500 }
    )
  }
}
