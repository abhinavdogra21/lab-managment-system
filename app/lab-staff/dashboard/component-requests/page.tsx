"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Check, Package, PackageCheck, X, Search, ChevronDown, ChevronUp, Clock, User, Users, Building, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface RequestItem { 
  id: number
  lab_id: number
  lab_name: string
  requester_id: number
  requester_name: string
  initiator_role: 'student' | 'faculty'
  purpose?: string | null
  status: string
  faculty_remarks?: string | null
  faculty_approved_at?: string | null
  lab_staff_remarks?: string | null
  lab_staff_approved_at?: string | null
  hod_remarks?: string | null
  hod_approved_at?: string | null
  issued_at?: string | null
  return_requested_at?: string | null
  returned_at?: string | null
  return_date?: string | null
  extension_requested_at?: string | null
  extension_requested_until?: string | null
  extension_approved_by?: number | null
  extension_approved_at?: string | null
  extension_remarks?: string | null
  mentor_faculty_name?: string
  items: Array<{ 
    id: number
    component_id: number
    quantity_requested: number
    component_name: string
    model?: string
    category?: string 
  }> 
}

export default function LabStaffComponentRequestsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [returnRemarks, setReturnRemarks] = useState<Record<number, string>>({})
  const [extensionRemarks, setExtensionRemarks] = useState<Record<number, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'issued' | 'return-pending' | 'returned' | 'rejected'>('all')
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
  const getStepStatus = (request: RequestItem, step: string): 'completed' | 'pending' | 'rejected' | 'waiting' => {
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
    
    if (step === 'HOD Review') {
      if (request.hod_approved_at) return 'completed'
      if (request.status === 'pending_hod') return 'pending'
      if (request.status === 'rejected' && request.lab_staff_approved_at && !request.hod_approved_at) return 'rejected'
      if (!request.lab_staff_approved_at) return 'waiting'
      return 'waiting'
    }
    
    return 'waiting'
  }

  const getFinalApprovalStatus = (request: RequestItem): 'completed' | 'pending' | 'rejected' | 'waiting' => {
    if (request.status === 'approved' || request.status === 'issued' || request.status === 'return-pending' || request.status === 'returned') return 'completed'
    if (request.status === 'rejected') return 'rejected'
    return 'waiting'
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lab-staff/component-requests', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      } else setRequests([])
    } catch { setRequests([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const act = async (id: number, action: 'approve'|'reject') => {
    // Prevent double-click: if already processing this request, ignore
    if (processingIds.has(id)) {
      return
    }
    
    if (action === 'reject' && !remarks[id]) {
      toast({ title: 'Remarks required', description: 'Please add remarks for rejection.', variant: 'destructive' }); return
    }
    try {
      // Mark as processing
      setProcessingIds(prev => new Set(prev).add(id))
      
      const res = await fetch(`/api/lab-staff/component-requests/${id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, remarks: remarks[id] || null }) })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      toast({ title: 'Updated', description: `Request ${action}d successfully.` })
      setRemarks(prev => { const p = { ...prev }; delete p[id]; return p })
      load()
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

  const issueComponents = async (id: number) => {
    // Prevent double-click
    if (processingIds.has(id)) {
      return
    }
    
    const req = requests.find(r => r.id === id)
    const role = req?.initiator_role === 'faculty' ? 'faculty' : 'student'
    if (!confirm(`Mark these components as issued to the ${role}?`)) return
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      
      const res = await fetch(`/api/lab-staff/component-requests/${id}/issue`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      toast({ title: 'Success', description: `Components marked as issued to ${role}` })
      load()
    } catch (e: any) {
      toast({ title: 'Issue failed', description: e?.message || 'Could not issue components', variant: 'destructive' })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const approveReturn = async (id: number) => {
    // Prevent double-click
    if (processingIds.has(id)) {
      return
    }
    
    if (!confirm('Approve the return? Verify components are in good condition first.')) return
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      
      const res = await fetch(`/api/lab-staff/component-requests/${id}/approve-return`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: returnRemarks[id] || '' })
      })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      toast({ title: 'Success', description: 'Return approved. Components marked as returned.' })
      setReturnRemarks(prev => { const next = { ...prev }; delete next[id]; return next })
      load()
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e?.message || 'Could not approve return', variant: 'destructive' })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleExtension = async (id: number, approved: boolean) => {
    // Prevent double-click
    if (processingIds.has(id)) {
      return
    }
    
    const action = approved ? 'approve' : 'reject'
    if (!approved && !extensionRemarks[id]?.trim()) {
      toast({ title: 'Remarks required', description: 'Please provide a reason for rejection', variant: 'destructive' })
      return
    }
    if (!confirm(`${approved ? 'Approve' : 'Reject'} this deadline extension request?`)) return
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      
      const res = await fetch(`/api/lab-staff/component-requests/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, remarks: extensionRemarks[id] })
      })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      toast({ title: 'Success', description: `Extension ${action}d successfully` })
      setExtensionRemarks(prev => ({ ...prev, [id]: '' }))
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || `Could not ${action} extension`, variant: 'destructive' })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const badge = (status: string) => {
    switch (status) {
      case 'pending_lab_staff': return <Badge className="bg-orange-100 text-orange-800" variant="secondary">Pending Lab Staff</Badge>
      case 'pending_hod': return <Badge className="bg-blue-100 text-blue-800" variant="secondary">Pending HOD</Badge>
      case 'approved': return <Badge className="bg-green-100 text-green-800" variant="secondary">Approved</Badge>
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let filtered = requests

    // Apply status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending_lab_staff')
    } else if (filterStatus === 'approved') {
      filtered = filtered.filter(r => r.status === 'approved' && !r.issued_at)
    } else if (filterStatus === 'issued') {
      filtered = filtered.filter(r => r.issued_at && !r.return_requested_at && !r.returned_at)
    } else if (filterStatus === 'return-pending') {
      filtered = filtered.filter(r => r.return_requested_at && !r.returned_at)
    } else if (filterStatus === 'returned') {
      filtered = filtered.filter(r => r.returned_at)
    } else if (filterStatus === 'rejected') {
      filtered = filtered.filter(r => r.status === 'rejected')
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.requester_name?.toLowerCase().includes(query) ||
        r.lab_name?.toLowerCase().includes(query) ||
        r.mentor_faculty_name?.toLowerCase().includes(query) ||
        r.purpose?.toLowerCase().includes(query) ||
        r.items?.some(item => 
          item.component_name?.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
        )
      )
    }

    return filtered
  }, [requests, filterStatus, searchQuery])

  // Get counts for each filter
  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending_lab_staff').length,
    approved: requests.filter(r => r.status === 'approved' && !r.issued_at).length,
    issued: requests.filter(r => r.issued_at && !r.return_requested_at && !r.returned_at).length,
    returnPending: requests.filter(r => r.return_requested_at && !r.returned_at).length,
    returned: requests.filter(r => r.returned_at).length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Component Requests</h1>
          <p className="text-sm text-muted-foreground">Review and approve component requests for your labs</p>
        </div>
        <Button asChild variant="outline"><Link href="/lab-staff/dashboard">Back</Link></Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by requester, lab, mentor, purpose, component name, model, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
        >
          All {counts.all > 0 && <Badge variant="secondary" className="ml-2 animate-pulse">{counts.all}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
        >
          Pending {counts.pending > 0 && <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800 animate-pulse">{counts.pending}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('approved')}
        >
          Ready to Issue {counts.approved > 0 && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 animate-pulse">{counts.approved}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'issued' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('issued')}
        >
          Currently Issued {counts.issued > 0 && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 animate-pulse">{counts.issued}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'return-pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('return-pending')}
        >
          Return Pending {counts.returnPending > 0 && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 animate-pulse">{counts.returnPending}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'returned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('returned')}
        >
          Returned {counts.returned > 0 && <Badge variant="secondary" className="ml-2">{counts.returned}</Badge>}
        </Button>
        <Button
          variant={filterStatus === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('rejected')}
        >
          Rejected {counts.rejected > 0 && <Badge variant="secondary" className="ml-2">{counts.rejected}</Badge>}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredRequests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          {searchQuery ? 'No requests match your search' : 'No requests found'}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(r => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> {r.lab_name}
                  {badge(r.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">Requester: <span className="font-medium text-foreground">{r.requester_name}</span></div>
                {r.mentor_faculty_name && (
                  <div className="text-sm text-muted-foreground">Mentor: <span className="font-medium text-foreground">{r.mentor_faculty_name}</span></div>
                )}
                {r.purpose && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Purpose: </span>
                    <span className="font-medium text-foreground">{r.purpose}</span>
                  </div>
                )}
                
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

                {/* Approval Timeline - Collapsible */}
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
                
                <div className="space-y-2">{r.items?.map((it, idx) => (
                    <div key={idx} className="p-2 border rounded text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.component_name} {it.model ? `(${it.model})` : ''}</div>
                        <div className="text-xs text-muted-foreground">{it.category || 'Uncategorized'}</div>
                      </div>
                      <div className="text-sm">Qty: <span className="font-medium">{it.quantity_requested}</span></div>
                    </div>
                  ))}
                </div>

                {/* Issue/Return Status */}
                {r.issued_at && !r.return_requested_at && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="font-medium text-green-900">✓ Issued to {r.initiator_role === 'faculty' ? 'Faculty' : 'Student'}</p>
                    <p className="text-green-700 text-xs">Issued: {new Date(r.issued_at).toLocaleDateString()}</p>
                    {r.return_date && <p className="text-green-700 text-xs">Expected return: {new Date(r.return_date).toLocaleDateString()}</p>}
                  </div>
                )}

                {r.return_requested_at && !r.returned_at && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p className="font-medium text-yellow-900">⏳ {r.initiator_role === 'faculty' ? 'Faculty' : 'Student'} Requested Return</p>
                    <p className="text-yellow-700 text-xs">Requested: {new Date(r.return_requested_at).toLocaleDateString()}</p>
                    <p className="text-yellow-700 text-xs">Please verify components and approve return</p>
                  </div>
                )}

                {r.returned_at && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="font-medium text-blue-900">✓ Returned by {r.initiator_role === 'faculty' ? 'Faculty' : 'Student'}</p>
                    <p className="text-blue-700 text-xs">Returned: {new Date(r.returned_at).toLocaleDateString()}</p>
                  </div>
                )}

                {/* Extension Request */}
                {r.extension_requested_at && !r.extension_approved_at && r.issued_at && !r.returned_at && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm space-y-2">
                    <p className="font-medium text-purple-900">⏰ Deadline Extension Requested</p>
                    <p className="text-purple-700 text-xs">
                      Current deadline: {r.return_date ? new Date(r.return_date).toLocaleDateString() : 'Not set'}
                    </p>
                    <p className="text-purple-700 text-xs">
                      Requested until: {new Date(r.extension_requested_until!).toLocaleDateString()}
                    </p>
                    {r.extension_remarks && (
                      <p className="text-purple-700 text-xs italic">Reason: {r.extension_remarks}</p>
                    )}
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Remarks for rejection (optional for approval)"
                        value={extensionRemarks[r.id] || ''}
                        onChange={(e) => setExtensionRemarks(prev => ({ ...prev, [r.id]: e.target.value }))}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700" 
                          onClick={() => handleExtension(r.id, true)}
                          disabled={processingIds.has(r.id)}
                        >
                          {processingIds.has(r.id) ? (
                            <>Processing...</>
                          ) : (
                            <><Check className="h-4 w-4 mr-1" /> Approve Extension</>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1" 
                          onClick={() => handleExtension(r.id, false)}
                          disabled={processingIds.has(r.id)}
                        >
                          {processingIds.has(r.id) ? (
                            <>Processing...</>
                          ) : (
                            <><X className="h-4 w-4 mr-1" /> Reject</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lab Staff Actions */}
                {r.status === 'pending_lab_staff' && (
                  <div className="space-y-2">
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

                {/* Issue Components Button - Show for approved but not yet issued */}
                {r.status === 'approved' && !r.issued_at && (
                  <div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => issueComponents(r.id)}
                      disabled={processingIds.has(r.id)}
                    >
                      {processingIds.has(r.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <PackageCheck className="h-4 w-4 mr-2" /> Issue Components to {r.initiator_role === 'faculty' ? 'Faculty' : 'Student'}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Approve Return Button - Show when student requested return */}
                {r.status === 'approved' && r.return_requested_at && !r.returned_at && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Optional remarks about return condition (e.g., 'All components in good condition')"
                      value={returnRemarks[r.id] || ''}
                      onChange={(e) => setReturnRemarks({ ...returnRemarks, [r.id]: e.target.value })}
                      className="h-20 text-sm"
                      disabled={processingIds.has(r.id)}
                    />
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700" 
                      onClick={() => approveReturn(r.id)}
                      disabled={processingIds.has(r.id)}
                    >
                      {processingIds.has(r.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" /> Approve Return
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
