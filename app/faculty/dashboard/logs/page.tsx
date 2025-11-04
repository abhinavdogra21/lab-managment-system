"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Download, Calendar, FileText, Filter, Package, Users, Building2 } from 'lucide-react'
import jsPDF from 'jspdf'

interface ComponentLog {
  log_id: number
  requester_name: string | null
  requester_email: string | null
  requester_role: string | null
  lab_name: string
  purpose: string
  issued_at: string
  return_date: string
  returned_at: string | null
  actual_return_date: string | null
  faculty_name: string | null
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_approved_at: string | null
  hod_name: string | null
  hod_approved_at: string | null
  items: Array<{ component_name: string; quantity_requested?: number; quantity?: number }>
  components_list?: string
}

interface BookingLog {
  log_id: number
  requester_name: string | null
  requester_email: string | null
  requester_role: string | null
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  faculty_supervisor_name: string | null
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_approved_at: string | null
  hod_name: string | null
  hod_approved_at: string | null
}

export default function FacultyLogsPage() {
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [filteredComponentLogs, setFilteredComponentLogs] = useState<ComponentLog[]>([])
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [filteredBookingLogs, setFilteredBookingLogs] = useState<BookingLog[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'booking-logs' | 'component-logs'>('booking-logs')
  const [logsSource, setLogsSource] = useState<'all' | 'own' | 'mentees'>('all')
  const [componentLogsSearch, setComponentLogsSearch] = useState('')
  const [bookingLogsSearch, setBookingLogsSearch] = useState('')
  const [componentStartDate, setComponentStartDate] = useState('')
  const [componentEndDate, setComponentEndDate] = useState('')
  const [bookingStartDate, setBookingStartDate] = useState('')
  const [bookingEndDate, setBookingEndDate] = useState('')
  const { toast } = useToast()

  const startDateDefault = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  const endDateDefault = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setComponentStartDate(startDateDefault)
    setComponentEndDate(endDateDefault)
    setBookingStartDate(startDateDefault)
    setBookingEndDate(endDateDefault)
    // Load logs on initial mount after dates are set
    setTimeout(() => {
      loadComponentLogs()
      loadBookingLogs()
    }, 100)
  }, [])

  useEffect(() => {
    if (componentStartDate && componentEndDate) {
      loadComponentLogs()
    }
  }, [logsSource])

  const loadBookingLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        source: logsSource,
        ...(bookingStartDate && { startDate: bookingStartDate }),
        ...(bookingEndDate && { endDate: bookingEndDate }),
      })

      console.log('Loading booking logs with params:', {
        source: logsSource,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
      })

      const res = await fetch(`/api/faculty/logs/bookings?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        console.error('API error:', errorData)
        throw new Error('Failed to fetch booking logs')
      }
      
      const data = await res.json()
      console.log('Received booking logs:', data.length, 'logs')
      
      setBookingLogs(data)
      setFilteredBookingLogs(data)
    } catch (error) {
      console.error('Error loading booking logs:', error)
      toast({ title: 'Error', description: 'Failed to load booking logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadComponentLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        source: logsSource,
        ...(componentStartDate && { startDate: componentStartDate }),
        ...(componentEndDate && { endDate: componentEndDate }),
      })

      console.log('Loading component logs with params:', {
        source: logsSource,
        startDate: componentStartDate,
        endDate: componentEndDate,
      })

      const res = await fetch(`/api/faculty/logs/components?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        console.error('API error:', errorData)
        throw new Error('Failed to fetch logs')
      }
      
      const data = await res.json()
      console.log('Received component logs:', data.length, 'logs')
      
      // Process component lists
      const processedData = data.map((log: any) => ({
        ...log,
        components_list: log.items?.map((item: any) => 
          `${item.component_name} (Qty: ${item.quantity_requested || item.quantity || 1})`
        ).join(', ') || 'No components listed'
      }))
      
      setComponentLogs(processedData)
      setFilteredComponentLogs(processedData)
    } catch (error) {
      console.error('Error loading component logs:', error)
      toast({ title: 'Error', description: 'Failed to load component logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtered = componentLogs.filter(log => {
      const searchLower = componentLogsSearch.toLowerCase()
      return (
        (log.requester_name || '').toLowerCase().includes(searchLower) ||
        (log.requester_email || '').toLowerCase().includes(searchLower) ||
        log.lab_name.toLowerCase().includes(searchLower) ||
        log.purpose.toLowerCase().includes(searchLower) ||
        log.components_list?.toLowerCase().includes(searchLower)
      )
    })
    setFilteredComponentLogs(filtered)
  }, [componentLogsSearch, componentLogs])

  useEffect(() => {
    const filtered = bookingLogs.filter(log => {
      const searchLower = bookingLogsSearch.toLowerCase()
      return (
        (log.requester_name || '').toLowerCase().includes(searchLower) ||
        (log.requester_email || '').toLowerCase().includes(searchLower) ||
        log.lab_name.toLowerCase().includes(searchLower) ||
        log.purpose.toLowerCase().includes(searchLower)
      )
    })
    setFilteredBookingLogs(filtered)
  }, [bookingLogsSearch, bookingLogs])

  const generateComponentLogPDF = async (log: ComponentLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const marginBottom = 20
    
    // Helper function to check if we need a new page
    const checkAddPage = (currentY: number, spaceNeeded: number = 20) => {
      if (currentY + spaceNeeded > pageHeight - marginBottom) {
        doc.addPage()
        return 20 // Reset to top of new page
      }
      return currentY
    }
    
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
    const docTitle = log.returned_at 
      ? 'Component Return Certificate' 
      : 'Component Issue Certificate'
    doc.text(docTitle, 105, 40, { align: 'center' })
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    // Request Details
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
    doc.text(log.requester_name || 'Unknown', 85, yPos)
    yPos += 6
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`(${log.requester_email || 'N/A'})`, 85, yPos)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Role:`, 20, yPos)
    doc.text((log.requester_role || 'N/A').toUpperCase(), 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 20)
    doc.text(`Purpose:`, 20, yPos)
    const purposeLines = doc.splitTextToSize(log.purpose || 'N/A', 100)
    doc.text(purposeLines, 85, yPos)
    yPos += (purposeLines.length * 6) + 6
    
    yPos = checkAddPage(yPos, 15)
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Components List
    yPos = checkAddPage(yPos, 25)
    doc.setFont('helvetica', 'bold')
    doc.text('Issued Components:', 15, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const componentLines = doc.splitTextToSize(log.components_list || '', 175)
    doc.text(componentLines, 20, yPos)
    yPos += (componentLines.length * 5) + 10
    
    yPos = checkAddPage(yPos, 15)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Timeline
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
    
    if (log.returned_at && log.actual_return_date) {
      yPos = checkAddPage(yPos, 10)
      doc.text(`Actual Return Date:`, 20, yPos)
      doc.text(new Date(log.actual_return_date).toLocaleDateString('en-IN'), 85, yPos)
      yPos += 8
      
      // Calculate delay
      const returnDate = new Date(log.return_date)
      const actualDate = new Date(log.actual_return_date)
      const delayDays = Math.floor((actualDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24))
        
      if (delayDays > 0) {
        yPos = checkAddPage(yPos, 10)
        doc.setTextColor(220, 38, 38) // Red for delay
        doc.text(`Delay:`, 20, yPos)
        doc.text(`${delayDays} day(s)`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 8
      }
    }
    
    yPos = checkAddPage(yPos, 15)
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Approval Chain
    yPos = checkAddPage(yPos, 50)
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Chain:', 15, yPos)
    yPos += 10
    
    // Faculty Recommendation (for students)
    if (log.requester_role === 'student' && log.faculty_name) {
      yPos = checkAddPage(yPos, 20)
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
    
    // Lab Staff Recommendation
    if (log.lab_staff_name) {
      yPos = checkAddPage(yPos, 20)
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
    
    // HOD Final Approval
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
    
    // Status Badge
    doc.setFont('helvetica', 'bold')
    if (log.returned_at) {
      doc.setFillColor(34, 197, 94) // Green
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('RETURNED', 40, yPos + 7, { align: 'center' })
    } else {
      doc.setFillColor(59, 130, 246) // Blue
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('ISSUED', 40, yPos + 7, { align: 'center' })
    }
    doc.setTextColor(0, 0, 0)
    
    // Footer
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, yPos + 7)
    doc.text(`Request ID: ${log.log_id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      const requesterNameSafe = (log.requester_name || 'Unknown').replace(/\s+/g, '_')
      const fileName = log.returned_at 
        ? `Component_Return_${log.log_id}_${requesterNameSafe}.pdf`
        : `Component_Issue_${log.log_id}_${requesterNameSafe}.pdf`
      doc.save(fileName)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const generateBookingLogPDF = async (log: BookingLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const marginBottom = 20
    
    // Helper function to check if we need a new page
    const checkAddPage = (currentY: number, spaceNeeded: number = 20) => {
      if (currentY + spaceNeeded > pageHeight - marginBottom) {
        doc.addPage()
        return 20 // Reset to top of new page
      }
      return currentY
    }
    
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
    doc.text('Lab Booking Certificate', 105, 40, { align: 'center' })
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    // Booking Details
    let yPos = 60
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Booking Details:', 15, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Lab:`, 20, yPos)
    doc.text(log.lab_name, 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 15)
    doc.text(`Booking Date:`, 20, yPos)
    doc.text(new Date(log.booking_date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Time Slot:`, 20, yPos)
    doc.text(`${log.start_time} - ${log.end_time}`, 85, yPos)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Status:`, 20, yPos)
    doc.text(log.status.toUpperCase(), 85, yPos)
    yPos += 12
    
    yPos = checkAddPage(yPos, 15)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Requester Info
    yPos = checkAddPage(yPos, 25)
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 15, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Name:`, 20, yPos)
    doc.text(log.requester_name || 'Unknown', 85, yPos)
    yPos += 6
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`(${log.requester_email || 'N/A'})`, 85, yPos)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    yPos += 8
    
    yPos = checkAddPage(yPos, 10)
    doc.text(`Role:`, 20, yPos)
    doc.text((log.requester_role || 'student').toUpperCase(), 85, yPos)
    yPos += 12
    
    yPos = checkAddPage(yPos, 15)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Purpose
    yPos = checkAddPage(yPos, 25)
    doc.setFont('helvetica', 'bold')
    doc.text('Purpose:', 15, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const purposeLines = doc.splitTextToSize(log.purpose || 'N/A', 175)
    doc.text(purposeLines, 20, yPos)
    yPos += (purposeLines.length * 5) + 10
    
    yPos = checkAddPage(yPos, 15)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    // Approval Chain
    yPos = checkAddPage(yPos, 50)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Chain:', 15, yPos)
    yPos += 10
    
    // Faculty Recommendation (for students)
    if (log.requester_role === 'student' && log.faculty_supervisor_name) {
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Faculty:`, 25, yPos)
      doc.text(log.faculty_supervisor_name, 85, yPos)
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
    
    // Lab Staff Recommendation
    if (log.lab_staff_name) {
      yPos = checkAddPage(yPos, 20)
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
    
    // HOD Final Approval
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
    
    // Status Badge
    doc.setFont('helvetica', 'bold')
    if (log.status === 'approved') {
      doc.setFillColor(34, 197, 94) // Green
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('APPROVED', 40, yPos + 7, { align: 'center' })
    } else if (log.status === 'rejected') {
      doc.setFillColor(239, 68, 68) // Red
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('REJECTED', 40, yPos + 7, { align: 'center' })
    } else {
      doc.setFillColor(234, 179, 8) // Yellow
      doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('PENDING', 40, yPos + 7, { align: 'center' })
    }
    doc.setTextColor(0, 0, 0)
    
    // Footer
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, yPos + 7)
    doc.text(`Booking ID: ${log.log_id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      const requesterNameSafe = (log.requester_name || 'Unknown').replace(/\s+/g, '_')
      const bookingDateSafe = new Date(log.booking_date).toISOString().split('T')[0]
      const fileName = `Lab_Booking_${log.log_id}_${requesterNameSafe}_${bookingDateSafe}.pdf`
      doc.save(fileName)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending_faculty':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Faculty</Badge>
      case 'pending_lab_staff':
        return <Badge className="bg-blue-100 text-blue-800">Pending Lab Staff</Badge>
      case 'pending_hod':
        return <Badge className="bg-purple-100 text-purple-800">Pending HOD</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">View lab booking and component issue/return logs for your own requests and mentee requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="booking-logs" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lab Booking Logs
            </TabsTrigger>
            <TabsTrigger value="component-logs" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Component Logs
            </TabsTrigger>
          </TabsList>

          {/* Logs Source Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={logsSource} onValueChange={(v: any) => {
              setLogsSource(v)
              setTimeout(() => {
                loadBookingLogs()
                loadComponentLogs()
              }, 100)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Logs Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="mentees">My Own Logs</SelectItem>
                <SelectItem value="own">Mentee Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="booking-logs" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search booking logs..."
                value={bookingLogsSearch}
                onChange={(e) => setBookingLogsSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={loadBookingLogs} size="sm" variant="secondary">
                Refresh
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
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookingLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No lab booking logs found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBookingLogs.map((log) => (
                <Card key={log.log_id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.lab_name}</span>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {new Date(log.booking_date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} • {log.start_time} - {log.end_time}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateBookingLogPDF(log, true)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateBookingLogPDF(log, false)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Requester Info */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium mb-2">Requester</div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{log.requester_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{log.requester_email || 'N/A'}</div>
                            <Badge variant="outline" className="text-xs mt-1">{(log.requester_role || 'student').toLowerCase()}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Purpose */}
                      <div>
                        <div className="text-sm font-medium mb-1">Purpose</div>
                        <div className="text-sm text-muted-foreground">{log.purpose}</div>
                      </div>

                      {/* Approval Chain */}
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium mb-2">Approval Chain</div>
                        <div className="space-y-2">
                          {log.requester_role === 'student' && log.faculty_supervisor_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Recommended by Faculty:</span>
                              <span className="font-medium">{log.faculty_supervisor_name}</span>
                            </div>
                          )}
                          {log.lab_staff_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Recommended by Lab Staff:</span>
                              <span className="font-medium">{log.lab_staff_name}</span>
                            </div>
                          )}
                          {log.hod_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Approved by HOD:</span>
                              <span className="font-medium">{log.hod_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="component-logs" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={componentLogsSearch}
                onChange={(e) => setComponentLogsSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={loadComponentLogs} size="sm" variant="secondary">
                Refresh
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
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredComponentLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No component issue/return logs found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredComponentLogs.map((log) => (
                <Card key={log.log_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{log.lab_name}</span>
                          {log.returned_at ? (
                            <Badge className="bg-green-100 text-green-800">Returned</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">Issued</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Issued: {new Date(log.issued_at).toLocaleDateString('en-IN')}</span>
                          {log.returned_at && (
                            <>
                              <span>•</span>
                              <span>Returned: {new Date(log.returned_at).toLocaleDateString('en-IN')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateComponentLogPDF(log, true)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateComponentLogPDF(log, false)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {/* Requester Info */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Requester</div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{log.requester_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{log.requester_email || 'N/A'}</div>
                          <Badge variant="outline" className="text-xs mt-1">{(log.requester_role || 'N/A').toUpperCase()}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Components List */}
                    <div>
                      <div className="text-sm font-medium mb-1">Components</div>
                      <div className="text-sm text-muted-foreground">{log.components_list}</div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <div className="text-sm font-medium mb-1">Purpose</div>
                      <div className="text-sm text-muted-foreground">{log.purpose}</div>
                    </div>

                    {/* Timeline */}
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Timeline</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Expected Return:</span>
                          <span className="ml-2 font-medium">{new Date(log.return_date).toLocaleDateString('en-IN')}</span>
                        </div>
                        {log.returned_at && log.actual_return_date && (() => {
                          const returnDate = new Date(log.return_date)
                          const actualDate = new Date(log.actual_return_date)
                          const delayDays = Math.floor((actualDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24))
                          return delayDays > 0 ? (
                            <div>
                              <span className="text-red-600">Delay:</span>
                              <span className="ml-2 font-medium text-red-600">{delayDays} day(s)</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {/* Approval Chain */}
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Approval Chain</div>
                      <div className="space-y-2">
                        {log.requester_role === 'student' && log.faculty_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-muted-foreground">Recommended by Faculty:</span>
                            <span className="font-medium">{log.faculty_name}</span>
                          </div>
                        )}
                        {log.lab_staff_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-muted-foreground">Recommended by Lab Staff:</span>
                            <span className="font-medium">{log.lab_staff_name}</span>
                          </div>
                        )}
                        {log.hod_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-muted-foreground font-bold">APPROVED BY HOD:</span>
                            <span className="font-medium">{log.hod_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
