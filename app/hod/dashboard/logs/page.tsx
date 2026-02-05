/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Download, Calendar, Users, FileText, Filter, History, Building2, Search, Package } from 'lucide-react'
import jsPDF from 'jspdf'

interface BookingLog {
  id: number
  log_id?: number
  requester_name: string
  requester_salutation?: string | null
  requester_email: string
  requester_role: string
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  faculty_name: string | null
  faculty_salutation?: string | null
  faculty_email: string | null
  lab_staff_name: string | null
  lab_staff_salutation?: string | null
  lab_coordinator_name: string | null
  lab_coordinator_salutation?: string | null
  hod_name?: string | null
  hod_salutation?: string | null
  responsible_person_name?: string | null
  created_at: string
  faculty_approved_at: string | null
  lab_staff_approved_at: string | null
  lab_coordinator_approved_at: string | null
  hod_approved_at?: string | null
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  final_approver_role?: 'hod' | 'lab_coordinator' | null
}

interface ComponentLog {
  id: number
  log_id?: number
  requester_name: string
  requester_salutation?: string | null
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
  faculty_salutation?: string | null
  faculty_email: string | null
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_salutation?: string | null
  lab_staff_email: string | null
  lab_staff_approved_at: string | null
  lab_coordinator_name: string | null
  lab_coordinator_salutation?: string | null
  lab_coordinator_email: string | null
  lab_coordinator_approved_at: string | null
  hod_name?: string | null
  hod_salutation?: string | null
  hod_email?: string | null
  hod_approved_at?: string | null
  components_list: string
  created_at: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
  final_approver_role?: 'hod' | 'lab_coordinator' | null
}

