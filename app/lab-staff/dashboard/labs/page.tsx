"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Download, Package, Calendar, Users, Building, FileText, Filter, History, Eye, Search, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react'
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
  hod_name: string | null
  hod_approved_at: string | null
  items: Array<{ id: number; component_name: string; quantity?: number; quantity_requested?: number }>
  created_at: string
}

export default function LabHeadLabsPage() {
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
  
  const [loading, setLoading] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])
  const [components, setComponents] = useState<LabComponent[]>([])
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [activeTab, setActiveTab] = useState<'inventory' | 'components' | 'logs' | 'component-logs'>('inventory')
  const [selectedLab, setSelectedLab] = useState<string>('all')
  const [bookingLogsSearch, setBookingLogsSearch] = useState('')
  const [componentLogsSearch, setComponentLogsSearch] = useState('')
  const [bookingStartDate, setBookingStartDate] = useState(startDateDefault)
  const [bookingEndDate, setBookingEndDate] = useState(endDateDefault)
  const [componentStartDate, setComponentStartDate] = useState(startDateDefault)
  const [componentEndDate, setComponentEndDate] = useState(endDateDefault)
  
  // Inventory management state
  const [inventoryLab, setInventoryLab] = useState<string>('')
  const [inventoryComponents, setInventoryComponents] = useState<LabComponent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [addForm, setAddForm] = useState({ name: '', category: '', model: '', condition_status: 'working', quantity_total: 1 })
  const [addLoading, setAddLoading] = useState(false)
  
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
      const params = new URLSearchParams()
      if (bookingLogsSearch) params.append('search', bookingLogsSearch)
      if (bookingStartDate) params.append('startDate', bookingStartDate)
      if (bookingEndDate) params.append('endDate', bookingEndDate)
      
      const url = params.toString() 
        ? `/api/lab-staff/labs/booking-logs?${params.toString()}`
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
      const params = new URLSearchParams()
      if (componentLogsSearch) params.append('search', componentLogsSearch)
      if (componentStartDate) params.append('startDate', componentStartDate)
      if (componentEndDate) params.append('endDate', componentEndDate)
      
      const url = params.toString() 
        ? `/api/lab-staff/labs/component-logs?${params.toString()}`
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
    } else if (activeTab === 'component-logs') {
      loadComponentLogs()
    } else if (activeTab === 'inventory') {
      loadComponents()
    }
  }, [activeTab])
  
  useEffect(() => {
    if (inventoryLab && activeTab === 'inventory') {
      loadInventoryComponents(Number(inventoryLab))
    }
  }, [inventoryLab])
  
  const loadInventoryComponents = async (labId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lab-staff/components?lab_id=${labId}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setInventoryComponents(data.components || [])
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load components', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load components', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddComponent = async () => {
    if (!inventoryLab || !addForm.name.trim() || !Number.isFinite(Number(addForm.quantity_total))) {
      toast({ title: 'Missing info', description: 'Select lab, enter name and quantity', variant: 'destructive' })
      return
    }
    setAddLoading(true)
    try {
      const res = await fetch('/api/lab-staff/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lab_id: Number(inventoryLab),
          name: addForm.name.trim(),
          category: addForm.category || null,
          model: addForm.model || null,
          condition_status: addForm.condition_status,
          quantity_total: Number(addForm.quantity_total)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add component')
      toast({ title: 'Success', description: 'Component added successfully' })
      setAddForm({ name: '', category: '', model: '', condition_status: 'working', quantity_total: 1 })
      loadInventoryComponents(Number(inventoryLab))
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add component', variant: 'destructive' })
    } finally {
      setAddLoading(false)
    }
  }

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
    doc.text((log.requester_role || 'Unknown').toUpperCase(), 85, yPos)
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
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Manage Inventory
          </TabsTrigger>
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

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Lab</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={inventoryLab} onValueChange={setInventoryLab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a lab to manage" />
                </SelectTrigger>
                <SelectContent>
                  {labs.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">No labs assigned</div>
                  ) : (
                    labs.map(l => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {inventoryLab && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Components in Lab</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : inventoryComponents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No components yet.</div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="search" className="flex items-center gap-2">
                          <Search className="h-4 w-4" /> Search Components
                        </Label>
                        <Input
                          id="search"
                          type="text"
                          placeholder="Search by name, model, or category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {inventoryComponents
                          .filter(c => {
                            if (!searchQuery.trim()) return true
                            const q = searchQuery.toLowerCase()
                            return c.name.toLowerCase().includes(q) || 
                                   c.model?.toLowerCase().includes(q) || 
                                   c.category?.toLowerCase().includes(q)
                          })
                          .map(c => (
                            <div key={c.id} className="p-3 border rounded">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{c.name} {c.model && `(${c.model})`}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {c.category || 'Uncategorized'} • {c.condition_status} • 
                                    Available: {c.quantity_available}/{c.quantity_total}
                                  </div>
                                </div>
                                <Badge variant={c.quantity_available > 0 ? 'default' : 'destructive'}>
                                  {c.quantity_available}/{c.quantity_total}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Component
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input 
                      value={addForm.name} 
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} 
                      placeholder="Component name" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Input 
                        value={addForm.category} 
                        onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} 
                        placeholder="e.g., Electronics" 
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input 
                        value={addForm.model} 
                        onChange={(e) => setAddForm({ ...addForm, model: e.target.value })} 
                        placeholder="Model no." 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Condition</Label>
                      <Select 
                        value={addForm.condition_status} 
                        onValueChange={(v) => setAddForm({ ...addForm, condition_status: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="working">Working</SelectItem>
                          <SelectItem value="dead">Dead</SelectItem>
                          <SelectItem value="consumable">Consumable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        value={addForm.quantity_total} 
                        onChange={(e) => setAddForm({ ...addForm, quantity_total: Number(e.target.value) })} 
                      />
                    </div>
                  </div>
                  <div className="pt-1">
                    <Button onClick={handleAddComponent} disabled={addLoading} className="w-full">
                      {addLoading ? 'Adding...' : 'Add Component'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: If this lab has a Head Lab Staff, only the head can add components.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

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
          {/* Search and Date Filters */}
          <div className="flex flex-col gap-3">
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
              {(bookingLogsSearch || bookingStartDate !== startDateDefault || bookingEndDate !== endDateDefault) && (
                <Button onClick={() => { 
                  setBookingLogsSearch('');
                  setBookingStartDate(startDateDefault);
                  setBookingEndDate(endDateDefault);
                  setTimeout(loadBookingLogs, 100);
                }} size="sm" variant="outline">
                  Clear
                </Button>
              )}
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <Input
                type="date"
                value={bookingStartDate}
                onChange={(e) => setBookingStartDate(e.target.value)}
                className="w-[170px]"
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={bookingEndDate}
                onChange={(e) => setBookingEndDate(e.target.value)}
                className="w-[170px]"
                placeholder="To"
              />
              <Button onClick={loadBookingLogs} size="sm" variant="secondary">
                Apply Dates
              </Button>
            </div>
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
                      
                      {/* Timeline */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold mb-3">Approval Timeline:</p>
                        <div className="space-y-3">
                          {/* Request Created */}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full bg-blue-500 p-1">
                                <Clock className="h-3 w-3 text-white" />
                              </div>
                              {(log.faculty_name || log.lab_staff_name || log.hod_name) && (
                                <div className="w-px h-8 bg-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <p className="text-sm font-medium">Request Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Faculty Approval */}
                          {log.faculty_name && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="rounded-full bg-green-500 p-1">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                {(log.lab_staff_name || log.hod_name) && (
                                  <div className="w-px h-8 bg-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <p className="text-sm font-medium">Recommended by Faculty</p>
                                <p className="text-xs text-muted-foreground">{log.faculty_name}</p>
                                {log.faculty_approved_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.faculty_approved_at).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Lab Staff Approval */}
                          {log.lab_staff_name && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="rounded-full bg-green-500 p-1">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                {log.hod_name && (
                                  <div className="w-px h-8 bg-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <p className="text-sm font-medium">Recommended by Lab Staff</p>
                                <p className="text-xs text-muted-foreground">{log.lab_staff_name}</p>
                                {log.lab_staff_approved_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.lab_staff_approved_at).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* HOD Final Approval */}
                          {log.hod_name && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="rounded-full bg-green-600 p-1">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold">APPROVED BY HOD</p>
                                <p className="text-xs text-muted-foreground">{log.hod_name}</p>
                                {log.hod_approved_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.hod_approved_at).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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
          {/* Search and Date Filters */}
          <div className="flex flex-col gap-3">
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
              {(componentLogsSearch || componentStartDate !== startDateDefault || componentEndDate !== endDateDefault) && (
                <Button onClick={() => { 
                  setComponentLogsSearch('');
                  setComponentStartDate(startDateDefault);
                  setComponentEndDate(endDateDefault);
                  setTimeout(loadComponentLogs, 100);
                }} size="sm" variant="outline">
                  Clear
                </Button>
              )}
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <Input
                type="date"
                value={componentStartDate}
                onChange={(e) => setComponentStartDate(e.target.value)}
                className="w-[170px]"
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={componentEndDate}
                onChange={(e) => setComponentEndDate(e.target.value)}
                className="w-[170px]"
                placeholder="To"
              />
              <Button onClick={loadComponentLogs} size="sm" variant="secondary">
                Apply Dates
              </Button>
            </div>
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
                          {log.items?.map((item, index) => (
                            <li key={`${log.id}-component-${item.id || index}-${item.component_name}`}>
                              {item.component_name} (Qty: {item.quantity_requested || item.quantity || 0})
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Timeline */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold mb-3">Request Timeline:</p>
                        <div className="space-y-3">
                          {/* Request Created */}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full bg-blue-500 p-1">
                                <Clock className="h-3 w-3 text-white" />
                              </div>
                              <div className="w-px h-8 bg-gray-300" />
                            </div>
                            <div className="flex-1 pb-2">
                              <p className="text-sm font-medium">Request Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                          
                          {/* HOD Approval */}
                          {log.hod_name && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="rounded-full bg-green-600 p-1">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                                <div className="w-px h-8 bg-gray-300" />
                              </div>
                              <div className="flex-1 pb-2">
                                <p className="text-sm font-bold">APPROVED BY HOD</p>
                                <p className="text-xs text-muted-foreground">{log.hod_name}</p>
                                {log.hod_approved_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.hod_approved_at).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Components Issued */}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full bg-purple-500 p-1">
                                <Package className="h-3 w-3 text-white" />
                              </div>
                              {log.returned_at && (
                                <div className="w-px h-8 bg-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <p className="text-sm font-medium">Components Issued</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.issued_at).toLocaleString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expected return: {new Date(log.return_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Components Returned */}
                          {log.returned_at && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="rounded-full bg-green-500 p-1">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Components Returned</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(log.returned_at).toLocaleString('en-IN')}
                                </p>
                                {log.actual_return_date && (
                                  <>
                                    <p className="text-xs text-muted-foreground">
                                      Actual return date: {new Date(log.actual_return_date).toLocaleDateString('en-IN')}
                                    </p>
                                    {(() => {
                                      const returnDate = new Date(log.return_date)
                                      const actualDate = new Date(log.actual_return_date)
                                      const delayDays = Math.floor((actualDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24))
                                      if (delayDays > 0) {
                                        return (
                                          <p className="text-xs text-red-600 font-medium">
                                            Delay: {delayDays} day(s)
                                          </p>
                                        )
                                      }
                                      return null
                                    })()}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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
