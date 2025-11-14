"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, ArrowLeft, User, Building, CheckCircle2, Users, ChevronDown, ChevronUp, Download, Eye, FileText, Package } from 'lucide-react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface BookingLog {
  id: number
  log_id?: number  // Deprecated, use id instead
  requester_name: string | null
  requester_salutation?: string
  requester_email: string | null
  requester_role: string | null
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
  faculty_supervisor_name: string | null
  faculty_supervisor_salutation?: string
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_salutation?: string
  lab_staff_approved_at: string | null
  lab_coordinator_name: string | null
  lab_coordinator_salutation?: string
  lab_coordinator_approved_at: string | null
  hod_name: string | null
  hod_salutation?: string
  hod_approved_at: string | null
  created_at: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
}

interface ComponentLog {
  id: number
  log_id?: number  // Deprecated, use id instead
  requester_name: string | null
  requester_salutation?: string
  requester_email: string | null
  requester_role: string | null
  lab_name: string
  purpose: string
  issued_at: string
  return_date: string
  returned_at: string | null
  actual_return_date: string | null
  faculty_name: string | null
  faculty_salutation?: string
  faculty_approved_at: string | null
  lab_staff_name: string | null
  lab_staff_salutation?: string
  lab_staff_approved_at: string | null
  lab_coordinator_name: string | null
  lab_coordinator_salutation?: string
  lab_coordinator_approved_at: string | null
  hod_name: string | null
  hod_salutation?: string
  hod_approved_at: string | null
  items: Array<{ component_name: string; quantity_requested?: number; quantity?: number }>
  components_list?: string
  created_at: string
  highest_approval_authority?: 'hod' | 'lab_coordinator'
}

// Helper function to format names with salutation
const formatNameWithSalutation = (name: string | null, salutation?: string): string => {
  if (!name) return 'Unknown'
  if (!salutation || salutation === 'none') return name
  
  const salutationMap: Record<string, string> = {
    'prof': 'Prof.',
    'dr': 'Dr.',
    'mr': 'Mr.',
    'mrs': 'Mrs.'
  }
  
  const prefix = salutationMap[salutation] || ''
  return prefix ? `${prefix} ${name}` : name
}

