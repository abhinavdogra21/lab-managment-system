"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, Clock, Package, AlertCircle, CheckCircle, XCircle } from "lucide-react"
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
    if (r.status === 'pending_hod') return <Badge className="bg-orange-500 animate-pulse">Pending HOD</Badge>
    if (r.status === 'pending_lab_staff') return <Badge className="bg-orange-500 animate-pulse">Pending Lab Staff</Badge>
    return <Badge className="bg-orange-500 animate-pulse">Pending</Badge>
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
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1">{counts.all}</Badge></TabsTrigger>
          <TabsTrigger value="pending">Pending <Badge className="ml-1 bg-orange-500 animate-pulse">{counts.pending}</Badge></TabsTrigger>
          <TabsTrigger value="approved">Approved <Badge className="ml-1 bg-green-600">{counts.approved}</Badge></TabsTrigger>
          <TabsTrigger value="issued">Issued <Badge className="ml-1 bg-blue-600 animate-pulse">{counts.issued}</Badge></TabsTrigger>
          <TabsTrigger value="returned">Returned <Badge className="ml-1 bg-gray-500">{counts.returned}</Badge></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <Badge variant="destructive" className="ml-1">{counts.rejected}</Badge></TabsTrigger>
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
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {req.lab_name} ({req.lab_code})
                        {getStatusBadge(req)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Requested: {new Date(req.created_at).toLocaleString()}
                      </p>
                      {req.return_date && (
                        <p className="text-sm text-muted-foreground">
                          Expected Return: {new Date(req.return_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-2">Requested Components:</h4>
                    <div className="space-y-1 text-sm">
                      {req.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-1 px-2 bg-muted rounded">
                          <span>{item.component_name} {item.component_model ? `(${item.component_model})` : ''}</span>
                          <span className="font-medium">×{item.quantity_requested}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Purpose */}
                  {req.purpose && (
                    <div>
                      <h4 className="font-medium mb-1">Purpose:</h4>
                      <p className="text-sm text-muted-foreground">{req.purpose}</p>
                    </div>
                  )}

                  {/* Remarks */}
                  {req.lab_staff_remarks && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-900">Lab Staff Remarks:</p>
                      <p className="text-sm text-blue-700 mt-1">{req.lab_staff_remarks}</p>
                    </div>
                  )}
                  {req.hod_remarks && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-900">HOD Remarks:</p>
                      <p className="text-sm text-green-700 mt-1">{req.hod_remarks}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {req.issued_at && <p>✓ Issued: {new Date(req.issued_at).toLocaleString()}</p>}
                    {req.return_requested_at && <p>⏳ Return Requested: {new Date(req.return_requested_at).toLocaleString()}</p>}
                    {req.returned_at && <p>✓ Returned: {new Date(req.returned_at).toLocaleString()}</p>}
                  </div>

                  {/* Return Request Status */}
                  {req.return_requested_at && !req.returned_at && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-2">
                      <p className="font-medium text-yellow-900">⏳ Return Requested</p>
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

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    {req.issued_at && !req.returned_at && !req.return_requested_at && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleReturn(req.id)}>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Request Return
                        </Button>
                        {!req.extension_requested_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExtendRequestId(req.id)
                              setNewReturnDate('')
                              setExtensionReason('')
                              setExtendDialogOpen(true)
                            }}
                            className="border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend Deadline
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
                    {req.status.includes('pending') && (
                      <Button size="sm" variant="destructive" onClick={() => handleWithdraw(req.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Withdraw
                      </Button>
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
