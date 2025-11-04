"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Calendar, Eye, Plus, Package, History as HistoryIcon } from "lucide-react"
import Link from "next/link"

interface PendingRequest {
  id: number
  student_name: string
  student_email: string
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  created_at: string
}

export default function FacultyDashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    if (u) {
      try { 
        const parsed = JSON.parse(u)
        setCurrentUser(parsed)
        if (parsed.role !== 'faculty') {
          window.location.href = "/dashboard"
          return
        }
      } catch {}
    }
    // Load pending requests
    if (u) {
      loadPendingRequests()
      loadStats()
    }
  }, [])

  const loadPendingRequests = async () => {
    try {
      const res = await fetch("/api/faculty/requests?status=pending_faculty")
      if (res.ok) {
        const data = await res.json()
        setPendingRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to load pending requests:", error)
    }
  }

  const loadStats = async () => {
    try {
      // Get all requests for this faculty to calculate stats
      const res = await fetch("/api/faculty/requests?status=all")
      if (res.ok) {
        const data = await res.json()
        const requests = data.requests || []
        
        setStats({
          pending: requests.filter((r: any) => r.status === 'pending_faculty').length,
          approved: requests.filter((r: any) => r.status !== 'pending_faculty' && r.status !== 'rejected').length,
          rejected: requests.filter((r: any) => r.status === 'rejected').length,
          total: requests.length
        })
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
        </div>
        <Button asChild>
          <Link href="/faculty/dashboard/approve">
            <CheckCircle className="h-4 w-4 mr-2" />
            Review Requests
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Approval Requests
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/dashboard/approve">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">No pending requests</p>
              <p className="text-sm">All caught up! No requests waiting for your approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{request.lab_name}</h4>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Pending Review
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Student: {request.student_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.booking_date).toLocaleDateString()} • {request.start_time} - {request.end_time}
                    </p>
                    <p className="text-sm mt-1">{request.purpose}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <Link href="/faculty/dashboard/approve">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {pendingRequests.length > 3 && (
            <div className="mt-4 text-center">
              <Button asChild variant="outline">
                <Link href="/faculty/dashboard/approve">
                  View All Pending Requests ({pendingRequests.length})
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/faculty/dashboard/approve">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review Pending Requests
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/faculty/dashboard/request-components">
                <Plus className="h-4 w-4 mr-2" />
                Request Lab Components
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/faculty/dashboard/my-component-requests">
                <Package className="h-4 w-4 mr-2" />
                My Component Requests
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/faculty/dashboard/bookings">
                <Calendar className="h-4 w-4 mr-2" />
                View My Bookings
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/faculty/dashboard/logs">
                <HistoryIcon className="h-4 w-4 mr-2" />
                View Logs
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Activity tracking coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
