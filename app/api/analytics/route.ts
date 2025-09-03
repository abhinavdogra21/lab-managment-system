import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const user = await verifyToken(req)
  if (!user || !hasRole(user, ["admin", "hod"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const url = new URL(req.url)
  const range = url.searchParams.get("range") || "28d"
  const today = new Date()
  const endDate = toISODate(today)
  const start = new Date(today)
  const days = range.endsWith("d") ? Number.parseInt(range) : 28
  start.setDate(today.getDate() - (Number.isFinite(days) ? days : 28) + 1)
  const startDate = toISODate(start)

  const [daily, statusDist, byDept, topLabs, uniqueBookers, pending, hours] = await Promise.all([
    dbOperations.getBookingDailyCounts(startDate, endDate),
    dbOperations.getBookingStatusDistribution(startDate, endDate),
    dbOperations.getBookingsByDepartment(startDate, endDate),
    dbOperations.getTopLabsByBookings(startDate, endDate, 5),
    dbOperations.getUniqueBookersCount(startDate, endDate),
  dbOperations.getPendingApprovalsCountInRange(startDate, endDate),
    dbOperations.getTotalHoursBooked(startDate, endDate),
  ])

  return NextResponse.json({
    range: { startDate, endDate },
    kpis: {
      totalBookings: daily.reduce((s: number, r: any) => s + Number(r.total || 0), 0),
      uniqueBookers,
      pendingApprovals: pending,
      totalHours: hours,
    },
    daily,
    status: statusDist,
    byDepartment: byDept,
    topLabs,
  })
}
