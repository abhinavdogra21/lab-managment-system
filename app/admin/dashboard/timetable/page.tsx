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
import { CalendarIcon, Plus, Edit, Trash2, Clock, Users, BookOpen, Search, Filter, Upload, Download, Eye } from "lucide-react"
import { format, addDays, startOfWeek } from "date-fns"

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

interface TimetableTemplate {
  id: number
  name: string
  academic_year: string
  semester_type: 'odd' | 'even'
  start_date: string
  end_date: string
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
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

export default function TimetablePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("view")
  
  // Data states
  const [labs, setLabs] = useState<Lab[]>([])
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])
  const [templates, setTemplates] = useState<TimetableTemplate[]>([])
  
  // Filter states
  const [selectedLab, setSelectedLab] = useState<string>("all")
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
    loadTemplates()
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

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/admin/timetable/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    }
  }

  // Filter entries based on selected filters
  const filteredEntries = timetableEntries.filter(entry => {
    const labMatch = selectedLab === "all" || entry.lab_id.toString() === selectedLab
    const dayMatch = selectedDay === "all" || entry.day_of_week.toString() === selectedDay
    const searchMatch = searchTerm === "" || 
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return labMatch && dayMatch && searchMatch
  })

  // Group entries by day and time for grid view
  const getWeeklyView = () => {
    const weekView: { [key: string]: { [key: string]: TimetableEntry[] } } = {}
    
    DAYS_OF_WEEK.forEach(day => {
      weekView[day.value] = {}
      TIME_SLOTS.forEach(time => {
        weekView[day.value][time] = []
      })
    })
    
    filteredEntries.forEach(entry => {
      const timeSlot = entry.time_slot_start.substring(0, 5) // Extract HH:MM
      if (weekView[entry.day_of_week] && weekView[entry.day_of_week][timeSlot]) {
        weekView[entry.day_of_week][timeSlot].push(entry)
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
      if (entryDialogMode === "create") {
        toast({ title: "Timetable entry created" })
      } else {
        toast({ title: "Timetable entry updated" })
      }
      
  setFormError(null)
  setEntryDialogOpen(false)
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
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Add timetable entries manually with just the essential information: which lab is scheduled when
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">
            <Eye className="h-4 w-4 mr-2" />
            View Timetable
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Clock className="h-4 w-4 mr-2" />
            Manage Entries
          </TabsTrigger>
          <TabsTrigger value="templates">
            <BookOpen className="h-4 w-4 mr-2" />
            Templates
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
                <Label className="text-xs">Lab</Label>
                <Select value={selectedLab} onValueChange={setSelectedLab}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labs</SelectItem>
                    {labs.map(lab => (
                      <SelectItem key={lab.id} value={lab.id.toString()}>
                        {lab.code === lab.name ? lab.name : `${lab.code} - ${lab.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHeader className="sticky top-0 bg-background border-b">
                      <TableRow>
                        <TableHead className="w-16 text-xs font-medium bg-muted/50 sticky left-0 z-10 border-r">Time</TableHead>
                        {DAYS_OF_WEEK.map(day => (
                          <TableHead key={day.value} className="text-center min-w-[160px] text-xs font-medium">
                            {day.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TIME_SLOTS.map(timeSlot => (
                        <TableRow key={timeSlot} className="border-b">
                          <TableCell className="font-medium text-xs bg-muted/30 sticky left-0 z-10 border-r p-2">
                            {timeSlot}
                          </TableCell>
                          {DAYS_OF_WEEK.map(day => {
                            const entries = weekView[day.value]?.[timeSlot] || []
                            return (
                              <TableCell key={day.value} className="p-1 align-top min-h-[60px] max-w-[160px]">
                                <div className="space-y-1">
                                  {entries.map(entry => (
                                    <div 
                                      key={entry.id}
                                      className="bg-blue-50 border border-blue-200 rounded p-1.5 text-xs space-y-1 hover:bg-blue-100 cursor-pointer transition-colors"
                                      onClick={() => openEditEntry(entry)}
                                    >
                                      <div className="font-medium text-blue-900 truncate">
                                        {getLabName(entry.lab_id)}
                                      </div>
                                      <div className="text-blue-700 line-clamp-2 leading-tight">
                                        {entry.notes || 'Lab Session'}
                                      </div>
                                      <div className="text-blue-500 text-xs">
                                        {entry.time_slot_start.substring(0,5)} - {entry.time_slot_end.substring(0,5)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
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

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timetable Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage academic year and semester-wise timetable templates. Templates allow you to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>Save different timetable configurations for Odd/Even semesters</li>
                <li>Quickly switch between academic year schedules</li>
                <li>Backup and restore timetable data</li>
                <li>Apply bulk changes across multiple time periods</li>
              </ul>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4" />
                <p className="font-medium">Template Management Coming Soon</p>
                <p className="text-sm">Create and manage reusable timetable templates for different semesters</p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                  <h4 className="font-medium text-blue-900 mb-2">Current Features Available:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• View lab schedules in weekly grid format</li>
                    <li>• Filter by lab, day, or search subjects/batches</li>
                    <li>• Add/edit/delete individual timetable entries</li>
                    <li>• Manage subject codes, faculty assignments, and student batches</li>
                    <li>• Prevent time slot conflicts automatically</li>
                  </ul>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg text-left">
                  <h4 className="font-medium text-green-900 mb-2">Upcoming Features:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Excel import/export for bulk timetable management</li>
                    <li>• Template creation and semester-wise activation</li>
                    <li>• Integration with booking system for available slots</li>
                    <li>• Faculty schedule conflict detection</li>
                    <li>• Automated report generation</li>
                  </ul>
                </div>
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
              <Select 
                value={entryForm.time_slot_start} 
                onValueChange={(v) => { setFormError(null); setEntryForm(s => ({ ...s, time_slot_start: v })) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Start Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">End Time <span className="text-red-600">*</span></Label>
              <Select 
                value={entryForm.time_slot_end} 
                onValueChange={(v) => { setFormError(null); setEntryForm(s => ({ ...s, time_slot_end: v })) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select End Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Details (Optional)</Label>
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
              <div aria-live="polite" className="text-sm text-red-600 mr-auto">
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
