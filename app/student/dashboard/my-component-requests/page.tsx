"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar, CheckCircle, Clock, Eye, Package, RotateCcw, User, Users, Building, XCircle, ChevronLeft, X } from "lucide-react"
import Link from "next/link"

interface ComponentRequestItem {
  id: number
  request_id: number
  component_id: number
  quantity_requested: number
  component_name: string
  model?: string | null
  category?: string | null
}

interface ComponentRequest {
  id: number
  lab_id: number
  requester_id: number
  initiator_role: 'student' | 'faculty'
  mentor_faculty_id: number | null
  purpose: string | null
  return_date: string | null
  status: 'pending_faculty' | 'pending_lab_staff' | 'pending_hod' | 'approved' | 'rejected'
  faculty_approver_id: number | null
  faculty_approved_at: string | null
  faculty_remarks: string | null
  lab_staff_approver_id: number | null
  lab_staff_approved_at: string | null
  lab_staff_remarks: string | null
  hod_approver_id: number | null
  hod_approved_at: string | null
  hod_remarks: string | null
  issued_at: string | null
  return_requested_at: string | null
  returned_at: string | null
  actual_return_date: string | null
  return_approved_by: number | null
  return_approved_at: string | null
  return_remarks: string | null
  extension_requested_at: string | null
  extension_requested_until: string | null
  extension_approved_by: number | null
  extension_approved_at: string | null
  extension_remarks: string | null
  rejected_by_id: number | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  lab_name: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  faculty_name?: string | null
  lab_staff_name?: string | null
  hod_name?: string | null
  items: ComponentRequestItem[]
}