export default function HODLogsPage() {
  const { toast } = useToast()
  
  const formatNameWithSalutation = (name: string | null | undefined, salutation?: string | null | undefined): string => {
    if (!name) return 'Unknown'
    if (!salutation || salutation === 'none') return name
    
    const salutationMap: Record<string, string> = {
      'prof': 'Prof.',
      'dr': 'Dr.',
      'mr': 'Mr.',
      'mrs': 'Mrs.'
    }
    
    const prefix = salutationMap[salutation.toLowerCase()]
    return prefix ? `${prefix} ${name}` : name
  }
  
  const formatTime = (time: string) => {
    // Convert HH:MM:SS or HH:MM to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const m = minutes || '00'
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${m} ${period}`
  }
  
  const getDefaultDates = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear
    const endYear = startYear + 1
    
    const startDateDefault = `${startYear}-08-01`
    const endDateDefault = `${endYear}-07-31`
    
    return { startDateDefault, endDateDefault }
  }
  
  const { startDateDefault, endDateDefault } = getDefaultDates()
  
  const [loading, setLoading] = useState(false)
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [activeTab, setActiveTab] = useState<'booking-logs' | 'component-logs'>('booking-logs')
  const [selectedLab, setSelectedLab] = useState<string>('all')
  const [bookingLogsSearch, setBookingLogsSearch] = useState('')
  const [componentLogsSearch, setComponentLogsSearch] = useState('')
  const [bookingStartDate, setBookingStartDate] = useState(startDateDefault)
  const [bookingEndDate, setBookingEndDate] = useState(endDateDefault)
  const [componentStartDate, setComponentStartDate] = useState(startDateDefault)
  const [componentEndDate, setComponentEndDate] = useState(endDateDefault)
  
  const uniqueLabs = Array.from(
    new Set([
      ...bookingLogs.map(l => l.lab_name),
      ...componentLogs.map(l => l.lab_name)
    ])
  ).sort()

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
    if (activeTab === 'booking-logs') {
      loadBookingLogs()
    } else {
      loadComponentLogs()
    }
  }, [activeTab])

  const generatePDF = async (log: BookingLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    doc.setDrawColor(3, 77, 162)
    doc.setLineWidth(1)
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
    
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 12, 35, 15)
    } catch (error) {
      console.error('Logo loading failed:', error)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('The LNM Institute of Information Technology, Jaipur', 105, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.text('Lab Booking Approval Report', 105, 27, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(15, 31, 195, 31)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 43
    
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
    doc.text(formatNameWithSalutation(log.requester_name, log.requester_salutation), 70, yPos)
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
    
    if (log.requester_role === 'student' && log.faculty_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Faculty:`, 25, yPos)
      doc.text(formatNameWithSalutation(log.faculty_name, log.faculty_salutation), 85, yPos)
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
      doc.text(formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation), 85, yPos)
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
    
    // Use final_approver_role (who ACTUALLY approved) with fallback to highest_approval_authority
    const actualApproverRole = log.final_approver_role || log.highest_approval_authority
    const approverIsHOD = actualApproverRole === 'hod' || (!actualApproverRole && log.hod_name && !log.lab_coordinator_name)
    
    if (approverIsHOD && log.hod_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY HOD:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatNameWithSalutation(log.hod_name, log.hod_salutation), 85, yPos)
      yPos += 7
      if (log.hod_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.hod_approved_at).toLocaleString('en-IN')}`, 85, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    } else if (log.lab_coordinator_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY LAB COORDINATOR:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatNameWithSalutation(log.lab_coordinator_name, log.lab_coordinator_salutation), 110, yPos)
      yPos += 7
      if (log.lab_coordinator_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.lab_coordinator_approved_at).toLocaleString('en-IN')}`, 110, yPos)
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
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos + 7, { align: 'center' })
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
    
    const addPageBorder = () => {
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      doc.setDrawColor(3, 77, 162)
      doc.setLineWidth(1)
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
    }
    
    const checkAddPage = (currentY: number, spaceNeeded: number = 20) => {
      if (currentY + spaceNeeded > pageHeight - marginBottom) {
        doc.addPage()
        addPageBorder()
        return 20
      }
      return currentY
    }
    
    addPageBorder()
    
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 12, 35, 15)
    } catch (error) {
      console.error('Logo loading failed:', error)
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('The LNM Institute of Information Technology, Jaipur', 105, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.text('Component Issue/Return Report', 105, 27, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(15, 31, 195, 31)
    
    let yPos = 43
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
    doc.text(formatNameWithSalutation(log.requester_name, log.requester_salutation), 85, yPos)
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
    const componentLines = doc.splitTextToSize(log.components_list, 175)
    doc.text(componentLines, 20, yPos)
    yPos += (componentLines.length * 5) + 10
    
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
    
    if (log.returned_at && log.actual_return_date) {
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
    
    yPos = checkAddPage(yPos, 15)
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 10
    
    yPos = checkAddPage(yPos, 50)
    doc.setFont('helvetica', 'bold')
    doc.text('Approval Chain:', 15, yPos)
    yPos += 10
    
    if (log.requester_role === 'student' && log.faculty_name) {
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Faculty:`, 25, yPos)
      doc.text(formatNameWithSalutation(log.faculty_name, log.faculty_salutation), 85, yPos)
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
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Lab Staff:`, 25, yPos)
      doc.text(formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation), 85, yPos)
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
    
    // Use final_approver_role (who ACTUALLY approved) with fallback to highest_approval_authority
    const actualApproverRole = log.final_approver_role || log.highest_approval_authority
    const approverIsHOD = actualApproverRole === 'hod' || (!actualApproverRole && log.hod_name && !log.lab_coordinator_name)
    
    if (approverIsHOD && log.hod_name) {
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY HOD:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatNameWithSalutation(log.hod_name, log.hod_salutation), 80, yPos)
      yPos += 7
      if (log.hod_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.hod_approved_at).toLocaleString('en-IN')}`, 80, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    } else if (log.lab_coordinator_name) {
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY LAB COORDINATOR:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatNameWithSalutation(log.lab_coordinator_name, log.lab_coordinator_salutation), 110, yPos)
      yPos += 7
      if (log.lab_coordinator_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.lab_coordinator_approved_at).toLocaleString('en-IN')}`, 110, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    } else if (log.lab_coordinator_name) {
      // Fallback to old logic if action is not available
      yPos = checkAddPage(yPos, 20)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFont('helvetica', 'bold')
      doc.text(`APPROVED BY LAB COORDINATOR:`, 25, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatNameWithSalutation(log.lab_coordinator_name, log.lab_coordinator_salutation), 110, yPos)
      yPos += 7
      if (log.lab_coordinator_approved_at) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(log.lab_coordinator_approved_at).toLocaleString('en-IN')}`, 110, yPos)
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
    
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos + 7, { align: 'center' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
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
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">View lab booking and component issue/return logs for your department</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="grid w-full grid-cols-2 max-w-lg">
            <TabsTrigger value="booking-logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lab Booking Logs
            </TabsTrigger>
            <TabsTrigger value="component-logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Component Logs
            </TabsTrigger>
          </TabsList>

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

        <TabsContent value="booking-logs" className="space-y-4">
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
                            })} • {formatTime(log.start_time)} - {formatTime(log.end_time)}
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

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium mb-2">Requester</div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{formatNameWithSalutation(log.requester_name, log.requester_salutation)}</div>
                            <div className="text-xs text-muted-foreground">{log.requester_email}</div>
                            <Badge variant="outline" className="text-xs mt-1">{log.requester_role}</Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">Purpose</div>
                        <div className="text-sm text-muted-foreground">{log.purpose}</div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="text-sm font-medium mb-2">Approval Chain</div>
                        <div className="space-y-2">
                          {log.requester_role === 'student' && log.faculty_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Recommended by Faculty:</span>
                              <span className="font-medium">{formatNameWithSalutation(log.faculty_name, log.faculty_salutation)}</span>
                            </div>
                          )}
                          {log.lab_staff_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Recommended by Lab Staff:</span>
                              <span className="font-medium">{formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation)}</span>
                            </div>
                          )}
                          {(log.lab_coordinator_name || log.hod_name) && (() => {
                            const actualApproverRole = log.final_approver_role || log.highest_approval_authority
                            const approvalAuthorityLabel = actualApproverRole === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
                            const approverName = actualApproverRole === 'lab_coordinator'
                              ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
                              : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
                            
                            return (
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-muted-foreground">Approved by {approvalAuthorityLabel}:</span>
                                <span className="font-medium">{approverName}</span>
                              </div>
                            )
                          })()}
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

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Requester</div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{formatNameWithSalutation(log.requester_name, log.requester_salutation)}</div>
                          <div className="text-xs text-muted-foreground">{log.requester_email}</div>
                          <Badge variant="outline" className="text-xs mt-1">{log.requester_role}</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-1">Components</div>
                      <div className="text-sm text-muted-foreground">{log.components_list}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-1">Purpose</div>
                      <div className="text-sm text-muted-foreground">{log.purpose}</div>
                    </div>

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

                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Approval Chain</div>
                      <div className="space-y-2">
                        {log.requester_role === 'student' && log.faculty_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-muted-foreground">Recommended by Faculty:</span>
                            <span className="font-medium">{formatNameWithSalutation(log.faculty_name, log.faculty_salutation)}</span>
                          </div>
                        )}
                        {log.lab_staff_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-muted-foreground">Recommended by Lab Staff:</span>
                            <span className="font-medium">{formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation)}</span>
                          </div>
                        )}
                        {(log.lab_coordinator_name || log.hod_name) && (() => {
                          const actualApproverRole = log.final_approver_role || log.highest_approval_authority
                          const approvalAuthorityLabel = actualApproverRole === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
                          const approverName = actualApproverRole === 'lab_coordinator'
                            ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
                            : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
                          
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground font-bold">APPROVED BY {approvalAuthorityLabel.toUpperCase()}:</span>
                              <span className="font-medium">{approverName}</span>
                            </div>
                          )
                        })()}
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
