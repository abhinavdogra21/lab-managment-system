// Departments API endpoint
// List and create departments

import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

// GET - Fetch all departments
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const departments = await dbOperations.listDepartments()
    return NextResponse.json({ departments })
  } catch (error) {
    console.error("Departments fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new department (Admin/HOD only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    if (!body?.name || !body?.code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
    }

    const dept = await dbOperations.createDepartment({ name: body.name, code: body.code })

    // Best-effort IP extraction
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
      action: "CREATE_DEPARTMENT",
      entityType: "department",
      entityId: dept.id,
      details: { name: body.name, code: body.code },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ department: dept }, { status: 201 })
  } catch (error) {
    console.error("Department creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete a department and cascade delete its labs and related records (Admin/HOD only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get("id")
    const departmentId = idParam ? Number.parseInt(idParam) : NaN
    if (!departmentId || Number.isNaN(departmentId)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const result = await dbOperations.deleteDepartmentCascade(departmentId)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
      action: "DELETE_DEPARTMENT",
      entityType: "department",
      entityId: departmentId,
      details: { cascade: true },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Department delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
