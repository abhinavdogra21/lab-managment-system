import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get("department_id")

    let rows
    if (departmentId) {
      // Get the department details first
      const deptRes = await db.query(
        `SELECT id, name, code FROM departments WHERE id = ? LIMIT 1`,
        [departmentId]
      )
      const dept = deptRes.rows?.[0]

      if (dept) {
        // Case-insensitive match on department code or name
        rows = (
          await db.query(
            `SELECT id, name, email, salutation, department as department_name
             FROM users 
             WHERE role = 'faculty' 
             AND (LOWER(department) = LOWER(?) OR LOWER(department) = LOWER(?))
             ORDER BY name ASC`,
            [dept.code, dept.name]
          )
        ).rows
        // Fallback: if no faculty found for this mapping, return all faculties
        if (!rows || rows.length === 0) {
          rows = (
            await db.query(
              `SELECT id, name, email, salutation, department as department_name FROM users WHERE role = 'faculty' ORDER BY name ASC`
            )
          ).rows
        }
      } else {
        // If department not found, return all faculties
        rows = (
          await db.query(
            `SELECT id, name, email, salutation, department as department_name FROM users WHERE role = 'faculty' ORDER BY name ASC`
          )
        ).rows
      }
    } else {
      rows = (await db.query(
        `SELECT id, name, email, salutation, department as department_name FROM users WHERE role = 'faculty' ORDER BY name ASC`
      )).rows
    }
    return NextResponse.json({ users: rows })
  } catch (error) {
    console.error("Failed to fetch faculties:", error)
    return NextResponse.json({ error: "Failed to fetch faculties" }, { status: 500 })
  }
}
