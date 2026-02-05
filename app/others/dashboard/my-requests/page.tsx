/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, Users, Building, Calendar, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  is_multi_lab?: number | boolean
  responsible_person_name?: string
  responsible_person_email?: string
  multi_lab_approvals?: Array<{
    lab_id: number
    lab_name: string
    lab_code: string
    status: string
    lab_staff_approved_at: string | null
    lab_staff_approved_by: number | null
    lab_staff_name: string | null
    lab_staff_salutation: string | null
    lab_staff_remarks: string | null
    hod_approved_at: string | null
    hod_approved_by: number | null
    hod_name: string | null
    hod_salutation: string | null
    hod_remarks: string | null
    responsible_person_name?: string
    responsible_person_email?: string
    highest_approval_authority?: 'hod' | 'lab_coordinator'
    final_approver_role?: 'hod' | 'lab_coordinator' | null
  }>
  timeline: TimelineStep[]
}

export default function TNPMyRequestsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<BookingWithTimeline[]>([])
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})

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

  const formatTime = (time: string) => {
    // Convert HH:MM:SS or HH:MM to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const m = minutes || '00'
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${m} ${period}`
  }

  const handleWithdraw = async (requestId: number) => {
    try {
      const res = await fetch(`/api/others/booking-requests?id=${requestId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Booking request withdrawn successfully',
        })
        loadMyRequests()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to withdraw booking',
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw booking',
        variant: 'destructive',
      })
    }
  }

  const canWithdraw = (status: string) => {
    return status === 'pending_faculty' || status === 'pending_lab_staff' || status === 'pending_hod'
  }

  const handleWithdrawLab = async (requestId: number, labId: number, labName: string) => {
    try {
      const res = await fetch(`/api/others/booking-requests/${requestId}/withdraw-lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_id: labId })
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: 'Success',
          description: `${labName} withdrawn successfully`,
        })
        loadMyRequests()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to withdraw lab',
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw lab',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (request: BookingWithTimeline) => {
    const status = request.status
    
    // For multi-lab bookings, check if only some labs are withdrawn
    if ((request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals) {
      const allStatuses = request.multi_lab_approvals.map(a => a.status)
      const withdrawnCount = allStatuses.filter(s => s === 'withdrawn').length
      const rejectedCount = allStatuses.filter(s => s === 'rejected').length
      const activeCount = allStatuses.length - withdrawnCount - rejectedCount
      
      // If some labs withdrawn but others active, show "Partially Withdrawn"
      if (withdrawnCount > 0 && activeCount > 0) {
        return <Badge className="bg-orange-600">Partially Withdrawn ({activeCount} active)</Badge>
      }
      
      // If all labs withdrawn/rejected, show "Withdrawn"
      if (activeCount === 0) {
        return <Badge variant="outline">Withdrawn</Badge>
      }
    }
    
    if (status === 'approved') {
      return <Badge variant="default">Approved</Badge>
    } else if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>
    } else if (status === 'withdrawn') {
      return <Badge variant="outline">Withdrawn</Badge>
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
    // Others-initiated bookings don't have Faculty Approval step
    // Use "Recommendation" for Lab Staff, "Approval" only for HOD/Lab Coordinator
    const finalApprovalLabel = getAuthorityLabel(request) === 'Lab Coordinator'
      ? 'Lab Coordinator Approval' 
      : 'HOD Approval'
    
    const steps = [
      { key: 'Lab Staff Recommendation', apiKey: 'Lab Staff Approval', icon: Users },
      { key: finalApprovalLabel, apiKey: getAuthorityLabel(request) === 'Lab Coordinator' ? 'Lab Coordinator Approval' : 'HOD Approval', icon: Building },
    ]
    
    const findStep = (key: string) => request.timeline.find(t => t.step_name.includes(key))
    const iconForStatus = (s?: string) => s === 'completed' ? 'completed' : s === 'pending' ? 'pending' : s === 'rejected' ? 'rejected' : 'waiting'
    
    // Format name with salutation helper
    const formatName = (name: string | null, salutation: string | null) => {
      if (!name) return null
      if (!salutation || salutation === 'none') return name
      const salutationMap: Record<string, string> = {
        'prof': 'Prof.',
        'dr': 'Dr.',
        'mr': 'Mr.',
        'mrs': 'Mrs.'
      }
      return `${salutationMap[salutation] || ''} ${name}`
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lab:</span>
            <span className="font-medium">{request.lab_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(request.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">{formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            {getStatusBadge(request)}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Purpose</h4>
          <p className="text-sm text-muted-foreground">{request.purpose}</p>
        </div>

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
                let displayStatus = 'Pending Lab Staff'
                let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline'
                
                if (approval.status === 'approved') {
                  displayStatus = '✓ Fully Approved'
                  badgeVariant = 'default'
                } else if (approval.status === 'approved_by_lab_staff') {
                  displayStatus = request.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD'
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
                } else if (approval.status === 'withdrawn') {
                  displayStatus = 'Withdrawn'
                  badgeVariant = 'outline'
                }
                
                const canWithdrawLab = ['pending_faculty','pending_lab_staff','pending_hod','approved'].includes(request.status) && 
                                       approval.status !== 'rejected' && 
                                       approval.status !== 'withdrawn'
                
                return (
                  <div key={approval.lab_id} className="p-2 bg-white rounded border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{approval.lab_name}</span>
                        <Badge variant={badgeVariant} className="text-xs">{displayStatus}</Badge>
                      </div>
                      {canWithdrawLab && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Withdraw
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Withdraw {approval.lab_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to withdraw {approval.lab_name} from this multi-lab booking? 
                                Other labs will remain active. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleWithdrawLab(request.id, approval.lab_id, approval.lab_name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Withdraw Lab
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {approval.responsible_person_name && (
                      <div className="text-xs text-blue-700 mb-1">
                        <p><span className="font-medium">Contact:</span> {approval.responsible_person_name}{approval.responsible_person_email && ` (${approval.responsible_person_email})`}</p>
                      </div>
                    )}
                    <div className="text-xs space-y-1 text-muted-foreground">
                      {approval.lab_staff_approved_at && (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Lab Staff: {formatName(approval.lab_staff_name, approval.lab_staff_salutation)} - {formatDate(approval.lab_staff_approved_at)}
                        </p>
                      )}
                      {approval.hod_approved_at && (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {getAuthorityLabel(request)}: {formatName(approval.hod_name, approval.hod_salutation)} - {formatDate(approval.hod_approved_at)}
                        </p>
                      )}
                      {!approval.lab_staff_approved_at && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-yellow-600" />
                          Awaiting Lab Staff approval
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Single Lab Approval Status */}
        {!(request.is_multi_lab === 1 || request.is_multi_lab === true) && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Building className="h-3 w-3" />
              Selected Labs:
            </h4>
            <div className="space-y-2">
              {(() => {
                // EXACT SAME status determination logic as multi-lab
                let displayStatus = 'Pending Lab Staff'
                let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline'
                
                const labStaffApproved = request.timeline.find(t => t.step_name === 'Lab Staff Approval')
                const hodApproved = request.timeline.find(t => t.step_name === 'HOD Approval')
                const labCoordApproved = request.timeline.find(t => t.step_name === 'Lab Coordinator Approval')
                
                if (request.status === 'approved') {
                  displayStatus = '✓ Fully Approved'
                  badgeVariant = 'default'
                } else if (labStaffApproved?.completed_at && request.status === 'pending_hod') {
                  displayStatus = request.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD'
                  badgeVariant = 'secondary'
                } else if (request.status === 'pending_lab_staff') {
                  displayStatus = 'Pending Lab Staff'
                  badgeVariant = 'outline'
                } else if (request.status === 'pending_hod' && !labStaffApproved?.completed_at) {
                  displayStatus = 'Pending Lab Staff'
                  badgeVariant = 'outline'
                } else if (request.status === 'rejected') {
                  displayStatus = 'Rejected'
                  badgeVariant = 'destructive'
                }
                
                return (
                  <div className="p-2 bg-white rounded border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{request.lab_name}</span>
                      <Badge variant={badgeVariant} className="text-xs">{displayStatus}</Badge>
                    </div>
                    {request.responsible_person_name && (
                      <div className="text-xs text-blue-700 mb-1">
                        <p><span className="font-medium">Contact:</span> {request.responsible_person_name}{request.responsible_person_email && ` (${request.responsible_person_email})`}</p>
                      </div>
                    )}
                    <div className="text-xs space-y-1 text-muted-foreground">
                      {labStaffApproved?.completed_at && (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Lab Staff: {labStaffApproved.user_name} - {formatDate(labStaffApproved.completed_at)}
                        </p>
                      )}
                      {hodApproved?.completed_at && (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          HOD: {hodApproved.user_name} - {formatDate(hodApproved.completed_at)}
                        </p>
                      )}
                      {labCoordApproved?.completed_at && (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Lab Coordinator: {labCoordApproved.user_name} - {formatDate(labCoordApproved.completed_at)}
                        </p>
                      )}
                      {!labStaffApproved?.completed_at && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-yellow-600" />
                          Awaiting Lab Staff approval
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Horizontal Timeline */}
        <div className="space-y-2">
          <h4 className="font-semibold">Approval Progress</h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
            
            {/* Timeline steps */}
            <div className="flex items-center justify-between relative">
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
              {steps.map((s, idx) => {
                const st = findStep(s.apiKey)
                const state = iconForStatus(st?.step_status)
                const Icon = s.icon
                return (
                  <div key={idx} className="flex flex-col items-center space-y-2 relative z-10" style={{ 
                    width: `${100 / steps.length}%`
                  }}>
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                      state === 'completed' ? 'bg-green-100 border-green-300' :
                      state === 'pending' ? 'bg-blue-100 border-blue-300' :
                      state === 'rejected' ? 'bg-red-100 border-red-300' :
                      'bg-white border-gray-300'
                    }`}>
                      {state === 'completed' && <CheckCircle className="h-6 w-6 text-green-600" />}
                      {state === 'pending' && <Clock className="h-6 w-6 text-blue-600" />}
                      {state === 'rejected' && <XCircle className="h-6 w-6 text-red-600" />}
                      {!['completed', 'pending', 'rejected'].includes(state) && <Icon className="h-5 w-5 text-gray-400" />}
                    </div>
                    
                    {/* Step label */}
                    <div className="text-center">
                      <p className="text-xs font-medium">{s.key}</p>
                      {/* Show progress for multi-lab Lab Staff step */}
                      {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && s.key === 'Lab Staff Recommendation' && (
                        <p className="text-xs text-blue-600 font-medium">
                          {request.multi_lab_approvals.filter(a => a.lab_staff_approved_at).length}/{request.multi_lab_approvals.length}
                        </p>
                      )}
                      {/* Show progress for multi-lab HOD step */}
                      {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && 
                       (s.key === 'HOD Approval' || s.key === 'Lab Coordinator Approval') && (
                        <p className="text-xs text-blue-600 font-medium">
                          {request.multi_lab_approvals.filter(a => a.hod_approved_at).length}/{request.multi_lab_approvals.length}
                        </p>
                      )}
                      <p className={`text-xs ${
                        state === 'completed' ? 'text-green-600' :
                        state === 'pending' ? 'text-blue-600' :
                        state === 'rejected' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {state === 'completed' ? 'Done' : state === 'pending' ? 'In Progress' : state === 'rejected' ? 'Rejected' : 'Waiting'}
                      </p>
                    </div>
                    {st?.completed_at && (
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {formatDate(st.completed_at)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Remarks section */}
        <div className="space-y-3">
          {/* Show overall timeline remarks (for single lab or overall comments) */}
          {request.timeline.some(t => t.remarks) && (
            <>
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
            </>
          )}
          
          {/* Show multi-lab remarks */}
          {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && 
           request.multi_lab_approvals.some(a => a.lab_staff_remarks || a.hod_remarks) && (
            <>
              <h4 className="font-semibold">Lab-Specific Remarks</h4>
              {request.multi_lab_approvals.map((approval) => (
                <div key={approval.lab_id}>
                  {(approval.lab_staff_remarks || approval.hod_remarks) && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {approval.lab_name}
                      </p>
                      {approval.lab_staff_remarks && (
                        <Card className="bg-muted/50 mb-1">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start gap-2">
                              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">Lab Staff:</span>
                                <p className="text-sm text-muted-foreground">{approval.lab_staff_remarks}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {approval.hod_remarks && (
                        <Card className="bg-muted/50">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start gap-2">
                              <Building className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">{getAuthorityLabel(request)}:</span>
                                <p className="text-sm text-muted-foreground">{approval.hod_remarks}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
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
    const isTimelineVisible = showTimeline[request.id] || false

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{request.lab_name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(request.date)}
                </span>
                <span>{formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              {canWithdraw(request.status) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <XCircle className="h-4 w-4 mr-1" />
                      Withdraw
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Withdraw Booking Request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to withdraw this booking request? This action cannot be undone.
                        All relevant parties will be notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleWithdraw(request.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Withdraw Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTimeline(prev => ({ ...prev, [request.id]: !prev[request.id] }))}
              >
                {isTimelineVisible ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Timeline
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    View Timeline
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.purpose}</p>
          
          {isTimelineVisible && (
            <div className="mt-6 pt-6 border-t">
              <TimelineView request={request} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
}
