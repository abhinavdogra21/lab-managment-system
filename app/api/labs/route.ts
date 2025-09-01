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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
      action: "CREATE_LAB",
      entityType: "lab",
      entityId: lab.id,
      details: labData,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ lab }, { status: 201 })
  } catch (error: any) {
    console.error("Lab creation error:", error)
    const message = String(error?.message || "Internal server error")
    const isDup = message.toLowerCase().includes("duplicate")
    return NextResponse.json({ error: isDup ? "Lab code already exists" : message }, { status: isDup ? 409 : 500 })
  }
}

// PATCH - Assign lab staff (Admin/HOD only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const labId = Number.parseInt(String(body?.labId || ""), 10)
    if (!labId || Number.isNaN(labId)) {
      return NextResponse.json({ error: "labId is required" }, { status: 400 })
    }
    // New: support multi-assign via staffIds: number[]
    if (Array.isArray(body?.staffIds)) {
      const staffIds: number[] = body.staffIds.map((v: any) => Number.parseInt(String(v), 10)).filter((n: number) => Number.isFinite(n))
      const assigned = await dbOperations.replaceLabStaff(labId, staffIds)
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
      await dbOperations.createLog({
        userId: user.userId,
        action: "SET_LAB_STAFF",
        entityType: "lab",
        entityId: labId,
        details: { staffIds },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "unknown",
      })
      return NextResponse.json({ staff: assigned })
    }
    // Back-compat: single assignment with staffId (or null to clear)
    const staffIdRaw = body?.staffId
    const staffId = staffIdRaw === null ? null : Number.parseInt(String(staffIdRaw), 10)
    const lab = await dbOperations.setLabStaff(labId, staffId)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
  action: "SET_LAB_STAFF",
  entityType: "lab",
  entityId: labId,
  details: Array.isArray(body?.staffIds) ? { staffIds: body.staffIds } : { staffId },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ lab })
  } catch (error: any) {
    const message = String(error?.message || "Internal server error")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - Update lab details (Admin/HOD only)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const labId = Number.parseInt(String(body?.id || ""), 10)
    if (!labId || Number.isNaN(labId)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const updated = await dbOperations.updateLab(labId, {
      name: body?.name,
      code: body?.code,
      capacity: body?.capacity,
      location: body?.location,
      staffId: body?.staffId === undefined ? undefined : (body.staffId === null ? null : Number.parseInt(String(body.staffId), 10)),
    })

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
      action: "UPDATE_LAB",
      entityType: "lab",
      entityId: labId,
      details: { ...body, id: labId },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ lab: updated })
  } catch (error: any) {
    const message = String(error?.message || "Internal server error")
    const isDup = message.toLowerCase().includes("duplicate")
    return NextResponse.json({ error: isDup ? "Lab code already exists" : message }, { status: isDup ? 409 : 500 })
  }
}

// DELETE - Delete a lab and all related records (Admin/HOD only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin", "hod"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get("id")
    const labId = idParam ? Number.parseInt(idParam) : NaN
    if (!labId || Number.isNaN(labId)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const result = await dbOperations.deleteLabCascade(labId)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    await dbOperations.createLog({
      userId: user.userId,
      action: "DELETE_LAB",
      entityType: "lab",
      entityId: labId,
      details: { cascade: true },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Lab delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