export default function MyComponentRequestsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<ComponentRequest[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'issued' | 'returned' | 'rejected'>('all')
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [extendRequestId, setExtendRequestId] = useState<number | null>(null)
  const [newReturnDate, setNewReturnDate] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => { loadRequests() }, [])

  async function loadRequests() {
    setLoading(true)
    try {
      const res = await fetch('/api/student/component-requests', { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      const data = JSON.parse(text)
      setRequests(data.requests || [])
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message || 'Could not load component requests', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  async function handleReturn(requestId: number) {
    if (!confirm('Request to return these components? Lab staff will need to approve after verification.')) return
    
    try {
      const res = await fetch(`/api/student/component-requests/${requestId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const text = await res.text()
      if (!res.ok) {
        const errorMsg = (() => { try { return JSON.parse(text)?.error } catch { return text } })()
        throw new Error(errorMsg || 'Failed to request return')
      }
      
      setSuccessDialog({ 
        open: true, 
        message: `✓ Return request submitted successfully!\n\nYour request to return the components has been sent to the lab staff.\n\nThe lab staff will verify the returned components and approve the return in the system.` 
      })
      loadRequests()
    } catch (e: any) {
      toast({ title: 'Request failed', description: e?.message || 'Could not request return', variant: 'destructive' })
    }
  }

  async function handleCancelReturn(requestId: number) {
    if (!confirm('Cancel the return request? You can request to return again later.')) return
    
    try {
      const res = await fetch(`/api/student/component-requests/${requestId}/cancel-return`, {
        method: 'POST'
      })
      const text = await res.text()
      if (!res.ok) {
        const errorMsg = (() => { try { return JSON.parse(text)?.error } catch { return text } })()
        throw new Error(errorMsg || 'Failed to cancel return request')
      }
      toast({ title: 'Success', description: 'Return request canceled.' })
      loadRequests()
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Could not cancel return request', variant: 'destructive' })
    }
  }

  async function handleWithdraw(requestId: number) {
    if (!confirm('Withdraw this request? This action cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/student/component-requests/${requestId}/withdraw`, {
        method: 'POST',
      })
      const text = await res.text()
      if (!res.ok) {
        const errorMsg = (() => { try { return JSON.parse(text)?.error } catch { return text } })()
        throw new Error(errorMsg || 'Failed to withdraw request')
      }
      toast({ title: 'Success', description: 'Request withdrawn successfully' })
      loadRequests()
    } catch (e: any) {
      toast({ title: 'Withdraw failed', description: e?.message || 'Could not withdraw request', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleExtendDeadline() {
    if (!extendRequestId || !newReturnDate) {
      toast({ title: 'Invalid input', description: 'Please select a new return date', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/student/component-requests/${extendRequestId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_return_date: newReturnDate, reason: extensionReason })
      })
      const text = await res.text()
      if (!res.ok) {
        const errorMsg = (() => { try { return JSON.parse(text)?.error } catch { return text } })()
        throw new Error(errorMsg || 'Failed to request extension')
      }
      
      // Format the date properly
      const formattedDate = new Date(newReturnDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      
      setSuccessDialog({ 
        open: true, 
        message: `✓ Extension request submitted successfully!\n\nRequested new return date: ${formattedDate}\n\nLab staff will review your extension request and notify you of their decision.` 
      })
      setExtendDialogOpen(false)
      setExtendRequestId(null)
      setNewReturnDate('')
      setExtensionReason('')
      loadRequests()
    } catch (e: any) {
      toast({ title: 'Extension request failed', description: e?.message || 'Could not request extension', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function StatusBadge({ status, request }: { status: ComponentRequest['status'], request?: ComponentRequest }) {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending_hod':
        return <Badge variant="outline">Pending {request?.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'}</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline">Pending Lab Staff</Badge>
      case 'pending_faculty':
      default:
        return <Badge variant="secondary">Pending Faculty</Badge>
    }
  }

  function StepCircle({ state, children }: { state: 'completed'|'pending'|'waiting'|'rejected', children: React.ReactNode }) {
    const cls = state === 'completed' ? 'bg-green-100 border-green-300 text-green-700'
      : state === 'pending' ? 'bg-blue-100 border-blue-300 text-blue-700'
      : state === 'rejected' ? 'bg-red-100 border-red-300 text-red-700'
      : 'bg-white border-gray-300 text-gray-500'
    return (
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${cls}`}>{children}</div>
    )
  }

  function getStepState(req: ComponentRequest, step: 'faculty'|'staff'|'hod'|'final') : 'completed'|'pending'|'waiting'|'rejected' {
    const status: any = req.status
    if (status === 'rejected') return 'rejected'
    if (step === 'faculty') {
      if (status === 'pending_faculty') return 'pending'
      if (['pending_lab_staff','pending_hod','approved'].includes(status)) return 'completed'
      return 'waiting'
    }
    if (step === 'staff') {
      if (status === 'pending_lab_staff') return 'pending'
      if (['pending_hod','approved'].includes(status)) return 'completed'
      if (status === 'pending_faculty') return 'waiting'
      return 'waiting'
    }
    if (step === 'hod') {
      if (status === 'pending_hod') return 'pending'
      if (status === 'approved') return 'completed'
      if (['pending_faculty','pending_lab_staff'].includes(status)) return 'waiting'
      return 'waiting'
    }
    // final
    if (status === 'approved') return 'completed'
    if (status === 'rejected') return 'rejected'
    return 'waiting'
  }

  // Filter requests based on active tab
  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    if (activeTab === 'pending') return requests.filter(r => ['pending_faculty', 'pending_lab_staff', 'pending_hod'].includes(r.status))
    if (activeTab === 'approved') return requests.filter(r => r.status === 'approved' && !r.issued_at)
    if (activeTab === 'issued') return requests.filter(r => r.issued_at && !r.returned_at)
    if (activeTab === 'returned') return requests.filter(r => r.returned_at !== null)
    if (activeTab === 'rejected') return requests.filter(r => r.status === 'rejected')
    return requests
  }, [requests, activeTab])

  // Calculate counts for badges
  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => ['pending_faculty', 'pending_lab_staff', 'pending_hod'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'approved' && !r.issued_at).length,
    issued: requests.filter(r => r.issued_at && !r.returned_at).length,
    returned: requests.filter(r => r.returned_at !== null).length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests])

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/student/dashboard"><ChevronLeft className="h-4 w-4 mr-2"/> Back</Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Component Requests</h1>
          <p className="text-muted-foreground">Track the status of your component requests</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Clock className="h-8 w-8 mx-auto mb-3 animate-spin" />
          <p>Loading your component requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">No component requests found</p>
            <p className="text-sm text-muted-foreground">Use "Request Lab Components" to create your first request</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/student/dashboard/request-components">Request Lab Components</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="all" className="text-xs">
              All {counts.all > 0 && <Badge variant="secondary" className="ml-1">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending {counts.pending > 0 && <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-800 animate-pulse">{counts.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Approved {counts.approved > 0 && <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">{counts.approved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="issued" className="text-xs">
              Issued {counts.issued > 0 && <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800 animate-pulse">{counts.issued}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="returned" className="text-xs">
              Returned {counts.returned > 0 && <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-800">{counts.returned}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              Rejected {counts.rejected > 0 && <Badge variant="destructive" className="ml-1">{counts.rejected}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No requests found in this category</p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-between">
                  <span className="truncate">{req.lab_name}</span>
                  <StatusBadge status={req.status} request={req} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div><span className="font-medium text-foreground">Submitted:</span> {new Date(req.created_at).toLocaleString()}</div>
                  {req.return_date && <div><span className="font-medium text-foreground">Return Date:</span> {new Date(req.return_date).toLocaleDateString()}</div>}
                  {req.purpose && <div className="sm:col-span-2"><span className="font-medium text-foreground">Purpose:</span> {req.purpose}</div>}
                  {req.faculty_name && <div><span className="font-medium text-foreground">Mentor:</span> {req.faculty_name}</div>}
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Requested Items</p>
                  <div className="rounded border divide-y">
                    {req.items.map((it) => (
                      <div key={it.id} className="p-3 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-medium">{it.component_name} {it.model ? `(${it.model})` : ''}</div>
                          <div className="text-xs text-muted-foreground">{it.category || 'Uncategorized'}</div>
                        </div>
                        <div className="text-sm">Qty: <span className="font-medium">{it.quantity_requested}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issue/Return Status */}
                {req.issued_at && !req.return_requested_at && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="font-medium text-green-900">✓ Components Issued</p>
                    <p className="text-green-700 text-xs">Issued on: {new Date(req.issued_at).toLocaleDateString()}</p>
                    {req.return_date && <p className="text-green-700 text-xs">Expected return: {new Date(req.return_date).toLocaleDateString()}</p>}
                  </div>
                )}

                {req.return_requested_at && !req.returned_at && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-2">
                    <p className="font-medium text-yellow-900">⏳ Return Requested</p>
                    <p className="text-yellow-700 text-xs">Requested on: {new Date(req.return_requested_at).toLocaleDateString()}</p>
                    <p className="text-yellow-700 text-xs">Waiting for lab staff to verify and approve return</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCancelReturn(req.id)}
                      className="mt-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Return Request
                    </Button>
                  </div>
                )}

                {req.returned_at && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="font-medium text-blue-900">✓ Components Returned</p>
                    <p className="text-blue-700 text-xs">Returned on: {new Date(req.returned_at).toLocaleDateString()}</p>
                    {req.return_approved_at && <p className="text-blue-700 text-xs">Approved by lab staff on: {new Date(req.return_approved_at).toLocaleDateString()}</p>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2"/>View Timeline</Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Request Timeline</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Horizontal steps */}
                      <div className="px-4">
                        <div className="relative flex items-center justify-between">
                          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"/>
                          {/* Submitted */}
                          <div className="flex flex-col items-center space-y-1 relative z-10">
                            <StepCircle state="completed"><Clock className="h-5 w-5"/></StepCircle>
                            <div className="text-xs text-center"><div className="font-medium">Submitted</div><div className="text-gray-500">{new Date(req.created_at).toLocaleDateString()}</div></div>
                          </div>
                          {/* Faculty */}
                          <div className="flex flex-col items-center space-y-1 relative z-10">
                            <StepCircle state={getStepState(req,'faculty')}><User className="h-5 w-5"/></StepCircle>
                            <div className="text-xs text-center"><div className="font-medium">Faculty Recommendation</div><div className="text-gray-500">{req.faculty_approved_at ? new Date(req.faculty_approved_at).toLocaleDateString() : ''}</div></div>
                          </div>
                          {/* Staff */}
                          <div className="flex flex-col items-center space-y-1 relative z-10">
                            <StepCircle state={getStepState(req,'staff')}><Users className="h-5 w-5"/></StepCircle>
                            <div className="text-xs text-center"><div className="font-medium">Lab Staff Recommendation</div><div className="text-gray-500">{req.lab_staff_approved_at ? new Date(req.lab_staff_approved_at).toLocaleDateString() : ''}</div></div>
                          </div>
                          {/* HOD/Lab Coordinator */}
                          <div className="flex flex-col items-center space-y-1 relative z-10">
                            <StepCircle state={getStepState(req,'hod')}><Building className="h-5 w-5"/></StepCircle>
                            <div className="text-xs text-center"><div className="font-medium">{req.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'} Approval</div><div className="text-gray-500">{req.hod_approved_at ? new Date(req.hod_approved_at).toLocaleDateString() : ''}</div></div>
                          </div>
                          {/* Final */}
                          <div className="flex flex-col items-center space-y-1 relative z-10">
                            {req.status === 'approved' ? (
                              <StepCircle state="completed"><CheckCircle className="h-5 w-5"/></StepCircle>
                            ) : req.status === 'rejected' ? (
                              <StepCircle state="rejected"><XCircle className="h-5 w-5"/></StepCircle>
                            ) : (
                              <StepCircle state="waiting"><Clock className="h-5 w-5"/></StepCircle>
                            )}
                            <div className="text-xs text-center"><div className="font-medium">Final</div></div>
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      {(req.faculty_remarks || req.lab_staff_remarks || req.hod_remarks || req.return_remarks || req.rejection_reason) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Remarks</h4>
                          {req.faculty_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">Faculty Recommendation:</span> {req.faculty_remarks}</div>}
                          {req.lab_staff_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">Lab Staff Recommendation:</span> {req.lab_staff_remarks}</div>}
                          {req.hod_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">HOD Approval:</span> {req.hod_remarks}</div>}
                          {req.return_remarks && <div className="text-xs p-2 bg-green-50 rounded border-l-2 border-green-300"><span className="font-medium">Return Approval:</span> {req.return_remarks}</div>}
                          {req.rejection_reason && <div className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-300"><span className="font-medium">Rejection:</span> {req.rejection_reason}</div>}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Withdraw Button - Show if pending (any stage) and not yet issued */}
                {(req.status === 'pending_faculty' || req.status === 'pending_lab_staff' || req.status === 'pending_hod') && !req.issued_at && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWithdraw(req.id)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2"/>Withdraw Request
                  </Button>
                )}

                {/* Request Return Button - Show if approved, issued, and not yet requested return */}
                {req.status === 'approved' && req.issued_at && !req.return_requested_at && !req.returned_at && (
                  <>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleReturn(req.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2"/>Request to Return Components
                    </Button>
                    
                    {/* Extend Deadline Button */}
                    {!req.extension_requested_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExtendRequestId(req.id)
                          setNewReturnDate('')
                          setExtensionReason('')
                          setExtendDialogOpen(true)
                        }}
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <Clock className="h-4 w-4 mr-2"/>Extend Deadline
                      </Button>
                    )}
                    
                    {req.extension_requested_at && !req.extension_approved_at && (
                      <Badge className="bg-purple-100 text-purple-800">
                        Extension Pending (until {new Date(req.extension_requested_until!).toLocaleDateString()})
                      </Badge>
                    )}

                    {!req.extension_requested_at && req.extension_remarks && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-medium text-red-900">❌ Extension Request Rejected</p>
                        <p className="text-red-700 text-xs italic mt-1">{req.extension_remarks}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              </CardContent>
            </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Extend Deadline Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Deadline Extension</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newReturnDate">New Return Date</Label>
              <Input
                id="newReturnDate"
                type="date"
                value={newReturnDate}
                onChange={(e) => setNewReturnDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="extensionReason">
                Reason for Extension <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="extensionReason"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Explain why you need more time..."
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExtendDeadline} 
                disabled={!newReturnDate || !extensionReason.trim() || loading}
              >
                {loading ? 'Requesting...' : 'Request Extension'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ open, message: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Success
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-line text-sm text-muted-foreground">
            {successDialog.message}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setSuccessDialog({ open: false, message: '' })}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
