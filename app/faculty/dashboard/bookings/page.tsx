"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, XCircle, User, Users, Building, Eye, Calendar } from "lucide-react"

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
  timeline: TimelineStep[]
}

export default function FacultyBookingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<BookingWithTimeline[]>([])

  useEffect(() => { loadMyRequests() }, [])

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

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'pending_hod':
        return <Badge variant="outline">Pending HOD</Badge>
      case 'pending_lab_staff':
        return <Badge variant="outline">Pending Lab Staff</Badge>
      case 'pending_faculty':
        return <Badge variant="secondary">Pending Faculty</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const TimelineView = ({ request }: { request: BookingWithTimeline }) => {
    // Faculty-initiated bookings skip the Faculty Approval step entirely
    const hasFacultyStep = request.status === 'pending_faculty' || request.timeline.some(t => t.step_name.includes('Faculty Approval'))
    const steps = [
      ...(hasFacultyStep ? [{ key: 'Faculty Approval', icon: User }] : []),
      { key: 'Lab Staff Approval', icon: Users },
      { key: 'HOD Approval', icon: Building },
    ]
    const findStep = (key: string) => request.timeline.find(t => t.step_name.includes(key))
    const iconForStatus = (s?: string) => s === 'completed' ? 'completed' : s === 'pending' ? 'pending' : s === 'rejected' ? 'rejected' : 'waiting'

    return (
      <div className="space-y-6">
        <div className="text-sm space-y-1 p-4 bg-gray-50 rounded-lg">
          <p><span className="font-medium">Lab:</span> {request.lab_name}</p>
          <p><span className="font-medium">Date:</span> {new Date(request.date).toLocaleDateString()}</p>
          <p><span className="font-medium">Time:</span> {request.start_time} - {request.end_time}</p>
        </div>

        <div className="px-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
            {steps.map((s, idx) => {
              const st = findStep(s.key)
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
                      {new Date(st.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">My Lab Bookings</h1>
        <p className="text-muted-foreground">View the status of your lab booking requests</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading your bookings...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">No bookings found</p>
            <p className="text-sm text-muted-foreground">Create a lab booking to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{request.lab_name}</h3>
                      {getOverallStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                      <p>Date: {new Date(request.date).toLocaleDateString()}</p>
                      <p>Time: {request.start_time} - {request.end_time}</p>
                      <p>Submitted: {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm mt-2">{request.purpose}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Timeline
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Request Timeline</DialogTitle>
                        </DialogHeader>
                        <TimelineView request={request} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
 
