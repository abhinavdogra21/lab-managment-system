"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, UserCheck, BarChart3, TrendingUp, Users, FileText } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface HODDashboardProps {
  user: User
}

/**
 * HODDashboard Component
 *
 * Dashboard for Head of Department with:
 * - Department overview
 * - Approval workflows
 * - Analytics and reports
 * - Resource management
 */
export function HODDashboard({ user }: HODDashboardProps) {
  // Mock data - would come from API
  const departmentStats = [
    { label: "Total Labs", value: "6", icon: Building },
    { label: "Active Faculty", value: "24", icon: Users },
    { label: "Students Enrolled", value: "450", icon: Users },
    { label: "Lab Utilization", value: "82%", icon: TrendingUp },
  ]

  const pendingApprovals = [
    {
      id: "1",
      type: "Lab Booking",
      requestor: "Prof. Smith",
      lab: "CP1",
      purpose: "Database Lab Session",
      date: "2024-01-20",
      priority: "high",
    },
    {
      id: "2",
      type: "Equipment Request",
      requestor: "Lab Staff - CP2",
      item: "New Oscilloscopes (5 units)",
      purpose: "Replace faulty equipment",
      priority: "medium",
    },
  ]

  const labUtilization = [
    { lab: "CP1", utilization: 95, sessions: 28, status: "high" },
    { lab: "CP2", utilization: 78, sessions: 22, status: "good" },
    { lab: "CP3", utilization: 65, sessions: 18, status: "good" },
    { lab: "CP4", utilization: 45, sessions: 12, status: "low" },
    { lab: "CP5", utilization: 88, sessions: 25, status: "high" },
    { lab: "CMLBDA", utilization: 72, sessions: 20, status: "good" },
  ]

  const recentActivities = [
    {
      id: "1",
      activity: "Lab booking approved for Prof. Johnson",
      time: "2 hours ago",
      type: "approval",
    },
    {
      id: "2",
      activity: "Monthly utilization report generated",
      time: "4 hours ago",
      type: "report",
    },
    {
      id: "3",
      activity: "Equipment request from CP3 lab staff",
      time: "6 hours ago",
      type: "request",
    },
  ]

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High Priority</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800">Low Priority</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  const getUtilizationBadge = (status: string) => {
    switch (status) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High Usage</Badge>
      case "good":
        return <Badge className="bg-green-100 text-green-800">Optimal</Badge>
      case "low":
        return <Badge className="bg-yellow-100 text-yellow-800">Underutilized</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Department Overview</h1>
        <p className="text-muted-foreground">
          {user.name} • Head of {user.department} Department
        </p>
      </div>

      {/* Department Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {departmentStats.map((stat, index) => (
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
            <CardTitle className="text-sm">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm">
              Review ({pendingApprovals.length})
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Generate Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Create Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Lab Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Department Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-secondary" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Requests requiring your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{approval.type}</p>
                  <p className="text-sm text-muted-foreground">Requestor: {approval.requestor}</p>
                  <p className="text-sm text-muted-foreground">
                    {approval.lab && `Lab: ${approval.lab} • `}
                    {approval.item && `Item: ${approval.item} • `}
                    Purpose: {approval.purpose}
                  </p>
                  {approval.date && <p className="text-sm text-muted-foreground">Date: {approval.date}</p>}
                </div>
                <div className="text-right">
                  {getPriorityBadge(approval.priority)}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive">
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lab Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Lab Utilization Overview
          </CardTitle>
          <CardDescription>Current month utilization across all labs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labUtilization.map((lab) => (
              <div key={lab.lab} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{lab.lab}</p>
                  <p className="text-sm text-muted-foreground">{lab.sessions} sessions this month</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{lab.utilization}%</div>
                  {getUtilizationBadge(lab.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Recent Activities
          </CardTitle>
          <CardDescription>Latest department activities and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="text-sm">{activity.activity}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
