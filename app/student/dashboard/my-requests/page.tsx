"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Users, Building, Eye, Calendar, ArrowRight } from "lucide-react"

interface TimelineStep {
  step_name: string
  step_status: 'pending' | 'completed' | 'rejected' | 'skipped'
  completed_at: string | null
  completed_by: number | null
  remarks: string | null
  user_name?: string
}

interface BookingWithTimeline {
  id: number
  lab_name: string
  faculty_name: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  created_at: string
  timeline: TimelineStep[]
}

export default function MyRequestsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<BookingWithTimeline[]>([])
  const [selectedRequest, setSelectedRequest] = useState<BookingWithTimeline | null>(null)

  useEffect(() => {
    loadMyRequests()
  }, [])

  const loadMyRequests = async () => {
    setLoading(true)
    try {
      // Student id comes from cookie on the server; the param is optional
      const res = await fetch(`/api/student/my-requests-new`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to load requests:", error)
      toast({ title: "Error", description: "Failed to load your requests", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'skipped':
        return <XCircle className="h-5 w-5 text-gray-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepIcon = (stepName: string) => {
    switch (stepName) {
      case 'submitted':
        return <User className="h-4 w-4" />
      case 'faculty_review':
      case 'faculty_approved':
        return <User className="h-4 w-4" />
      case 'staff_review':
      case 'staff_approved':
        return <Users className="h-4 w-4" />
      case 'hod_review':
      case 'hod_approved':
        return <Building className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStepTitle = (stepName: string) => {
    switch (stepName) {
      case 'submitted':
        return 'Request Submitted'
      case 'faculty_review':
        return 'Faculty Review'
      case 'faculty_approved':
        return 'Faculty Approved'
      case 'staff_review':
        return 'Lab Staff Review'
      case 'staff_approved':
        return 'Lab Staff Approved'
      case 'hod_review':
        return 'HOD Review'
      case 'hod_approved':
        return 'HOD Approved'
      case 'rejected':
        return 'Request Rejected'
      default:
        return stepName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'hod_approved':
        return <Badge className="bg-green-600">Fully Approved</Badge>
      case 'staff_approved':
        return <Badge variant="outline">Pending HOD</Badge>
      case 'faculty_approved':
        return <Badge variant="outline">Pending Lab Staff</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending Faculty</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => {
    // Create standard timeline steps for visual consistency
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
          <p><span className="font-medium">Lab:</span> {request.lab_name}</p>
          <p><span className="font-medium">Faculty:</span> {request.faculty_name}</p>
          <p><span className="font-medium">Date:</span> {new Date(request.date).toLocaleDateString()}</p>
          <p><span className="font-medium">Time:</span> {request.start_time} - {request.end_time}</p>
        </div>

        {/* Horizontal Timeline */}
        <div className="px-4">
          <div className="flex items-center justify-between relative">
            {/* Timeline line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
            
            {/* Timeline steps */}
            {allSteps.map((step, index) => {
              // Fix the timeline step matching logic
              let timelineStep = null
              if (step.name === 'Submitted') {
                timelineStep = { completed_at: request.created_at }
              } else {
                timelineStep = request.timeline.find(t => {
                  const stepTitle = getStepTitle(t.step_name)
                  return stepTitle.includes('Faculty') && step.name === 'Faculty Review' ||
                         stepTitle.includes('Lab Staff') && step.name === 'Lab Staff Review' ||
                         stepTitle.includes('HOD') && step.name === 'HOD Review'
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
          {request.timeline.some(t => t.remarks) && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium">Remarks:</h4>
              {request.timeline.filter(t => t.remarks).map((step, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                  <span className="font-medium">{getStepTitle(step.step_name)}:</span> {step.remarks}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Helper function to determine step status with proper flow logic
  const getStepStatus = (request: BookingWithTimeline, stepName: string) => {
    // Find the timeline step for this stage
    const step = request.timeline.find(t => {
      const stepTitle = getStepTitle(t.step_name)
      return stepTitle === stepName
    })
    
    // If this specific step was rejected, return rejected
    if (step?.step_status === 'rejected') return 'rejected'
    
    // Status-based checking (prioritized over timeline data)
    if (stepName === 'Faculty Review') {
      if (request.status === 'pending_faculty') return 'pending'
      if (['pending_lab_staff', 'pending_hod', 'approved'].includes(request.status)) return 'completed'
      if (request.status === 'rejected' && !step) return 'waiting' // Rejected before this step
    }
    if (stepName === 'Lab Staff Review') {
      if (request.status === 'pending_lab_staff') return 'pending'
      if (['pending_hod', 'approved'].includes(request.status)) return 'completed'
      if (request.status === 'pending_faculty') return 'waiting'
      if (request.status === 'rejected' && !step) return 'waiting' // Rejected before this step
    }
    if (stepName === 'HOD Review') {
      if (request.status === 'pending_hod') return 'pending'
      if (request.status === 'approved') return 'completed'
      if (['pending_faculty', 'pending_lab_staff'].includes(request.status)) return 'waiting'
      if (request.status === 'rejected' && !step) return 'waiting' // Rejected before this step
    }
    
    // Check if step was completed in timeline
    if (step?.step_status === 'completed') return 'completed'
    
    return 'waiting'
  }

  // Helper function for final approval status
  const getFinalApprovalStatus = (request: BookingWithTimeline) => {
    if (request.status === 'approved') return 'completed'
    if (request.status === 'rejected') return 'rejected'
    
    // Check if all previous steps are completed
    const allPreviousCompleted = request.timeline.every(step => 
      step.step_status === 'completed'
    )
    
    // Only show as pending if all previous steps are done
    if (allPreviousCompleted && request.status !== 'pending_faculty' && request.status !== 'pending_lab_staff' && request.status !== 'pending_hod') {
      return 'pending'
    }
    
    return 'waiting'
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">My Lab Booking Requests</h1>
        <p className="text-muted-foreground">Track the status of your lab booking requests</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading your requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">No booking requests found</p>
            <p className="text-sm text-muted-foreground">Create your first lab booking request to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{request.lab_name}</h3>
                      {getOverallStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Faculty: {request.faculty_name}</p>
                      <p>Date: {new Date(request.date).toLocaleDateString()}</p>
                      <p>Time: {request.start_time} - {request.end_time}</p>
                      <p>Submitted: {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm mt-2">{request.purpose}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Timeline
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Request Timeline</DialogTitle>
                        </DialogHeader>
                        <TimelineView request={request} />
                      </DialogContent>
                    </Dialog>
                    {/* Withdraw button for pending requests */}
                    {['pending_faculty','pending_lab_staff','pending_hod'].includes(request.status) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          const res = await fetch(`/api/student/booking-requests/${request.id}/withdraw`, { method: 'POST' })
                          if (res.ok) {
                            toast({ title: 'Request withdrawn', description: 'Your booking request has been withdrawn.' })
                            loadMyRequests()
                          } else {
                            toast({ title: 'Error', description: 'Failed to withdraw request', variant: 'destructive' })
                          }
                        }}
                      >
                        Withdraw Request
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
