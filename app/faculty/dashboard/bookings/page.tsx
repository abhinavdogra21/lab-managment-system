/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Users, Building, Eye, Calendar, ChevronDown, ChevronUp, Filter, AlertCircle, Loader2 } from "lucide-react"
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
  step_status: 'pending' | 'completed' | 'skipped' | 'rejected' | 'waiting'
  completed_at: string | null
  completed_by: number | null
  remarks: string | null
  user_name?: string | null
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
  final_approver_role?: 'hod' | 'lab_coordinator' | null
  is_multi_lab?: number | boolean
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
  }>
  timeline: TimelineStep[]
}

export default function FacultyBookingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<BookingWithTimeline[]>([])
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [withdrawing, setWithdrawing] = useState<number | null>(null)

  useEffect(() => { loadMyRequests() }, [])

  const toggleTimeline = (requestId: number) => {
    setShowTimeline(prev => ({ ...prev, [requestId]: !prev[requestId] }))
  }

  const loadMyRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/faculty/my-requests-new`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load your bookings', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load your bookings', variant: 'destructive' })
    } finally { setLoading(false) }
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
      console.log('Withdrawing booking:', requestId)
      setWithdrawing(requestId)
      const res = await fetch(`/api/faculty/booking-requests?id=${requestId}`, {
        method: 'DELETE',
      })

      console.log('Withdraw response status:', res.status)
      
      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Booking request withdrawn successfully',
        })
        loadMyRequests()
      } else {
        const data = await res.json()
        console.error('Withdraw error:', data)
        toast({
          title: 'Error',
          description: data.error || 'Failed to withdraw booking',
          variant: 'destructive',
        })
      }
    } catch (e) {
      console.error('Withdraw exception:', e)
      toast({
        title: 'Error',
        description: 'Failed to withdraw booking',
        variant: 'destructive',
      })
    } finally {
      setWithdrawing(null)
    }
  }

  const canWithdraw = (status: string, booking?: any) => {
    // Allow withdrawal if status is withdrawable
    const isWithdrawableStatus = status === 'pending_faculty' || status === 'pending_lab_staff' || status === 'pending_hod' || status === 'approved'
    
    if (!isWithdrawableStatus) return false
    
    // For multi-lab bookings, check if at least one lab is still active (not withdrawn/rejected)
    if (booking && (booking.is_multi_lab === 1 || booking.is_multi_lab === true)) {
      // If we have multi_lab_approvals data, check if any labs are active
      if (booking.multi_lab_approvals && booking.multi_lab_approvals.length > 0) {
        const activeLabsExist = booking.multi_lab_approvals.some((a: any) => 
          a.status !== 'withdrawn' && a.status !== 'rejected'
        )
        // Only hide withdraw button if we know for sure all labs are withdrawn/rejected
        if (!activeLabsExist) return false
      }
      // If no multi_lab_approvals data or has active labs, allow withdrawal
    }
    
    return true
  }

  const handleWithdrawLab = async (requestId: number, labId: number, labName: string) => {
    try {
      setWithdrawing(requestId)
      const res = await fetch(`/api/faculty/booking-requests/${requestId}/withdraw-lab`, {
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
    } finally {
      setWithdrawing(null)
    }
  }

  const getOverallStatusBadge = (request: BookingWithTimeline) => {
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
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'pending_hod':
        // Check if this request has highest_approval_authority set to lab_coordinator
        return <Badge variant="outline">{request.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD'}</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline">Pending Lab Staff</Badge>
      case 'pending_faculty':
        return <Badge variant="secondary">Pending Faculty</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'withdrawn':
        return <Badge variant="outline">Withdrawn</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Helper function to determine the correct authority label for completed approvals
  const getAuthorityLabel = (request: BookingWithTimeline): 'Lab Coordinator' | 'HOD' => {
    // Check timeline data first to see what actually happened
    const hasLabCoordApproval = request.timeline.some(t => t.step_name === 'Lab Coordinator Approval' && t.step_status === 'completed')
    const hasHODApproval = request.timeline.some(t => t.step_name === 'HOD Approval' && t.step_status === 'completed')
    
    if (hasLabCoordApproval) return 'Lab Coordinator'
    if (hasHODApproval) return 'HOD'
    
    // For pending requests, use current setting
    return request.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
  }

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => {
    // Faculty-initiated bookings skip the Faculty Approval step entirely
    const hasFacultyStep = request.status === 'pending_faculty' || request.timeline.some(t => t.step_name.includes('Faculty Approval'))
    
    // Determine the correct label for final approval based on actual timeline data
    // Check if Lab Coordinator or HOD actually approved in the timeline
    const hasLabCoordApproval = request.timeline.some(t => t.step_name === 'Lab Coordinator Approval' && t.step_status === 'completed')
    const hasHODApproval = request.timeline.some(t => t.step_name === 'HOD Approval' && t.step_status === 'completed')
    
    let finalApprovalLabel: string
    if (hasLabCoordApproval) {
      finalApprovalLabel = 'Lab Coordinator Approval'
    } else if (hasHODApproval) {
      finalApprovalLabel = 'HOD Approval'
    } else {
      // For pending requests, use current setting
      finalApprovalLabel = request.highest_approval_authority === 'lab_coordinator' 
        ? 'Lab Coordinator Approval' 
        : 'HOD Approval'
    }
    
    // Use "Recommendation" for Faculty and Lab Staff, "Approval" only for HOD/Lab Coordinator
    const steps = [
      ...(hasFacultyStep ? [{ key: 'Faculty Recommendation', apiKey: 'Faculty Approval', icon: User }] : []),
      { key: 'Lab Staff Recommendation', apiKey: 'Lab Staff Approval', icon: Users },
      { key: finalApprovalLabel, apiKey: 'HOD Approval', icon: Building },
    ]
    const findStep = (key: string) => request.timeline.find(t => t.step_name.includes(key))
    const iconForStatus = (s?: string) => s === 'completed' ? 'completed' : s === 'pending' ? 'pending' : s === 'rejected' ? 'rejected' : 'waiting'

    return (
      <div className="space-y-4">
        {/* Toggle Timeline Button */}
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

        {/* Timeline Content - Collapsible */}
        {showTimeline[request.id] && (
          <div className="space-y-6">
            <div className="text-sm space-y-1 p-4 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Lab:</span> {request.lab_name}</p>
              <p><span className="font-medium">Date:</span> {formatDate(request.date)}</p>
              <p><span className="font-medium">Time:</span> {formatTime(request.start_time)} - {formatTime(request.end_time)}</p>
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
                    
                    const canWithdrawLab = (
                      ['pending_faculty','pending_lab_staff','pending_hod','approved'].includes(request.status) ||
                      ['pending', 'approved_by_lab_staff', 'approved'].includes(approval.status)
                    ) && approval.status !== 'rejected' && approval.status !== 'withdrawn'
                    
                    // Format names with salutations
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
                          {!approval.lab_staff_approved_at && 
                           request.status !== 'pending_faculty' && 
                           approval.status !== 'approved' && 
                           approval.status !== 'rejected' && 
                           approval.status !== 'withdrawn' && (
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
                  Individual Lab Approval Status
                </h4>
                <div className="space-y-2">
                  {(() => {
                    // Determine display status
                    let displayStatus = 'Pending Lab Staff'
                    let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline'
                    
                    const labStaffApproved = request.timeline.find(t => t.step_name === 'Lab Staff Recommendation')
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
                          {!labStaffApproved?.completed_at && request.status !== 'pending_faculty' && request.status !== 'approved' && request.status !== 'rejected' && (
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

            <div className="px-4">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
                {steps.map((s, idx) => {
                  const st = findStep(s.apiKey)
                  const state = iconForStatus(st?.step_status)
                  const Icon = s.icon
                  return (
                    <div key={idx} className="flex flex-col items-center space-y-2 relative z-10">
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        state === 'completed' ? 'bg-green-100 border-green-300' :
                        state === 'pending' ? 'bg-blue-100 border-blue-300' :
                        state === 'rejected' ? 'bg-red-100 border-red-300' :
                        'bg-white border-gray-300'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          state === 'completed' ? 'text-green-600' :
                          state === 'pending' ? 'text-blue-600' :
                          state === 'rejected' ? 'text-red-600' :
                          'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">{s.key}</p>
                        {/* Show progress for multi-lab Lab Staff step */}
                        {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && s.key === 'Lab Staff Recommendation' && (
                          <p className="text-xs text-blue-600 font-medium">
                            {request.multi_lab_approvals.filter(a => a.lab_staff_approved_at).length}/{request.multi_lab_approvals.length}
                          </p>
                        )}
                        {/* Show progress for multi-lab HOD/Lab Coordinator step */}
                        {(request.is_multi_lab === 1 || request.is_multi_lab === true) && request.multi_lab_approvals && (s.key === 'HOD Approval' || s.key === 'Lab Coordinator Approval') && (
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
            
            {/* Remarks section */}
            <div className="mt-6 space-y-2">
              {/* Show overall timeline remarks (for single lab or overall comments) */}
              {request.timeline.some(t => t.remarks) && (
                <>
                  <h4 className="text-sm font-medium">Remarks:</h4>
                  {request.timeline.filter(t => t.remarks).map((step, index) => {
                    // Display the correct label for HOD/Lab Coordinator based on who actually approved
                    const displayStepName = step.step_name.includes('HOD Approval') || step.step_name.includes('Lab Coordinator Approval')
                      ? (getAuthorityLabel(request) === 'Lab Coordinator'
                        ? step.step_name.replace('HOD Approval', 'Lab Coordinator Approval')
                        : step.step_name.replace('Lab Coordinator Approval', 'HOD Approval'))
                      : step.step_name
                    return (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                        <span className="font-medium">{displayStepName}:</span> {step.remarks}
                      </div>
                    )
                  })}
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
                              <span className="font-medium">{getAuthorityLabel(request)}:</span> {approval.hod_remarks}
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
        )}
      </div>
    )
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
          <h1 className="text-xl sm:text-2xl font-bold">My Lab Bookings</h1>
          <p className="text-muted-foreground">View the status of your lab booking requests</p>
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
          <p>Loading your bookings...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">No bookings found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all" ? "Create a lab booking to get started" : `No ${statusFilter} bookings found`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{request.lab_name}</h3>
                      {getOverallStatusBadge(request)}
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                      <p>Date: {formatDate(request.date)}</p>
                      <p>Time: {formatTime(request.start_time)} - {formatTime(request.end_time)}</p>
                      <p>Submitted: {formatDate(request.created_at)}</p>
                    </div>
                    <p className="text-sm mt-2">{request.purpose}</p>
                  </div>
                  
                  {/* Withdraw button for pending requests */}
                  {canWithdraw(request.status, request) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={withdrawing === request.id}
                        >
                          {withdrawing === request.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Withdrawing...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Withdraw
                            </>
                          )}
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
                </div>
                
                {/* Inline Timeline */}
                <TimelineView request={request} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
 
