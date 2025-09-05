"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Users, Building, Eye, Calendar, Plus, BookOpen } from "lucide-react"
import Link from "next/link"

interface BookingRequest {
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
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  rejected_at?: string
  rejection_reason?: string
}

interface TimelineStep {
  step_name: string
  step_status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  completed_by: number | null
  remarks: string | null
  user_name?: string
}

interface BookingWithTimeline extends BookingRequest {
  timeline: TimelineStep[]
}

export default function FacultyBookingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([])
  const [approvedRequests, setApprovedRequests] = useState<BookingRequest[]>([])
  const [rejectedRequests, setRejectedRequests] = useState<BookingRequest[]>([])
  const [myBookings, setMyBookings] = useState<BookingRequest[]>([])

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
        loadAllBookings()
      } catch {}
    }
  }, [])

  const loadAllBookings = async () => {
    setLoading(true)
    try {
      // Load requests under faculty supervision
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/faculty/requests?status=pending_faculty'),
        // Changed: Get all non-pending requests (approved by faculty)
        fetch('/api/faculty/requests?status=all'),
        fetch('/api/faculty/requests?status=rejected')
      ])

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingRequests(data.requests || [])
      }

      if (approvedRes.ok) {
        const data = await approvedRes.json()
        // Filter to get requests that have been approved by this faculty (not pending_faculty)
        const facultyApprovedRequests = (data.requests || []).filter((req: BookingRequest) => 
          req.status !== 'pending_faculty' && req.status !== 'rejected'
        )
        setApprovedRequests(facultyApprovedRequests)
      }

      if (rejectedRes.ok) {
        const data = await rejectedRes.json()
        setRejectedRequests(data.requests || [])
      }

      // For now, set empty array for my bookings - we'll implement this later
      setMyBookings([])

    } catch (error) {
      console.error("Failed to load bookings:", error)
      toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId: number, action: 'approve' | 'reject', remarks?: string) => {
    setActionLoading(requestId)
    try {
      const res = await fetch(`/api/faculty/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks })
      })

      if (res.ok) {
        toast({ title: "Success", description: `Request ${action}d successfully` })
        loadAllBookings() // Reload data
      } else {
        const error = await res.json()
        toast({ title: "Error", description: error.error || "Action failed", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process request", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_faculty':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline">Pending Lab Staff</Badge>
      case 'pending_hod':
        return <Badge variant="outline">Pending HOD</Badge>
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => {
    const allSteps = [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Review', status: getStepStatus(request, 'Faculty Review'), icon: User },
      { name: 'Lab Staff Review', status: getStepStatus(request, 'Lab Staff Review'), icon: Users },
      { name: 'HOD Review', status: getStepStatus(request, 'HOD Review'), icon: Building },
      { name: 'Approved', status: getFinalApprovalStatus(request), icon: CheckCircle }
    ]

    return (
      <div className="space-y-6">
        {/* Request Details */}
        <div className="text-sm space-y-1 p-4 bg-gray-50 rounded-lg">
          <p><span className="font-medium">Student:</span> {request.student_name}</p>
          <p><span className="font-medium">Lab:</span> {request.lab_name}</p>
          <p><span className="font-medium">Date:</span> {new Date(request.booking_date).toLocaleDateString()}</p>
          <p><span className="font-medium">Time:</span> {request.start_time} - {request.end_time}</p>
          <p><span className="font-medium">Purpose:</span> {request.purpose}</p>
        </div>

        {/* Horizontal Timeline */}
        <div className="px-4">
          <div className="flex items-center justify-between relative">
            {/* Timeline line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
            
            {/* Timeline steps */}
            {allSteps.map((step, index) => {
              let timelineStep = null
              if (step.name === 'Submitted') {
                timelineStep = { completed_at: request.created_at }
              } else {
                // Match timeline data to display steps
                timelineStep = request.timeline?.find(t => {
                  return (
                    (step.name === 'Faculty Review' && t.step_name === 'Faculty Approval') ||
                    (step.name === 'Lab Staff Review' && t.step_name === 'Lab Staff Approval') ||
                    (step.name === 'HOD Review' && t.step_name === 'HOD Approval')
                  )
                })
              }
              
              return (
                <div key={index} className="flex flex-col items-center space-y-2 relative z-10">
                  {/* Step circle */}
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                    step.status === 'completed' 
                      ? 'bg-green-100 border-green-300' 
                      : step.status === 'pending'
                      ? 'bg-blue-100 border-blue-300'
                      : step.status === 'rejected'
                      ? 'bg-red-100 border-red-300'
                      : 'bg-white border-gray-300'
                  }`}>
                    <step.icon className={`h-5 w-5 ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'pending' ? 'text-blue-600' :
                      step.status === 'rejected' ? 'text-red-600' :
                      'text-gray-400'
                    }`} />
                  </div>
                  
                  {/* Step label */}
                  <div className="text-center">
                    <p className="text-xs font-medium">{step.name}</p>
                    <p className={`text-xs ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'pending' ? 'text-blue-600' :
                      step.status === 'rejected' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {step.status === 'completed' ? 'Done' :
                       step.status === 'pending' ? 'In Progress' :
                       step.status === 'rejected' ? 'Rejected' :
                       'Waiting'}
                    </p>
                  </div>
                  
                  {/* Show completion details */}
                  {timelineStep?.completed_at && (
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {new Date(timelineStep.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Remarks section */}
          {(request.faculty_remarks || request.lab_staff_remarks || request.hod_remarks || request.rejection_reason) && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium">Remarks:</h4>
              {request.faculty_remarks && (
                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                  <span className="font-medium">Faculty:</span> {request.faculty_remarks}
                </div>
              )}
              {request.lab_staff_remarks && (
                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-green-300">
                  <span className="font-medium">Lab Staff:</span> {request.lab_staff_remarks}
                </div>
              )}
              {request.hod_remarks && (
                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-purple-300">
                  <span className="font-medium">HOD:</span> {request.hod_remarks}
                </div>
              )}
              {request.rejection_reason && (
                <div className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-300">
                  <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getStepStatus = (request: BookingWithTimeline, stepName: string) => {
    if (request.status === 'rejected') return 'rejected'
    
    // For Faculty Review - if the status has moved beyond pending_faculty, it means faculty approved
    if (stepName === 'Faculty Review') {
      if (request.status === 'pending_faculty') return 'pending'
      // If status is pending_lab_staff, pending_hod, or approved, faculty must have approved
      if (['pending_lab_staff', 'pending_hod', 'approved'].includes(request.status)) return 'completed'
    }
    
    // For Lab Staff Review
    if (stepName === 'Lab Staff Review') {
      if (request.status === 'pending_lab_staff') return 'pending'
      if (['pending_hod', 'approved'].includes(request.status)) return 'completed'
      if (request.status === 'pending_faculty') return 'waiting'
    }
    
    // For HOD Review  
    if (stepName === 'HOD Review') {
      if (request.status === 'pending_hod') return 'pending'
      if (request.status === 'approved') return 'completed'
      if (['pending_faculty', 'pending_lab_staff'].includes(request.status)) return 'waiting'
    }
    
    // Check timeline data as secondary verification
    const timelineStep = request.timeline?.find(t => {
      return (
        (stepName === 'Faculty Review' && t.step_name === 'Faculty Approval') ||
        (stepName === 'Lab Staff Review' && t.step_name === 'Lab Staff Approval') ||
        (stepName === 'HOD Review' && t.step_name === 'HOD Approval')
      )
    })
    
    if (timelineStep?.step_status === 'completed') return 'completed'
    if (timelineStep?.step_status === 'pending') return 'pending'
    
    return 'waiting'
  }

  const getFinalApprovalStatus = (request: BookingWithTimeline) => {
    if (request.status === 'approved') return 'completed'
    if (request.status === 'rejected') return 'rejected'
    return 'waiting'
  }

  const getStepTitle = (stepName: string) => {
    switch (stepName) {
      case 'Faculty Approval':
        return 'Faculty Review'
      case 'Lab Staff Approval':
        return 'Lab Staff Review'
      case 'HOD Approval':
        return 'HOD Review'
      case 'faculty_review':
      case 'faculty_approved':
        return 'Faculty Review'
      case 'staff_review':
      case 'staff_approved':
        return 'Lab Staff Review'
      case 'hod_review':
      case 'hod_approved':
        return 'HOD Review'
      default:
        return stepName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faculty Bookings</h1>
          <p className="text-muted-foreground">Manage lab booking requests and your own bookings</p>
        </div>
        <Button asChild>
          <Link href="/student/dashboard/book-lab">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Approval Requests</TabsTrigger>
          <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Pending Approval ({pendingRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{request.lab_name}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Student: {request.student_name}</p>
                            <p>Date: {new Date(request.booking_date).toLocaleDateString()}</p>
                            <p>Time: {request.start_time} - {request.end_time}</p>
                            <p>Submitted: {new Date(request.created_at).toLocaleDateString()}</p>
                          </div>
                          
                          <p className="text-sm mt-2">{request.purpose}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAction(request.id, 'approve')}
                            disabled={actionLoading === request.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAction(request.id, 'reject')}
                            disabled={actionLoading === request.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Timeline
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Request Timeline</DialogTitle>
                              </DialogHeader>
                              <TimelineView request={request as BookingWithTimeline} />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Approved Requests */}
            {approvedRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approved Requests ({approvedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {approvedRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{request.lab_name}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Student: {request.student_name}</p>
                            <p>Date: {new Date(request.booking_date).toLocaleDateString()}</p>
                            <p>Time: {request.start_time} - {request.end_time}</p>
                          </div>
                          
                          <p className="text-sm mt-2">{request.purpose}</p>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Timeline
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Request Timeline</DialogTitle>
                            </DialogHeader>
                            <TimelineView request={request as BookingWithTimeline} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Rejected Requests */}
            {rejectedRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Rejected Requests ({rejectedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rejectedRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{request.lab_name}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Student: {request.student_name}</p>
                            <p>Date: {new Date(request.booking_date).toLocaleDateString()}</p>
                            <p>Time: {request.start_time} - {request.end_time}</p>
                          </div>
                          
                          <p className="text-sm mt-2">{request.purpose}</p>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Timeline
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Request Timeline</DialogTitle>
                            </DialogHeader>
                            <TimelineView request={request as BookingWithTimeline} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {pendingRequests.length === 0 && approvedRequests.length === 0 && rejectedRequests.length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium">No requests found</p>
                  <p className="text-sm text-muted-foreground">No booking requests under your supervision</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-bookings" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">My Bookings</p>
              <p className="text-sm text-muted-foreground mb-4">Feature coming soon - Faculty personal lab bookings</p>
              <Button asChild>
                <Link href="/student/dashboard/book-lab">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Booking
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
