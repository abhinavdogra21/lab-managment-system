"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Download, Package, Calendar, Users, Building, FileText, Filter, History, Building2, Search } from 'lucide-react'
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
  components_list: string
  created_at: string
}

export default function HODLabsPage() {
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
  const [bookingStartDate, setBookingStartDate] = useState('')
  const [bookingEndDate, setBookingEndDate] = useState('')
  const [componentStartDate, setComponentStartDate] = useState('')
  const [componentEndDate, setComponentEndDate] = useState('')
  
  // Get unique labs for filter - prioritize labs list, fallback to components/logs
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
      const res = await fetch('/api/hod/labs/components', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setLabs(data.labs || [])
        setComponents(data.components || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load components', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load components', variant: 'destructive' })
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
        ? `/api/hod/labs/booking-logs?${params.toString()}`
        : '/api/hod/labs/booking-logs'
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        console.log('Booking logs received:', data.logs)
        if (data.logs && data.logs.length > 0) {
          console.log('First booking log sample:', data.logs[0])
        }
        setBookingLogs(data.logs || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load booking logs', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load booking logs', variant: 'destructive' })
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
        ? `/api/hod/labs/component-logs?${params.toString()}`
        : '/api/hod/labs/component-logs'
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setComponentLogs(data.logs || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load component logs', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load component logs', variant: 'destructive' })
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
        logoImg.onerror = resolve // Continue even if logo fails
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
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    // Booking Details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 55
    
    // Booking Information
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
    
    // Student/Requester Information
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
    
    // Approval Chain
    doc.setFont('helvetica', 'bold')
    doc.text('Approval/Recommendation Chain:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    // Faculty Recommendation (if student and faculty exists)
    if (log.requester_role === 'student' && log.faculty_name) {
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
    
    // HOD Final Approval (only HOD gets "Approved by")
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
    
    // Status Badge
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(34, 197, 94) // Green color
    doc.roundedRect(15, yPos, 50, 10, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text('APPROVED', 40, yPos + 7, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    
    // Footer
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, yPos + 7)
    doc.text(`Booking ID: ${log.id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
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

  const generateLabInventoryPDF = async (lab: Lab, labComponents: LabComponent[], viewOnly: boolean = false) => {
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
    doc.text('Lab Components Inventory Report', 105, 40, { align: 'center' })
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    // Lab Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Lab: ${lab.name}`, 15, 55)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Total Components: ${labComponents.length}`, 15, 62)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, 68)
    
    // Components Table
    const tableData = labComponents.map(comp => [
      comp.name,
      comp.category || '-',
      comp.model || '-',
      `${comp.quantity_available}/${comp.quantity_total}`,
      comp.condition_status || 'working',
      comp.quantity_available === 0 ? 'Out of Stock' : 
        comp.quantity_available < comp.quantity_total * 0.3 ? 'Low Stock' : 'OK'
    ])

    autoTable(doc, {
      startY: 75,
      head: [['Component', 'Category', 'Model', 'Qty (Avail/Total)', 'Condition', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('This is a computer-generated document.', 105, pageHeight - 10, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'Inventory PDF opened in new tab!' })
    } else {
      doc.save(`Lab_Inventory_${lab.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: 'Success', description: 'Inventory PDF downloaded successfully!' })
    }
  }

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
    
    // Components List
    yPos = checkAddPage(yPos, 25)
    doc.setFont('helvetica', 'bold')
    doc.text('Issued Components:', 15, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const componentLines = doc.splitTextToSize(log.components_list, 175)
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
    doc.text(`Request ID: ${log.id}`, 195, yPos + 7, { align: 'right' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      const fileName = log.returned_at 
        ? `Component_Return_${log.id}_${log.requester_name.replace(/\s+/g, '_')}.pdf`
        : `Component_Issue_${log.id}_${log.requester_name.replace(/\s+/g, '_')}.pdf`
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lab Management</h1>
        <p className="text-muted-foreground mt-1">View components inventory and booking logs for your department labs</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Components Inventory
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lab Booking Logs
            </TabsTrigger>
            <TabsTrigger value="component-logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Component Logs
            </TabsTrigger>
          </TabsList>

          {/* Lab Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedLab} onValueChange={setSelectedLab}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by lab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labs</SelectItem>
                {uniqueLabs.map((lab) => (
                  <SelectItem key={lab} value={lab}>{lab}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="components" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading components...
              </CardContent>
            </Card>
          ) : labs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No labs found in your department
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Show all labs, with or without components */}
              {labs
                .filter(lab => selectedLab === 'all' || lab.name === selectedLab)
                .map(lab => {
                  const labComponents = components.filter(c => c.lab_id === lab.id)
                  return (
                    <Card key={lab.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {lab.name}
                          <Badge variant="secondary" className="ml-auto">
                            {labComponents.length} component{labComponents.length !== 1 ? 's' : ''}
                          </Badge>
                          {labComponents.length > 0 && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateLabInventoryPDF(lab, labComponents, true)}
                                className="flex items-center gap-2 ml-2"
                              >
                                <FileText className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateLabInventoryPDF(lab, labComponents, false)}
                                className="flex items-center gap-2 ml-1"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {labComponents.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No components in this lab yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {labComponents.map((comp) => (
                              <div key={comp.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{comp.name}</div>
                                  {comp.model && <div className="text-sm text-muted-foreground">Model: {comp.model}</div>}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <Badge variant="outline" className="text-xs">{comp.category}</Badge>
                                    {comp.condition_status && comp.condition_status !== 'working' && (
                                      <Badge variant="secondary" className="text-xs ml-1">{comp.condition_status}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    {comp.quantity_available}/{comp.quantity_total}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Available/Total</div>
                                  {comp.quantity_available === 0 && (
                                    <Badge variant="destructive" className="text-xs mt-1">Out of Stock</Badge>
                                  )}
                                  {comp.quantity_available > 0 && comp.quantity_available < comp.quantity_total * 0.3 && (
                                    <Badge className="text-xs mt-1 bg-yellow-100 text-yellow-800">Low Stock</Badge>
                                  )}
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
              {(bookingLogsSearch || bookingStartDate || bookingEndDate) && (
                <Button onClick={() => { 
                  setBookingLogsSearch('');
                  setBookingStartDate('');
                  setBookingEndDate('');
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
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading booking logs...
              </CardContent>
            </Card>
          ) : bookingLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved booking logs found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookingLogs
                .filter(log => selectedLab === 'all' || log.lab_name === selectedLab)
                .map((log) => (
                <Card key={log.log_id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePDF(log, true)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePDF(log, false)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Student/Requester Info */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium mb-2">Requester</div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{log.requester_name}</div>
                            <div className="text-xs text-muted-foreground">{log.requester_email}</div>
                            <Badge variant="outline" className="text-xs mt-1">{log.requester_role}</Badge>
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

        {/* Component Logs Tab */}
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
              {(componentLogsSearch || componentStartDate || componentEndDate) && (
                <Button onClick={() => { 
                  setComponentLogsSearch('');
                  setComponentStartDate('');
                  setComponentEndDate('');
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
          ) : componentLogs.length === 0 ? (
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
              {componentLogs
                .filter(log => selectedLab === 'all' || log.lab_name === selectedLab)
                .map((log) => (
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
                          <div className="text-sm font-medium">{log.requester_name}</div>
                          <div className="text-xs text-muted-foreground">{log.requester_email}</div>
                          <Badge variant="outline" className="text-xs mt-1">{log.requester_role}</Badge>
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
