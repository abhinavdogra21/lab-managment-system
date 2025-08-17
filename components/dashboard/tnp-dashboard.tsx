"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Building, TrendingUp, Clock, MapPin, Briefcase } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface TNPDashboardProps {
  user: User
}

/**
 * TNPDashboard Component
 *
 * Dashboard for Training & Placement Cell with:
 * - Placement event management
 * - Lab booking for assessments
 * - Company visit scheduling
 * - Student placement tracking
 */
export function TNPDashboard({ user }: TNPDashboardProps) {
  // Mock data - would come from API
  const placementStats = [
    { label: "Active Companies", value: "45", icon: Briefcase },
    { label: "Scheduled Interviews", value: "128", icon: Calendar },
    { label: "Students Registered", value: "892", icon: Users },
    { label: "Placement Rate", value: "78%", icon: TrendingUp },
  ]

  const upcomingEvents = [
    {
      id: "1",
      company: "TCS",
      type: "Technical Assessment",
      date: "2024-01-20",
      time: "10:00 AM - 2:00 PM",
      lab: "CP1, CP2",
      students: 150,
      status: "confirmed",
    },
    {
      id: "2",
      company: "Infosys",
      type: "Group Discussion",
      date: "2024-01-22",
      time: "9:00 AM - 12:00 PM",
      lab: "Seminar Hall",
      students: 80,
      status: "pending",
    },
    {
      id: "3",
      company: "Microsoft",
      type: "Coding Round",
      date: "2024-01-25",
      time: "2:00 PM - 5:00 PM",
      lab: "CP3, CP4",
      students: 200,
      status: "confirmed",
    },
  ]

  const recentBookings = [
    {
      id: "1",
      purpose: "Amazon Online Assessment",
      lab: "CP1",
      date: "2024-01-18",
      students: 75,
      status: "completed",
    },
    {
      id: "2",
      purpose: "Google Technical Interview",
      lab: "Interview Room 1",
      date: "2024-01-19",
      students: 25,
      status: "completed",
    },
  ]

  const companyVisits = [
    {
      id: "1",
      company: "Adobe",
      purpose: "Campus Recruitment Drive",
      date: "2024-01-28",
      coordinator: "HR Manager",
      status: "scheduled",
    },
    {
      id: "2",
      company: "Flipkart",
      purpose: "Pre-placement Talk",
      date: "2024-02-02",
      coordinator: "Talent Acquisition",
      status: "confirmed",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case "scheduled":
        return <Badge className="bg-purple-100 text-purple-800">Scheduled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Training & Placement Dashboard</h1>
        <p className="text-muted-foreground">{user.name} • T&P Cell Coordinator</p>
      </div>

      {/* Placement Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {placementStats.map((stat, index) => (
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
            <CardTitle className="text-sm">Book Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm">
              Book Now
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Schedule Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              New Event
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Company Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Manage Visits
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

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Placement Events
          </CardTitle>
          <CardDescription>Scheduled assessments and interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{event.company}</p>
                  <p className="text-sm text-muted-foreground">{event.type}</p>
                  <p className="text-sm text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {new Date(event.date).toLocaleDateString()} • {event.time}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {event.lab} • {event.students} students
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(event.status)}
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

      {/* Recent Lab Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-secondary" />
            Recent Lab Bookings
          </CardTitle>
          <CardDescription>Latest lab reservations for placement activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{booking.purpose}</p>
                  <p className="text-sm text-muted-foreground">
                    Lab: {booking.lab} • {new Date(booking.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{booking.students} students participated</p>
                </div>
                <div className="text-right">{getStatusBadge(booking.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            Scheduled Company Visits
          </CardTitle>
          <CardDescription>Upcoming company visits and recruitment drives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companyVisits.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{visit.company}</p>
                  <p className="text-sm text-muted-foreground">{visit.purpose}</p>
                  <p className="text-sm text-muted-foreground">Date: {new Date(visit.date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Coordinator: {visit.coordinator}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(visit.status)}
                  <div className="mt-2">
                    <Button variant="ghost" size="sm">
                      Manage
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
