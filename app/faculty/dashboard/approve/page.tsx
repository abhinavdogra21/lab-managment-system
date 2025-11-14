"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  faculty_name?: string
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  faculty_approved_at?: string | null
  lab_staff_approved_at?: string | null
  hod_approved_at?: string | null
  highest_approval_authority?: 'hod' | 'lab_coordinator'
}

export default function FacultyApprovePage() {
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [showTimeline, setShowTimeline] = useState<Record<number, boolean>>({})

  // Debounce search (lab list only)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Filters for lab requests
  const filteredPendingItems = useMemo(() => pendingItems.filter(item =>
    item.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.student_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.lab_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.purpose?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.id.toString().includes(debouncedSearch)
  ), [pendingItems, debouncedSearch])

  const filteredApprovedItems = useMemo(() => approvedItems.filter(item =>
    item.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.student_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.lab_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.purpose?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.id.toString().includes(debouncedSearch)
  ), [approvedItems, debouncedSearch])

  const filteredRejectedItems = useMemo(() => rejectedItems.filter(item =>
    item.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.student_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.lab_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.purpose?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.id.toString().includes(debouncedSearch)
  ), [rejectedItems, debouncedSearch])

  // Loaders (lab requests)
  const loadAllLabRequests = async () => {
    setLoading(true)
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/faculty/requests?status=pending_faculty', { cache: 'no-store' }),
        fetch('/api/faculty/requests?status=approved,pending_lab_staff', { cache: 'no-store' }),
        fetch('/api/faculty/requests?status=rejected', { cache: 'no-store' })
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
    } catch (e) {
      console.error('Failed to load lab requests:', e)
      setPendingItems([])
      setApprovedItems([])
      setRejectedItems([])
    } finally {
      setLoading(false)
    }
  }

  // Load on tab/type change (lab only)
  useEffect(() => {
    if (activeType === 'lab') {
      loadAllLabRequests()
    }
  }, [activeType])

  const handleAction = async (requestId: number, action: 'approve' | 'reject', overrideRemarks?: string) => {
    // Prevent double-click: if already processing this request, ignore
    if (actionLoading === requestId) {
      return
    }
    
    const requestRemarks = typeof overrideRemarks === 'string' ? overrideRemarks.trim() : (remarks[requestId] || '').trim()
    if (action === 'reject' && !requestRemarks) {
      alert('⚠️ Remarks Required\n\nPlease provide remarks before rejecting the request.\n\nRemarks help explain the reason for rejection to the student.')
      return
    }
    try {
      setActionLoading(requestId)
      const res = await fetch(`/api/faculty/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks: requestRemarks || null })
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const successMessage = action === 'approve' 
          ? '✓ Lab booking request approved successfully! The request has been forwarded to Lab Staff for further processing.'
          : '✓ Lab booking request rejected successfully. The student has been notified with your remarks.'
        setSuccessDialog({ open: true, message: successMessage })
        // Clear remark for this request
        setRemarks(prev => { const p = { ...prev }; delete p[requestId]; return p })
        // Refresh lists and switch tab for approve
        await loadAllLabRequests()
        setActiveTab(action === 'approve' ? 'approved' : 'rejected')
      } else {
        // Robust error parsing for non-JSON responses
        let message = 'Failed to process request'
        try { const e = await res.json(); message = e?.error || e?.message || message } catch { const t = await res.text(); if (t) message = t.slice(0, 200) }
        toast({ title: 'Error', description: message, variant: 'destructive' })
      }
    } catch (e) {
      console.error('Failed to process action:', e)
      toast({ title: 'Error', description: 'Failed to process request', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  const formatTime = (timeString?: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }


  function FacultyComponentsApprovals() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<'pending'|'approved'|'rejected'>('pending')
    const [loading, setLoading] = useState(false)
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
    const [pending, setPending] = useState<any[]>([])
    const [approved, setApproved] = useState<any[]>([])
    const [rejected, setRejected] = useState<any[]>([])
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

    // Helper function to determine step status for component requests
    const getComponentStepStatus = (request: any, step: string): 'completed' | 'pending' | 'rejected' | 'waiting' => {
      if (step === 'Faculty Review') {
        if (request.faculty_approved_at) return 'completed'
        if (request.status === 'pending_faculty') return 'pending'
        if (request.status === 'rejected' && !request.faculty_approved_at) return 'rejected'
        return 'waiting'
      }
      
      if (step === 'Lab Staff Review') {
        if (request.lab_staff_approved_at) return 'completed'
        if (request.status === 'pending_lab_staff') return 'pending'
        if (request.status === 'rejected' && request.faculty_approved_at && !request.lab_staff_approved_at) return 'rejected'
        if (!request.faculty_approved_at) return 'waiting'
        return 'waiting'
      }
      
      // Handle both "HOD Review" and "Lab Coordinator Review"
      if (step === 'HOD Review' || step === 'Lab Coordinator Review') {
        if (request.hod_approved_at) return 'completed'
        if (request.status === 'pending_hod') return 'pending'
        if (request.status === 'rejected' && request.lab_staff_approved_at && !request.hod_approved_at) return 'rejected'
        if (!request.lab_staff_approved_at) return 'waiting'
        return 'waiting'
      }
      
      return 'waiting'
    }

    const getComponentFinalApprovalStatus = (request: any): 'completed' | 'pending' | 'rejected' | 'waiting' => {
      if (request.status === 'approved' || request.status === 'issued' || request.status === 'return-pending' || request.status === 'returned') return 'completed'
      if (request.status === 'rejected') return 'rejected'
      return 'waiting'
    }

    const loadAll = async () => {
      setLoading(true)
      try {
        // Load all tabs at once
        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
          fetch('/api/faculty/component-requests/review?status=pending', { cache: 'no-store' }),
          fetch('/api/faculty/component-requests/review?status=approved', { cache: 'no-store' }),
          fetch('/api/faculty/component-requests/review?status=rejected', { cache: 'no-store' })
        ])
        
        const pendingText = await pendingRes.text()
        const approvedText = await approvedRes.text()
        const rejectedText = await rejectedRes.text()
        
        if (pendingRes.ok) {
          const data = JSON.parse(pendingText)
          setPending(data.requests || [])
        }
        if (approvedRes.ok) {
          const data = JSON.parse(approvedText)
          setApproved(data.requests || [])
        }
        if (rejectedRes.ok) {
          const data = JSON.parse(rejectedText)
          setRejected(data.requests || [])
        }
      } catch (e: any) {
        toast({ title: 'Failed to load', description: e?.message || 'Could not load component requests', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => { loadAll() }, [])

    const act = async (id: number, action: 'approve'|'reject') => {
      // Prevent double-click: if already processing this request, ignore
      if (processingIds.has(id)) {
        return
      }
      
      if (action === 'reject' && !remarks[id]) {
        alert('⚠️ Remarks Required\n\nPlease provide remarks before rejecting the request.\n\nRemarks help explain the reason for rejection to the student.')
        return
      }
      try {
        // Mark as processing
        setProcessingIds(prev => new Set(prev).add(id))
        
        const res = await fetch(`/api/faculty/component-requests/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, remarks: remarks[id] || null })
        })
        const text = await res.text()
        if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
        const successMessage = action === 'approve' 
          ? '✓ Component request approved successfully! The request has been forwarded to Lab Staff for processing.'
          : '✓ Component request rejected successfully. The student has been notified with your remarks.'
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

    const list = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected

    const counts = useMemo(() => ({
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    }), [pending, approved, rejected])

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
            ) : list.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {list.map((r: any) => (
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
                              {(r.initiator_role === 'faculty' ? [
                                { name: 'Submitted', status: 'completed', icon: Clock },
                                { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                                { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                                { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
                              ] : [
                                { name: 'Submitted', status: 'completed', icon: Clock },
                                { name: 'Faculty', status: getComponentStepStatus(r, 'Faculty Review'), icon: User },
                                { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                                { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                                { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
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
                                  <span className="font-medium">{r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator:' : 'HOD:'}</span> {r.hod_remarks}
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
                      {r.status === 'pending_faculty' && (
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
            ) : list.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {list.map((r: any) => (
                  <Card key={r.id}><CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.lab_name} • <span className="text-muted-foreground">{r.requester_name}</span></div>
                      {badge(r.status)}
                    </div>
                    
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
                              { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                              { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
                            ] : [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Faculty', status: getComponentStepStatus(r, 'Faculty Review'), icon: User },
                              { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                              { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
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
                                <span className="font-medium">{r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator:' : 'HOD:'}</span> {r.hod_remarks}
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
            ) : list.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No requests found</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {list.map((r: any) => (
                  <Card key={r.id}><CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.lab_name} • <span className="text-muted-foreground">{r.requester_name}</span></div>
                      {badge(r.status)}
                    </div>
                    
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
                              { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                              { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
                            ] : [
                              { name: 'Submitted', status: 'completed', icon: Clock },
                              { name: 'Faculty', status: getComponentStepStatus(r, 'Faculty Review'), icon: User },
                              { name: 'Lab Staff', status: getComponentStepStatus(r, 'Lab Staff Review'), icon: Users },
                              { name: r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD', status: getComponentStepStatus(r, r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator Review' : 'HOD Review'), icon: Building },
                              { name: 'Final', status: getComponentFinalApprovalStatus(r), icon: CheckCircle2 }
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
                                <span className="font-medium">{r.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator:' : 'HOD:'}</span> {r.hod_remarks}
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
  
  // Lab booking timeline helpers
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

  const toggleTimeline = (itemId: number) => {
    setShowTimeline(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const getStatusBadge = (status: string, item?: RequestItem) => {
    switch (status) {
      case 'pending_faculty':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending Faculty Review</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Pending Lab Staff Review</Badge>
      case 'pending_hod':
        const approvalLabel = item?.highest_approval_authority === 'lab_coordinator' 
          ? 'Lab Coordinator' 
          : 'HOD'
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Pending {approvalLabel} Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

    // Timeline component
  const TimelineView = ({ item }: { item: RequestItem }) => {
    // Dynamic approval authority label
    const approvalAuthorityLabel = item.highest_approval_authority === 'lab_coordinator' 
      ? 'Lab Coordinator Review' 
      : 'HOD Review'
    
    const allSteps = [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Review', status: getStepStatus(item, 'Faculty Review'), icon: User },
      { name: 'Lab Staff Review', status: getStepStatus(item, 'Lab Staff Review'), icon: Users },
      { name: approvalAuthorityLabel, status: getStepStatus(item, approvalAuthorityLabel), icon: Building },
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

  // Request Card component
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{item.lab_name}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-600">{item.student_name}</span>
          </div>
          {getStatusBadge(item.status, item)}
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
                defaultValue={remarks[item.id] || ''}
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Review Requests</h1>
          <p className="text-xs text-muted-foreground">
            {activeType === 'lab'
              ? (activeTab === 'pending' ? `${pendingItems.length} lab requests pending your approval`
                : activeTab === 'approved' ? `${approvedItems.length} lab requests approved`
                : `${rejectedItems.length} lab requests rejected`)
              : (activeTab === 'pending' ? `Component requests pending your approval` : activeTab === 'approved' ? `Component requests you approved` : `Component requests you rejected`)}
          </p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as 'lab'|'components')} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-8">
          <TabsTrigger value="lab" className="text-xs">Lab Bookings</TabsTrigger>
          <TabsTrigger value="components" className="text-xs">Component Requests</TabsTrigger>
        </TabsList>

        {/* Lab bookings section */}
        <TabsContent value="lab" className="space-y-3">
          <div className="max-w-md mb-2">
            <input
              type="text"
              placeholder="Search by student name, email, or request ID..."
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
              ) : filteredPendingItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No pending approval requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredPendingItems.map((item) => (
                    <RequestCard key={item.id} item={item} showActions={true} />
                  ))}
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
              ) : filteredApprovedItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No approved requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredApprovedItems.map((item) => (
                    <RequestCard key={item.id} item={item} />
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
              ) : filteredRejectedItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No rejected requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredRejectedItems.map((item) => (
                    <RequestCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Component requests section */}
        <TabsContent value="components" className="space-y-3">
          <FacultyComponentsApprovals />
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
