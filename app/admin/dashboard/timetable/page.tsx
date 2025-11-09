"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Plus, Edit, Trash2, Clock, Users, Search, Filter, Eye, CalendarDays } from "lucide-react"
import { format, addDays, startOfWeek } from "date-fns"
import Link from "next/link"

// Types
interface Lab {
  id: number
  name: string
  code: string
  department: string
  capacity: number
  location: string
}

interface TimetableEntry {
  id?: number
  lab_id: number
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  time_slot_start: string // HH:MM format
  time_slot_end: string // HH:MM format
  notes?: string // Optional details about the lab session
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

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
]

// Hourly time slots for the weekly view (simplified display)
const HOURLY_VIEW_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

export default function TimetablePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("view")
  
  // Data states
  const [labs, setLabs] = useState<Lab[]>([])
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])
  
  // Filter states
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
    lab_id: null as any, // Allow null initially so button stays disabled until selected
    day_of_week: 1,
    time_slot_start: "09:00",
    time_slot_end: "10:00",
    notes: "",
    is_active: true
  })

  // Clear timetable dialog state
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadLabs()
    loadTimetableEntries()
  }, [])

  const loadLabs = async () => {
    try {
      const res = await fetch("/api/admin/labs")
      if (res.ok) {
        const data = await res.json()
        setLabs(data.labs || [])
      }
    } catch (error) {
      console.error("Failed to load labs:", error)
    }
  }

  const loadTimetableEntries = async () => {
    try {
      const res = await fetch("/api/admin/timetable/entries")
      if (res.ok) {
        const data = await res.json()
        setTimetableEntries(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to load timetable entries:", error)
    }
  }

  // Filter entries based on selected filters
  const filteredEntries = timetableEntries.filter(entry => {
    const dayMatch = selectedDay === "all" || entry.day_of_week.toString() === selectedDay
    const searchMatch = searchTerm === "" || 
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return dayMatch && searchMatch
  })

  // Group entries by day and time for grid view with proper spanning
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

  const resetEntryForm = () => setEntryForm({
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
    // Ensure time format is HH:MM for form inputs
    const editForm = {
      ...entry,
      time_slot_start: entry.time_slot_start.substring(0, 5), // Convert HH:MM:SS to HH:MM
      time_slot_end: entry.time_slot_end.substring(0, 5)     // Convert HH:MM:SS to HH:MM
    }
    setEntryForm(editForm)
    setEntryDialogOpen(true)
  }

  const saveEntry = async () => {
  console.log('saveEntry called with form:', entryForm)
  console.log('Button disabled status:', loading || !entryForm.lab_id || entryForm.lab_id <= 0 || !entryForm.time_slot_start || !entryForm.time_slot_end)
  setFormError(null)
    
    if (!entryForm.lab_id || !entryForm.time_slot_start || !entryForm.time_slot_end) {
      const msg = "Please select lab, start time and end time"
      setFormError(msg)
      toast({ title: "Cannot Save", description: msg, variant: "destructive" })
      return
    }

    // Validate time logic
    if (entryForm.time_slot_start >= entryForm.time_slot_end) {
      const msg = "End time must be after start time"
      setFormError(msg)
      toast({ title: "Invalid Time", description: msg, variant: "destructive" })
      return
    }

    // Check for local conflicts before sending to server
    console.log('Checking conflicts for:', {
      lab_id: entryForm.lab_id,
      day_of_week: entryForm.day_of_week,
      time_slot_start: entryForm.time_slot_start,
      time_slot_end: entryForm.time_slot_end,
      editing_id: entryForm.id
    })
    
    const conflictingEntry = timetableEntries.find(entry => {
      // Don't check against itself when editing
      if (entry.id === entryForm.id) return false
      
      // Must be same lab and same day
      if (entry.lab_id !== entryForm.lab_id || entry.day_of_week !== entryForm.day_of_week) return false
      
      // Must be active
      if (!entry.is_active) return false
      
      // Check time overlap - normalize time format to HH:MM for comparison
      const newStart = entryForm.time_slot_start.substring(0, 5)
      const newEnd = entryForm.time_slot_end.substring(0, 5)
      const existingStart = entry.time_slot_start.substring(0, 5)
      const existingEnd = entry.time_slot_end.substring(0, 5)
      
      console.log('Comparing times:', {
        new: `${newStart}-${newEnd}`,
        existing: `${existingStart}-${existingEnd}`,
        overlap: (newStart < existingEnd && newEnd > existingStart)
      })
      
      // Check if times overlap
      return (newStart < existingEnd && newEnd > existingStart)
    })
    
    console.log('Conflicting entry found:', conflictingEntry)

    if (conflictingEntry) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const labName = getLabName(conflictingEntry.lab_id)
      const conflictDetails = conflictingEntry.notes ? ` (${conflictingEntry.notes})` : ''
      const msg = `${labName} is already booked on ${dayNames[entryForm.day_of_week]} from ${conflictingEntry.time_slot_start.substring(0,5)} to ${conflictingEntry.time_slot_end.substring(0,5)}${conflictDetails}. Please choose a different time slot.`
      setFormError(msg)
      toast({ title: "Conflict Detected", description: msg, variant: "destructive", duration: 10000 })
      return
    }
    
    setLoading(true)
    try {
      const method = entryDialogMode === "create" ? "POST" : "PATCH"
      const url = entryDialogMode === "create" 
        ? "/api/admin/timetable/entries" 
        : `/api/admin/timetable/entries/${entryForm.id}`
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryForm)
      })
      
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || "Failed to save entry")
  if (!data?.entry) throw new Error("Server did not return the saved entry")
      
      // Reload to avoid filter/view mismatches and ensure latest state
      await loadTimetableEntries()
      
      // Show success message but keep dialog open for manual close
      const successMsg = entryDialogMode === "create" 
        ? "✓ Entry created successfully! You can close this dialog or add another entry."
        : "✓ Entry updated successfully! You can close this dialog now."
      
      setFormError(successMsg) // Reuse formError for success message (we'll style it green)
      
      toast({ 
        title: entryDialogMode === "create" ? "Entry Created" : "Entry Updated",
        description: "Timetable has been updated successfully",
        variant: "default"
      })
      
      // Reset form only if creating (so user can add more entries easily)
      if (entryDialogMode === "create") {
        resetEntryForm()
      }
      
      // Don't auto-close the dialog - let user close it manually
    } catch (error: any) {
      console.error("Save entry error:", error)
  const msg = error?.message || "Failed to save timetable entry"
  setFormError(msg)
  toast({ title: "Cannot Save", description: msg, variant: "destructive", duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (entryId: number) => {
    setEntryToDelete(entryId)
    setDeleteDialogOpen(true)
  }

  const deleteEntry = async () => {
    if (!entryToDelete) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/timetable/entries/${entryToDelete}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete entry")
      
      setTimetableEntries(prev => prev.filter(e => e.id !== entryToDelete))
      toast({ title: "Timetable entry deleted" })
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const clearAllTimetable = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/timetable/entries/clear-all", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to clear timetable")
      
      setTimetableEntries([])
      toast({ title: "All timetable entries cleared" })
      setClearDialogOpen(false)
    } catch (error: any) {
      toast({ title: "Clear failed", description: error?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getLabName = (labId: number) => {
    const lab = labs.find(l => l.id === labId)
    return lab ? (lab.code === lab.name ? lab.name : `${lab.code} - ${lab.name}`) : "Unknown Lab"
  }

  const getDayName = (dayOfWeek: number) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)
    return day ? day.label : "Unknown Day"
  }

  const weekView = getWeeklyView()

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Simple lab scheduling - Day, Time, Lab details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard/daily-schedule">
              <CalendarDays className="h-4 w-4 mr-2" />
              Daily Schedule
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setClearDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Timetable
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
                    setSelectedLab("all")
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
                            // But we still need to check if we should skip the TD element itself
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
                                    className="h-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3 hover:from-blue-100 hover:to-blue-200 cursor-pointer transition-all shadow-sm hover:shadow-md"
                                    onClick={() => openEditEntry(entry)}
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

        {/* Manage Entries Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Timetable Entries
                <Button onClick={openCreateEntry} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-20">Day</TableHead>
                      <TableHead className="w-32">Time</TableHead>
                      <TableHead className="w-32">Lab</TableHead>
                      <TableHead className="min-w-[200px]">Details</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{getDayName(entry.day_of_week)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {entry.time_slot_start.substring(0,5)} - {entry.time_slot_end.substring(0,5)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm truncate max-w-[120px]" title={getLabName(entry.lab_id)}>
                            {getLabName(entry.lab_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {entry.notes || 'Lab Session'}
                          </div>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Create/Edit Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={(open) => {
        setEntryDialogOpen(open)
        if (!open) {
          // Clear any stale errors and reset to defaults next time
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
            <Button onClick={saveEntry} disabled={loading || !entryForm.lab_id || entryForm.lab_id <= 0 || entryForm.day_of_week == null || !entryForm.time_slot_start || !entryForm.time_slot_end}>
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

      {/* Clear All Timetable Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Entire Timetable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear ALL timetable entries? This will remove all scheduled classes and cannot be undone. This is typically done when creating a new semester schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={clearAllTimetable} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Timetable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
