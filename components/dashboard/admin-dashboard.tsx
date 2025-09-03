"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Building, Database, AlertTriangle, TrendingUp, X, Plus, Edit, Trash2, Shield } from "lucide-react"
import { useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status?: string
}

interface AdminDashboardProps {
  user: User
}

/**
 * AdminDashboard Component
 *
 * Dashboard for system administrators with:
 * - System-wide overview
 * - User management
 * - Global settings
 * - Security monitoring
 */
export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<{ totalUsers: number; activeLabs: number; dbUptimeSeconds: number; dbSizeMB: number; recentLogs: any[] }>({ totalUsers: 0, activeLabs: 0, dbUptimeSeconds: 0, dbSizeMB: 0, recentLogs: [] })
  const [labComponents, setLabComponents] = useState<Array<{ id: number; name: string; code: string; items: number; total_quantity: number }>>([])
  const systemStats = [
    { label: "Total Users", value: String(stats.totalUsers), icon: Users },
    { label: "Active Labs", value: String(stats.activeLabs), icon: Building },
    { label: "DB Size (MB)", value: stats.dbSizeMB.toFixed(2), icon: Database },
  ]

  // Load live stats
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useState(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {}
      try {
        const res2 = await fetch("/api/admin/labs/components", { cache: "no-store" })
        if (res2.ok) {
          const data2 = await res2.json()
          setLabComponents(data2.labs || [])
        }
      } catch {}
    })()
    return undefined
  })

  const systemAlerts = [
    {
      id: "1",
      type: "Security",
      message: "Multiple failed login attempts detected",
      severity: "high",
      time: "5 minutes ago",
    },
    {
      id: "2",
      type: "System",
      message: "Database backup completed successfully",
      severity: "info",
      time: "2 hours ago",
    },
    {
      id: "3",
      type: "Performance",
      message: "Server response time increased by 15%",
      severity: "medium",
      time: "4 hours ago",
    },
  ]

  const departmentOverview = [
    { dept: "CSE", users: 456, labs: 6, utilization: 85 },
    { dept: "ECE", users: 398, labs: 5, utilization: 78 },
    { dept: "MME", users: 234, labs: 4, utilization: 65 },
    { dept: "CCE", users: 159, labs: 3, utilization: 72 },
  ]

  const recentActivities = [
    {
      id: "1",
      activity: "New faculty member added to CSE department",
      user: "Dr. Sarah Wilson",
      time: "1 hour ago",
      type: "user_management",
    },
    {
      id: "2",
      activity: "System backup configuration updated",
      user: "System Admin",
      time: "3 hours ago",
      type: "system_config",
    },
    {
      id: "3",
      activity: "Lab booking policy updated for all departments",
      user: "Admin",
      time: "6 hours ago",
      type: "policy_update",
    },
  ]

  const [activeView, setActiveView] = useState<string>("dashboard")
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [users, setUsers] = useState([
    {
      id: "1",
      name: "Dr. Rajesh Kumar",
      email: "hod.cse@lnmiit.ac.in",
      role: "HOD",
      department: "CSE",
      status: "Active",
    },
    {
      id: "2",
      name: "Prof. Amit Singh",
      email: "faculty1@lnmiit.ac.in",
      role: "Faculty",
      department: "CSE",
      status: "Active",
    },
    {
      id: "3",
      name: "Rahul Agarwal",
      email: "21ucs001@lnmiit.ac.in",
      role: "Student",
      department: "CSE",
      status: "Active",
    },
    {
      id: "4",
      name: "Mr. Suresh Patel",
      email: "labstaff1@lnmiit.ac.in",
      role: "Lab Staff",
      department: "CSE",
      status: "Active",
    },
  ])

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "low":
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>
      case "info":
        return <Badge className="bg-green-100 text-green-800">Info</Badge>
      default:
        return <Badge variant="secondary">{severity}</Badge>
    }
  }

  const handleManageUsers = () => {
    if (typeof window !== "undefined") {
      const prefix = `/${user.role}`
      // Use role-prefixed path for consistency; rewrites will map it
      window.location.href = `${prefix}/dashboard/users`
    } else {
      setActiveView("users")
    }
  }

  const handleSettings = () => {
    setActiveView("settings")
  }

  const handleSecurity = () => {
    setActiveView("security")
  }

  const handleReports = () => {
    setActiveView("reports")
  }

  const handleDatabase = () => {
    setActiveView("database")
  }

  const handleViewAlert = (alert: any) => {
    setSelectedAlert(alert)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId))
  }

  // Compact dashboard view
  if (activeView === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {systemStats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl">{s.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

  {/* Recent System Activity card removed per requirements */}

        {/* Recent bookings and error rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest bookings across labs</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(stats as any).recentBookings?.length ? (
                  (stats as any).recentBookings.map((b: any) => (
                    <li key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <span className="font-medium">{b.lab_name}</span>
                      <span className="text-muted-foreground">{b.booking_date} {b.start_time}-{b.end_time}</span>
                      <span className="text-muted-foreground">{b.approval_status}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No recent bookings</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health</CardTitle>
              <CardDescription>Pending approvals and error rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-sm">Pending approvals: {(stats as any).pendingApprovals ?? 0}</div>
              <div className="flex items-end gap-1 h-16">
                {((stats as any).errorSparkline || []).map((v: number, i: number) => (
                  <div key={i} className="w-2 bg-red-500/70" style={{ height: `${Math.round((v || 0) * 64)}px` }} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Error rate last 14 days</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Labs Overview</CardTitle>
            <CardDescription>Top components by item count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {labComponents.slice(0, 6).map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <span className="font-medium">{l.name} ({l.code})</span>
                  <span className="text-muted-foreground">Items: {l.items} • Qty: {l.total_quantity}</span>
                </div>
              ))}
              {!labComponents.length && (
                <div className="text-muted-foreground">No lab data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Labs This Week</CardTitle>
              <CardDescription>Counts by bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(stats as any).activeLabsThisWeek?.length ? (
                  (stats as any).activeLabsThisWeek.map((r: any) => (
                    <li key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <span className="font-medium">{r.lab}</span>
                      <span className="text-muted-foreground">{r.count} bookings</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No bookings yet this week</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recently Added Users</CardTitle>
              <CardDescription>Non-students only</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(stats as any).recentNonStudents?.length ? (
                  (stats as any).recentNonStudents.map((u: any) => (
                    <li key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground">{u.role} • {u.created_at}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No recent users</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } : u)))
  }

  const renderUserManagement = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="space-x-2">
          <Button onClick={() => setActiveView("dashboard")} variant="outline">
            Back to Dashboard
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Department</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">{user.role}</td>
                    <td className="p-4">{user.department}</td>
                    <td className="p-4">
                      <Badge variant={user.status === "Active" ? "default" : "secondary"}>{user.status}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleToggleUserStatus(user.id)}>
                          {user.status === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Settings</h2>
        <Button onClick={() => setActiveView("dashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">System Name</label>
              <input className="w-full mt-1 p-2 border rounded" defaultValue="LNMIIT Lab Management" />
            </div>
            <div>
              <label className="text-sm font-medium">Session Timeout (minutes)</label>
              <input className="w-full mt-1 p-2 border rounded" defaultValue="30" type="number" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">SMTP Server</label>
              <input className="w-full mt-1 p-2 border rounded" defaultValue="smtp.lnmiit.ac.in" />
            </div>
            <div>
              <label className="text-sm font-medium">From Email</label>
              <input className="w-full mt-1 p-2 border rounded" defaultValue="noreply@lnmiit.ac.in" />
            </div>
            <Button>Test Connection</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Security Monitor</h2>
        <Button onClick={() => setActiveView("dashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Failed Logins (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">23</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">156</div>
            <p className="text-xs text-muted-foreground">Normal activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">87%</div>
            <p className="text-xs text-muted-foreground">Good security</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: "Multiple failed login attempts", ip: "192.168.1.100", time: "2 minutes ago", severity: "high" },
              { event: "New device login detected", ip: "10.0.0.45", time: "15 minutes ago", severity: "medium" },
              { event: "Password changed successfully", ip: "192.168.1.50", time: "1 hour ago", severity: "info" },
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{event.event}</p>
                  <p className="text-sm text-muted-foreground">
                    IP: {event.ip} • {event.time}
                  </p>
                </div>
                {getSeverityBadge(event.severity)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderReports = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Reports</h2>
        <Button onClick={() => setActiveView("dashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "User Activity Report", desc: "Login patterns and usage statistics", action: "Generate PDF" },
          { title: "Lab Utilization Report", desc: "Department-wise lab usage analysis", action: "Generate Excel" },
          { title: "Security Audit Report", desc: "Security events and compliance status", action: "Generate PDF" },
          { title: "System Performance Report", desc: "Server metrics and performance data", action: "Generate Excel" },
        ].map((report, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">{report.action}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderDatabase = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Database Administration</h2>
        <Button onClick={() => setActiveView("dashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex justify-between">
              <span>Database Size:</span>
              <span>2.4 GB</span>
            </div>
            <div className="flex justify-between">
              <span>Last Backup:</span>
              <span>2 hours ago</span>
            </div>
            <Button className="w-full">Run Backup Now</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full bg-transparent">
              Optimize Tables
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              Clear Cache
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              Export Data
            </Button>
            <Button variant="destructive" className="w-full">
              Reset System
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (activeView === "users") return renderUserManagement()
  if (activeView === "settings") return renderSettings()
  // Security and Reports views are deprecated in quick actions
  if (activeView === "database") return renderDatabase()

  return (
    <div className="space-y-6">
      {/* Alert Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alert Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Type:</strong> {selectedAlert.type}
                </div>
                <div>
                  <strong>Message:</strong> {selectedAlert.message}
                </div>
                <div>
                  <strong>Severity:</strong> {getSeverityBadge(selectedAlert.severity)}
                </div>
                <div>
                  <strong>Time:</strong> {selectedAlert.time}
                </div>
                <Button className="w-full" onClick={() => setSelectedAlert(null)}>
                  Mark as Resolved
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">System Administration</h1>
        <p className="text-muted-foreground">{user.name} • System Administrator</p>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat, index) => (
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
            <CardTitle className="text-sm">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={handleManageUsers}>
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={() => (window.location.href = "/dashboard/settings")}>Settings</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Database Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={handleDatabase}>Database</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Analytics & Reports</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={() => (window.location.href = "/dashboard/analytics")}>Analytics</Button>
            <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={() => (window.location.href = "/dashboard/reports")}>Reports</Button>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts (live) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-secondary" />
            Recent System Logs
          </CardTitle>
          <CardDescription>Last 10 actions recorded by the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground">{log.entity_type} #{log.entity_id}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">user {log.user_id}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Labs and components overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Labs and Components
          </CardTitle>
          <CardDescription>Items and quantities per lab (from inventory)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labComponents.map((lab) => (
              <div key={lab.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{lab.name} ({lab.code})</p>
                  <p className="text-sm text-muted-foreground">{lab.items} items • {lab.total_quantity} total units</p>
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
            <Shield className="h-5 w-5 text-muted-foreground" />
            Recent System Activities
          </CardTitle>
          <CardDescription>Latest administrative actions and system changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="text-sm">{activity.activity}</p>
                  <p className="text-xs text-muted-foreground">
                    By {activity.user} • {activity.time}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