const BookingLogTimeline = ({ log }: { log: BookingLog }) => {
  // Determine the actual approver based on highest_approval_authority
  const approvalAuthorityLabel = log.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
  const approverName = log.highest_approval_authority === 'lab_coordinator'
    ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
    : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
  const approvalDate = log.highest_approval_authority === 'lab_coordinator'
    ? log.lab_coordinator_approved_at
    : log.hod_approved_at
  const hasFinalApproval = log.lab_coordinator_name || log.hod_name
  
  return (
    <div className="space-y-3">
      {/* Request Created */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-blue-500 p-1">
            <Clock className="h-3 w-3 text-white" />
          </div>
          {(log.faculty_supervisor_name || log.lab_staff_name || hasFinalApproval) && (
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
      
      {/* Faculty Approval (for student bookings) */}
      {log.requester_role === 'student' && log.faculty_supervisor_name && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-500 p-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            {(log.lab_staff_name || hasFinalApproval) && (
              <div className="w-px h-8 bg-gray-300" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm font-medium">Recommended by Faculty</p>
            <p className="text-xs text-muted-foreground">
              {formatNameWithSalutation(log.faculty_supervisor_name, log.faculty_supervisor_salutation)}
            </p>
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
            {hasFinalApproval && (
              <div className="w-px h-8 bg-gray-300" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm font-medium">Recommended by Lab Staff</p>
            <p className="text-xs text-muted-foreground">
              {formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation)}
            </p>
            {log.lab_staff_approved_at && (
              <p className="text-xs text-muted-foreground">
                {new Date(log.lab_staff_approved_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* HOD/Lab Coordinator Final Approval */}
      {hasFinalApproval && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-600 p-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">APPROVED BY {approvalAuthorityLabel.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{approverName}</p>
            {approvalDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(approvalDate).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ComponentLogTimeline = ({ log }: { log: ComponentLog }) => {
  // Determine the actual approver based on highest_approval_authority
  const approvalAuthorityLabel = log.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
  const approverName = log.highest_approval_authority === 'lab_coordinator'
    ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
    : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
  const approvalDate = log.highest_approval_authority === 'lab_coordinator'
    ? log.lab_coordinator_approved_at
    : log.hod_approved_at
  const hasFinalApproval = log.lab_coordinator_name || log.hod_name
  
  return (
    <div className="space-y-3">
      {/* Request Created */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-blue-500 p-1">
            <Clock className="h-3 w-3 text-white" />
          </div>
          {(log.faculty_name || log.lab_staff_name || hasFinalApproval) && (
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
      
      {/* Faculty Approval (for student requests) */}
      {log.requester_role === 'student' && log.faculty_name && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-500 p-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            {(log.lab_staff_name || hasFinalApproval) && (
              <div className="w-px h-8 bg-gray-300" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm font-medium">Recommended by Faculty</p>
            <p className="text-xs text-muted-foreground">
              {formatNameWithSalutation(log.faculty_name, log.faculty_salutation)}
            </p>
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
            {hasFinalApproval && (
              <div className="w-px h-8 bg-gray-300" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm font-medium">Recommended by Lab Staff</p>
            <p className="text-xs text-muted-foreground">
              {formatNameWithSalutation(log.lab_staff_name, log.lab_staff_salutation)}
            </p>
            {log.lab_staff_approved_at && (
              <p className="text-xs text-muted-foreground">
                {new Date(log.lab_staff_approved_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* HOD/Lab Coordinator Final Approval */}
      {hasFinalApproval && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-600 p-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">APPROVED BY {approvalAuthorityLabel.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{approverName}</p>
            {approvalDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(approvalDate).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LabStaffLogsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [bookingLogs, setBookingLogs] = useState<BookingLog[]>([])
  const [componentLogs, setComponentLogs] = useState<ComponentLog[]>([])
  const [activeTab, setActiveTab] = useState<'booking'|'component'>('booking')
  const [bookingSearch, setBookingSearch] = useState('')
  const [componentSearch, setComponentSearch] = useState('')
  const [expandedTimelines, setExpandedTimelines] = useState<Set<number>>(new Set())

  // Calculate academic year dates (1 Aug to 31 July)
  const getAcademicYearDates = () => {
    const today = new Date()
    const currentMonth = today.getMonth() // 0-11 (0 = Jan, 7 = Aug)
    const currentYear = today.getFullYear()
    
    // If current month is Jan-July (0-6), academic year started last Aug
    // If current month is Aug-Dec (7-11), academic year started this Aug
    const academicYearStart = currentMonth >= 7 
      ? new Date(currentYear, 7, 1) // Aug 1 this year
      : new Date(currentYear - 1, 7, 1) // Aug 1 last year
    
    const academicYearEnd = currentMonth >= 7
      ? new Date(currentYear + 1, 6, 31) // July 31 next year
      : new Date(currentYear, 6, 31) // July 31 this year
    
    return {
      start: academicYearStart.toISOString().split('T')[0],
      end: academicYearEnd.toISOString().split('T')[0]
    }
  }
  
  const academicYear = getAcademicYearDates()
  const [bookingStartDate, setBookingStartDate] = useState(academicYear.start)
  const [bookingEndDate, setBookingEndDate] = useState(academicYear.end)
  const [componentStartDate, setComponentStartDate] = useState(academicYear.start)
  const [componentEndDate, setComponentEndDate] = useState(academicYear.end)

  const toggleTimeline = (id: number) => {
    setExpandedTimelines(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const loadBookingLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'booking',
        ...(bookingStartDate && { startDate: bookingStartDate }),
        ...(bookingEndDate && { endDate: bookingEndDate }),
      })

      const res = await fetch(`/api/lab-staff/activity-logs?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch booking logs')
      
      const data = await res.json()
      setBookingLogs(data.bookingLogs || [])
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
        type: 'component',
        ...(componentStartDate && { startDate: componentStartDate }),
        ...(componentEndDate && { endDate: componentEndDate }),
      })

      const res = await fetch(`/api/lab-staff/activity-logs?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch component logs')
      
      const data = await res.json()
      
      // Process component lists
      const processedData = (data.componentLogs || []).map((log: any) => ({
        ...log,
        components_list: log.items?.map((item: any) => 
          `${item.component_name} (Qty: ${item.quantity_requested || item.quantity || 1})`
        ).join(', ') || 'No components listed'
      }))
      
      setComponentLogs(processedData)
    } catch (error) {
      console.error('Error loading component logs:', error)
      toast({ title: 'Error', description: 'Failed to load component logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const generateBookingLogPDF = async (log: BookingLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    // Add page border
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    doc.setDrawColor(3, 77, 162)
    doc.setLineWidth(1)
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
    
    // Add LNMIIT logo
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 12, 40, 20)
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
    doc.text('Lab Booking Approval Document', 105, 34, { align: 'center' })
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 38, 195, 38)
    
    // Booking Details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 50
    
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
    
    // Requester Information
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    doc.text(`Name:`, 20, yPos)
    doc.text(formatNameWithSalutation(log.requester_name, log.requester_salutation), 70, yPos)
    yPos += 7
    
    doc.text(`Email:`, 20, yPos)
    doc.text(log.requester_email || '', 70, yPos)
    yPos += 7
    
    doc.text(`Role:`, 20, yPos)
    doc.text((log.requester_role || 'student').toUpperCase(), 70, yPos)
    yPos += 10
    
    // Approval Chain
    const approvalAuthorityLabel = log.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
    const approverName = log.highest_approval_authority === 'lab_coordinator'
      ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
      : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
    const approvalDate = log.highest_approval_authority === 'lab_coordinator'
      ? log.lab_coordinator_approved_at
      : log.hod_approved_at
    const hasFinalApproval = log.lab_coordinator_name || log.hod_name
    
    doc.setFont('helvetica', 'bold')
    doc.text('Approval/Recommendation Chain:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    // Faculty Recommendation
    if (log.faculty_supervisor_name) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`Recommended by Faculty:`, 25, yPos)
      doc.text(formatNameWithSalutation(log.faculty_supervisor_name, log.faculty_supervisor_salutation), 85, yPos)
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
    
    // Final Approval
    if (hasFinalApproval) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      const approvalText = `APPROVED BY ${approvalAuthorityLabel.toUpperCase()}:`
      doc.text(approvalText, 25, yPos)
      
      // Calculate position for name to avoid overlap
      const approvalTextWidth = doc.getTextWidth(approvalText)
      const nameXPos = 25 + approvalTextWidth + 3 // 3px spacing
      
      doc.setFont('helvetica', 'normal')
      doc.text(approverName, nameXPos, yPos)
      yPos += 7
      if (approvalDate) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(approvalDate).toLocaleString('en-IN')}`, nameXPos, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    }
    
    yPos += 10
    
    // Status Badge
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(34, 197, 94)
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
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos + 7, { align: 'center' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Lab_Booking_${log.id}_${(log.requester_name || 'booking').replace(/\s+/g, '_')}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  const generateComponentLogPDF = async (log: ComponentLog, viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    // Add page border
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    doc.setDrawColor(3, 77, 162)
    doc.setLineWidth(1)
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
    
    // Add LNMIIT logo
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 12, 40, 20)
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
    doc.text('Component Issue/Return Document', 105, 34, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(15, 38, 195, 38)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 50
    
    // Component Issue Information
    doc.setFont('helvetica', 'bold')
    doc.text('Issue Information:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    doc.text(`Lab Name:`, 20, yPos)
    doc.text(log.lab_name, 70, yPos)
    yPos += 7
    
    doc.text(`Issued Date:`, 20, yPos)
    doc.text(new Date(log.issued_at).toLocaleDateString('en-IN'), 70, yPos)
    yPos += 7
    
    doc.text(`Expected Return:`, 20, yPos)
    doc.text(new Date(log.return_date).toLocaleDateString('en-IN'), 70, yPos)
    yPos += 7
    
    if (log.returned_at) {
      doc.text(`Returned Date:`, 20, yPos)
      doc.text(new Date(log.returned_at).toLocaleDateString('en-IN'), 70, yPos)
      yPos += 7
    }
    
    doc.text(`Purpose:`, 20, yPos)
    const purposeLines = doc.splitTextToSize(log.purpose, 120)
    doc.text(purposeLines, 70, yPos)
    yPos += (purposeLines.length * 7) + 5
    
    // Requester Information
    doc.setFont('helvetica', 'bold')
    doc.text('Requester Information:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    doc.text(`Name:`, 20, yPos)
    doc.text(formatNameWithSalutation(log.requester_name, log.requester_salutation), 70, yPos)
    yPos += 7
    
    doc.text(`Email:`, 20, yPos)
    doc.text(log.requester_email || '', 70, yPos)
    yPos += 7
    
    doc.text(`Role:`, 20, yPos)
    doc.text((log.requester_role || 'student').toUpperCase(), 70, yPos)
    yPos += 10
    
    // Components List
    doc.setFont('helvetica', 'bold')
    doc.text('Components Issued:', 15, yPos)
    yPos += 7
    
    if (log.items && log.items.length > 0) {
      log.items.forEach((item: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`• ${item.component_name}`, 20, yPos)
        doc.text(`Qty: ${item.quantity_requested || item.quantity || 1}`, 150, yPos)
        yPos += 7
      })
    }
    yPos += 5
    
    // Approval Chain
    const approvalAuthorityLabel = log.highest_approval_authority === 'lab_coordinator' ? 'Lab Coordinator' : 'HOD'
    const approverName = log.highest_approval_authority === 'lab_coordinator'
      ? formatNameWithSalutation(log.lab_coordinator_name || '', log.lab_coordinator_salutation)
      : formatNameWithSalutation(log.hod_name || '', log.hod_salutation)
    const approvalDate = log.highest_approval_authority === 'lab_coordinator'
      ? log.lab_coordinator_approved_at
      : log.hod_approved_at
    const hasFinalApproval = log.lab_coordinator_name || log.hod_name
    
    doc.setFont('helvetica', 'bold')
    doc.text('Approval/Recommendation Chain:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10
    
    // Faculty Recommendation (for student requests)
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
    
    // Lab Staff Recommendation
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
    
    // Final Approval
    if (hasFinalApproval) {
      doc.setFont('helvetica', 'bold')
      doc.text('✓', 20, yPos)
      const approvalText = `APPROVED BY ${approvalAuthorityLabel.toUpperCase()}:`
      doc.text(approvalText, 25, yPos)
      
      // Calculate position for name to avoid overlap
      const approvalTextWidth = doc.getTextWidth(approvalText)
      const nameXPos = 25 + approvalTextWidth + 3 // 3px spacing
      
      doc.setFont('helvetica', 'normal')
      doc.text(approverName, nameXPos, yPos)
      yPos += 7
      if (approvalDate) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Final approval on: ${new Date(approvalDate).toLocaleString('en-IN')}`, nameXPos, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        yPos += 7
      }
    }
    
    yPos += 10
    
    // Status Badge
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
    
    // Footer
    yPos = 270
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos + 7, { align: 'center' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos + 14, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'PDF opened in new tab!' })
    } else {
      doc.save(`Component_Issue_${log.id}_${(log.requester_name || 'issue').replace(/\s+/g, '_')}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully!' })
    }
  }

  useEffect(() => {
    loadBookingLogs()
    loadComponentLogs()
  }, [])

  const filteredBookingLogs = useMemo(() => {
    return bookingLogs.filter(log => {
      const searchLower = bookingSearch.toLowerCase()
      return (
        (log.requester_name || '').toLowerCase().includes(searchLower) ||
        (log.requester_email || '').toLowerCase().includes(searchLower) ||
        log.lab_name.toLowerCase().includes(searchLower) ||
        log.purpose.toLowerCase().includes(searchLower) ||
        log.id.toString().includes(searchLower)
      )
    })
  }, [bookingLogs, bookingSearch])

  const filteredComponentLogs = useMemo(() => {
    return componentLogs.filter(log => {
      const searchLower = componentSearch.toLowerCase()
      return (
        (log.requester_name || '').toLowerCase().includes(searchLower) ||
        (log.requester_email || '').toLowerCase().includes(searchLower) ||
        log.lab_name.toLowerCase().includes(searchLower) ||
        log.purpose.toLowerCase().includes(searchLower) ||
        log.components_list?.toLowerCase().includes(searchLower) ||
        log.id.toString().includes(searchLower)
      )
    })
  }, [componentLogs, componentSearch])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/lab-staff/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Activity Logs</h1>
          <p className="text-xs text-muted-foreground">
            View approved lab booking and component issue logs for your assigned labs
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-8">
          <TabsTrigger value="booking" className="text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Lab Booking Logs
            {filteredBookingLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{filteredBookingLogs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="component" className="text-xs flex items-center gap-1">
            <Package className="h-3 w-3" />
            Component Logs
            {filteredComponentLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{filteredComponentLogs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Booking Logs Tab */}
        <TabsContent value="booking" className="space-y-3">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, lab, purpose, or ID..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="max-w-md text-xs"
              />
              <Button onClick={loadBookingLogs} size="sm" variant="secondary" className="text-xs">
                Refresh
              </Button>
              {(bookingSearch || bookingStartDate !== academicYear.start || bookingEndDate !== academicYear.end) && (
                <Button onClick={() => { 
                  setBookingSearch('');
                  setBookingStartDate(academicYear.start);
                  setBookingEndDate(academicYear.end);
                  setTimeout(loadBookingLogs, 100);
                }} size="sm" variant="outline" className="text-xs">
                  Clear
                </Button>
              )}
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Date Range:</span>
              <Input
                type="date"
                value={bookingStartDate}
                onChange={(e) => setBookingStartDate(e.target.value)}
                className="w-[140px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={bookingEndDate}
                onChange={(e) => setBookingEndDate(e.target.value)}
                className="w-[140px] text-xs"
              />
              <Button onClick={loadBookingLogs} size="sm" variant="secondary" className="text-xs">
                Apply Dates
              </Button>
            </div>
          </div>

          {loading ? (
            <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">Loading...</CardContent></Card>
          ) : filteredBookingLogs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">No booking logs found</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredBookingLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{log.lab_name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-600">
                          {formatNameWithSalutation(log.requester_name, log.requester_salutation)}
                        </span>
                      </div>
                      {getStatusBadge(log.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(log.booking_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(log.start_time)} - {formatTime(log.end_time)}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="font-medium text-gray-700">Purpose: </span>
                      <span className="text-gray-600">{log.purpose}</span>
                    </div>

                    {/* View Timeline Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => toggleTimeline(log.id)}
                    >
                      {expandedTimelines.has(log.id) ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Hide Timeline
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          View Timeline
                        </>
                      )}
                    </Button>

                    {/* Timeline - Collapsible */}
                    {expandedTimelines.has(log.id) && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-gray-700 mb-3">Approval Timeline:</div>
                        <BookingLogTimeline log={log} />
                      </div>
                    )}

                    {/* PDF Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateBookingLogPDF(log, true)}
                        className="flex-1 text-xs h-8"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => generateBookingLogPDF(log, false)}
                        className="flex-1 text-xs h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Component Logs Tab */}
        <TabsContent value="component" className="space-y-3">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by lab, requester, component, purpose..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="max-w-md text-xs"
              />
              <Button onClick={loadComponentLogs} size="sm" variant="secondary" className="text-xs">
                Refresh
              </Button>
              {(componentSearch || componentStartDate !== academicYear.start || componentEndDate !== academicYear.end) && (
                <Button onClick={() => { 
                  setComponentSearch('');
                  setComponentStartDate(academicYear.start);
                  setComponentEndDate(academicYear.end);
                  setTimeout(loadComponentLogs, 100);
                }} size="sm" variant="outline" className="text-xs">
                  Clear
                </Button>
              )}
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Date Range:</span>
              <Input
                type="date"
                value={componentStartDate}
                onChange={(e) => setComponentStartDate(e.target.value)}
                className="w-[140px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={componentEndDate}
                onChange={(e) => setComponentEndDate(e.target.value)}
                className="w-[140px] text-xs"
              />
              <Button onClick={loadComponentLogs} size="sm" variant="secondary" className="text-xs">
                Apply Dates
              </Button>
            </div>
          </div>

          {loading ? (
            <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">Loading...</CardContent></Card>
          ) : filteredComponentLogs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">No component logs found</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredComponentLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{log.lab_name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-600">
                          {formatNameWithSalutation(log.requester_name, log.requester_salutation)}
                        </span>
                      </div>
                      <Badge variant={log.returned_at ? 'default' : 'secondary'} className="text-xs">
                        {log.returned_at ? 'Returned' : 'Issued'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Issued: {formatDate(log.issued_at)}</span>
                      </div>
                      {log.returned_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Returned: {formatDate(log.returned_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs">
                      <span className="font-medium text-gray-700">Purpose: </span>
                      <span className="text-gray-600">{log.purpose}</span>
                    </div>

                    <div className="text-xs">
                      <span className="font-medium text-gray-700">Components: </span>
                      <span className="text-gray-600">{log.components_list}</span>
                    </div>

                    {/* View Timeline Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => toggleTimeline(log.id)}
                    >
                      {expandedTimelines.has(log.id) ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Hide Timeline
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          View Timeline
                        </>
                      )}
                    </Button>

                    {/* Timeline - Collapsible */}
                    {expandedTimelines.has(log.id) && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-gray-700 mb-3">Approval Timeline:</div>
                        <ComponentLogTimeline log={log} />
                      </div>
                    )}

                    {/* PDF Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateComponentLogPDF(log, true)}
                        className="flex-1 text-xs h-8"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => generateComponentLogPDF(log, false)}
                        className="flex-1 text-xs h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download PDF
                      </Button>
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
