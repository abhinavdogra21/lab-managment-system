import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [counts, uptime, dbSize, recentLogs, recentBookings, pendingApprovals, errorSparkline, activeLabsThisWeek, recentNonStudents] = await Promise.all([
    dbOperations.getCounts(),
    dbOperations.getDbUptimeSeconds(),
    dbOperations.getDbSizeMB(),
    dbOperations.getRecentLogs(10),
    dbOperations.getRecentBookings(8),
    dbOperations.getPendingApprovalsCount(),
    dbOperations.getErrorSparkline(14),
    dbOperations.getMostActiveLabsThisWeek(5),
    dbOperations.getRecentlyAddedNonStudentUsers(8),
  ])

  return NextResponse.json({
    totalUsers: counts.totalUsers,
    activeLabs: counts.activeLabs,
    dbUptimeSeconds: uptime,
    dbSizeMB: dbSize,
    recentLogs,
    recentBookings,
    pendingApprovals,
  errorSparkline,
  activeLabsThisWeek,
  recentNonStudents,
  })
}
