/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, FileText, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface BookingRequest {
  id: number
  lab_name: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  faculty_remarks?: string
  lab_staff_remarks?: string
  hod_remarks?: string
  created_at: string
}

export default function TNPMyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/others/my-bookings')
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (booking: BookingRequest) => {
    const status = booking.status
    const statusConfig = {
      'pending_lab_staff': { label: 'Pending Lab Staff', variant: 'secondary' as const, icon: Clock },
      'pending_hod': { 
        label: booking.highest_approval_authority === 'lab_coordinator' ? 'Pending Lab Coordinator' : 'Pending HOD', 
        variant: 'secondary' as const, 
        icon: Clock 
      },
      'approved': { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      'rejected': { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: 'secondary' as const, 
      icon: AlertCircle 
    }
    
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings
    if (status === 'pending') return bookings.filter(b => b.status.includes('pending'))
    return bookings.filter(b => b.status === status)
  }

  const BookingCard = ({ booking }: { booking: BookingRequest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {booking.lab_name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(booking.date), 'PPP')}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {booking.start_time} - {booking.end_time}
            </div>
          </div>
          {getStatusBadge(booking)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <FileText className="h-3 w-3" />
            Purpose
          </div>
          <p className="text-sm text-muted-foreground pl-5">{booking.purpose}</p>
        </div>

        {booking.lab_staff_remarks && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">Lab Staff Remarks</div>
            <p className="text-sm text-muted-foreground">{booking.lab_staff_remarks}</p>
          </div>
        )}

        {booking.hod_remarks && (
          <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">HOD Remarks</div>
            <p className="text-sm text-muted-foreground">{booking.hod_remarks}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Submitted: {format(new Date(booking.created_at), 'PPp')}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Lab Bookings</h1>
        <p className="text-muted-foreground">View and track your lab booking requests</p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterBookings('pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({filterBookings('approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({filterBookings('rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No booking requests found</p>
                <Button className="mt-4" onClick={() => window.location.href = '/tnp/dashboard/book-labs'}>
                  Book a Lab
                </Button>
              </CardContent>
            </Card>
          ) : (
            bookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filterBookings('pending').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            filterBookings('pending').map(booking => <BookingCard key={booking.id} booking={booking} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {filterBookings('approved').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No approved bookings</p>
              </CardContent>
            </Card>
          ) : (
            filterBookings('approved').map(booking => <BookingCard key={booking.id} booking={booking} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {filterBookings('rejected').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No rejected requests</p>
              </CardContent>
            </Card>
          ) : (
            filterBookings('rejected').map(booking => <BookingCard key={booking.id} booking={booking} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
