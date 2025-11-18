"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Users, Building, Eye, Calendar, ArrowRight, Filter, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react"

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
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  is_multi_lab?: boolean | number
  multi_lab_approvals?: Array<{
    lab_id: number
    lab_name: string
    lab_code: string
    status: string
    lab_staff_approved_at: string | null
    lab_staff_approved_by: number | null
    lab_staff_name: string | null
    lab_staff_remarks: string | null
    hod_approved_at: string | null
    hod_approved_by: number | null
    hod_name: string | null
    hod_remarks: string | null
    responsible_person_name?: string
    responsible_person_email?: string
  }>
  timeline: TimelineStep[]
}

export default function MyRequestsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<BookingWithTimeline[]>([])
  const [selectedRequest, setSelectedRequest] = useState<BookingWithTimeline | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})

  const toggleTimeline = (id: number) => {
    setShowTimeline(prev => ({ ...prev, [id]: !prev[id] }))
  }

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
      case 'Faculty Approval':
        return 'Faculty Recommendation'
      case 'faculty_review':
        return 'Faculty Recommendation'
      case 'faculty_approved':
        return 'Faculty Recommendation'
      case 'Lab Staff Approval':
        return 'Lab Staff Recommendation'
      case 'staff_review':
        return 'Lab Staff Recommendation'
      case 'staff_approved':
        return 'Lab Staff Recommendation'
      case 'HOD Approval':
        return 'HOD Approval'
      case 'hod_review':
        return 'HOD Approval'
      case 'hod_approved':
        return 'HOD Approval'
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
    // Determine the approval authority label based on department settings
    const approvalAuthorityLabel = request.highest_approval_authority === 'lab_coordinator' 
      ? 'Lab Coordinator Approval' 
      : 'HOD Approval'
    
    // Create standard timeline steps for visual consistency
    // Use "Recommendation" for Faculty and Lab Staff, "Approval" only for HOD/Lab Coordinator
    const allSteps = [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Recommendation', status: getStepStatus(request, 'Faculty Recommendation'), icon: User },
      { name: 'Lab Staff Recommendation', status: getStepStatus(request, 'Lab Staff Recommendation'), icon: Users },
      { name: approvalAuthorityLabel, status: getStepStatus(request, approvalAuthorityLabel), icon: Building },
      { name: 'Approved', status: getFinalApprovalStatus(request), icon: CheckCircle }
    ]

    return (
      <div className="space-y-4">
        {/* View Timeline Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => toggleTimeline(request.id)}
        >
          {showTimeline[request.id] ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide Timeline
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              View Timeline
            </>
          )}
        </Button>

        {/* Horizontal Timeline - Collapsible */}
        {showTimeline[request.id] && (
        <div className="space-y-3">
          {/* Multi-Lab Approval Status */}
          {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && request.multi_lab_approvals.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                <Building className="h-3 w-3" />
                Individual Lab Approval Status
              </h4>
              <div className="space-y-2">
                {request.multi_lab_approvals.map((approval) => {
                  // Determine display status
                  let displayStatus = 'Pending Faculty'
                  let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline'
                  
                  if (request.status === 'pending_faculty') {
                    displayStatus = 'Pending Faculty'
                    badgeVariant = 'outline'
                  } else if (approval.status === 'approved') {
                    displayStatus = '✓ Fully Approved'
                    badgeVariant = 'default'
                  } else if (approval.status === 'approved_by_lab_staff') {
                    displayStatus = 'Pending HOD'
                    badgeVariant = 'secondary'
                  } else if (approval.status === 'pending' && request.status === 'pending_lab_staff') {
                    displayStatus = 'Pending Lab Staff'
                    badgeVariant = 'outline'
                  } else if (approval.status === 'pending' && request.status === 'pending_hod') {
                    displayStatus = 'Pending Lab Staff'
                    badgeVariant = 'outline'
                  } else if (approval.status === 'rejected') {
                    displayStatus = 'Rejected'
                    badgeVariant = 'destructive'
                  }
                  
                  return (
                    <div key={approval.lab_id} className="p-2 bg-white rounded border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{approval.lab_name}</span>
                        <Badge variant={badgeVariant} className="text-xs">{displayStatus}</Badge>
                      </div>
                      {approval.responsible_person_name && (
                        <div className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium">Contact:</span> {approval.responsible_person_name}
                          {approval.responsible_person_email && ` (${approval.responsible_person_email})`}
                        </div>
                      )}
                      <div className="text-xs space-y-1 text-muted-foreground">
                        {approval.lab_staff_approved_at && (
                          <p className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Lab Staff: {approval.lab_staff_name} - {new Date(approval.lab_staff_approved_at).toLocaleDateString()}
                          </p>
                        )}
                        {approval.hod_approved_at && (
                          <p className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            HOD: {approval.hod_name} - {new Date(approval.hod_approved_at).toLocaleDateString()}
                          </p>
                        )}
                        {!approval.lab_staff_approved_at && request.status !== 'pending_faculty' && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-yellow-600" />
                            Awaiting Lab Staff approval
                          </p>
                        )}
                        {request.status === 'pending_faculty' && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-yellow-600" />
                            Awaiting Faculty recommendation
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
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
                  return stepTitle.includes('Faculty') && step.name === 'Faculty Recommendation' ||
                         stepTitle.includes('Lab Staff') && step.name === 'Lab Staff Recommendation' ||
                         (stepTitle.includes('HOD') || stepTitle.includes('Lab Coordinator')) && 
                         (step.name === 'HOD Approval' || step.name === 'Lab Coordinator Approval')
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
                    {/* Show progress for multi-lab Lab Staff step */}
                    {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && step.name === 'Lab Staff Recommendation' && (
                      <p className="text-xs text-blue-600 font-medium">
                        {request.multi_lab_approvals.filter(a => a.lab_staff_approved_at).length}/{request.multi_lab_approvals.length}
                      </p>
                    )}
                    {/* Show progress for multi-lab HOD step */}
                    {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && 
                     (step.name === 'HOD Approval' || step.name === 'Lab Coordinator Approval') && (
                      <p className="text-xs text-blue-600 font-medium">
                        {request.multi_lab_approvals.filter(a => a.hod_approved_at).length}/{request.multi_lab_approvals.length}
                      </p>
                    )}
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
          <div className="mt-6 space-y-2">
            {/* Show overall timeline remarks (for single lab or overall comments) */}
            {request.timeline.some(t => t.remarks) && (
              <>
                <h4 className="text-sm font-medium">Remarks:</h4>
                {request.timeline.filter(t => t.remarks).map((step, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                    <span className="font-medium">{getStepTitle(step.step_name)}:</span> {step.remarks}
                  </div>
                ))}
              </>
            )}
            
            {/* Show multi-lab remarks */}
            {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && 
             request.multi_lab_approvals.some(a => a.lab_staff_remarks || a.hod_remarks) && (
              <>
                <h4 className="text-sm font-medium">Lab-Specific Remarks:</h4>
                {request.multi_lab_approvals.map((approval) => (
                  <div key={approval.lab_id}>
                    {(approval.lab_staff_remarks || approval.hod_remarks) && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {approval.lab_name}
                        </p>
                        {approval.lab_staff_remarks && (
                          <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300 mb-1">
                            <span className="font-medium">Lab Staff:</span> {approval.lab_staff_remarks}
                          </div>
                        )}
                        {approval.hod_remarks && (
                          <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                            <span className="font-medium">HOD:</span> {approval.hod_remarks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        </div>
        )}
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
    if (stepName === 'Faculty Recommendation') {
      if (request.status === 'pending_faculty') return 'pending'
      if (['pending_lab_staff', 'pending_hod', 'approved'].includes(request.status)) return 'completed'
      if (request.status === 'rejected' && !step) return 'waiting' // Rejected before this step
    }
    if (stepName === 'Lab Staff Recommendation') {
      if (request.status === 'pending_lab_staff') return 'pending'
      if (['pending_hod', 'approved'].includes(request.status)) return 'completed'
      if (request.status === 'pending_faculty') return 'waiting'
      if (request.status === 'rejected' && !step) return 'waiting' // Rejected before this step
    }
    // Handle both "HOD Approval" and "Lab Coordinator Approval"
    if (stepName === 'HOD Approval' || stepName === 'Lab Coordinator Approval') {
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

  // Filter requests based on selected status
  const filteredRequests = requests.filter(request => {
    if (statusFilter === "all") return true
    
    if (statusFilter === "pending") {
      return request.status.startsWith('pending_')
    }
    
    return request.status === statusFilter
  })

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Lab Booking Requests</h1>
          <p className="text-muted-foreground">Track the status of your lab booking requests</p>
        </div>
        
        {/* Status Filter */}
        <div className="w-[180px]">
          <Label htmlFor="status-filter" className="sr-only">Filter by Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading your requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">
              {requests.length === 0 ? "No booking requests found" : "No requests match the selected filter"}
            </p>
            <p className="text-sm text-muted-foreground">
              {requests.length === 0 ? "Create your first lab booking request to get started" : "Try changing the filter to see other requests"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
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
                
                {/* Inline Timeline Section */}
                <div className="mt-4 pt-4 border-t">
                  <TimelineView request={request} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
