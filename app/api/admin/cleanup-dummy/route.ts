import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

const db = Database.getInstance()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    
    // Only allow admin users to clean dummy data
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for dummy requests
    const dummyRequests = await db.query(`
      SELECT * FROM booking_requests 
      WHERE LOWER(purpose) LIKE '%test%' 
         OR LOWER(purpose) LIKE '%dummy%' 
         OR LOWER(purpose) LIKE '%sample%' 
         OR LOWER(purpose) LIKE '%demo%'
         OR LOWER(purpose) LIKE '%database project testing%'
         OR LOWER(purpose) LIKE '%network configuration lab%'
         OR LOWER(purpose) LIKE '%software development project demo%'
         OR LOWER(purpose) LIKE '%machine learning algorithm testing%'
    `)

    // Check for orphaned requests
    const orphanedRequests = await db.query(`
      SELECT br.* FROM booking_requests br 
      LEFT JOIN users u ON br.requested_by = u.id 
      WHERE u.id IS NULL
    `)

    const dummyCount = dummyRequests.rows.length
    const orphanedCount = orphanedRequests.rows.length

    if (dummyCount > 0) {
      await db.query(`
        DELETE FROM booking_requests 
        WHERE LOWER(purpose) LIKE '%test%' 
           OR LOWER(purpose) LIKE '%dummy%' 
           OR LOWER(purpose) LIKE '%sample%' 
           OR LOWER(purpose) LIKE '%demo%'
           OR LOWER(purpose) LIKE '%database project testing%'
           OR LOWER(purpose) LIKE '%network configuration lab%'
           OR LOWER(purpose) LIKE '%software development project demo%'
           OR LOWER(purpose) LIKE '%machine learning algorithm testing%'
      `)
    }

    if (orphanedCount > 0) {
      await db.query(`
        DELETE br FROM booking_requests br 
        LEFT JOIN users u ON br.requested_by = u.id 
        WHERE u.id IS NULL
      `)
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${dummyCount} dummy requests and ${orphanedCount} orphaned requests removed`,
      deleted: {
        dummy: dummyCount,
        orphaned: orphanedCount,
        total: dummyCount + orphanedCount
      }
    })

  } catch (error) {
    console.error("Database cleanup error:", error)
    return NextResponse.json(
      { error: "Failed to clean database" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    
    // Only allow admin users to view dummy data
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check current requests
    const allRequests = await db.query(`
      SELECT br.*, u.name as student_name, u.email as student_email
      FROM booking_requests br
      LEFT JOIN users u ON br.requested_by = u.id
      ORDER BY br.created_at DESC
    `)

    // Check for dummy requests
    const dummyRequests = await db.query(`
      SELECT br.*, u.name as student_name 
      FROM booking_requests br
      LEFT JOIN users u ON br.requested_by = u.id
      WHERE LOWER(br.purpose) LIKE '%test%' 
         OR LOWER(br.purpose) LIKE '%dummy%' 
         OR LOWER(br.purpose) LIKE '%sample%' 
         OR LOWER(br.purpose) LIKE '%demo%'
         OR LOWER(br.purpose) LIKE '%database project testing%'
         OR LOWER(br.purpose) LIKE '%network configuration lab%'
         OR LOWER(br.purpose) LIKE '%software development project demo%'
         OR LOWER(br.purpose) LIKE '%machine learning algorithm testing%'
    `)

    // Check for orphaned requests
    const orphanedRequests = await db.query(`
      SELECT br.* FROM booking_requests br 
      LEFT JOIN users u ON br.requested_by = u.id 
      WHERE u.id IS NULL
    `)

    return NextResponse.json({
      success: true,
      total: allRequests.rows.length,
      requests: allRequests.rows,
      dummy: {
        count: dummyRequests.rows.length,
        requests: dummyRequests.rows
      },
      orphaned: {
        count: orphanedRequests.rows.length,
        requests: orphanedRequests.rows
      }
    })

  } catch (error) {
    console.error("Database check error:", error)
    return NextResponse.json(
      { error: "Failed to check database" },
      { status: 500 }
    )
  }
}
