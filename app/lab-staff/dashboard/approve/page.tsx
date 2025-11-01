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
  timeline?: any[]
}

export default function LabStaffApprovePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
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
    const requestRemarks = typeof overrideRemarks === 'string'
      ? overrideRemarks.trim()
      : remarks[requestId]?.trim()
    
    if (action === 'reject' && !requestRemarks) {
      toast({
        title: "Error",
        description: "Please provide remarks for rejection",
        variant: "destructive"
      })
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
        toast({
          title: "Success",
          description: data.message,
          variant: "default"
        })

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_lab_staff':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending Lab Staff Approval</Badge>
      case 'pending_hod':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending HOD Approval</Badge>
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
    
    const allSteps = isStudentBooking ? [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Review', status: getStepStatus(item, 'Faculty Review'), icon: User },
      { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
      { name: 'HOD Review', status: getStepStatus(item, 'HOD Review'), icon: Building },
      { name: 'Approved', status: getFinalApprovalStatus(item), icon: CheckCircle }
    ] : [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
      { name: 'HOD Review', status: getStepStatus(item, 'HOD Review'), icon: Building },
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
    // If request is rejected, all remaining steps are rejected
    if (item.status === 'rejected') return 'rejected'
    
    // Status-based checking first (prioritized over timeline data)
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
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{item.lab_name}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-600">{item.student_name}</span>
          </div>
          {getStatusBadge(item.status)}
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

        {/* Faculty Approval - Compact */}
        {item.faculty_name && (
          <div className="bg-green-50 p-2 rounded text-xs">
            <span className="font-medium text-green-800">Faculty: </span>
            <span className="text-green-700">{item.faculty_name}</span>
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

        {/* Remarks from other approvers (for approved items) */}
        {(item.lab_staff_remarks || item.hod_remarks) && (
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
                    Approve
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
    </div>
  )
}