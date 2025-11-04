"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Download, Calendar, FileText, Filter, Clock, CheckCircle2, Package, XCircle, Users } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface BookingLog {
  id: number
  log_id?: number
  requester_name: string
  requester_email: string
  requester_role: string
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  faculty_name: string | null
  faculty_email: string | null
  lab_staff_name: string | null
  hod_name: string | null
  created_at: string
  faculty_approved_at: string | null
  lab_staff_approved_at: string | null
  hod_approved_at: string | null
}

interface ComponentLog {
  id: number
  log_id?: number
  requester_name: string
  requester_email: string
  requester_role: string
  lab_name: string
  purpose: string
  status: string
  return_date: string
  issued_at: string
  returned_at: string | null
  actual_return_date: string | null
  faculty_name: string | null
  faculty_email: string | null
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_email: string | null
  lab_staff_approved_at: string | null
  hod_name: string | null
  hod_email: string | null
  hod_approved_at: string | null
  items: Array<{ id: number; component_name: string; quantity?: number; quantity_requested?: number }>
  created_at: string
}

export default function FacultyLogsPage() {
  const { toast } = useToast()
  
  // Calculate default dates: Aug 1 (current year) to July 31 (next year)
  const getDefaultDates = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-11
    
    // If we're before August, use previous year's Aug 1
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear
    const endYear = startYear + 1
    
    const startDateDefault = `${startYear}-08-01`
    const endDateDefault = `${endYear}-07-31`
    
    return { startDateDefault, endDateDefault }
  }
  
  const { startDateDefault, endDateDefault } = getDefaultDates()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('booking-logs')
  
  // Booking Logs State
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [filteredBookingLogs, setFilteredBookingLogs] = useState<BookingLog[]>([])
  const [bookingLogsLoading, setBookingLogsLoading] = useState(false)
  
  // Component Logs State
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [filteredComponentLogs, setFilteredComponentLogs] = useState<ComponentLog[]>([])
  const [componentLogsLoading, setComponentLogsLoading] = useState(false)
  
  // Filter states
  const [bookingDateRange, setBookingDateRange] = useState({ start: startDateDefault, end: endDateDefault })
  const [componentDateRange, setComponentDateRange] = useState({ start: startDateDefault, end: endDateDefault })
  const [bookingSearchTerm, setBookingSearchTerm] = useState('')
  const [componentSearchTerm, setComponentSearchTerm] = useState('')
  const [logsSource, setLogsSource] = useState<'own' | 'mentees' | 'all'>('all')

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    if (u) {
      try { 
        const parsed = JSON.parse(u)
        setCurrentUser(parsed)
        if (parsed.role !== 'faculty') {
          window.location.href = "/dashboard"
          return
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (currentUser && activeTab === 'booking-logs') {
      loadBookingLogs()
    }
  }, [currentUser, activeTab, bookingDateRange, logsSource])

  useEffect(() => {
    if (currentUser && activeTab === 'component-logs') {
      loadComponentLogs()
    }
  }, [currentUser, activeTab, componentDateRange, logsSource])

  useEffect(() => {
    applyBookingFilters()
  }, [bookingLogs, bookingSearchTerm])

  useEffect(() => {
    applyComponentFilters()
  }, [componentLogs, componentSearchTerm])

  const loadBookingLogs = async () => {
    if (!currentUser) return
    
    setBookingLogsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: bookingDateRange.start,
        endDate: bookingDateRange.end,
        source: logsSource
      })
      
      const res = await fetch(`/api/faculty/logs/bookings?${params}`)
      
      if (res.ok) {
        const data = await res.json()
        setBookingLogs(data.logs || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load booking logs",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to load booking logs:", error)
      toast({
        title: "Error",
        description: "Failed to load booking logs",
        variant: "destructive"
      })
    } finally {
      setBookingLogsLoading(false)
    }
  }

  const loadComponentLogs = async () => {
    if (!currentUser) return
    
    setComponentLogsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: componentDateRange.start,
        endDate: componentDateRange.end,
        source: logsSource
      })
      
      const res = await fetch(`/api/faculty/logs/components?${params}`)
      
      if (res.ok) {
        const data = await res.json()
        setComponentLogs(data.logs || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load component logs",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to load component logs:", error)
      toast({
        title: "Error",
        description: "Failed to load component logs",
        variant: "destructive"
      })
    } finally {
      setComponentLogsLoading(false)
    }
  }

  const applyBookingFilters = () => {
    let filtered = [...bookingLogs]
    
    // Search filter only - don't filter by status since logs show all bookings
    if (bookingSearchTerm) {
      const term = bookingSearchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.requester_name.toLowerCase().includes(term) ||
        log.requester_email.toLowerCase().includes(term) ||
        log.lab_name.toLowerCase().includes(term) ||
        log.purpose.toLowerCase().includes(term)
      )
    }
    
    setFilteredBookingLogs(filtered)
  }

  const applyComponentFilters = () => {
    let filtered = [...componentLogs]
    
    // Search filter only - don't filter by status since logs show issued/returned components
    if (componentSearchTerm) {
      const term = componentSearchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.requester_name.toLowerCase().includes(term) ||
        log.requester_email.toLowerCase().includes(term) ||
        log.lab_name.toLowerCase().includes(term) ||
        log.purpose.toLowerCase().includes(term)
      )
    }
    
    setFilteredComponentLogs(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'pending_faculty': { variant: 'secondary', label: 'Pending Faculty' },
      'pending_lab_staff': { variant: 'secondary', label: 'Pending Lab Staff' },
      'pending_hod': { variant: 'secondary', label: 'Pending HOD' },
      'approved': { variant: 'default', label: 'Approved' },
      'rejected': { variant: 'destructive', label: 'Rejected' },
      'issued': { variant: 'default', label: 'Issued' },
      'returned': { variant: 'outline', label: 'Returned' }
    }
    
    const config = statusConfig[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const exportBookingLogPDF = (log: BookingLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Lab Booking Certificate', 14, 22)
    
    doc.setFontSize(11)
    doc.text(`Lab: ${log.lab_name}`, 14, 32)
    doc.text(`Date: ${new Date(log.booking_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Time: ${log.start_time} - ${log.end_time}`, 14, 44)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 50)
    
    let yPos = 60
    
    // Requester Info
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    doc.text(`Name: ${log.requester_name}`, 20, yPos)
    yPos += 6
    doc.text(`Email: ${log.requester_email}`, 20, yPos)
    yPos += 6
    doc.text(`Role: ${(log.requester_role || 'Unknown').toUpperCase()}`, 20, yPos)
    yPos += 10
    
    // Purpose
    doc.setFont('helvetica', 'bold')
    doc.text('Purpose:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    const purposeLines = doc.splitTextToSize(log.purpose, 180)
    doc.text(purposeLines, 20, yPos)
    yPos += purposeLines.length * 6 + 10
    
    // Approval Chain
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Timeline:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    
    if (log.faculty_approved_at) {
      doc.text(`✓ Faculty: ${log.faculty_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.faculty_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (log.lab_staff_approved_at) {
      doc.text(`✓ Lab Staff: ${log.lab_staff_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.lab_staff_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (log.hod_approved_at) {
      doc.text(`✓ HOD: ${log.hod_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.hod_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Booking_${log.lab_name.replace(/\s+/g, '_')}_${log.id}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const exportBookingLogsPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Lab Booking Logs', 14, 22)
    
    doc.setFontSize(11)
    doc.text(`Faculty: ${currentUser?.name}`, 14, 32)
    doc.text(`Date Range: ${bookingDateRange.start} to ${bookingDateRange.end}`, 14, 38)
    doc.text(`Source: ${logsSource === 'own' ? 'Own Logs' : logsSource === 'mentees' ? 'Mentees Logs' : 'All Logs'}`, 14, 44)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 50)
    
    const tableData = filteredBookingLogs.map(log => [
      log.requester_name,
      (log.requester_role || 'Unknown').toUpperCase(),
      log.lab_name,
      new Date(log.booking_date).toLocaleDateString(),
      `${log.start_time} - ${log.end_time}`,
      log.purpose,
      log.status
    ])
    
    autoTable(doc, {
      head: [['Requester', 'Role', 'Lab', 'Date', 'Time', 'Purpose', 'Status']],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    })
    
    doc.save(`faculty-booking-logs-${new Date().toISOString().split('T')[0]}.pdf`)
    
    toast({
      title: "Success",
      description: "Booking logs exported to PDF"
    })
  }

  const exportComponentLogPDF = (log: ComponentLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Component Issue Certificate', 14, 22)
    
    doc.setFontSize(11)
    doc.text(`Lab: ${log.lab_name}`, 14, 32)
    doc.text(`Return Date: ${new Date(log.return_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44)
    
    let yPos = 54
    
    // Requester Info
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    doc.text(`Name: ${log.requester_name}`, 20, yPos)
    yPos += 6
    doc.text(`Email: ${log.requester_email}`, 20, yPos)
    yPos += 6
    doc.text(`Role: ${(log.requester_role || 'Unknown').toUpperCase()}`, 20, yPos)
    yPos += 10
    
    // Components
    doc.setFont('helvetica', 'bold')
    doc.text('Components:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    log.items?.forEach((item) => {
      doc.text(`• ${item.component_name} (Qty: ${item.quantity_requested || item.quantity || 0})`, 20, yPos)
      yPos += 6
    })
    yPos += 4
    
    // Purpose
    doc.setFont('helvetica', 'bold')
    doc.text('Purpose:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    const purposeLines = doc.splitTextToSize(log.purpose, 180)
    doc.text(purposeLines, 20, yPos)
    yPos += purposeLines.length * 6 + 10
    
    // Status
    doc.setFont('helvetica', 'bold')
    doc.text('Status:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    if (log.issued_at) {
      doc.text(`Issued: ${new Date(log.issued_at).toLocaleString()}`, 20, yPos)
      yPos += 6
    }
    if (log.returned_at) {
      doc.text(`Returned: ${new Date(log.returned_at).toLocaleString()}`, 20, yPos)
      yPos += 6
    }
    yPos += 4
    
    // Approval Chain
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Timeline:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 8
    
    if (log.faculty_approved_at) {
      doc.text(`✓ Faculty: ${log.faculty_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.faculty_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (log.lab_staff_approved_at) {
      doc.text(`✓ Lab Staff: ${log.lab_staff_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.lab_staff_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (log.hod_approved_at) {
      doc.text(`✓ HOD: ${log.hod_name || 'N/A'}`, 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.text(`   ${new Date(log.hod_approved_at).toLocaleString()}`, 20, yPos)
      doc.setFontSize(11)
      yPos += 8
    }
    
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Component_${log.lab_name.replace(/\s+/g, '_')}_${log.id}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const exportComponentLogsPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Component Issue Logs', 14, 22)
    
    doc.setFontSize(11)
    doc.text(`Faculty: ${currentUser?.name}`, 14, 32)
    doc.text(`Date Range: ${componentDateRange.start} to ${componentDateRange.end}`, 14, 38)
    doc.text(`Source: ${logsSource === 'own' ? 'Own Logs' : logsSource === 'mentees' ? 'Mentees Logs' : 'All Logs'}`, 14, 44)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 50)
    
    const tableData = filteredComponentLogs.map(log => [
      log.requester_name,
      (log.requester_role || 'Unknown').toUpperCase(),
      log.lab_name,
      log.items?.map(item => `${item.component_name} (${item.quantity_requested || item.quantity || 0})`).join(', ') || '',
      log.purpose,
      new Date(log.return_date).toLocaleDateString(),
      log.status
    ])
    
    autoTable(doc, {
      head: [['Requester', 'Role', 'Lab', 'Components', 'Purpose', 'Return Date', 'Status']],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    })
    
    doc.save(`faculty-component-logs-${new Date().toISOString().split('T')[0]}.pdf`)
    
    toast({
      title: "Success",
      description: "Component logs exported to PDF"
    })
  }

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">View your booking and component issue history</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="booking-logs" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Booking Logs
            </TabsTrigger>
            <TabsTrigger value="component-logs" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Component Logs
            </TabsTrigger>
          </TabsList>

          {/* Logs Source Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={logsSource} onValueChange={(value: any) => setLogsSource(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="own">My Own Logs</SelectItem>
                <SelectItem value="mentees">My Mentees' Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Booking Logs Tab */}
        <TabsContent value="booking-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={bookingDateRange.start}
                    onChange={(e) => setBookingDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={bookingDateRange.end}
                    onChange={(e) => setBookingDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by requester, lab, or purpose..."
                  value={bookingSearchTerm}
                  onChange={(e) => setBookingSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking Logs ({filteredBookingLogs.length})
                </span>
                <Button onClick={exportBookingLogsPDF} disabled={filteredBookingLogs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookingLogsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading booking logs...</p>
                </div>
              ) : filteredBookingLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-medium">No booking logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookingLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{log.lab_name}</h4>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Requester: {log.requester_name} ({log.requester_role?.toUpperCase()})</p>
                            <p>Email: {log.requester_email}</p>
                            <p>Date: {new Date(log.booking_date).toLocaleDateString()}</p>
                            <p>Time: {log.start_time} - {log.end_time}</p>
                            <p>Purpose: {log.purpose}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportBookingLogPDF(log, true)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportBookingLogPDF(log, false)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">Approval Timeline</p>
                        <div className="space-y-3">
                          {/* Request Created */}
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Request Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Faculty Approval */}
                          {log.faculty_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Faculty Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.faculty_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.faculty_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Lab Staff Approval */}
                          {log.lab_staff_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Lab Staff Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.lab_staff_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.lab_staff_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* HOD Approval */}
                          {log.hod_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">HOD Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.hod_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.hod_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Rejected */}
                          {log.status === 'rejected' && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-red-600">Rejected</p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Component Logs Tab */}
        <TabsContent value="component-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={componentDateRange.start}
                    onChange={(e) => setComponentDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={componentDateRange.end}
                    onChange={(e) => setComponentDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by requester, lab, or purpose..."
                  value={componentSearchTerm}
                  onChange={(e) => setComponentSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Component Logs ({filteredComponentLogs.length})
                </span>
                <Button onClick={exportComponentLogsPDF} disabled={filteredComponentLogs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {componentLogsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading component logs...</p>
                </div>
              ) : filteredComponentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-medium">No component logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComponentLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{log.lab_name}</h4>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Requester: {log.requester_name} ({log.requester_role?.toUpperCase()})</p>
                            <p>Email: {log.requester_email}</p>
                            <p>Purpose: {log.purpose}</p>
                            <p>Return Date: {new Date(log.return_date).toLocaleDateString()}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Components:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {log.items?.map((item, index) => (
                                <li key={`${log.id}-component-${item.id || index}-${item.component_name}`}>
                                  {item.component_name} (Qty: {item.quantity_requested || item.quantity || 0})
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportComponentLogPDF(log, true)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportComponentLogPDF(log, false)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">Approval Timeline</p>
                        <div className="space-y-3">
                          {/* Request Created */}
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Request Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Faculty Approval */}
                          {log.faculty_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Faculty Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.faculty_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.faculty_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Lab Staff Approval */}
                          {log.lab_staff_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Lab Staff Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.lab_staff_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.lab_staff_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* HOD Approval */}
                          {log.hod_approved_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">HOD Approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    By: {log.hod_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.hod_approved_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Issued */}
                          {log.issued_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <Package className="h-5 w-5 text-purple-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Components Issued</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.issued_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Returned */}
                          {log.returned_at && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Components Returned</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.returned_at).toLocaleString()}
                                  </p>
                                  {log.actual_return_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Actual Return: {new Date(log.actual_return_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Rejected */}
                          {log.status === 'rejected' && (
                            <>
                              <div className="ml-2 border-l-2 border-gray-300 h-4"></div>
                              <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-red-600">Rejected</p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
