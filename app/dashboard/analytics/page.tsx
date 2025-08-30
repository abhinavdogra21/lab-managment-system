"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts"

export default function AnalyticsPage() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      window.location.href = "/"
      return
    }
    setUser(JSON.parse(stored))
    setReady(true)
  }, [])

  if (!ready || !user) return null

  const weeklyBookings = [
    { day: "Mon", bookings: 12 },
    { day: "Tue", bookings: 18 },
    { day: "Wed", bookings: 8 },
    { day: "Thu", bookings: 20 },
    { day: "Fri", bookings: 14 },
    { day: "Sat", bookings: 6 },
    { day: "Sun", bookings: 4 },
  ]

  const deptUsage = [
    { dept: "CSE", usage: 78 },
    { dept: "ECE", usage: 64 },
    { dept: "MME", usage: 55 },
    { dept: "CCE", usage: 61 },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Lab Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ bookings: { label: "Bookings", color: "hsl(var(--primary))" } }}
              className="h-64"
            >
              <LineChart data={weeklyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Utilization (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ usage: { label: "Usage", color: "hsl(var(--secondary))" } }}
              className="h-64"
            >
              <BarChart data={deptUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" />
                <YAxis />
                <Bar dataKey="usage" fill="var(--color-usage)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
