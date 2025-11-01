"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, Clock, Package, AlertCircle, CheckCircle, XCircle, Eye, Users, Building, RotateCcw } from "lucide-react"
import Link from "next/link"

interface ComponentRequestItem {
  id: number
  component_name: string
  component_model: string | null
  component_category: string | null
  quantity_requested: number
}

interface ComponentRequest {
  id: number
  lab_name: string
  lab_code: string
  purpose: string | null
  return_date: string | null
  status: string
  created_at: string
  issued_at: string | null
  returned_at: string | null
  return_requested_at: string | null
  extension_requested_at: string | null
  extension_requested_until: string | null
  extension_approved_by: number | null
  extension_approved_at: string | null
  extension_remarks: string | null
  lab_staff_remarks: string | null
  hod_remarks: string | null
  items: ComponentRequestItem[]
}

export default function FacultyMyComponentRequestsPage() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<ComponentRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'issued' | 'returned' | 'rejected'>('all')
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [extendRequestId, setExtendRequestId] = useState<number | null>(null)
  const [newReturnDate, setNewReturnDate] = useState('')
  const [extensionReason, setExtensionReason] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/faculty/component-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      } else {
        toast({ title: 'Failed to load', description: 'Could not load your component requests', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to load', description: 'Could not load your component requests', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    if (activeTab === 'pending') return requests.filter(r => r.status.includes('pending'))
    if (activeTab === 'approved') return requests.filter(r => r.status === 'approved' && !r.issued_at)
    if (activeTab === 'issued') return requests.filter(r => r.issued_at && !r.returned_at)
    if (activeTab === 'returned') return requests.filter(r => r.returned_at)
    if (activeTab === 'rejected') return requests.filter(r => r.status === 'rejected')
    return requests
  }, [requests, activeTab])

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status.includes('pending')).length,
    approved: requests.filter(r => r.status === 'approved' && !r.issued_at).length,
    issued: requests.filter(r => r.issued_at && !r.returned_at).length,
    returned: requests.filter(r => r.returned_at).length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }), [requests])

  const handleReturn = async (id: number) => {
    if (!confirm('Request return for these components?')) return
    try {
      const res = await fetch(`/api/faculty/component-requests/${id}/return`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to request return')
      toast({ title: 'Return requested', description: 'Lab staff will review your return request.' })
      loadRequests()
    } catch {
      toast({ title: 'Failed', description: 'Could not request return', variant: 'destructive' })
    }
  }

  const handleCancelReturn = async (id: number) => {
    if (!confirm('Cancel the return request? You can request to return again later.')) return
    try {
      const res = await fetch(`/api/faculty/component-requests/${id}/cancel-return`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to cancel return request')
      toast({ title: 'Success', description: 'Return request canceled.' })
      loadRequests()
    } catch {
      toast({ title: 'Failed', description: 'Could not cancel return request', variant: 'destructive' })
    }
  }

  const handleWithdraw = async (id: number) => {
    if (!confirm('Withdraw this request? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/faculty/component-requests/${id}/withdraw`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to withdraw')
      toast({ title: 'Request withdrawn', description: 'The request has been canceled.' })
      loadRequests()
    } catch {
      toast({ title: 'Failed', description: 'Could not withdraw request', variant: 'destructive' })
    }
  }

  const handleExtendDeadline = async () => {
    if (!extendRequestId || !newReturnDate) {
      toast({ title: 'Invalid input', description: 'Please select a new return date', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/faculty/component-requests/${extendRequestId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_return_date: newReturnDate, reason: extensionReason })
      })
      const text = await res.text()
      if (!res.ok) {
        const errorMsg = (() => { try { return JSON.parse(text)?.error } catch { return text } })()
        throw new Error(errorMsg || 'Failed to request extension')
      }
      toast({ title: 'Extension requested', description: 'Lab staff will review your extension request' })
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

  const getStatusBadge = (r: ComponentRequest) => {
    if (r.returned_at) return <Badge className="bg-gray-500">Returned</Badge>
    if (r.return_requested_at) return <Badge className="bg-yellow-500 animate-pulse">Return Pending</Badge>
    if (r.issued_at) return <Badge className="bg-blue-600 animate-pulse">Issued</Badge>
    if (r.status === 'approved') return <Badge className="bg-green-600">Approved</Badge>
    if (r.status === 'rejected') return <Badge variant="destructive">Rejected</Badge>
    if (r.status === 'pending_hod') return <Badge variant="outline">Pending HOD</Badge>
    if (r.status === 'pending_lab_staff') return <Badge variant="outline">Pending Lab Staff</Badge>
    return <Badge variant="secondary">Pending</Badge>
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

  function getStepState(req: ComponentRequest, step: 'labstaff'|'hod'|'final') : 'completed'|'pending'|'waiting'|'rejected' {
    const status: any = req.status
    if (status === 'rejected') return 'rejected'
    if (step === 'labstaff') {
      if (status === 'pending_lab_staff') return 'pending'
      if (['pending_hod','approved'].includes(status) || req.issued_at) return 'completed'
      return 'waiting'
    }
    if (step === 'hod') {
      if (status === 'pending_hod') return 'pending'
      if (status === 'approved' || req.issued_at) return 'completed'
      if (status === 'pending_lab_staff') return 'waiting'
      return 'waiting'
    }
    // final
    if (req.issued_at) return 'completed'
    if (status === 'approved') return 'completed'
    if (status === 'rejected') return 'rejected'
    return 'waiting'
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">My Component Requests</h1>
          <p className="text-muted-foreground">View and track your component requests</p>
        </div>
        <Button asChild>
          <Link href="/faculty/dashboard/request-components">
            <Package className="h-4 w-4 mr-2" /> New Request
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
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

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">No requests found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === 'all' ? 'You have no component requests yet' : `No ${activeTab} requests`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map(req => (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <span className="truncate">{req.lab_name} ({req.lab_code})</span>
                    {getStatusBadge(req)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><span className="font-medium text-foreground">Submitted:</span> {new Date(req.created_at).toLocaleString()}</div>
                    {req.return_date && <div><span className="font-medium text-foreground">Return Date:</span> {new Date(req.return_date).toLocaleDateString()}</div>}
                    {req.purpose && <div className="sm:col-span-2"><span className="font-medium text-foreground">Purpose:</span> {req.purpose}</div>}
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Requested Items</p>
                    <div className="rounded border divide-y">
                      {req.items.map((item) => (
                        <div key={item.id} className="p-3 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.component_name} {item.component_model ? `(${item.component_model})` : ''}</div>
                            <div className="text-xs text-muted-foreground">{item.component_category || 'Uncategorized'}</div>
                          </div>
                          <div className="text-sm">Qty: <span className="font-medium">{item.quantity_requested}</span></div>
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
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Return Request
                      </Button>
                    </div>
                  )}

                  {req.returned_at && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="font-medium text-blue-900">✓ Components Returned</p>
                      <p className="text-blue-700 text-xs">Returned on: {new Date(req.returned_at).toLocaleDateString()}</p>
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
                              {/* Lab Staff */}
                              <div className="flex flex-col items-center space-y-1 relative z-10">
                                <StepCircle state={getStepState(req,'labstaff')}><Users className="h-5 w-5"/></StepCircle>
                                <div className="text-xs text-center"><div className="font-medium">Lab Staff Review</div><div className="text-gray-500">{req.status !== 'pending_lab_staff' && (req.status === 'approved' || req.issued_at) ? 'Approved' : ''}</div></div>
                              </div>
                              {/* HOD */}
                              <div className="flex flex-col items-center space-y-1 relative z-10">
                                <StepCircle state={getStepState(req,'hod')}><Building className="h-5 w-5"/></StepCircle>
                                <div className="text-xs text-center"><div className="font-medium">HOD Review</div><div className="text-gray-500">{(req.status === 'approved' || req.issued_at) ? 'Approved' : ''}</div></div>
                              </div>
                              {/* Final */}
                              <div className="flex flex-col items-center space-y-1 relative z-10">
                                {req.issued_at ? (
                                  <StepCircle state="completed"><CheckCircle className="h-5 w-5"/></StepCircle>
                                ) : req.status === 'rejected' ? (
                                  <StepCircle state="rejected"><XCircle className="h-5 w-5"/></StepCircle>
                                ) : (
                                  <StepCircle state="waiting"><Clock className="h-5 w-5"/></StepCircle>
                                )}
                                <div className="text-xs text-center"><div className="font-medium">{req.issued_at ? 'Issued' : 'Final'}</div></div>
                              </div>
                            </div>
                          </div>

                          {/* Remarks */}
                          {(req.lab_staff_remarks || req.hod_remarks) && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Remarks</h4>
                              {req.lab_staff_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">Lab Staff:</span> {req.lab_staff_remarks}</div>}
                              {req.hod_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">HOD:</span> {req.hod_remarks}</div>}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Withdraw Button - Show if pending (any stage) and not yet issued */}
                    {(req.status === 'pending_lab_staff' || req.status === 'pending_hod') && !req.issued_at && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleWithdraw(req.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2"/>Withdraw Request
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
              <Label htmlFor="extensionReason">Reason for Extension (Optional)</Label>
              <Textarea
                id="extensionReason"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Explain why you need more time..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExtendDeadline} disabled={!newReturnDate || loading}>
                {loading ? 'Requesting...' : 'Request Extension'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
