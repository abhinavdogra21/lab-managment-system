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
  step_status: 'pending' | 'completed' | 'skipped'
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
      // TODO: Get student ID from auth context
      const studentId = 1 // Temporary hardcode
      const res = await fetch(`/api/student/my-requests-new?student_id=${studentId}`)
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

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-1">
        <p><span className="font-medium">Lab:</span> {request.lab_name}</p>
        <p><span className="font-medium">Faculty:</span> {request.faculty_name}</p>
        <p><span className="font-medium">Date:</span> {new Date(request.date).toLocaleDateString()}</p>
        <p><span className="font-medium">Time:</span> {request.start_time} - {request.end_time}</p>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {request.timeline.map((step, index) => (
            <div key={index} className="relative flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                step.step_status === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : step.step_status === 'pending'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {getStepIcon(step.step_name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium">{getStepTitle(step.step_name)}</h4>
                  {getStatusIcon(step.step_status)}
                </div>
                
                {step.completed_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed on {new Date(step.completed_at).toLocaleString()}
                  </p>
                )}
                
                {step.user_name && (
                  <p className="text-xs text-muted-foreground">
                    by {step.user_name}
                  </p>
                )}
                
                {step.remarks && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="font-medium">Remarks:</span> {step.remarks}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

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
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Timeline
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Request Approval Timeline</DialogTitle>
                        </DialogHeader>
                        <TimelineView request={request} />
                      </DialogContent>
                    </Dialog>
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
