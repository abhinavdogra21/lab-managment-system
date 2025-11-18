"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Check, X, ArrowLeft, User, Building, CheckCircle2, XCircle, AlertCircle, Users, CheckCircle, Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RequestItem {
  id: number
  student_name: string
  student_email: string
  requester_role: string
  lab_name: string
  lab_names?: string // For multi-lab: "Computer Lab1, Computer Lab2, Computer Lab 3"
  is_multi_lab?: boolean | number
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  requested_by: number
  faculty_supervisor_id: number | null
  faculty_name?: string
  faculty_salutation?: string
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  timeline?: any[]
  multi_lab_approvals?: Array<{
    lab_id: number
    lab_name: string
    lab_code: string
    status: string
    lab_staff_approved_by?: number
    lab_staff_approved_at?: string
    lab_staff_name?: string
    hod_approved_by?: number
    hod_approved_at?: string
    hod_name?: string
    responsible_person_name?: string
    responsible_person_email?: string
  }>
}

export default function LabStaffApprovePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [pendingItems, setPendingItems] = useState<RequestItem[]>([])
  const [approvedItems, setApprovedItems] = useState<RequestItem[]>([])
  const [rejectedItems, setRejectedItems] = useState<RequestItem[]>([])
  const [activeTab, setActiveTab] = useState('pending')
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Memoized remarks change handler to prevent re-renders
  const handleRemarksChange = useCallback((requestId: number, value: string) => {
    setRemarks(prev => ({ ...prev, [requestId]: value }))
  }, [])

  const loadAllLabRequests = async () => {
    setLoading(true)
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/lab-staff/requests?status=pending_lab_staff', { cache: 'no-store' }),
        fetch('/api/lab-staff/requests?status=approved', { cache: 'no-store' }),
        fetch('/api/lab-staff/requests?status=rejected', { cache: 'no-store' })
      ])

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingItems(data.requests || [])
      } else {
        setPendingItems([])
      }

      if (approvedRes.ok) {
        const data = await approvedRes.json()
        setApprovedItems(data.requests || [])
      } else {
        setApprovedItems([])
      }

      if (rejectedRes.ok) {
        const data = await rejectedRes.json()
        setRejectedItems(data.requests || [])
      } else {
        setRejectedItems([])
      }
    } catch (error) {
      console.error("Failed to load lab requests:", error)
      setPendingItems([])
      setApprovedItems([])
      setRejectedItems([])
    } finally {
      setLoading(false)
    }
  }

  // Filter function for search
  const filterItems = (items: RequestItem[]) => {
    if (!searchTerm.trim()) return items
    
    const searchLower = searchTerm.toLowerCase()
    return items.filter(item => 
      item.student_email.toLowerCase().includes(searchLower) ||
      item.student_name.toLowerCase().includes(searchLower) ||
      (item.faculty_name && item.faculty_name.toLowerCase().includes(searchLower)) ||
      item.id.toString().includes(searchLower) ||
      item.lab_name.toLowerCase().includes(searchLower) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchLower))
    )
  }

  const handleAction = async (requestId: number, action: 'approve' | 'reject', overrideRemarks?: string) => {
    // Prevent double-click: if already processing this request, ignore
    if (actionLoading === requestId) {
      return
    }
    
    const requestRemarks = typeof overrideRemarks === 'string'
      ? overrideRemarks.trim()
      : remarks[requestId]?.trim()
    
    if (action === 'reject' && !requestRemarks) {
      alert('⚠️ Remarks Required\n\nPlease provide remarks before rejecting the request.\n\nRemarks help explain the reason for rejection to the requester.')
      return
    }

    try {
      setActionLoading(requestId)
      const res = await fetch(`/api/lab-staff/requests/${requestId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          remarks: requestRemarks || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        const successMessage = action === 'approve' 
          ? '✓ Lab booking request recommended successfully! The request has been forwarded to HOD/Lab Coordinator for final approval.'
          : '✓ Lab booking request rejected successfully. The requester has been notified with your remarks.'
        setSuccessDialog({ open: true, message: successMessage })

        // Clear remarks for this request
        setRemarks(prev => {
          const newRemarks = { ...prev }
          delete newRemarks[requestId]
          return newRemarks
        })

        // Refresh all data and switch tab
        await loadAllLabRequests()
        setActiveTab(action === 'approve' ? 'approved' : 'rejected')
      } else {
        // Robust error parsing to avoid JSON parse crash on HTML/text responses
        let message = "Failed to process request"
        try {
          const error = await res.json()
          message = error?.error || error?.message || message
        } catch {
          try {
            const text = await res.text()
            if (text) message = text.slice(0, 200)
          } catch {}
        }
        toast({
          title: "Error",
          description: message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to process action:", error)
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const toggleTimeline = (itemId: number) => {
    setShowTimeline(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const getStatusBadge = (status: string, item?: RequestItem) => {
    switch (status) {
      case 'pending_lab_staff':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending Lab Staff Approval</Badge>
      case 'pending_hod':
        const approvalLabel = item?.highest_approval_authority === 'lab_coordinator' 
          ? 'Lab Coordinator' 
          : 'HOD'
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending {approvalLabel} Approval</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const TimelineView = ({ item }: { item: RequestItem }) => {
    // Only student bookings have 5 steps (where requested_by != faculty_supervisor_id)
    // Faculty and TnP bookings have 4 steps (they book for themselves)
    const isStudentBooking = item.faculty_supervisor_id && item.requested_by !== item.faculty_supervisor_id
    
    // Dynamic approval authority label
    const approvalAuthorityLabel = item.highest_approval_authority === 'lab_coordinator' 
      ? 'Lab Coordinator Review' 
      : 'HOD Review'
    
    const allSteps = isStudentBooking ? [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Review', status: getStepStatus(item, 'Faculty Review'), icon: User },
      { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
      { name: approvalAuthorityLabel, status: getStepStatus(item, approvalAuthorityLabel), icon: Building },
      { name: 'Approved', status: getFinalApprovalStatus(item), icon: CheckCircle }
    ] : [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
      { name: approvalAuthorityLabel, status: getStepStatus(item, approvalAuthorityLabel), icon: Building },
      { name: 'Approved', status: getFinalApprovalStatus(item), icon: CheckCircle }
    ]

    return (
      <div className="space-y-4">
        {/* Horizontal Timeline */}
        <div className="px-2">
          <div className="flex items-center justify-between relative">
            {/* Timeline line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
            
            {/* Timeline steps */}
            {allSteps.map((step, index) => {
              let stepDate = null
              if (step.name === 'Submitted') {
                stepDate = item.booking_date
              } else if (step.name === 'Faculty Review' && step.status === 'completed') {
                stepDate = item.booking_date // Faculty approval date
              } else if (step.name === 'Lab Staff Review' && step.status === 'completed') {
                stepDate = item.booking_date // Lab staff approval date
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
                    
                    {/* Multi-lab progress counter */}
                    {(item.is_multi_lab === 1 || item.is_multi_lab === true) && item.multi_lab_approvals && (
                      <>
                        {step.name === 'Lab Staff Review' && (
                          <p className="text-xs text-blue-600 font-medium">
                            {item.multi_lab_approvals.filter(a => a.lab_staff_approved_at).length}/{item.multi_lab_approvals.length}
                          </p>
                        )}
                        {(step.name === 'HOD Review' || step.name === 'Lab Coordinator Review') && (
                          <p className="text-xs text-blue-600 font-medium">
                            {item.multi_lab_approvals.filter(a => a.hod_approved_at).length}/{item.multi_lab_approvals.length}
                          </p>
                        )}
                      </>
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
                  {stepDate && (
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {formatDate(stepDate)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Remarks section */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Timeline Remarks:</h4>
            {item.faculty_remarks && (
              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                <span className="font-medium">Faculty Approval:</span> {item.faculty_remarks}
              </div>
            )}
            {item.lab_staff_remarks && (
              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                <span className="font-medium">Lab Staff Approval:</span> {item.lab_staff_remarks}
              </div>
            )}
            {item.hod_remarks && (
              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                <span className="font-medium">HOD Approval:</span> {item.hod_remarks}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Helper function to determine step status with proper flow logic
  const getStepStatus = (item: RequestItem, stepName: string) => {
    // If request is rejected, determine which step caused the rejection
    if (item.status === 'rejected') {
      if (stepName === 'Faculty Review') {
        // Faculty rejected if no lab_staff_approved_at
        if (!item.lab_staff_approved_at) {
          return 'rejected'
        }
        return 'completed' // Faculty approved, rejection happened later
      }
      if (stepName === 'Lab Staff Review') {
        // Lab staff rejected if lab_staff_approved_at exists (they took action)
        if (item.lab_staff_approved_at) {
          return 'rejected'
        }
        return 'rejected' // Also rejected due to faculty rejection
      }
      if (stepName === 'HOD Review' || stepName === 'Lab Coordinator Review') {
        // HOD/Coordinator rejected if lab staff had approved
        if (item.lab_staff_approved_at) {
          return 'rejected'
        }
        return 'rejected' // Also rejected due to earlier rejection
      }
      return 'rejected'
    }
    
    // Status-based checking first (prioritized over timeline data)
    if (stepName === 'Faculty Review') {
      if (item.status === 'pending_faculty') return 'pending'
      if (['pending_lab_staff', 'pending_hod', 'approved'].includes(item.status)) return 'completed'
    }
    if (stepName === 'Lab Staff Review') {
      // For multi-lab: check if ALL lab staff have approved
      if ((item.is_multi_lab === 1 || item.is_multi_lab === true) && item.multi_lab_approvals) {
        const totalLabs = item.multi_lab_approvals.length
        const approvedLabs = item.multi_lab_approvals.filter(a => a.lab_staff_approved_at).length
        
        if (approvedLabs === totalLabs) {
          return 'completed' // All lab staff approved
        } else if (approvedLabs > 0) {
          return 'pending' // Some approved, some pending
        } else {
          return item.status === 'pending_lab_staff' ? 'pending' : 'waiting'
        }
      }
      
      // For single-lab bookings
      if (item.status === 'pending_lab_staff') return 'pending'
      if (['pending_hod', 'approved'].includes(item.status)) return 'completed'
      if (item.status === 'pending_faculty') return 'waiting'
    }
    // Handle both "HOD Review" and "Lab Coordinator Review"
    if (stepName === 'HOD Review' || stepName === 'Lab Coordinator Review') {
      if (item.status === 'pending_hod') return 'pending'
      if (item.status === 'approved') return 'completed'
      if (['pending_faculty', 'pending_lab_staff'].includes(item.status)) return 'waiting'
    }
    
    return 'waiting'
  }

  const getFinalApprovalStatus = (item: RequestItem) => {
    if (item.status === 'approved') return 'completed'
    if (item.status === 'rejected') return 'rejected'
    return 'waiting'
  }

  const RequestCard = React.memo(({ item, showActions = false }: { item: RequestItem, showActions?: boolean }) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    const getCurrentRemark = () => {
      return textareaRef.current?.value || ''
    }

    const handleApprove = () => {
      const currentRemark = getCurrentRemark()
      handleAction(item.id, 'approve', currentRemark)
    }

    const handleReject = () => {
      const currentRemark = getCurrentRemark()
      handleAction(item.id, 'reject', currentRemark)
    }

    return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header - Lab and Student Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">
              {(item.is_multi_lab === 1 || item.is_multi_lab === true) ? item.lab_names : item.lab_name}
            </span>
            {(item.is_multi_lab === 1 || item.is_multi_lab === true) && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                Multi-Lab
              </Badge>
            )}
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-600">{item.student_name}</span>
          </div>
          {getStatusBadge(item.status, item)}
        </div>

        {/* Booking Details - Compact */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.booking_date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
          </div>
        </div>

        {/* Purpose - Compact */}
        <div className="text-xs">
          <span className="font-medium text-gray-700">Purpose: </span>
          <span className="text-gray-600">{item.purpose}</span>
        </div>

        {/* Faculty Approval - Compact - Only show for student requests */}
        {item.faculty_name && item.requester_role === 'student' && (
          <div className="bg-green-50 p-2 rounded text-xs">
            <span className="font-medium text-green-800">Faculty: </span>
            <span className="text-green-700">
              {item.faculty_salutation ? `${item.faculty_salutation.charAt(0).toUpperCase() + item.faculty_salutation.slice(1)}. ` : ''}{item.faculty_name}
            </span>
            {item.faculty_remarks && (
              <div className="text-green-600 mt-1 italic">"{item.faculty_remarks}"</div>
            )}
          </div>
        )}

        {/* Timeline - Show only when toggled */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleTimeline(item.id)}
            className="h-6 text-xs px-2"
          >
            <Clock className="h-3 w-3 mr-1" />
            {showTimeline[item.id] ? 'Hide Timeline' : 'View Timeline'}
          </Button>
          
          {showTimeline[item.id] && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs font-medium text-gray-700 mb-2">Request Timeline</div>
              <TimelineView item={item} />
            </div>
          )}
        </div>

        {/* Individual Lab Approval Status for Multi-Lab */}
        {(item.is_multi_lab === 1 || item.is_multi_lab === true) && item.multi_lab_approvals && item.multi_lab_approvals.length > 0 && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
            <h4 className="text-xs font-medium text-blue-900">Individual Lab Approval Status</h4>
            {item.multi_lab_approvals.map((approval) => {
              let displayStatus = 'Pending Lab Staff'
              let badgeVariant: "secondary" | "destructive" | "default" = "secondary"
              
              if (approval.status === 'approved') {
                displayStatus = 'Approved'
                badgeVariant = "default"
              } else if (approval.status === 'rejected') {
                displayStatus = 'Rejected'
                badgeVariant = "destructive"
              } else if (approval.status === 'approved_by_lab_staff') {
                displayStatus = item.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD'
                badgeVariant = "secondary"
              }
              
              return (
                <div key={approval.lab_id} className="bg-white p-2 rounded border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{approval.lab_name}</span>
                    <Badge variant={badgeVariant} className="text-xs">
                      {displayStatus}
                    </Badge>
                  </div>
                  {/* Responsible Person */}
                  {approval.responsible_person_name && (
                    <div className="text-xs text-blue-700">
                      <p className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsible: {approval.responsible_person_name}
                      </p>
                      {approval.responsible_person_email && (
                        <p className="ml-4">{approval.responsible_person_email}</p>
                      )}
                    </div>
                  )}
                  {approval.status === 'pending' && (
                    <p className="text-xs text-gray-600">Awaiting Lab Staff approval</p>
                  )}
                  {approval.lab_staff_approved_at && (
                    <p className="text-xs text-green-700">
                      Lab Staff: {approval.lab_staff_name} - {formatDate(approval.lab_staff_approved_at)}
                    </p>
                  )}
                  {approval.hod_approved_at && (
                    <p className="text-xs text-purple-700">
                      HOD: {approval.hod_name} - {formatDate(approval.hod_approved_at)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Single Lab Approval Status */}
        {!(item.is_multi_lab === 1 || item.is_multi_lab === true) && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h4 className="text-xs font-medium text-blue-900 mb-2">Lab Approval Status</h4>
            {(() => {
              // EXACT SAME status determination logic as multi-lab
              let displayStatus = 'Pending Lab Staff'
              let badgeVariant: "secondary" | "destructive" | "default" = "secondary"
              
              if (item.status === 'approved') {
                displayStatus = 'Approved'
                badgeVariant = "default"
              } else if (item.status === 'rejected') {
                displayStatus = 'Rejected'
                badgeVariant = "destructive"
              } else if (item.status === 'pending_hod' || item.status === 'pending_lab_coordinator') {
                displayStatus = item.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD'
                badgeVariant = "secondary"
              } else if (item.status === 'pending_lab_staff') {
                displayStatus = 'Pending Lab Staff'
                badgeVariant = "secondary"
              }
              
              return (
                <div className="bg-white p-2 rounded border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{item.lab_name}</span>
                    <Badge variant={badgeVariant} className="text-xs">
                      {displayStatus}
                    </Badge>
                  </div>
                  {/* Responsible Person */}
                  {item.responsible_person_name && (
                    <div className="text-xs text-blue-700">
                      <p className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsible: {item.responsible_person_name}
                      </p>
                      {item.responsible_person_email && (
                        <p className="ml-4">{item.responsible_person_email}</p>
                      )}
                    </div>
                  )}
                  {item.status === 'pending_lab_staff' && (
                    <p className="text-xs text-gray-600">Awaiting Lab Staff approval</p>
                  )}
                  {item.timeline?.find((t: any) => t.step_name === 'Lab Staff Approval')?.completed_at && (
                    <p className="text-xs text-green-700">
                      Lab Staff: {item.timeline.find((t: any) => t.step_name === 'Lab Staff Approval')?.user_name} - {formatDate(item.timeline.find((t: any) => t.step_name === 'Lab Staff Approval')?.completed_at)}
                    </p>
                  )}
                  {item.timeline?.find((t: any) => t.step_name === 'HOD Approval')?.completed_at && (
                    <p className="text-xs text-purple-700">
                      HOD: {item.timeline.find((t: any) => t.step_name === 'HOD Approval')?.user_name} - {formatDate(item.timeline.find((t: any) => t.step_name === 'HOD Approval')?.completed_at)}
                    </p>
                  )}
                  {item.timeline?.find((t: any) => t.step_name === 'Lab Coordinator Approval')?.completed_at && (
                    <p className="text-xs text-purple-700">
                      Lab Coordinator: {item.timeline.find((t: any) => t.step_name === 'Lab Coordinator Approval')?.user_name} - {formatDate(item.timeline.find((t: any) => t.step_name === 'Lab Coordinator Approval')?.completed_at)}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Remarks Section - Show for all items */}
        {(item.faculty_remarks || item.lab_staff_remarks || item.hod_remarks) && (
          <div className="space-y-1">
            {item.faculty_remarks && (
              <div className="bg-green-50 p-2 rounded text-xs">
                <span className="font-medium text-green-800">Faculty: </span>
                <span className="text-green-600 italic">"{item.faculty_remarks}"</span>
              </div>
            )}
            {item.lab_staff_remarks && (
              <div className="bg-blue-50 p-2 rounded text-xs">
                <span className="font-medium text-blue-800">Lab Staff: </span>
                <span className="text-blue-600 italic">"{item.lab_staff_remarks}"</span>
              </div>
            )}
            {item.hod_remarks && (
              <div className="bg-purple-50 p-2 rounded text-xs">
                <span className="font-medium text-purple-800">HOD: </span>
                <span className="text-purple-600 italic">"{item.hod_remarks}"</span>
              </div>
            )}
          </div>
        )}

        {/* Old Remarks Section - Keep for backward compatibility but hide if already shown above */}
        {false && (item.lab_staff_remarks || item.hod_remarks) && (
          <div className="space-y-1">
            {item.lab_staff_remarks && (
              <div className="bg-blue-50 p-2 rounded text-xs">
                <span className="font-medium text-blue-800">Lab Staff: </span>
                <span className="text-blue-600 italic">"{item.lab_staff_remarks}"</span>
              </div>
            )}
            {item.hod_remarks && (
              <div className="bg-purple-50 p-2 rounded text-xs">
                <span className="font-medium text-purple-800">HOD: </span>
                <span className="text-purple-600 italic">"{item.hod_remarks}"</span>
              </div>
            )}
          </div>
        )}

        {/* Action Section for Pending Requests */}
        {showActions && (
          <div className="space-y-2 pt-2 border-t">
            <textarea
              ref={textareaRef}
              placeholder="Add your remarks (optional for approval, required for rejection)..."
              defaultValue={remarks[item.id] || ''}
              className="min-h-[60px] text-xs w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={actionLoading === item.id}
                className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
              >
                {actionLoading === item.id ? (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Recommend
                  </>
                )}
              </Button>

              <Button
                onClick={handleReject}
                disabled={actionLoading === item.id}
                variant="destructive"
                className="flex-1 h-8 text-xs"
              >
                {actionLoading === item.id ? (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    )
  })

  useEffect(() => {
    loadAllLabRequests()
  }, [])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/lab-staff/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Review Lab Requests</h1>
          <p className="text-xs text-muted-foreground">
            {activeTab === 'pending' ? 
              `${pendingItems.length} requests pending your approval` :
              `${approvedItems.length} approved requests`
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student email, faculty name, or request ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 max-w-md h-8">
          <TabsTrigger value="pending" className="flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            Pending
            {filterItems(pendingItems).length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-800 animate-pulse">{filterItems(pendingItems).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Approved
            {filterItems(approvedItems).length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-800">{filterItems(approvedItems).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs">
            <XCircle className="h-3 w-3" />
            Rejected
            {filterItems(rejectedItems).length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{filterItems(rejectedItems).length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading pending requests...</p>
              </div>
            </div>
          ) : filterItems(pendingItems).length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {searchTerm ? 'No matching requests' : 'No pending requests'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'All lab requests have been processed.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filterItems(pendingItems).map((item) => (
                <RequestCard key={item.id} item={item} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Requests Tab */}
        <TabsContent value="approved" className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading approved requests...</p>
              </div>
            </div>
          ) : filterItems(approvedItems).length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {searchTerm ? 'No matching requests' : 'No approved requests'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'No lab requests have been approved yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filterItems(approvedItems).map((item) => (
                <RequestCard key={item.id} item={item} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Requests Tab */}
        <TabsContent value="rejected" className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading rejected requests...</p>
              </div>
            </div>
          ) : filterItems(rejectedItems).length === 0 ? (
            <div className="text-center py-6">
              <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {searchTerm ? 'No matching requests' : 'No rejected requests'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'No requests have been rejected.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filterItems(rejectedItems).map((item) => (
                <RequestCard key={item.id} item={item} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Success!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {successDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setSuccessDialog({ open: false, message: '' })} className="w-24">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}