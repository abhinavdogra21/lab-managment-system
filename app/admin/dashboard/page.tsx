/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, HardDrive, Users, FlaskConical, Calendar, Clock } from "lucide-react"
import Link from "next/link"

type StatResponse = {
  totalUsers: number
  activeLabs: number
  dbUptimeSeconds: number
  dbSizeMB: number
  pendingApprovals: number
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StatResponse | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load stats (${res.status})`)
        const json = (await res.json()) as StatResponse
        if (mounted) setData(json)
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load stats")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const skeleton = (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const fmtMB = (n: number) => `${(n ?? 0).toFixed(1)} MB`
  const fmtUptime = (s: number) => {
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    return d > 0 ? `${d}d ${h}h` : `${h}h`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground">Your system's recent activity</p>
      </div>

      {loading && skeleton}
      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Error loading stats</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" /> Total Users
                </CardTitle>
                <CardDescription>All active and archived users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalUsers ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="h-5 w-5 text-primary" /> Active Labs
                </CardTitle>
                <CardDescription>Labs currently available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.activeLabs ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-5 w-5 text-primary" /> DB Size
                </CardTitle>
                <CardDescription>Approximate database storage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{fmtMB(data.dbSizeMB || 0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-primary" /> DB Uptime
                </CardTitle>
                <CardDescription>Database availability window</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{fmtUptime(data.dbUptimeSeconds || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> 
                Quick Actions
              </CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/admin/dashboard/daily-schedule" className="flex flex-col items-center gap-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    <div className="text-center">
                      <div className="font-medium">Daily Schedule</div>
                      <div className="text-xs text-muted-foreground">View lab bookings & classes</div>
                    </div>
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/admin/dashboard/timetable" className="flex flex-col items-center gap-2">
                    <Calendar className="h-6 w-6 text-green-600" />
                    <div className="text-center">
                      <div className="font-medium">Weekly Timetable</div>
                      <div className="text-xs text-muted-foreground">Manage class schedules</div>
                    </div>
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/admin/dashboard/labs" className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-purple-600" />
                    <div className="text-center">
                      <div className="font-medium">Lab Management</div>
                      <div className="text-xs text-muted-foreground">Configure labs & equipment</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
