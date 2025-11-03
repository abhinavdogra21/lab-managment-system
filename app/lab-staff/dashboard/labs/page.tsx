"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Download, Package, Calendar, Users, Building, FileText, Filter, History, Eye, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LabComponent {
  id: number
  name: string
  model: string | null
  category: string
  quantity_available: number
  quantity_total: number
  condition_status: string
  lab_name: string
  lab_id: number
}

interface Lab {
  id: number
  name: string
  department_id: number
}

interface BookingLog {
  id: number
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
  lab_staff_name: string | null
  hod_name: string | null
  created_at: string
  faculty_approved_at: string | null
  lab_staff_approved_at: string | null
  hod_approved_at: string | null
}

interface ComponentLog {
  id: number
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
  hod_name: string | null
  hod_approved_at: string | null
  items: Array<{ id: number; component_name: string; quantity: number }>
  created_at: string
}

export default function LabHeadLabsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])
  const [components, setComponents] = useState<LabComponent[]>([])
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [activeTab, setActiveTab] = useState<'components' | 'logs' | 'component-logs'>('components')
  const [selectedLab, setSelectedLab] = useState<string>('all')
  const [bookingLogsSearch, setBookingLogsSearch] = useState('')
  const [componentLogsSearch, setComponentLogsSearch] = useState('')
  
  const uniqueLabs = labs.length > 0 
    ? labs.map(l => l.name).sort()
    : Array.from(
        new Set([
          ...components.map(c => c.lab_name),
          ...bookingLogs.map(l => l.lab_name)
        ])
      ).sort()

  const loadComponents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lab-staff/labs/components', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setLabs(data.labs || [])
        setComponents(data.components || [])
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load components', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load components', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadBookingLogs = async () => {
    setLoading(true)
    try {
      const url = bookingLogsSearch 
        ? `/api/lab-staff/labs/booking-logs?search=${encodeURIComponent(bookingLogsSearch)}`
        : '/api/lab-staff/labs/booking-logs'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setBookingLogs(data.logs || [])
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load booking logs', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load booking logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadComponentLogs = async () => {
    setLoading(true)
    try {
      const url = componentLogsSearch 
        ? `/api/lab-staff/labs/component-logs?search=${encodeURIComponent(componentLogsSearch)}`
        : '/api/lab-staff/labs/component-logs'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setComponentLogs(data.logs || [])
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load component logs', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load component logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'components') {
      loadComponents()
    } else if (activeTab === 'logs') {
      loadBookingLogs()
    } else {
      loadComponentLogs()
    }
  }, [activeTab])

  const generatePDF = async (log: BookingLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    // Add LNMIIT logo
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 10, 40, 20)
    } catch (error) {
      console.error('Logo loading failed:', error)
    }

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('LNMIIT', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('The LNM Institute of Information Technology', 105, 27, { align: 'center' })
    
    doc.setFontSize(14)
    doc.text('Lab Booking Approval Certificate', 105, 40, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 55
    
    doc.setFont('helvetica', 'bold')
    doc.text('Booking Information:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    doc.text(`Lab Name:`, 20, yPos)
    doc.text(log.lab_name, 70, yPos)
    yPos += 7
    
    doc.text(`Date:`, 20, yPos)
    doc.text(new Date(log.booking_date).toLocaleDateString('en-IN'), 70, yPos)
    yPos += 7
    
    doc.text(`Time:`, 20, yPos)
    doc.text(`${log.start_time} - ${log.end_time}`, 70, yPos)
    yPos += 7
    
    doc.text(`Purpose:`, 20, yPos)
    const purposeLines = doc.splitTextToSize(log.purpose, 120)
    doc.text(purposeLines, 70, yPos)
    yPos += (purposeLines.length * 7) + 5
    
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    doc.text(`Name:`, 20, yPos)
    doc.text(log.requester_name, 70, yPos)
    yPos += 7
    
    doc.text(`Email:`, 20, yPos)
    doc.text(log.requester_email, 70, yPos)
    yPos += 7
    
    doc.text(`Role:`, 20, yPos)
    doc.text(log.requester_role.toUpperCase(), 70, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('Approval/Recommendation Chain:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    if (log.faculty_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Faculty:`, 25, yPos)
      doc.text(log.faculty_name, 85, yPos)
      yPos += 7
      if (log.faculty_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Recommended on: ${new Date(log.faculty_approved_at).toLocaleString('en-IN')}`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
      yPos += 3
    }
    
    if (log.lab_staff_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Lab Staff:`, 25, yPos)
      doc.text(log.lab_staff_name, 85, yPos)
      yPos += 7
      if (log.lab_staff_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Recommended on: ${new Date(log.lab_staff_approved_at).toLocaleString('en-IN')}`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
      yPos += 3
    }
    
    if (log.hod_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY HOD:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(log.hod_name, 85, yPos)
      yPos += 7
      if (log.hod_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.hod_approved_at).toLocaleString('en-IN')}`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    }
    
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text('APPROVED', 40, yPos + 7, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, yPos + 7)
    doc.text(`Booking ID: ${log.id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Lab_Booking_${log.id}_${log.requester_name.replace(/\s+/g, '_')}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const generateComponentLogPDF = async (log: ComponentLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const marginBottom = 20
    
    const checkAddPage = (currentY: number, spaceNeeded: number = 20) => {
      if (currentY + spaceNeeded > pageHeight - marginBottom) {
        doc.addPage()
        return 20
      }
      return currentY
    }
    
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 10, 40, 20)
    } catch (error) {
      console.error('Logo loading failed:', error)
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('LNMIIT', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('The LNM Institute of Information Technology', 105, 27, { align: 'center' })
    
    doc.setFontSize(14)
    const docTitle = log.returned_at ? 'Component Return Certificate' : 'Component Issue Certificate'
    doc.text(docTitle, 105, 40, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    let yPos = 60
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Request Details:', 15, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Lab:`, 20, yPos)
    doc.text(log.lab_name, 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 15)
    doc.text(`Requester:`, 20, yPos)
    doc.text(log.requester_name, 85, yPos)
    yPos += 6
    
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`(${log.requester_email})`, 85, yPos)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Role:`, 20, yPos)
    doc.text(log.requester_role.toUpperCase(), 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 20)
    doc.text(`Purpose:`, 20, yPos)
    const purposeLines = doc.splitTextToSize(log.purpose, 100)
    doc.text(purposeLines, 85, yPos)
    yPos += (purposeLines.length * 6) + 6
    
    yPos = checkAddPage(yPos, 15)
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    yPos = checkAddPage(yPos, 25)
    doc.setFont('helvetica', 'bold')
    doc.text('Issued Components:', 15, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    if (log.items && log.items.length > 0) {
      for (const item of log.items) {
        yPos = checkAddPage(yPos, 6)
        doc.text(`• ${item.component_name} (Qty: ${item.quantity})`, 20, yPos)
        yPos += 6
      }
    }
    yPos += 4
    
    yPos = checkAddPage(yPos, 15)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    yPos = checkAddPage(yPos, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Timeline:', 15, yPos)
    yPos += 10
    doc.setFont('helvetica', 'normal')
    
    doc.text(`Issue Date:`, 20, yPos)
    doc.text(new Date(log.issued_at).toLocaleString('en-IN'), 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Expected Return:`, 20, yPos)
    doc.text(new Date(log.return_date).toLocaleDateString('en-IN'), 85, yPos)
    yPos += 8
    
    if (log.returned_at) {
      yPos = checkAddPage(yPos, 10)
      doc.text(`Returned On:`, 20, yPos)
      doc.text(new Date(log.returned_at).toLocaleString('en-IN'), 85, yPos)
      yPos += 8
      
      if (log.actual_return_date) {
        yPos = checkAddPage(yPos, 10)
        doc.text(`Actual Return Date:`, 20, yPos)
        doc.text(new Date(log.actual_return_date).toLocaleDateString('en-IN'), 85, yPos)
        yPos += 8
        
        const returnDate = new Date(log.return_date)
        const actualDate = new Date(log.actual_return_date)
        const delayDays = Math.floor((actualDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (delayDays > 0) {
          yPos = checkAddPage(yPos, 10)
          doc.setTextColor(220, 38, 38)
          doc.text(`Delay:`, 20, yPos)
          doc.text(`${delayDays} day(s)`, 85, yPos)
          doc.setTextColor(0, 0, 0)
          yPos += 8
        }
      }
    }
    
    yPos = checkAddPage(yPos, 15)
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    yPos = checkAddPage(yPos, 50)
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Chain:', 15, yPos)
    yPos += 10
    
    if (log.hod_name) {
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY HOD:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(log.hod_name, 85, yPos)
      yPos += 7
      if (log.hod_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.hod_approved_at).toLocaleString('en-IN')}`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    }
    
    yPos = checkAddPage(yPos, 20)
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    if (log.returned_at) {
      doc.setFillColor(34, 197, 94)
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('RETURNED', 40, yPos + 7, { align: 'center' })
    } else {
      doc.setFillColor(59, 130, 246)
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('ISSUED', 40, yPos + 7, { align: 'center' })
    }
    doc.setTextColor(0, 0, 0)
    
    yPos = checkAddPage(yPos, 30)
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = 20
    } else {
      yPos = pageHeight - 20
    }
    
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, yPos + 7)
    doc.text(`Request ID: ${log.id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Component_Log_${log.id}_${log.requester_name.replace(/\s+/g, '_')}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const filteredComponents = selectedLab === 'all' 
    ? components 
    : components.filter(c => c.lab_name === selectedLab)

  const filteredBookingLogs = selectedLab === 'all'
    ? bookingLogs
    : bookingLogs.filter(l => l.lab_name === selectedLab)

  const filteredComponentLogs = selectedLab === 'all'
    ? componentLogs
    : componentLogs.filter(l => l.lab_name === selectedLab)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Labs</h1>
          <p className="text-muted-foreground mt-1">Manage lab inventory and view logs</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedLab} onValueChange={setSelectedLab}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by lab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labs</SelectItem>
              {uniqueLabs.map(lab => (
                <SelectItem key={lab} value={lab}>{lab}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="components" className="gap-2">
            <Package className="h-4 w-4" />
            Components Inventory
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Calendar className="h-4 w-4" />
            Lab Booking Logs
          </TabsTrigger>
          <TabsTrigger value="component-logs" className="gap-2">
            <History className="h-4 w-4" />
            Component Issue Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-6">Loading...</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Labs</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{labs.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Components</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredComponents.length}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4">
                {labs.filter(l => selectedLab === 'all' || l.name === selectedLab).map(lab => {
                  const labComps = components.filter(c => c.lab_id === lab.id)
                  return (
                    <Card key={lab.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{lab.name}</CardTitle>
                          <Badge variant="outline">{labComps.length} components</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {labComps.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No components</p>
                        ) : (
                          <div className="space-y-2">
                            {labComps.map(comp => (
                              <div key={comp.id} className="flex items-center justify-between p-2 rounded border">
                                <div>
                                  <p className="font-medium">{comp.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {comp.category} {comp.model && `• ${comp.model}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={comp.quantity_available > 0 ? 'default' : 'destructive'}>
                                    {comp.quantity_available}/{comp.quantity_total}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">{comp.condition_status}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by lab, requester, purpose, or email..."
              value={bookingLogsSearch}
              onChange={(e) => setBookingLogsSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadBookingLogs()}
              className="max-w-md"
            />
            <Button onClick={loadBookingLogs} size="sm">
              Search
            </Button>
            {bookingLogsSearch && (
              <Button onClick={() => { 
                setBookingLogsSearch(''); 
                setTimeout(loadBookingLogs, 100);
              }} size="sm" variant="outline">
                Clear
              </Button>
            )}
          </div>

          {loading ? (
            <Card><CardContent className="p-6">Loading...</CardContent></Card>
          ) : filteredBookingLogs.length === 0 ? (
            <Card><CardContent className="p-6">No booking logs found</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {filteredBookingLogs.map(log => {
                return (
                  <Card key={log.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{log.lab_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.booking_date).toLocaleDateString('en-IN')} • {log.start_time} - {log.end_time}
                          </p>
                        </div>
                        <Badge variant="default">Approved</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Purpose:</p>
                        <p className="text-sm text-muted-foreground">{log.purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Requested by:</p>
                        <p className="text-sm text-muted-foreground">{log.requester_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => generatePDF(log, true)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>
                        <Button size="sm" onClick={() => generatePDF(log, false)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="component-logs" className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by lab, requester, component, purpose, or email..."
              value={componentLogsSearch}
              onChange={(e) => setComponentLogsSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadComponentLogs()}
              className="max-w-md"
            />
            <Button onClick={loadComponentLogs} size="sm">
              Search
            </Button>
            {componentLogsSearch && (
              <Button onClick={() => { 
                setComponentLogsSearch(''); 
                setTimeout(loadComponentLogs, 100);
              }} size="sm" variant="outline">
                Clear
              </Button>
            )}
          </div>

          {loading ? (
            <Card><CardContent className="p-6">Loading...</CardContent></Card>
          ) : filteredComponentLogs.length === 0 ? (
            <Card><CardContent className="p-6">No component logs found</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {filteredComponentLogs.map(log => {
                return (
                  <Card key={log.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{log.lab_name} - Request #{log.id}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Issued: {new Date(log.issued_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <Badge variant={log.returned_at ? 'default' : 'secondary'}>
                          {log.returned_at ? 'Returned' : 'Issued'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Purpose:</p>
                        <p className="text-sm text-muted-foreground">{log.purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Requested by:</p>
                        <p className="text-sm text-muted-foreground">{log.requester_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Components:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {log.items?.map((item) => (
                            <li key={item.id}>{item.component_name} (Qty: {item.quantity})</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => generateComponentLogPDF(log, true)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>
                        <Button size="sm" onClick={() => generateComponentLogPDF(log, false)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
