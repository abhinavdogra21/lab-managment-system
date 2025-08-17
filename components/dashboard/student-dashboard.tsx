"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Calendar, Clock, AlertCircle, X } from "lucide-react"
import { useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface StudentDashboardProps {
  user: User
}

/**
 * StudentDashboard Component
 *
 * Dashboard for students with:
 * - Quick actions (request items, view bookings)
 * - Recent requests status
 * - Upcoming deadlines
 * - Activity summary
 */
export function StudentDashboard({ user }: StudentDashboardProps) {
  const [activeView, setActiveView] = useState<string>("dashboard")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showNewRequestForm, setShowNewRequestForm] = useState(false)

  const recentRequests = [
    {
      id: "1",
      item: "Arduino Uno Kit",
      status: "approved",
      requestDate: "2024-01-15",
      dueDate: "2024-01-22",
      supervisor: "Dr. Smith",
    },
    {
      id: "2",
      item: "Raspberry Pi 4",
      status: "pending",
      requestDate: "2024-01-16",
      supervisor: "Prof. Johnson",
    },
    {
      id: "3",
      item: "Oscilloscope",
      status: "faculty-review",
      requestDate: "2024-01-14",
      supervisor: "Dr. Brown",
    },
  ]

  const upcomingDeadlines = [
    { item: "Arduino Uno Kit", dueDate: "2024-01-22", daysLeft: 3 },
    { item: "Multimeter", dueDate: "2024-01-25", daysLeft: 6 },
  ]

  const mockBookings = [
    {
      id: "1",
      lab: "CP1",
      date: "2024-01-22",
      time: "10:00 AM - 12:00 PM",
      purpose: "Database Lab",
      status: "confirmed",
    },
    {
      id: "2",
      lab: "CP2",
      date: "2024-01-25",
      time: "2:00 PM - 4:00 PM",
      purpose: "Web Development",
      status: "pending",
    },
  ]

  const mockHistory = [
    { id: "1", item: "Arduino Kit", date: "2024-01-10", status: "returned", supervisor: "Dr. Smith" },
    { id: "2", item: "Raspberry Pi", date: "2024-01-05", status: "returned", supervisor: "Prof. Johnson" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "faculty-review":
        return <Badge className="bg-blue-100 text-blue-800">Faculty Review</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleNewRequest = () => {
    setShowNewRequestForm(true)
  }

  const handleViewBookings = () => {
    setActiveView("bookings")
  }

  const handleViewHistory = () => {
    setActiveView("history")
  }

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request)
  }

  const handleBackToDashboard = () => {
    setActiveView("dashboard")
    setSelectedRequest(null)
    setShowNewRequestForm(false)
  }

  const renderNewRequestForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">New Item Request</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Item Category</label>
            <select className="w-full mt-1 p-2 border rounded">
              <option>Arduino Kits</option>
              <option>Raspberry Pi</option>
              <option>Sensors</option>
              <option>Breadboards</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Purpose</label>
            <textarea
              className="w-full mt-1 p-2 border rounded"
              placeholder="Describe your project purpose..."
            ></textarea>
          </div>
          <div>
            <label className="text-sm font-medium">Duration (days)</label>
            <input className="w-full mt-1 p-2 border rounded" type="number" defaultValue="7" />
          </div>
          <Button className="w-full">Submit Request</Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderBookings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Lab Bookings</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <div className="space-y-3">
        {mockBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {booking.lab} - {booking.purpose}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.date} • {booking.time}
                  </p>
                </div>
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>{booking.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Request History</h2>
        <Button onClick={handleBackToDashboard} variant="outline">
          Back
        </Button>
      </div>
      <div className="space-y-3">
        {mockHistory.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {item.date} • Supervisor: {item.supervisor}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">{item.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  if (showNewRequestForm) return renderNewRequestForm()
  if (activeView === "bookings") return renderBookings()
  if (activeView === "history") return renderHistory()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Welcome back, {user.name}!</h1>
        <p className="text-muted-foreground">
          {user.department} Department • Student ID: {user.email.split("@")[0]}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleNewRequest}>
              New Request
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleViewBookings}>
              View Bookings
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">History</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleViewHistory}>
              View History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Track the status of your item requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{request.item}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested on {new Date(request.requestDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Supervisor: {request.supervisor}</p>
                  {request.dueDate && (
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(request.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(request.status)}
                  <div className="mt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(request)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-secondary" />
            Upcoming Deadlines
          </CardTitle>
          <CardDescription>Items that need to be returned soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{deadline.item}</p>
                  <p className="text-sm text-muted-foreground">
                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={deadline.daysLeft <= 3 ? "destructive" : "secondary"}>
                    {deadline.daysLeft} days left
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal for request details */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Item:</strong> {selectedRequest.item}
                </div>
                <div>
                  <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <strong>Supervisor:</strong> {selectedRequest.supervisor}
                </div>
                <div>
                  <strong>Request Date:</strong> {selectedRequest.requestDate}
                </div>
                {selectedRequest.dueDate && (
                  <div>
                    <strong>Due Date:</strong> {selectedRequest.dueDate}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
