"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AnalyticsResponse = {
  range: { startDate: string; endDate: string }
  kpis: { totalBookings: number; uniqueBookers: number; pendingApprovals: number; totalHours: number }
  daily: { day: string; total: number }[]
  status: { status: string; count: number }[]
  byDepartment: { department: string; count: number }[]
  topLabs: { lab: string; count: number }[]
}

export default function AnalyticsPage() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const [range, setRange] = useState<string>("28d")
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      window.location.href = "/"
      return
    }
    setUser(JSON.parse(stored))
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/analytics?range=${encodeURIComponent(range)}`)
        if (!res.ok) {
          if (res.status === 403) {
            setError("You do not have access to Analytics. Please sign in as Admin or HOD.")
            setData(null)
            return
          }
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || "Failed to load analytics")
        }
        const json = (await res.json()) as AnalyticsResponse
        setData(json)
      } finally {
        setLoading(false)
      }
    })()
  }, [ready, range])

  const statusColors: Record<string, string> = {
    approved: "hsl(var(--green-500, 142 76% 36%))",
    pending: "hsl(var(--amber-500, 37 92% 50%))",
    rejected: "hsl(var(--red-500, 0 72% 51%))",
  }

  const dailyChartData = useMemo(() => {
    return (data?.daily || []).map((d) => ({ day: d.day.slice(5), bookings: Number(d.total || 0) }))
  }, [data])

  return (
    <div className="p-6 space-y-6">
      {(!ready || !user) ? null : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Analytics</h1>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="28d">Last 28 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <Card>
              <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
            </Card>
          ) : null}

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total bookings</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{data?.kpis.totalBookings ?? (loading ? "…" : 0)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Unique bookers</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{data?.kpis.uniqueBookers ?? (loading ? "…" : 0)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pending approvals</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{data?.kpis.pendingApprovals ?? (loading ? "…" : 0)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total hours booked</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{data?.kpis.totalHours ?? (loading ? "…" : 0)}</CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Bookings over time</CardTitle>
              </CardHeader>
              <CardContent>
                {(data && dailyChartData.length > 0) ? (
                  <ChartContainer config={{ bookings: { label: "Bookings", color: "hsl(var(--primary))" } }} className="h-72">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">{loading ? "Loading…" : "No data for the selected range."}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {(data && (data.status || []).length > 0) ? (
                  <ChartContainer config={{}} className="h-72">
                    <PieChart>
                      <Pie dataKey="count" nameKey="status" data={data.status} outerRadius={100}>
                        {data.status.map((entry, idx) => (
                          <Cell key={idx} fill={statusColors[entry.status] || "hsl(var(--muted-foreground))"} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">{loading ? "Loading…" : "No data for the selected range."}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bookings by department</CardTitle>
              </CardHeader>
              <CardContent>
                {(data && (data.byDepartment || []).length > 0) ? (
                  <ChartContainer config={{ cnt: { label: "Bookings", color: "hsl(var(--secondary))" } }} className="h-72">
                    <BarChart data={data.byDepartment.map((d) => ({ dept: d.department, cnt: d.count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dept" interval={0} angle={-20} height={60} textAnchor="end" />
                      <YAxis allowDecimals={false} />
                      <Bar dataKey="cnt" fill="var(--color-cnt)" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">{loading ? "Loading…" : "No data for the selected range."}</div>
                )}
              </CardContent>
            </Card>

        <Card>
              <CardHeader>
                <CardTitle>Top labs by bookings</CardTitle>
              </CardHeader>
              <CardContent>
            {(data && (data.topLabs || []).length > 0) ? (
              <ChartContainer config={{ cnt: { label: "Bookings", color: "hsl(var(--primary))" } }} className="h-72">
                <BarChart data={data.topLabs.map((d) => ({ lab: d.lab, cnt: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lab" interval={0} angle={-20} height={60} textAnchor="end" />
                  <YAxis allowDecimals={false} />
                  <Bar dataKey="cnt" fill="var(--color-cnt)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">{loading ? "Loading…" : "No data for the selected range."}</div>
            )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
