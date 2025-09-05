import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

// Endpoint to ensure all departments have HOD users
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["admin"])) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const result = await dbOperations.ensureAllDepartmentsHaveHods()
    
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || "unknown"
    
    await dbOperations.createLog({
      userId: user.userId,
      action: "ENSURE_DEPARTMENT_HODS",
      entityType: "user",
      entityId: null,
      details: result,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: `Checked ${result.departmentsChecked} departments and created ${result.hodsCreated} HOD users`,
      ...result
    })
  } catch (error) {
    console.error("Error ensuring HOD users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
