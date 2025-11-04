"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, Users, Building, Eye, Calendar, Loader2 } from "lucide-react"

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
  date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  requested_by: number
  faculty_supervisor_id: number | null
  created_at: string
  timeline: TimelineStep[]
}

export default function TNPMyRequestsPage() {
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
      const res = await fetch(`/api/others/my-requests-timeline`, { cache: 'no-store' })
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

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge variant="default">Approved</Badge>
    } else if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>
    } else if (status.includes('pending')) {
      return <Badge variant="secondary">Pending</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getStepIcon = (stepName: string) => {
    switch (stepName) {
      case 'Lab Staff Approval':
        return <Users className="h-4 w-4" />
      case 'HOD Approval':
        return <Building className="h-4 w-4" />
      case 'Faculty Approval':
        return <Users className="h-4 w-4" />
      case 'Rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Helper to convert approval names to recommendation for TnP bookings
  const getStepDisplayName = (stepName: string) => {
    // For TnP bookings, use "Recommendation" instead of "Approval" for Faculty and Lab Staff
    if (stepName === 'Faculty Approval') {
      return 'Faculty Recommendation'
    }
    if (stepName === 'Lab Staff Approval') {
      return 'Lab Staff Recommendation'
    }
    return stepName
  }

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => {
    // Only student bookings have 5 steps (where requested_by != faculty_supervisor_id)
    // Faculty and TnP bookings have 4 steps (they book for themselves)
    const isStudentBooking = request.faculty_supervisor_id && request.requested_by !== request.faculty_supervisor_id
    
    // For TnP bookings, show "Recommended" instead of "Approval" for Faculty and Lab Staff
    const allSteps = isStudentBooking ? [
      { name: 'Submitted', key: 'submitted', icon: CheckCircle, color: 'green' },
      { name: 'Faculty Recommendation', key: 'faculty', icon: Users, color: 'blue' },
      { name: 'Lab Staff Recommendation', key: 'lab_staff', icon: Users, color: 'blue' },
      { name: 'HOD Approval', key: 'hod', icon: Building, color: 'purple' },
      { name: 'Approved', key: 'approved', icon: CheckCircle, color: 'green' }
    ] : [
      { name: 'Submitted', key: 'submitted', icon: CheckCircle, color: 'green' },
      { name: 'Lab Staff Recommendation', key: 'lab_staff', icon: Users, color: 'blue' },
      { name: 'HOD Approval', key: 'hod', icon: Building, color: 'purple' },
      { name: 'Approved', key: 'approved', icon: CheckCircle, color: 'green' }
    ]

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lab:</span>
            <span className="font-medium">{request.lab_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{new Date(request.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">{request.start_time} - {request.end_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            {getStatusBadge(request.status)}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Purpose</h4>
          <p className="text-sm text-muted-foreground">{request.purpose}</p>
        </div>

        {/* Horizontal Timeline */}
        <div className="space-y-2">
          <h4 className="font-semibold">Approval Progress</h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
            
            {/* Timeline steps */}
            {allSteps.map((step, index) => {
              let timelineStep = null
              if (step.key === 'submitted') {
                timelineStep = { completed_at: request.created_at, step_status: 'completed' }
              } else if (step.key === 'faculty') {
                timelineStep = request.timeline.find(t => t.step_name === 'Faculty Approval')
              } else if (step.key === 'lab_staff') {
                timelineStep = request.timeline.find(t => t.step_name === 'Lab Staff Approval')
              } else if (step.key === 'hod') {
                timelineStep = request.timeline.find(t => t.step_name === 'HOD Approval')
              }

              const isCompleted = timelineStep?.step_status === 'completed'
              const isPending = timelineStep?.step_status === 'pending'
              const isRejected = timelineStep?.step_status === 'rejected'
              
              // If a step is rejected, all subsequent steps should be skipped (not shown as rejected)
              const isAfterRejection = request.timeline.some((t, i) => {
                const stepIndex = request.timeline.findIndex(ts => ts.step_name === timelineStep?.step_name)
                const rejectedIndex = request.timeline.findIndex(ts => ts.step_status === 'rejected')
                return rejectedIndex !== -1 && stepIndex > rejectedIndex
              })

              return (
                <div key={step.key} className="relative flex flex-col items-center" style={{ 
                  width: `${100 / allSteps.length}%`,
                  float: 'left'
                }}>
                  {/* Step circle */}
                  <div className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white
                    ${isCompleted ? 'border-green-500 text-green-500' : ''}
                    ${isPending ? 'border-orange-500 text-orange-500 animate-pulse' : ''}
                    ${isRejected ? 'border-red-500 text-red-500' : ''}
                    ${!isCompleted && !isPending && !isRejected ? 'border-gray-300 text-gray-300' : ''}
                  `}>
                    {isCompleted && <CheckCircle className="h-6 w-6" />}
                    {isPending && <Clock className="h-6 w-6" />}
                    {isRejected && <XCircle className="h-6 w-6" />}
                    {!isCompleted && !isPending && !isRejected && getStepIcon(step.name)}
                  </div>
                  
                  {/* Step label */}
                  <div className="mt-2 text-center">
                    <div className={`text-xs font-medium ${
                      isCompleted || isPending ? 'text-foreground' : 
                      isRejected ? 'text-red-500' : 
                      'text-muted-foreground'
                    }`}>
                      {isRejected ? `Rejected at ${step.name}` : step.name}
                    </div>
                    {timelineStep?.completed_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(timelineStep.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="clear-both" />
          </div>
        </div>

        {/* Remarks section */}
        {request.timeline.some(t => t.remarks) && (
          <div className="space-y-3">
            <h4 className="font-semibold">Remarks</h4>
            {request.timeline.filter(t => t.remarks).map((step, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStepIcon(step.step_name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{getStepDisplayName(step.step_name)}</span>
                        {step.user_name && (
                          <span className="text-xs text-muted-foreground">by {step.user_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.remarks}</p>
                      {step.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(step.completed_at).toLocaleString()}
                        </p>
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Booking Requests</h1>
        <p className="text-muted-foreground">View timeline and status of your lab bookings</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No booking requests found</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({requests.filter(r => r.status.includes('pending')).length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({requests.filter(r => r.status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({requests.filter(r => r.status === 'rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {requests.filter(r => r.status.includes('pending')).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.filter(r => r.status.includes('pending')).map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {requests.filter(r => r.status === 'approved').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No approved requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.filter(r => r.status === 'approved').map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {requests.filter(r => r.status === 'rejected').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rejected requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.filter(r => r.status === 'rejected').map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )

  function RequestCard({ request }: { request: BookingWithTimeline }) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{request.lab_name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(request.date).toLocaleDateString()}
                </span>
                <span>{request.start_time} - {request.end_time}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Timeline
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Booking Request Timeline</DialogTitle>
                  </DialogHeader>
                  {selectedRequest && <TimelineView request={selectedRequest} />}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.purpose}</p>
        </CardContent>
      </Card>
    )
  }
}
