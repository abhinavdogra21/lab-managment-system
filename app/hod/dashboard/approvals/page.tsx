"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Clock, User, MapPin, FileText, CheckCircle, XCircle, Eye, EyeOff, Building, Calendar, Check, X, Users, CheckCircle as CheckCircle2, ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

interface RequestItem {
  id: number
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  created_at: string
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  student_name: string
  student_email: string
  faculty_name: string
  lab_name: string
}
export default function HODApprovalsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [allRequests, setAllRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showTimeline, setShowTimeline] = useState<{[key: number]: boolean}>({})
  const [actionLoading, setActionLoading] = useState<{[key: number]: boolean}>({})
  const [remarks, setRemarks] = useState<{[key: number]: string}>({})
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState('pending')
  const { toast } = useToast()

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch('/api/hod/requests?status=pending_hod', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      } else {
        console.error('Failed to fetch pending requests')
        setRequests([])
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      setRequests([])
    }
  }

  const fetchAllRequests = async () => {
    try {
  const res = await fetch('/api/hod/requests?status=all', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setAllRequests(data.requests || [])
      } else {
        console.error('Failed to fetch all requests')
        setAllRequests([])
      }
    } catch (error) {
      console.error('Error fetching all requests:', error)
      setAllRequests([])
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchPendingRequests(), fetchAllRequests()])
      setLoading(false)
    }
    loadData()
  }, [])

  // Polling: refresh lists periodically so external approvals (curl/scripts) show up
  useEffect(() => {
    const id = setInterval(() => {
      fetchPendingRequests()
      fetchAllRequests()
    }, 30000)
    return () => clearInterval(id)
  }, [])

  // client-side filtered lists based on search
  const filteredPending = requests.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [r.student_name, r.student_email, r.faculty_name, r.lab_name, r.purpose]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const filteredApproved = allRequests.filter(req => req.status === 'approved').filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [r.student_name, r.student_email, r.faculty_name, r.lab_name, r.purpose]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const filteredRejected = allRequests.filter(req => req.status === 'rejected').filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [r.student_name, r.student_email, r.faculty_name, r.lab_name, r.purpose]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  // format helpers (match faculty styles)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getStepStatus = (item: RequestItem, stepName: string) => {
    // If rejected, determine at which step it was rejected
    if (item.status === 'rejected') {
      // Check if rejected by HOD (has hod_remarks or hod_approved_by)
      if (item.hod_remarks || stepName === 'HOD Review') {
        if (stepName === 'Faculty Review' || stepName === 'Lab Staff Review') return 'completed'
        if (stepName === 'HOD Review') return 'rejected'
        return 'waiting'
      }
      // Check if rejected by Lab Staff (has lab_staff_remarks but no hod_remarks)
      else if (item.lab_staff_remarks && !item.hod_remarks) {
        if (stepName === 'Faculty Review') return 'completed'
        if (stepName === 'Lab Staff Review') return 'rejected'
        if (stepName === 'HOD Review') return 'waiting'
        return 'waiting'
      }
      // Rejected by Faculty (has faculty_remarks but no lab_staff_remarks)
      else {
        if (stepName === 'Faculty Review') return 'rejected'
        return 'waiting'
      }
    }
    
    // Normal flow for non-rejected requests
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


  const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && (!remarks[requestId] || remarks[requestId].trim() === '')) {
      toast({
        title: "Error",
        description: "Please provide remarks for rejection",
        variant: "destructive"
      })
      return
    }

    setActionLoading(prev => ({ ...prev, [requestId]: true }))
    
    try {
      const res = await fetch(`/api/hod/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          remarks: remarks[requestId] || '' 
        })
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: `Request ${action}d successfully`
        })
        
        // Refresh the data
        await Promise.all([fetchPendingRequests(), fetchAllRequests()])
        
        // Clear remarks
        setRemarks(prev => ({ ...prev, [requestId]: '' }))
      } else {
        const error = await res.json()
        toast({
          title: "Error",
          description: error.error || `Failed to ${action} request`,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} request`,
        variant: "destructive"
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }))
    }
  }

  const toggleTimeline = (itemId: number) => {
    setShowTimeline(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // Local TimelineView (uses getStepStatus/getFinalApprovalStatus from component scope)
  const TimelineView = ({ item }: { item: RequestItem }) => {
    const allSteps = [
      { name: 'Submitted', status: 'completed', icon: Clock },
      { name: 'Faculty Review', status: getStepStatus(item, 'Faculty Review'), icon: User },
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
                  step.status === 'completed' ? 'bg-green-100 border-green-300' : step.status === 'pending' ? 'bg-blue-100 border-blue-300' : step.status === 'rejected' ? 'bg-red-100 border-red-300' : 'bg-white border-gray-300'
                }`}>
                  <step.icon className={`h-4 w-4 ${step.status === 'completed' ? 'text-green-600' : step.status === 'pending' ? 'text-blue-600' : step.status === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{step.name}</p>
                  <p className={`text-xs ${step.status === 'completed' ? 'text-green-600' : step.status === 'pending' ? 'text-blue-600' : step.status === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>{step.status === 'completed' ? 'Done' : step.status === 'pending' ? 'In Progress' : step.status === 'rejected' ? 'Rejected' : 'Waiting'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {item.faculty_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">Faculty:</span> {item.faculty_remarks}</div>}
            {item.lab_staff_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">Lab Staff:</span> {item.lab_staff_remarks}</div>}
            {item.hod_remarks && <div className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-300"><span className="font-medium">HOD:</span> {item.hod_remarks}</div>}
          </div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_hod':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending HOD Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const RequestCard = ({ item, showActions = false }: { item: RequestItem, showActions?: boolean }) => (
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
          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> <span>{formatDate(item.booking_date)}</span></div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span></div>
        </div>

        <div className="text-xs"><span className="font-medium text-gray-700">Purpose: </span><span className="text-gray-600">{item.purpose}</span></div>

        {item.faculty_name && (
          <div className="bg-green-50 p-2 rounded text-xs">
            <span className="font-medium text-green-800">Faculty: </span>
            <span className="text-green-700">{item.faculty_name}</span>
            {item.faculty_remarks && (<div className="text-green-600 mt-1 italic">"{item.faculty_remarks}"</div>)}
          </div>
        )}

        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => toggleTimeline(item.id)} className="h-6 text-xs px-2">
            <Clock className="h-3 w-3 mr-1" />{showTimeline[item.id] ? 'Hide Timeline' : 'View Timeline'}
          </Button>

          {showTimeline[item.id] && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs font-medium text-gray-700 mb-2">Request Timeline</div>
              <TimelineView item={item} />
            </div>
          )}
        </div>

        {(item.lab_staff_remarks || item.hod_remarks) && (
          <div className="space-y-1">
            {item.lab_staff_remarks && (<div className="bg-blue-50 p-2 rounded text-xs"><span className="font-medium text-blue-800">Lab Staff: </span><span className="text-blue-600 italic">"{item.lab_staff_remarks}"</span></div>)}
            {item.hod_remarks && (<div className="bg-purple-50 p-2 rounded text-xs"><span className="font-medium text-purple-800">HOD: </span><span className="text-purple-600 italic">"{item.hod_remarks}"</span></div>)}
          </div>
        )}

        {showActions && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea placeholder="Add your remarks (optional for approval, required for rejection)..." value={remarks[item.id] || ''} onChange={(e) => setRemarks(prev => ({ ...prev, [item.id]: e.target.value }))} className="min-h-[60px] text-xs" />

            <div className="flex gap-2">
              <Button onClick={() => handleAction(item.id, 'approve')} disabled={actionLoading[item.id]} className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs">
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button onClick={() => handleAction(item.id, 'reject')} disabled={actionLoading[item.id]} variant="destructive" className="flex-1 h-8 text-xs">
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // render normally; show loading in-place so hooks order remains stable

  const approvedRequests = allRequests.filter(req => req.status === 'approved')
  const rejectedRequests = allRequests.filter(req => req.status === 'rejected')

  // Counts: if user is searching, show filtered counts so tabs reflect search
  const pendingCount = search.trim() ? filteredPending.length : requests.length
  const approvedCount = search.trim() ? filteredApproved.length : approvedRequests.length
  const rejectedCount = search.trim() ? filteredRejected.length : rejectedRequests.length

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
          <h1 className="text-xl font-bold">Review Lab Requests</h1>
          <p className="text-xs text-muted-foreground">{activeTab === 'pending' ? `${filteredPending.length} requests pending your approval` : `${activeTab === 'approved' ? filteredApproved.length : filteredRejected.length} requests`}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div />
        <div className="w-72">
          <label className="sr-only">Search</label>
          <input placeholder="Search student/faculty/lab/purpose" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border px-3 py-2" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 max-w-md h-8">
          <TabsTrigger value="pending" className="flex items-center gap-1 text-xs">
            Pending
            {pendingCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-1 text-xs">
            Approved
            {approvedCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{approvedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs">
            Rejected
            {rejectedCount > 0 && <Badge variant="destructive" className="ml-1 text-xs">{rejectedCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {filteredPending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No pending approval requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPending.map((item) => (
                <RequestCard key={item.id} item={item} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {filteredApproved.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No approved requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredApproved.map((item) => (
                <RequestCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {filteredRejected.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No rejected requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRejected.map((item) => (
                <RequestCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
