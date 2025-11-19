/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = Database.getInstance()
    
    // Get complete user information
    const result = await db.query(
      `SELECT 
        id, 
        name, 
        email, 
        role,
        salutation,
        department
       FROM users 
       WHERE id = ?`,
      [user.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userInfo = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role,
        salutation: userInfo.salutation,
        department: userInfo.department
      }
    })
  } catch (error) {
    console.error("Error fetching user info:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
