"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Clock, MapPin, User, Building2, ArrowLeft, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Lab {
  id: number
  name: string
  code: string
}

interface ScheduleEntry {
  id: string
  lab_id: number
  lab_name: string
  lab_code: string
  start_time: string
  end_time: string
  time_range: string
  purpose: string
  type: 'class' | 'booking'
  booker_name?: string
  status: string
}

interface GroupedSchedule {
  lab_id: number
  lab_name: string
  lab_code: string
  entries: ScheduleEntry[]
}

export default function DailySchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedLab, setSelectedLab] = useState<string>('all')
  const [labs, setLabs] = useState<Lab[]>([])
  const [schedule, setSchedule] = useState<GroupedSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)

  useEffect(() => {
    loadLabs()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadDailySchedule()
    }
  }, [selectedDate, selectedLab])

  const loadLabs = async () => {
    try {
      const res = await fetch('/api/admin/labs')
      if (res.ok) {
        const data = await res.json()
        setLabs(data.labs || [])
      } else {
        console.error('Failed to fetch labs:', res.status)
        setLabs([])
      }
    } catch (error) {
      console.error('Failed to load labs:', error)
      setLabs([])
    }
  }

  const loadDailySchedule = async () => {
    setLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const labParam = selectedLab !== 'all' ? `&lab_id=${selectedLab}` : ''
      const res = await fetch(`/api/admin/daily-schedule?date=${dateStr}${labParam}`)
      
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.schedule || [])
        setTotalEntries(data.total_entries || 0)
      } else {
        console.error('Failed to fetch schedule:', res.status)
        setSchedule([])
        setTotalEntries(0)
      }
    } catch (error) {
      console.error('Failed to load daily schedule:', error)
      setSchedule([])
      setTotalEntries(0)
    } finally {
      setLoading(false)
    }
  }

  const getDayName = (date: Date) => {
    return format(date, 'EEEE')
  }

  const getStatusBadge = (entry: ScheduleEntry) => {
    if (entry.type === 'class') {
      return <Badge variant="outline" className="text-green-600 border-green-300">Scheduled Class</Badge>
    } else {
      switch (entry.status) {
        case 'pending':
          return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending Approval</Badge>
        case 'faculty_approved':
          return <Badge variant="outline" className="text-blue-600 border-blue-300">Faculty Approved</Badge>
        case 'staff_approved':
          return <Badge variant="outline" className="text-purple-600 border-purple-300">Staff Approved</Badge>
        case 'hod_approved':
          return <Badge variant="outline" className="text-green-600 border-green-300">Fully Approved</Badge>
        default:
          return <Badge variant="outline">{entry.status}</Badge>
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Daily Lab Schedule</h1>
          <p className="text-muted-foreground">
            View lab bookings and scheduled classes for any day
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Picker */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    defaultMonth={new Date()}
                    initialFocus
                    fromDate={new Date(2020, 0, 1)}
                    toDate={new Date(2030, 11, 31)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Lab Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Lab</label>
              <Select value={selectedLab} onValueChange={setSelectedLab}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labs</SelectItem>
                  {labs && labs.length > 0 && labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id.toString()}>
                      {lab.name} ({lab.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <Button onClick={loadDailySchedule} disabled={loading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <span>Date: <strong>{format(selectedDate, "PPP")} ({getDayName(selectedDate)})</strong></span>
            <span>Total Entries: <strong>{totalEntries}</strong></span>
            <span>Labs: <strong>{selectedLab === 'all' ? 'All' : labs && labs.find(l => l.id.toString() === selectedLab)?.name || 'Unknown'}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Display */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading schedule...</p>
          </CardContent>
        </Card>
      ) : (!schedule || schedule.length === 0) ? (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No scheduled classes or lab bookings found for {format(selectedDate, "PPP")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedule.map((labSchedule) => (
            <Card key={labSchedule.lab_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {labSchedule.lab_name} ({labSchedule.lab_code})
                  <Badge variant="secondary" className="ml-auto">
                    {(labSchedule.entries || []).length} {(labSchedule.entries || []).length === 1 ? 'entry' : 'entries'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(labSchedule.entries || []).map((entry) => (
                    <div 
                      key={entry.id}
                      className={`p-4 rounded-lg border ${
                        entry.type === 'class' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-lg">{entry.time_range}</span>
                        </div>
                        {getStatusBadge(entry)}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">Purpose:</span>
                          <span>{entry.purpose}</span>
                        </div>
                        
                        {entry.booker_name && entry.type === 'booking' && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">Booked by:</span>
                            <span className="text-blue-600">{entry.booker_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
