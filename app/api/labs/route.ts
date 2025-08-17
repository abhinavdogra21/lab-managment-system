// Labs API endpoint
// CRUD operations for lab management

import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

// GET - Fetch all labs or labs by department
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("department")

    let labs
    if (departmentId) {
      labs = await dbOperations.getLabsByDepartment(Number.parseInt(departmentId))
    } else {
      labs = await dbOperations.getAllLabs()
    }

    return NextResponse.json({ labs })
  } catch (error) {
    console.error("Labs fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new lab (Admin/HOD only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const labData = await request.json()

    // Validate required fields
    if (!labData.name || !labData.code || !labData.departmentId) {
      return NextResponse.json({ error: "Name, code, and department are required" }, { status: 400 })
    }

    // Create lab in database
    const lab = await dbOperations.createLab(labData)

    // Log the action
    await dbOperations.createLog({
      userId: user.userId,
      action: "CREATE_LAB",
      entityType: "lab",
      entityId: lab.id,
      details: labData,
      ipAddress: request.ip || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ lab }, { status: 201 })
  } catch (error) {
    console.error("Lab creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
