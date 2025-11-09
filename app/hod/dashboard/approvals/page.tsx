"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Check, X, ArrowLeft, User, Building, CheckCircle2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RequestItem {
  id: number
  student_name: string
  student_email: string
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  requested_by: number
  faculty_supervisor_id: number | null
  faculty_name?: string
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  faculty_approved_at?: string | null
  lab_staff_approved_at?: string | null
  hod_approved_at?: string | null
}

const TimelineView = ({ item, getStepStatus, getFinalApprovalStatus }: { 
  item: RequestItem, 
  getStepStatus: any, 
  getFinalApprovalStatus: any 
}) => {
  // Only student bookings have 5 steps (where requested_by != faculty_supervisor_id)
  // Faculty and TnP bookings have 4 steps (they book for themselves)
  const isStudentBooking = item.faculty_supervisor_id && item.requested_by !== item.faculty_supervisor_id
  
  const allSteps = isStudentBooking ? [
    { name: 'Submitted', status: 'completed', icon: Clock },
    { name: 'Faculty Review', status: getStepStatus(item, 'Faculty Review'), icon: User },
    { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
    { name: 'HOD Review', status: getStepStatus(item, 'HOD Review'), icon: Building },
    { name: 'Approved', status: getFinalApprovalStatus(item), icon: CheckCircle2 }
  ] : [
    { name: 'Submitted', status: 'completed', icon: Clock },
    { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
    { name: 'HOD Review', status: getStepStatus(item, 'HOD Review'), icon: Building },
    { name: 'Approved', status: getFinalApprovalStatus(item), icon: CheckCircle2 }
  ]

  return (
    <div className="space-y-3">
      <div className="px-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
          {allSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center space-y-1 relative z-10">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                step.status === 'completed' ? 'bg-green-100 border-green-300' : 
                step.status === 'pending' ? 'bg-blue-100 border-blue-300' : 
                step.status === 'rejected' ? 'bg-red-100 border-red-300' : 
                'bg-white border-gray-300'
              }`}>
                <step.icon className={`h-4 w-4 ${
                  step.status === 'completed' ? 'text-green-600' : 
                  step.status === 'pending' ? 'text-blue-600' : 
                  step.status === 'rejected' ? 'text-red-600' : 
                  'text-gray-400'
                }`} />
              </div>
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
                   step.status === 'rejected' ? 'Rejected' : 'Waiting'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {item.faculty_remarks && (
            <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
              <span className="font-medium">Faculty:</span> {item.faculty_remarks}
            </div>
          )}
          {item.lab_staff_remarks && (
            <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
              <span className="font-medium">Lab Staff:</span> {item.lab_staff_remarks}
            </div>
          )}
          {item.hod_remarks && (
            <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
              <span className="font-medium">HOD:</span> {item.hod_remarks}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const RequestCard = React.memo(function RequestCardComponent({
  item,
  showActions = false,
  remark,
  showTimelineForItem,
  onRemarksChange,
  onToggleTimeline,
  onAction,
  actionLoading,
  formatDate,
  formatTime,
  getStatusBadge,
  getStepStatus,
  getFinalApprovalStatus
}: any) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const getCurrentRemark = () => {
    return textareaRef.current?.value || ''
  }

  const handleApprove = () => {
    const currentRemark = getCurrentRemark()
    onAction(item.id, 'approve', currentRemark)
  }

  const handleReject = () => {
    const currentRemark = getCurrentRemark()
    onAction(item.id, 'reject', currentRemark)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{item.lab_name}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-600">{item.student_name}</span>
          </div>
          {getStatusBadge(item.status)}
        </div>

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

        <div className="text-xs">
          <span className="font-medium text-gray-700">Purpose: </span>
          <span className="text-gray-600">{item.purpose}</span>
        </div>

        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onToggleTimeline(item.id)} 
            className="h-6 text-xs px-2"
          >
            <Clock className="h-3 w-3 mr-1" />
            {showTimelineForItem ? 'Hide Timeline' : 'View Timeline'}
          </Button>

          {showTimelineForItem && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs font-medium text-gray-700 mb-2">Request Timeline</div>
              <TimelineView item={item} getStepStatus={getStepStatus} getFinalApprovalStatus={getFinalApprovalStatus} />
            </div>
          )}
        </div>

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

        {showActions && (
          <div className="space-y-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg p-3 -m-3 mt-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Your Remarks
              </label>
              <textarea
                ref={textareaRef}
                placeholder="Add your remarks (optional for approval, required for rejection)..."
                defaultValue={remark || ''}
                className="min-h-[80px] w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApprove}
                disabled={actionLoading === item.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 text-sm transition-colors"
              >
                {actionLoading === item.id ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </>
                )}
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading === item.id}
                variant="destructive"
                className="flex-1 font-medium py-2 text-sm transition-colors"
              >
                {actionLoading === item.id ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" /> Reject
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

export default function HODApprovePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [pendingItems, setPendingItems] = useState<RequestItem[]>([])
  const [approvedItems, setApprovedItems] = useState<RequestItem[]>([])
  const [rejectedItems, setRejectedItems] = useState<RequestItem[]>([])
  const [activeTab, setActiveTab] = useState<'pending'|'approved'|'rejected'>('pending')
  const [activeType, setActiveType] = useState<'lab'|'components'>('lab')
  const [search, setSearch] = useState('')
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})

  const handleRemarksChange = useCallback((requestId: number, value: string) => {
    setRemarks(prev => ({ ...prev, [requestId]: value }))
  }, [])

  const filteredPendingItems = useMemo(() => {
    return pendingItems.filter(item =>
      item.student_name.toLowerCase().includes(search.toLowerCase()) ||
      item.student_email.toLowerCase().includes(search.toLowerCase()) ||
      item.lab_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.faculty_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toString().includes(search)
    )
  }, [pendingItems, search])

  const filteredApprovedItems = useMemo(() => {
    return approvedItems.filter(item =>
      item.student_name.toLowerCase().includes(search.toLowerCase()) ||
      item.student_email.toLowerCase().includes(search.toLowerCase()) ||
      item.lab_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.faculty_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toString().includes(search)
    )
  }, [approvedItems, search])

  const filteredRejectedItems = useMemo(() => {
    return rejectedItems.filter(item =>
      item.student_name.toLowerCase().includes(search.toLowerCase()) ||
      item.student_email.toLowerCase().includes(search.toLowerCase()) ||
      item.lab_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.faculty_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toString().includes(search)
    )
  }, [rejectedItems, search])

  const loadAllLabRequests = async () => {
    setLoading(true)
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/hod/requests?status=pending_hod', { cache: 'no-store' }),
        fetch('/api/hod/requests?status=approved', { cache: 'no-store' }),
        fetch('/api/hod/requests?status=rejected', { cache: 'no-store' })
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

  useEffect(() => {
    if (activeType === 'lab') {
      loadAllLabRequests()
    }
  }, [activeType])

  const handleAction = async (requestId: number, action: 'approve' | 'reject', overrideRemarks?: string) => {
    const requestRemarks = typeof overrideRemarks === 'string'
      ? overrideRemarks.trim()
      : remarks[requestId]?.trim() || ''

    if (action === 'reject' && (!requestRemarks || requestRemarks === '')) {
      alert('⚠️ Remarks Required\n\nPlease provide remarks before rejecting the request.\n\nRemarks help explain the reason for rejection to the requester.')
      return
    }

    try {
      setActionLoading(requestId)
      const res = await fetch(`/api/hod/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          remarks: requestRemarks || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        const successMessage = action === 'approve' 
          ? '✓ Lab booking request approved successfully! The booking is now confirmed and the requester has been notified.'
          : '✓ Lab booking request rejected successfully. The requester has been notified with your remarks.'
        setSuccessDialog({ open: true, message: successMessage })

        setRemarks(prev => {
          const newRemarks = { ...prev }
          delete newRemarks[requestId]
          return newRemarks
        })

        await loadAllLabRequests()
        setActiveTab(action === 'approve' ? 'approved' : 'rejected')
      } else {
        const error = await res.json()
        toast({
          title: "Error",
          description: error.error || "Failed to process request",
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

  const getStepStatus = (item: RequestItem, stepName: string) => {
    // For rejected requests, determine which step rejected it
    if (item.status === 'rejected') {
      if (stepName === 'Faculty Review') {
        // If faculty approved, show completed, otherwise show rejected
        return item.faculty_approved_at ? 'completed' : 'rejected'
      }
      if (stepName === 'Lab Staff Review') {
        // If lab staff approved, show completed, otherwise check if it reached this step
        if (item.lab_staff_approved_at) return 'completed'
        if (item.faculty_approved_at) return 'rejected' // Reached lab staff and was rejected
        return 'waiting' // Never reached this step
      }
      if (stepName === 'HOD Review') {
        // If HOD approved, show completed, otherwise check if it reached this step
        if (item.hod_approved_at) return 'completed'
        if (item.lab_staff_approved_at) return 'rejected' // Reached HOD and was rejected
        return 'waiting' // Never reached this step
      }
    }
    
    // For non-rejected requests, use the existing logic
    if (stepName === 'Faculty Review') {
      if (item.status === 'pending_faculty') return 'pending'
      if (['pending_lab_staff', 'pending_hod', 'approved'].includes(item.status)) return 'completed'
    }
    if (stepName === 'Lab Staff Review') {
      if (item.status === 'pending_lab_staff') return 'pending'
      if (['pending_hod', 'approved'].includes(item.status)) return 'completed'
      if (item.status === 'pending_faculty') return 'waiting'
    }
    if (stepName === 'HOD Review') {
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

  const toggleTimeline = (itemId: number) => {
    setShowTimeline(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_hod':
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Pending HOD Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>
      case 'pending_faculty':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending Faculty Review</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Pending Lab Staff Review</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Components approvals for HOD
  function HODComponentsApprovals() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
    const [activeTab, setActiveTab] = useState<'pending'|'approved'|'rejected'>('pending')
    const [all, setAll] = useState<any[]>([])
    const [remarks, setRemarks] = useState<Record<number, string>>({})
    const [expandedTimelines, setExpandedTimelines] = useState<Set<number>>(new Set())

    const toggleTimeline = (id: number) => {
      setExpandedTimelines(prev => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
    }

    const getStepStatus = (request: any, step: string) => {
      // For rejected requests, determine which step rejected it
      if (request.status === 'rejected') {
        if (step === 'Faculty Review') {
          // If faculty approved, show completed, otherwise show rejected
          return request.faculty_approved_at ? 'completed' : 'rejected'
        }
        if (step === 'Lab Staff Review') {
          // If lab staff approved, show completed, otherwise check if it reached this step
          if (request.lab_staff_approved_at) return 'completed'
          if (request.faculty_approved_at) return 'rejected' // Reached lab staff and was rejected
          return 'waiting' // Never reached this step
        }
        if (step === 'HOD Review') {
          // If HOD approved, show completed, otherwise check if it reached this step
          if (request.hod_approved_at) return 'completed'
          if (request.lab_staff_approved_at) return 'rejected' // Reached HOD and was rejected
          return 'waiting' // Never reached this step
        }
      }
      
      // For non-rejected requests, use status-based logic
      if (step === 'Faculty Review') {
        if (request.faculty_approved_at) return 'completed'
        if (request.status === 'pending_faculty') return 'pending'
        return 'waiting'
      }
      if (step === 'Lab Staff Review') {
        if (request.lab_staff_approved_at) return 'completed'
        if (request.status === 'pending_lab_staff') return 'pending'
        if (!request.faculty_approved_at) return 'waiting'
        return 'waiting'
      }
      if (step === 'HOD Review') {
        if (request.hod_approved_at) return 'completed'
        if (request.status === 'pending_hod') return 'pending'
        if (!request.lab_staff_approved_at) return 'waiting'
        return 'waiting'
      }
      return 'waiting'
    }

    const getFinalApprovalStatus = (request: any) => {
      if (request.status === 'approved') return 'completed'
      if (request.status === 'rejected') return 'rejected'
      return 'waiting'
    }

    const loadAll = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/hod/component-requests', { cache: 'no-store' })
        const text = await res.text()
        if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
        const data = JSON.parse(text)
        setAll(data.requests || [])
      } catch (e: any) {
        toast({ title: 'Failed to load', description: e?.message || 'Could not load component requests', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => { loadAll() }, [])

    const filtered = useMemo(() => {
      if (activeTab === 'pending') return all.filter(r => r.status === 'pending_hod')
      if (activeTab === 'approved') return all.filter(r => r.status === 'approved')
      return all.filter(r => r.status === 'rejected')
    }, [all, activeTab])

    const counts = useMemo(() => ({
      pending: all.filter(r => r.status === 'pending_hod').length,
      approved: all.filter(r => r.status === 'approved').length,
      rejected: all.filter(r => r.status === 'rejected').length,
    }), [all])

    const act = async (id: number, action: 'approve'|'reject') => {
      // Prevent double-click: if already processing this request, ignore
      if (processingIds.has(id)) {
        return
      }
      
      if (action === 'reject' && !remarks[id]) {
        alert('⚠️ Remarks Required\n\nPlease provide remarks before rejecting the request.\n\nRemarks help explain the reason for rejection to the requester.')
        return
      }
      try {
        // Mark as processing
        setProcessingIds(prev => new Set(prev).add(id))
        
        const res = await fetch(`/api/hod/component-requests/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, remarks: remarks[id] || null })
        })
        const text = await res.text()
        if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
        const successMessage = action === 'approve' 
          ? '✓ Component request approved successfully! The request is now approved and the requester has been notified.'
          : '✓ Component request rejected successfully. The requester has been notified with your remarks.'
        setSuccessDialog({ open: true, message: successMessage })
        setRemarks(prev => { const p = { ...prev }; delete p[id]; return p })
        await loadAll()
        setActiveTab(action === 'approve' ? 'approved' : 'rejected')
      } catch (e: any) {
        toast({ title: 'Action failed', description: e?.message || 'Could not update request', variant: 'destructive' })
      } finally {
        // Remove from processing
        setProcessingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }
    }

    const badge = (status: string) => {
      switch (status) {
        case 'pending_faculty': return <Badge className="bg-orange-100 text-orange-800" variant="secondary">Pending Faculty</Badge>
        case 'pending_lab_staff': return <Badge className="bg-blue-100 text-blue-800" variant="secondary">Pending Lab Staff</Badge>
        case 'pending_hod': return <Badge className="bg-purple-100 text-purple-800" variant="secondary">Pending HOD</Badge>
        case 'approved': return <Badge className="bg-green-100 text-green-800" variant="secondary">Approved</Badge>
        case 'rejected': return <Badge variant="destructive">Rejected</Badge>
        default: return <Badge variant="outline">{status}</Badge>
      }
    }

    return (
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 max-w-md h-8">
            <TabsTrigger value="pending" className="flex items-center gap-1 text-xs">
              Pending
              {counts.pending > 0 && <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-800 animate-pulse">{counts.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-1 text-xs">
              Approved
              {counts.approved > 0 && <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-800">{counts.approved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs">
              Rejected
              {counts.rejected > 0 && <Badge variant="destructive" className="ml-1 text-xs">{counts.rejected}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r: any) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{r.lab_name} • <span className="text-muted-foreground">{r.requester_name}</span></div>
                        {badge(r.status)}
                      </div>
                      {r.purpose && (<div className="text-sm"><span className="text-muted-foreground">Purpose: </span>{r.purpose}</div>)}
                      
                      {/* View Timeline Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => toggleTimeline(r.id)}
                      >
                        {expandedTimelines.has(r.id) ? (
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

                      {/* Timeline - Collapsible */}
                      {expandedTimelines.has(r.id) && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="px-2">
                            <div className="flex items-center justify-between relative">
                              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
                              {[
                                { name: 'Submitted', status: 'completed', icon: Clock },
                                { name: 'Faculty', status: getStepStatus(r, 'Faculty Review'), icon: User },
                                { name: 'Lab Staff', status: getStepStatus(r, 'Lab Staff Review'), icon: Users },
                                { name: 'HOD', status: getStepStatus(r, 'HOD Review'), icon: Building },
                                { name: 'Final', status: getFinalApprovalStatus(r), icon: CheckCircle2 }
                              ].map((step, index) => (
                                <div key={index} className="flex flex-col items-center space-y-1 relative z-10">
                                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                                    step.status === 'completed' ? 'bg-green-100 border-green-300' : 
                                    step.status === 'pending' ? 'bg-blue-100 border-blue-300' : 
                                    step.status === 'rejected' ? 'bg-red-100 border-red-300' : 
                                    'bg-white border-gray-300'
                                  }`}>
                                    <step.icon className={`h-4 w-4 ${
                                      step.status === 'completed' ? 'text-green-600' : 
                                      step.status === 'pending' ? 'text-blue-600' : 
                                      step.status === 'rejected' ? 'text-red-600' : 
                                      'text-gray-400'
                                    }`} />
                                  </div>
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
                                       step.status === 'rejected' ? 'Rejected' : 'Waiting'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Previous Remarks */}
                            <div className="mt-3 space-y-2">
                              {r.faculty_remarks && (
                                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                  <span className="font-medium">Faculty:</span> {r.faculty_remarks}
                                </div>
                              )}
                              {r.lab_staff_remarks && (
                                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                  <span className="font-medium">Lab Staff:</span> {r.lab_staff_remarks}
                                </div>
                              )}
                              {r.hod_remarks && (
                                <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                  <span className="font-medium">HOD:</span> {r.hod_remarks}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        {r.items?.map((it: any, idx: number) => (
                          <div key={idx} className="text-sm flex items-center justify-between border rounded p-2">
                            <div>
                              <div className="font-medium">{it.component_name} {it.model ? `(${it.model})` : ''}</div>
                              <div className="text-xs text-muted-foreground">{it.category || 'Uncategorized'}</div>
                            </div>
                            <div>Qty: <span className="font-medium">{it.quantity_requested}</span></div>
                          </div>
                        ))}
                      </div>
                      {r.status === 'pending_hod' && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea placeholder="Remarks (optional for approval, required for rejection)" value={remarks[r.id] || ''} onChange={(e) => setRemarks(prev => ({ ...prev, [r.id]: e.target.value }))} />
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => act(r.id, 'approve')}
                              disabled={processingIds.has(r.id)}
                            >
                              {processingIds.has(r.id) ? (
                                <>Processing...</>
                              ) : (
                                <><Check className="h-4 w-4 mr-2" /> Approve</>
                              )}
                            </Button>
                            <Button 
                              className="flex-1" 
                              variant="destructive" 
                              onClick={() => act(r.id, 'reject')}
                              disabled={processingIds.has(r.id)}
                            >
                              {processingIds.has(r.id) ? (
                                <>Processing...</>
                              ) : (
                                <><X className="h-4 w-4 mr-2" /> Reject</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r: any) => (
                  <Card key={r.id}><CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.lab_name} • <span className="text-muted-foreground">{r.requester_name}</span></div>
                      {badge(r.status)}
                    </div>
                    {r.purpose && (<div className="text-sm"><span className="text-muted-foreground">Purpose: </span>{r.purpose}</div>)}
                    
                    {/* View Timeline Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => toggleTimeline(r.id)}
                    >
                      {expandedTimelines.has(r.id) ? (
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

                    {/* Timeline - Collapsible */}
                    {expandedTimelines.has(r.id) && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="px-2">
                          <div className="flex items-center justify-between relative">
                            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
                            {(r.initiator_role === 'faculty' ? [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Lab Staff', status: getStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: 'HOD', status: getStepStatus(r, 'HOD Review'), icon: Building },
                              { name: 'Final', status: getFinalApprovalStatus(r), icon: CheckCircle2 }
                            ] : [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Faculty', status: getStepStatus(r, 'Faculty Review'), icon: User },
                              { name: 'Lab Staff', status: getStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: 'HOD', status: getStepStatus(r, 'HOD Review'), icon: Building },
                              { name: 'Final', status: getFinalApprovalStatus(r), icon: CheckCircle2 }
                            ]).map((step, index) => (
                              <div key={index} className="flex flex-col items-center space-y-1 relative z-10">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                                  step.status === 'completed' ? 'bg-green-100 border-green-300' : 
                                  step.status === 'pending' ? 'bg-blue-100 border-blue-300' : 
                                  step.status === 'rejected' ? 'bg-red-100 border-red-300' : 
                                  'bg-white border-gray-300'
                                }`}>
                                  <step.icon className={`h-4 w-4 ${
                                    step.status === 'completed' ? 'text-green-600' : 
                                    step.status === 'pending' ? 'text-blue-600' : 
                                    step.status === 'rejected' ? 'text-red-600' : 
                                    'text-gray-400'
                                  }`} />
                                </div>
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
                                     step.status === 'rejected' ? 'Rejected' : 'Waiting'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Previous Remarks */}
                          <div className="mt-3 space-y-2">
                            {r.faculty_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">Faculty:</span> {r.faculty_remarks}
                              </div>
                            )}
                            {r.lab_staff_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">Lab Staff:</span> {r.lab_staff_remarks}
                              </div>
                            )}
                            {r.hod_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">HOD:</span> {r.hod_remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      {r.items?.map((it: any, idx: number) => (
                        <div key={idx} className="text-sm flex items-center justify-between border rounded p-2">
                          <div className="font-medium">{it.component_name} {it.model ? `(${it.model})` : ''}</div>
                          <div>Qty: <span className="font-medium">{it.quantity_requested}</span></div>
                        </div>
                      ))}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r: any) => (
                  <Card key={r.id}><CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.lab_name} • <span className="text-muted-foreground">{r.requester_name}</span></div>
                      {badge(r.status)}
                    </div>
                    {r.purpose && (<div className="text-sm"><span className="text-muted-foreground">Purpose: </span>{r.purpose}</div>)}
                    
                    {/* View Timeline Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => toggleTimeline(r.id)}
                    >
                      {expandedTimelines.has(r.id) ? (
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

                    {/* Timeline - Collapsible */}
                    {expandedTimelines.has(r.id) && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="px-2">
                          <div className="flex items-center justify-between relative">
                            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
                            {(r.initiator_role === 'faculty' ? [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Lab Staff', status: getStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: 'HOD', status: getStepStatus(r, 'HOD Review'), icon: Building },
                              { name: 'Final', status: getFinalApprovalStatus(r), icon: CheckCircle2 }
                            ] : [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Faculty', status: getStepStatus(r, 'Faculty Review'), icon: User },
                              { name: 'Lab Staff', status: getStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: 'HOD', status: getStepStatus(r, 'HOD Review'), icon: Building },
                              { name: 'Final', status: getFinalApprovalStatus(r), icon: CheckCircle2 }
                            ]).map((step, index) => (
                              <div key={index} className="flex flex-col items-center space-y-1 relative z-10">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                                  step.status === 'completed' ? 'bg-green-100 border-green-300' : 
                                  step.status === 'pending' ? 'bg-blue-100 border-blue-300' : 
                                  step.status === 'rejected' ? 'bg-red-100 border-red-300' : 
                                  'bg-white border-gray-300'
                                }`}>
                                  <step.icon className={`h-4 w-4 ${
                                    step.status === 'completed' ? 'text-green-600' : 
                                    step.status === 'pending' ? 'text-blue-600' : 
                                    step.status === 'rejected' ? 'text-red-600' : 
                                    'text-gray-400'
                                  }`} />
                                </div>
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
                                     step.status === 'rejected' ? 'Rejected' : 'Waiting'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Previous Remarks */}
                          <div className="mt-3 space-y-2">
                            {r.faculty_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">Faculty:</span> {r.faculty_remarks}
                              </div>
                            )}
                            {r.lab_staff_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">Lab Staff:</span> {r.lab_staff_remarks}
                              </div>
                            )}
                            {r.hod_remarks && (
                              <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300">
                                <span className="font-medium">HOD:</span> {r.hod_remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      {r.items?.map((it: any, idx: number) => (
                        <div key={idx} className="text-sm flex items-center justify-between border rounded p-2">
                          <div className="font-medium">{it.component_name} {it.model ? `(${it.model})` : ''}</div>
                          <div>Qty: <span className="font-medium">{it.quantity_requested}</span></div>
                        </div>
                      ))}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/hod/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Review Requests</h1>
          <p className="text-xs text-muted-foreground">
            {activeType === 'lab'
              ? (activeTab === 'pending' ? `${pendingItems.length} lab requests pending your approval`
                : activeTab === 'approved' ? `${approvedItems.length} lab requests you approved`
                : `${rejectedItems.length} lab requests you rejected`)
              : (activeTab === 'pending' ? `Component requests pending your approval` : activeTab === 'approved' ? `Component requests you approved` : `Component requests you rejected`)}
          </p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as 'lab'|'components')} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-8">
          <TabsTrigger value="lab" className="text-xs">Lab Bookings</TabsTrigger>
          <TabsTrigger value="components" className="text-xs">Component Requests</TabsTrigger>
        </TabsList>

        {/* Lab bookings */}
        <TabsContent value="lab" className="space-y-3">
          <div className="max-w-md mb-2">
            <input
              type="text"
              placeholder="Search by student, lab, faculty, purpose, or request ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded text-xs"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-3">
            <TabsList className="grid w-full grid-cols-3 max-w-md h-8">
              <TabsTrigger value="pending" className="flex items-center gap-1 text-xs">
                Pending
                {pendingItems.length > 0 && <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-800 animate-pulse">{pendingItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1 text-xs">
                Approved
                {approvedItems.length > 0 && <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-800">{approvedItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs">
                Rejected
                {rejectedItems.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{rejectedItems.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Loading...</p>
                  </CardContent>
                </Card>
              ) : pendingItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No pending approval requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredPendingItems.map((item) => {
                    const remarkText = remarks[item.id] || ''
                    const showTimelineForItem = !!showTimeline[item.id]

                    return (
                      <RequestCard
                        key={item.id}
                        item={item}
                        showActions={true}
                        remark={remarkText}
                        showTimelineForItem={showTimelineForItem}
                        onRemarksChange={(val: string) => handleRemarksChange(item.id, val)}
                        onToggleTimeline={() => toggleTimeline(item.id)}
                        onAction={handleAction}
                        actionLoading={actionLoading}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        getStatusBadge={getStatusBadge}
                        getStepStatus={getStepStatus}
                        getFinalApprovalStatus={getFinalApprovalStatus}
                      />
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Loading...</p>
                  </CardContent>
                </Card>
              ) : approvedItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No approved requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredApprovedItems.map((item) => (
                    <RequestCard
                      key={item.id}
                      item={item}
                      showActions={false}
                      remark={remarks[item.id] || ''}
                      showTimelineForItem={!!showTimeline[item.id]}
                      onRemarksChange={(v: string) => handleRemarksChange(item.id, v)}
                      onToggleTimeline={() => toggleTimeline(item.id)}
                      onAction={handleAction}
                      actionLoading={actionLoading}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getStatusBadge={getStatusBadge}
                      getStepStatus={getStepStatus}
                      getFinalApprovalStatus={getFinalApprovalStatus}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Loading...</p>
                  </CardContent>
                </Card>
              ) : rejectedItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No rejected requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredRejectedItems.map((item) => (
                    <RequestCard
                      key={item.id}
                      item={item}
                      showActions={false}
                      remark={remarks[item.id] || ''}
                      showTimelineForItem={!!showTimeline[item.id]}
                      onRemarksChange={(v: string) => handleRemarksChange(item.id, v)}
                      onToggleTimeline={() => toggleTimeline(item.id)}
                      onAction={handleAction}
                      actionLoading={actionLoading}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getStatusBadge={getStatusBadge}
                      getStepStatus={getStepStatus}
                      getFinalApprovalStatus={getFinalApprovalStatus}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Component requests */}
        <TabsContent value="components" className="space-y-3">
          <HODComponentsApprovals />
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
