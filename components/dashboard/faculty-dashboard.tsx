"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, UserCheck, BookOpen, BarChart3, Clock, Users } from "lucide-react"
import { useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface FacultyDashboardProps {
  user: User
}

/**
 * FacultyDashboard Component
 *
 * Dashboard for faculty members with:
 * - Lab booking capabilities
 * - Student request approvals
 * - Upcoming sessions
 * - Department statistics
 */
export function FacultyDashboard({ user }: FacultyDashboardProps) {
  const [activeView, setActiveView] = useState<string>("dashboard")
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: "1",
      student: "Alice Johnson",
      item: "Arduino Uno Kit",
      requestDate: "2024-01-16",
      purpose: "IoT Project Development",
    },
    {
      id: "2",
      student: "Bob Smith",
      item: "Raspberry Pi 4",
      requestDate: "2024-01-15",
      purpose: "Machine Learning Assignment",
    },
  ])

  const upcomingSessions = [
    {
      id: "1",
      lab: "CP1",
      subject: "Data Structures Lab",
      time: "10:00 AM - 12:00 PM",
      date: "2024-01-18",
      students: 45,
    },
    {
      id: "2",
      lab: "CP2",
      subject: "Database Lab",
      time: "2:00 PM - 4:00 PM",
      date: "2024-01-19",
      students: 38,
    },
  ]

  const stats = [
    { label: "Active Bookings", value: "12", icon: Calendar },
    { label: "Pending Approvals", value: "8", icon: UserCheck },
    { label: "Students Supervised", value: "156", icon: Users },
    { label: "This Month Sessions", value: "24", icon: BookOpen },
  ]

  const handleBookLab = () => {
    setActiveView("book-lab")
  }

  const handleReviewRequests = () => {
    setActiveView("review-requests")
  }

  const handleCreateReport = () => {
    setActiveView("create-report")
  }

  const handleApproveRequest = (requestId: string) => {
    setPendingApprovals((prev) => prev.filter((req) => req.id !== requestId))
    alert("Request approved successfully!")
  }

  const handleRejectRequest = (requestId: string) => {
    setPendingApprovals((prev) => prev.filter((req) => req.id !== requestId))
    alert("Request rejected.")
  }

  const handleBackToDashboard = () => {
    setActiveView("dashboard")
  }

  const renderBookLab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Book Laboratory</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Laboratory</label>
            <select className="w-full mt-1 p-2 border rounded">
              <option>CP1 - Computer Lab 1</option>
              <option>CP2 - Computer Lab 2</option>
              <option>CP3 - Computer Lab 3</option>
              <option>CMLBDA - Machine Learning Lab</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <input className="w-full mt-1 p-2 border rounded" type="date" />
          </div>
          <div>
            <label className="text-sm font-medium">Time Slot</label>
            <select className="w-full mt-1 p-2 border rounded">
              <option>9:00 AM - 11:00 AM</option>
              <option>11:00 AM - 1:00 PM</option>
              <option>2:00 PM - 4:00 PM</option>
              <option>4:00 PM - 6:00 PM</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Subject/Purpose</label>
            <input className="w-full mt-1 p-2 border rounded" placeholder="e.g., Database Lab Session" />
          </div>
          <Button className="w-full">Submit Booking Request</Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderReviewRequests = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review Student Requests</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <div className="space-y-4">
        {pendingApprovals.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{request.student}</p>
                  <p className="text-sm text-muted-foreground">Requesting: {request.item}</p>
                  <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                  <p className="text-sm text-muted-foreground">Date: {request.requestDate}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApproveRequest(request.id)}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingApprovals.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No pending requests to review.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  const renderCreateReport = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generate Activity Report</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Report Type</label>
            <select className="w-full mt-1 p-2 border rounded">
              <option>Lab Session Report</option>
              <option>Student Supervision Report</option>
              <option>Equipment Usage Report</option>
              <option>Monthly Activity Summary</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date Range</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input className="p-2 border rounded" type="date" placeholder="From" />
              <input className="p-2 border rounded" type="date" placeholder="To" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Format</label>
            <select className="w-full mt-1 p-2 border rounded">
              <option>PDF Report</option>
              <option>Excel Spreadsheet</option>
            </select>
          </div>
          <Button className="w-full">Generate Report</Button>
        </CardContent>
      </Card>
    </div>
  )

  if (activeView === "book-lab") return renderBookLab()
  if (activeView === "review-requests") return renderReviewRequests()
  if (activeView === "create-report") return renderCreateReport()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Welcome, Prof. {user.name}</h1>
        <p className="text-muted-foreground">{user.department} Department • Faculty Dashboard</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Book Lab
            </CardTitle>
            <CardDescription>Schedule a new lab session</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleBookLab}>
              Book Now
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Approve Requests
            </CardTitle>
            <CardDescription>Review student item requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleReviewRequests}>
              Review ({pendingApprovals.length})
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>Create activity reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleCreateReport}>
              Create Report
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
          <CardDescription>Student requests waiting for your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingApprovals.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{request.student}</p>
                  <p className="text-sm text-muted-foreground">Requesting: {request.item}</p>
                  <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {new Date(request.requestDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApproveRequest(request.id)}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>Your scheduled lab sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{session.subject}</p>
                  <p className="text-sm text-muted-foreground">Lab: {session.lab}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()} • {session.time}
                  </p>
                  <p className="text-sm text-muted-foreground">{session.students} students enrolled</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">Confirmed</Badge>
                  <div className="mt-2">
                    <Button variant="ghost" size="sm">
                      View Details
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
