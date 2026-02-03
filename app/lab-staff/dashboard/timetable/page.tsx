/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { CalendarDays, Clock, Search, Filter, Eye, Plus, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Types
interface Lab {
  id: number
  name: string
  code: string
  department: string
  capacity: number
  location: string
  is_head_staff?: number // 1 if user is head staff, 0 if just assigned
}

interface TimetableEntry {
  id: number
  lab_id: number
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  time_slot_start: string // HH:MM format
  time_slot_end: string // HH:MM format
  notes?: string
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
]

// Hourly time slots for the weekly view
const HOURLY_VIEW_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

export default function LabStaffTimetablePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("view")
  const [userId, setUserId] = useState<string>("")
  
  // Data states
  const [labs, setLabs] = useState<Lab[]>([])
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])
  
  // Filter states
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog states
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [entryDialogMode, setEntryDialogMode] = useState<"create" | "edit">("create")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Form state
  const [entryForm, setEntryForm] = useState<TimetableEntry>({
    id: 0,
    lab_id: null as any,
    day_of_week: 1,
    time_slot_start: "09:00",
    time_slot_end: "10:00",
    notes: "",
    is_active: true
  })

  // Get user ID from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      setUserId(user.id)
    }
  }, [])

  // Load data when userId is available
  useEffect(() => {
    if (userId) {
      loadAssignedLabs()
      loadTimetableEntries()
    }
  }, [userId])

  // Set default lab to CP1 when labs are loaded
  useEffect(() => {
    if (labs.length > 0 && !selectedLab) {
      const cp1Lab = labs.find(lab => lab.code === 'CP1')
      if (cp1Lab) {
        setSelectedLab(cp1Lab.id.toString())
      } else {
        setSelectedLab(labs[0].id.toString())
      }
    }
  }, [labs, selectedLab])

  const loadAssignedLabs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/lab-staff/labs")
      if (res.ok) {
        const data = await res.json()
        console.log('Lab staff labs loaded:', data.labs)
        setLabs(data.labs || [])
      } else {
        console.error('Failed to load labs, status:', res.status)
        toast({
          title: "Error",
          description: "Failed to load assigned labs",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to load labs:", error)
      toast({
        title: "Error",
        description: "Failed to load assigned labs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTimetableEntries = async () => {
    try {
      const res = await fetch("/api/lab-staff/timetable/entries")
      if (res.ok) {
        const data = await res.json()
        console.log('Timetable entries loaded:', data.entries?.length || 0)
        setTimetableEntries(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to load timetable entries:", error)
    }
  }

  const getLabName = (labId: number) => {
    const lab = labs.find(l => l.id === labId)
    return lab ? (lab.code === lab.name ? lab.name : `${lab.code} - ${lab.name}`) : 'Unknown Lab'
  }

  const resetEntryForm = () => setEntryForm({
    id: 0,
    lab_id: null as any,
    day_of_week: 1,
    time_slot_start: "09:00",
    time_slot_end: "10:00",
    notes: "",
    is_active: true
  })

  const openCreateEntry = () => {
    setEntryDialogMode("create")
    setFormError(null)
    resetEntryForm()
    setEntryDialogOpen(true)
  }

  const openEditEntry = (entry: TimetableEntry) => {
    setEntryDialogMode("edit")
    setFormError(null)
    const editForm = {
      ...entry,
      time_slot_start: entry.time_slot_start.substring(0, 5),
      time_slot_end: entry.time_slot_end.substring(0, 5)
    }
    setEntryForm(editForm)
    setEntryDialogOpen(true)
  }

  const saveEntry = async () => {
    setFormError(null)
    
    if (!entryForm.lab_id || !entryForm.time_slot_start || !entryForm.time_slot_end) {
      const msg = "Please select lab, start time and end time"
      setFormError(msg)
      toast({ title: "Cannot Save", description: msg, variant: "destructive" })
      return
    }

    if (entryForm.time_slot_start >= entryForm.time_slot_end) {
      const msg = "End time must be after start time"
      setFormError(msg)
      toast({ title: "Invalid Time", description: msg, variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const url = "/api/lab-staff/timetable/entries"
      const method = entryDialogMode === "create" ? "POST" : "PUT"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryForm)
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save entry")
      }

      toast({ title: entryDialogMode === "create" ? "Entry created" : "Entry updated" })
      setEntryDialogOpen(false)
      loadTimetableEntries()
    } catch (error: any) {
      setFormError(error.message)
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: number) => {
    setEntryToDelete(id)
    setDeleteDialogOpen(true)
  }

  const deleteEntry = async () => {
    if (!entryToDelete) return

    try {
      setLoading(true)
      const res = await fetch(`/api/lab-staff/timetable/entries?id=${entryToDelete}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete entry")
      }

      toast({ title: "Entry deleted" })
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
      loadTimetableEntries()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getDayName = (dayOfWeek: number) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)
    return day ? day.label : "Unknown Day"
  }

  // Filter entries to only show assigned labs and other filters
  const filteredEntries = timetableEntries.filter(entry => {
    // Only show entries for labs assigned to this lab staff
    const assignedLabIds = labs.map(lab => lab.id)
    if (!assignedLabIds.includes(entry.lab_id)) return false
    
    const labMatch = selectedLab === "" || entry.lab_id.toString() === selectedLab
    const dayMatch = selectedDay === "all" || entry.day_of_week.toString() === selectedDay
    const searchMatch = searchTerm === "" || 
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return labMatch && dayMatch && searchMatch
  })

  console.log('Filtered entries:', filteredEntries.length, 'Selected lab:', selectedLab, 'Assigned labs:', labs.map(l => l.id))

  // Debug effect
  useEffect(() => {
    console.log('State update - Labs:', labs.length, 'Timetable entries:', timetableEntries.length, 'Filtered:', filteredEntries.length)
  }, [labs, timetableEntries, filteredEntries])

  // Group entries by day and time for grid view
  const getWeeklyView = () => {
    interface CellData {
      entry: TimetableEntry | null
      isStart: boolean
      rowSpan: number
      labName: string
    }
    
    const weekView: { [day: number]: { [time: string]: CellData } } = {}
    
    // Initialize grid
    DAYS_OF_WEEK.forEach(day => {
      weekView[day.value] = {}
      HOURLY_VIEW_SLOTS.forEach(time => {
        weekView[day.value][time] = {
          entry: null,
          isStart: false,
          rowSpan: 0,
          labName: ''
        }
      })
    })
    
    // Convert time to comparable format (minutes from midnight)
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    // Place each entry in the grid
    filteredEntries.forEach(entry => {
      const entryStart = entry.time_slot_start.substring(0, 5)
      const entryEnd = entry.time_slot_end.substring(0, 5)
      const startMinutes = timeToMinutes(entryStart)
      const endMinutes = timeToMinutes(entryEnd)
      const labName = getLabName(entry.lab_id)
      
      // Find which hourly slots this entry spans
      const spannedSlots: string[] = []
      HOURLY_VIEW_SLOTS.forEach(hourSlot => {
        const hourMinutes = timeToMinutes(hourSlot)
        const nextHourMinutes = hourMinutes + 60
        
        // Entry overlaps if: entry_start < hour_end AND entry_end > hour_start
        if (startMinutes < nextHourMinutes && endMinutes > hourMinutes) {
          spannedSlots.push(hourSlot)
        }
      })
      
      // Mark the first slot as the start with rowSpan
      if (spannedSlots.length > 0 && weekView[entry.day_of_week]) {
        const firstSlot = spannedSlots[0]
        weekView[entry.day_of_week][firstSlot] = {
          entry: entry,
          isStart: true,
          rowSpan: spannedSlots.length,
          labName: labName
        }
        
        // Mark subsequent slots as occupied (not start)
        for (let i = 1; i < spannedSlots.length; i++) {
          weekView[entry.day_of_week][spannedSlots[i]] = {
            entry: entry,
            isStart: false,
            rowSpan: 0,
            labName: labName
          }
        }
      }
    })
    
    return weekView
  }

  const weekView = getWeeklyView()

  if (loading && labs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading timetable...</p>
        </div>
      </div>
    )
  }

  if (labs.length === 0) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Lab Timetable</h1>
            <p className="text-muted-foreground text-sm sm:text-base">View timetable for your assigned labs</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Labs Assigned</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You are not currently assigned to any labs. Contact your administrator to get lab assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Simple lab scheduling - Day, Time, Lab details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/lab-staff/dashboard/daily-schedule">
              <CalendarDays className="h-4 w-4 mr-2" />
              Daily Schedule
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="view">
            <Eye className="h-4 w-4 mr-2" />
            View Timetable
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Clock className="h-4 w-4 mr-2" />
            Manage Entries
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs">Lab</Label>
                <Select value={selectedLab} onValueChange={setSelectedLab}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {labs.map(lab => (
                      <SelectItem key={lab.id} value={lab.id.toString()}>
                        {lab.code === lab.name ? lab.name : `${lab.code} - ${lab.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search details..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    const cp1Lab = labs.find(lab => lab.code === 'CP1')
                    if (cp1Lab) {
                      setSelectedLab(cp1Lab.id.toString())
                    } else if (labs.length > 0) {
                      setSelectedLab(labs[0].id.toString())
                    }
                    setSelectedDay("all")
                    setSearchTerm("")
                  }}
                  variant="outline" 
                  className="w-full text-sm"
                  size="sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Timetable Tab */}
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Weekly Timetable View
                <Badge variant="outline">{filteredEntries.length} entries</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background border-b z-20">
                      <TableRow>
                        <TableHead className="w-20 text-xs font-medium bg-muted/50 sticky left-0 z-30 border-r">Time</TableHead>
                        {DAYS_OF_WEEK.map(day => (
                          <TableHead key={day.value} className="text-center min-w-[180px] text-xs font-medium bg-muted/50">
                            {day.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {HOURLY_VIEW_SLOTS.map((timeSlot, rowIndex) => (
                        <TableRow key={timeSlot} className="border-b h-16">
                          <TableCell className="font-medium text-xs bg-muted/30 sticky left-0 z-10 border-r p-2 align-top">
                            <div className="font-semibold">{timeSlot}</div>
                          </TableCell>
                          {DAYS_OF_WEEK.map(day => {
                            const cellData = weekView[day.value]?.[timeSlot]
                            if (!cellData) return <TableCell key={day.value} className="p-1" />
                            
                            // Skip rendering cell content if this is a continuation cell (not the start)
                            const entry = cellData.entry
                            
                            // If this is a continuation of a spanning cell, don't render TD at all
                            if (entry && !cellData.isStart) {
                              // Find the start slot for this entry to check if it's truly spanning
                              const entryStartTime = entry.time_slot_start.substring(0, 5)
                              const currentSlotIndex = HOURLY_VIEW_SLOTS.indexOf(timeSlot)
                              
                              // Check if there's a previous slot with this same entry as the start
                              let isPartOfSpan = false
                              for (let i = 0; i < currentSlotIndex; i++) {
                                const prevSlot = HOURLY_VIEW_SLOTS[i]
                                const prevCellData = weekView[day.value]?.[prevSlot]
                                if (prevCellData?.entry?.id === entry.id && prevCellData?.isStart) {
                                  isPartOfSpan = true
                                  break
                                }
                              }
                              
                              // If this is part of a rowSpan from above, don't render the TD
                              if (isPartOfSpan) {
                                return null
                              }
                            }
                            
                            // Render the entry cell with proper rowSpan
                            if (entry && cellData.isStart) {
                              return (
                                <TableCell 
                                  key={day.value} 
                                  className="p-2 align-top border-l border-r relative"
                                  rowSpan={cellData.rowSpan}
                                >
                                  <div 
                                    className="h-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3 hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md"
                                  >
                                    <div className="space-y-2">
                                      {/* Lab Name */}
                                      <div className="font-bold text-blue-900 text-sm leading-tight">
                                        {cellData.labName}
                                      </div>
                                      
                                      {/* Notes/Description */}
                                      {entry.notes && (
                                        <div className="text-blue-700 text-xs leading-tight break-words">
                                          {entry.notes}
                                        </div>
                                      )}
                                      
                                      {/* Time Range Badge */}
                                      <div className="flex items-center gap-1 pt-1">
                                        <Clock className="h-3 w-3 text-blue-600" />
                                        <span className="text-blue-600 font-semibold text-xs">
                                          {entry.time_slot_start.substring(0,5)} - {entry.time_slot_end.substring(0,5)}
                                        </span>
                                      </div>
                                      
                                      {/* Duration Indicator */}
                                      {cellData.rowSpan > 1 && (
                                        <div className="text-blue-500 text-[10px] font-medium bg-blue-200/50 px-2 py-0.5 rounded-full inline-block">
                                          {cellData.rowSpan} hour{cellData.rowSpan > 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              )
                            }
                            
                            // Empty cell
                            return (
                              <TableCell key={day.value} className="p-2 bg-gray-50/30">
                                <div className="h-full min-h-[48px]" />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Entries Tab (List View) */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Timetable Entries
                {selectedLab && labs.find(l => l.id.toString() === selectedLab)?.is_head_staff === 1 && (
                  <Button onClick={openCreateEntry} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timetable entries found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lab</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries
                        .sort((a, b) => {
                          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
                          return a.time_slot_start.localeCompare(b.time_slot_start)
                        })
                        .map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-medium">{getLabName(entry.lab_id)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getDayName(entry.day_of_week)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {entry.time_slot_start.substring(0, 5)} - {entry.time_slot_end.substring(0, 5)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {entry.notes || 'Lab Session'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {labs.find(l => l.id === entry.lab_id)?.is_head_staff === 1 ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditEntry(entry)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => confirmDelete(entry.id!)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  View only
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Create/Edit Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={(open) => {
        setEntryDialogOpen(open)
        if (!open) {
          setFormError(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {entryDialogMode === "create" ? "Add Timetable Entry" : "Edit Timetable Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <Label className="text-xs">Lab <span className="text-red-600">*</span></Label>
              <Select 
                value={entryForm.lab_id ? entryForm.lab_id.toString() : ""} 
                onValueChange={(v) => { setFormError(null); setEntryForm(s => ({ ...s, lab_id: parseInt(v) })) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Lab" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map(lab => (
                    <SelectItem key={lab.id} value={lab.id.toString()}>
                      {lab.code === lab.name ? lab.name : `${lab.code} - ${lab.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Day <span className="text-red-600">*</span></Label>
              <Select 
                value={entryForm.day_of_week.toString()} 
                onValueChange={(v) => { setFormError(null); setEntryForm(s => ({ ...s, day_of_week: parseInt(v) })) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Time <span className="text-red-600">*</span></Label>
              <Input 
                type="time"
                value={entryForm.time_slot_start} 
                onChange={(e) => { setFormError(null); setEntryForm(s => ({ ...s, time_slot_start: e.target.value })) }}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-xs">End Time <span className="text-red-600">*</span></Label>
              <Input 
                type="time"
                value={entryForm.time_slot_end} 
                onChange={(e) => { setFormError(null); setEntryForm(s => ({ ...s, time_slot_end: e.target.value })) }}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Details</Label>
              <Input 
                value={entryForm.notes || ""} 
                onChange={(e) => setEntryForm(s => ({ ...s, notes: e.target.value }))} 
                placeholder="e.g. Programming Lab, Data Structures Session"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              Cancel
            </Button>
            {formError ? (
              <div aria-live="polite" className={`text-sm mr-auto ${formError.startsWith('✓') ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                {formError}
              </div>
            ) : null}
            <Button onClick={saveEntry} disabled={loading || !entryForm.lab_id || entryForm.lab_id <= 0 || !entryForm.time_slot_start || !entryForm.time_slot_end}>
              {loading ? (entryDialogMode === "create" ? "Creating…" : "Saving…") : (entryDialogMode === "create" ? "Create" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this timetable entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
