"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ClipboardList, UserCheck, AlertTriangle, TrendingUp } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface LabStaffDashboardProps {
  user: User
}

/**
 * LabStaffDashboard Component
 *
 * Dashboard for lab staff with:
 * - Inventory management
 * - Issue/return tracking
 * - Attendance management
 * - Lab-specific reports
 */
export function LabStaffDashboard({ user }: LabStaffDashboardProps) {
  // Mock data - would come from API
  const inventoryAlerts = [
    { item: "Arduino Uno", available: 2, total: 20, status: "low" },
    { item: "Raspberry Pi 4", available: 0, total: 15, status: "out" },
    { item: "Breadboards", available: 8, total: 30, status: "ok" },
  ]

  const pendingReturns = [
    {
      id: "1",
      student: "Alice Johnson",
      item: "Oscilloscope",
      dueDate: "2024-01-20",
      daysOverdue: 2,
      condition: "Good",
    },
    {
      id: "2",
      student: "Bob Smith",
      item: "Function Generator",
      dueDate: "2024-01-18",
      daysOverdue: 4,
      condition: "Fair",
    },
  ]

  const todaysSessions = [
    {
      id: "1",
      subject: "Digital Electronics Lab",
      faculty: "Dr. Smith",
      time: "10:00 AM - 12:00 PM",
      students: 45,
      attendance: 42,
    },
    {
      id: "2",
      subject: "Microprocessor Lab",
      faculty: "Prof. Johnson",
      time: "2:00 PM - 4:00 PM",
      students: 38,
      attendance: null,
    },
  ]

  const stats = [
    { label: "Items Issued Today", value: "23", icon: Package },
    { label: "Pending Returns", value: "12", icon: ClipboardList },
    { label: "Overdue Items", value: "5", icon: AlertTriangle },
    { label: "Lab Utilization", value: "78%", icon: TrendingUp },
  ]

  const getInventoryBadge = (status: string) => {
    switch (status) {
      case "low":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
      case "out":
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
      case "ok":
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Lab Staff Dashboard</h1>
        <p className="text-muted-foreground">
          {user.name} • {user.department} Department
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Manage Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm">
              View Inventory
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Issue Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Issue/Return
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Attendance
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Generate Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-secondary" />
            Inventory Alerts
          </CardTitle>
          <CardDescription>Items requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventoryAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{alert.item}</p>
                  <p className="text-sm text-muted-foreground">
                    Available: {alert.available} / {alert.total}
                  </p>
                </div>
                <div className="text-right">{getInventoryBadge(alert.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Today's Sessions
          </CardTitle>
          <CardDescription>Lab sessions scheduled for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaysSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{session.subject}</p>
                  <p className="text-sm text-muted-foreground">Faculty: {session.faculty}</p>
                  <p className="text-sm text-muted-foreground">Time: {session.time}</p>
                  <p className="text-sm text-muted-foreground">
                    Students: {session.students} enrolled
                    {session.attendance && ` • ${session.attendance} present`}
                  </p>
                </div>
                <div className="text-right">
                  {session.attendance ? (
                    <Badge className="bg-green-100 text-green-800">Attendance Marked</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                  <div className="mt-2">
                    <Button variant="ghost" size="sm">
                      {session.attendance ? "View" : "Mark Attendance"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
