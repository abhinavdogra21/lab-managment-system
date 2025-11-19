/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function DELETE(request: NextRequest) {
  try {
    const result = await db.query(
      `DELETE FROM timetable_entries WHERE is_active = true`
    )

    return NextResponse.json({ 
      success: true, 
      message: `Cleared ${result.affectedRows} timetable entries` 
    })
  } catch (error) {
    console.error("Error clearing timetable entries:", error)
    return NextResponse.json(
      { error: "Failed to clear timetable entries" },
      { status: 500 }
    )
  }
}
