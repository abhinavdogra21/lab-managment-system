"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowRight, Clock, MapPin, User, Building, Building2, ChevronLeft, CheckCircle2, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Department {
  id: number
  name: string
  code: string
}

interface Faculty {
  id: number
  name: string
  email: string
  salutation?: string
  department_id: number
}

interface Lab {
  id: number
  name: string
  code: string
  department_id: number
  capacity: number
  location: string
}

interface TimeSlot {
  start_time: string
  end_time: string
  is_available: boolean
  duration_minutes?: number
  display?: string
}

interface BookedSlotItem {
  start_time: string
  end_time: string
  time_range: string
  purpose: string
  booker_name?: string
  type: 'booking' | 'class'
  lab_name?: string
}

export default function BookLabPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [bookedSlots, setBookedSlots] = useState<BookedSlotItem[]>([])
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  
  // Form states
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [selectedFaculty, setSelectedFaculty] = useState<string>("")
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]) // Changed to array for multi-lab
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [purpose, setPurpose] = useState("")
  const [remarks, setRemarks] = useState("")
  const [labSelectOpen, setLabSelectOpen] = useState(false) // For multi-select dropdown
  
  // Person Responsible fields - array for multi-lab support
  const [responsiblePersons, setResponsiblePersons] = useState<{
    lab_id: string
    lab_name: string
    name: string
    email: string
  }[]>([])

  // Initialize responsible persons array when labs are selected
  useEffect(() => {
    if (selectedLabs.length > 0) {
      // Get lab names
      const newResponsiblePersons = selectedLabs.map(labId => {
        const lab = labs.find(l => l.id.toString() === labId)
        const existing = responsiblePersons.find(rp => rp.lab_id === labId)
        return existing || {
          lab_id: labId,
          lab_name: lab?.name || `Lab ${labId}`,
          name: '',
          email: ''
        }
      })
      setResponsiblePersons(newResponsiblePersons)
    } else {
      setResponsiblePersons([])
    }
  }, [selectedLabs, labs])

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
  console.log("Fetching departments from /api/student/departments")
  const res = await fetch("/api/student/departments")
      console.log("Response status:", res.status)
      console.log("Response content-type:", res.headers.get('content-type'))
      
      const text = await res.text()
      console.log("Response text (first 200 chars):", text.substring(0, 200))
      
      if (res.ok && text.trim().startsWith('{')) {
        const data = JSON.parse(text)
        if (data.departments && Array.isArray(data.departments)) {
          setDepartments(data.departments)
          console.log("Successfully loaded", data.departments.length, "departments")
        }
      } else {
        console.log("API response not valid JSON or not successful, keeping fallback data")
      }
    } catch (error) {
      console.error("Error loading departments, keeping fallback data:", error)
    }
  }

  const loadFaculties = async (departmentId: string) => {
    if (!departmentId) return
    try {
  const res = await fetch(`/api/student/faculties?department_id=${departmentId}`)
      if (res.ok) {
        const text = await res.text()
        console.log("Faculty API response:", text.substring(0, 200)) // Log first 200 chars
        
        // Check if response is HTML (error page)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error("Received HTML instead of JSON for faculties")
          setFaculties([])
          return
        }
        
        try {
          const data = JSON.parse(text)
          setFaculties(data.users || [])
        } catch (parseError) {
          console.error("JSON parse error for faculties:", parseError)
          setFaculties([])
        }
      } else {
        console.error("Failed to fetch faculties:", res.status)
        setFaculties([])
      }
    } catch (error) {
      console.error("Failed to load faculties:", error)
      setFaculties([])
    }
  }

  const loadLabs = async (departmentId: string) => {
    // Load ALL labs regardless of department - students should be able to book any lab
    try {
      const res = await fetch(`/api/student/labs`)
      if (res.ok) {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setLabs(data.labs || [])
        } catch (parseError) {
          console.error("JSON parse error for labs:", parseError)
          setLabs([])
        }
      } else {
        console.error("Failed to fetch labs:", res.status)
        setLabs([])
      }
    } catch (error) {
      console.error("Failed to load labs:", error)
      setLabs([])
    }
  }

  const loadAvailableSlots = async (labId: string, date: Date) => {
    if (!labId || !date) return
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      console.log(`Loading available slots for lab ${labId} on ${dateStr}`)
      const res = await fetch(`/api/student/available-slots?lab_id=${labId}&date=${dateStr}`)
      console.log("Available slots response status:", res.status)
      
      if (res.ok) {
        const text = await res.text()
        console.log("Available slots response:", text.substring(0, 200))
        
        try {
          const data = JSON.parse(text)
          console.log("Parsed slots data:", data)
          // Fix: API returns availableSlots, not slots
          setAvailableSlots(data.availableSlots || [])
        } catch (parseError) {
          console.error("JSON parse error for available slots:", parseError)
          setAvailableSlots([])
        }
      } else {
        console.error("Failed to fetch available slots:", res.status)
        setAvailableSlots([])
      }
    } catch (error) {
      console.error("Failed to load available slots:", error)
      setAvailableSlots([])
    }
  }

  const loadCommonFreeSlots = async (labIds: string[], date: Date) => {
    if (!labIds.length || !date) return
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const labIdsParam = labIds.join(',')
      console.log(`Loading common free slots for labs ${labIdsParam} on ${dateStr}`)
      const res = await fetch(`/api/student/common-free-slots?lab_ids=${labIdsParam}&date=${dateStr}`)
      
      if (res.ok) {
        const data = await res.json()
        console.log("Common free slots data:", data)
        setAvailableSlots(data.commonSlots || [])
        
        // Load booked slots for all selected labs to show conflicts
        loadMultiLabBookedSlots(labIds, date)
      } else {
        console.error("Failed to fetch common free slots:", res.status)
        setAvailableSlots([])
        toast({ title: "Error", description: "Failed to load common free slots", variant: "destructive" })
      }
    } catch (error) {
      console.error("Failed to load common free slots:", error)
      setAvailableSlots([])
    }
  }

  const loadMultiLabBookedSlots = async (labIds: string[], date: Date) => {
    if (!labIds.length || !date) return
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const allBookedSlots: any[] = []
      
      // Fetch booked slots for each lab
      for (const labId of labIds) {
        const lab = labs.find(l => l.id.toString() === labId)
        const res = await fetch(`/api/student/labs/${labId}/booked-schedule?date=${dateStr}`)
        if (res.ok) {
          const data = await res.json()
          // Add lab name to each booking
          const slotsWithLab = data.bookedSlots.map((slot: any) => ({
            ...slot,
            lab_name: lab?.name || `Lab ${labId}`
          }))
          allBookedSlots.push(...slotsWithLab)
        }
      }
      
      // Sort by start time
      allBookedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
      setBookedSlots(allBookedSlots)
    } catch (error) {
      console.error("Failed to load multi-lab booked slots:", error)
      setBookedSlots([])
    }
  }

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value)
    setSelectedFaculty("")
    setSelectedLabs([])
    setFaculties([])
    setLabs([])
    loadFaculties(value)
    loadLabs(value)
  }

  const handleLabAndDateChange = () => {
    // For single lab - show booked slots
    if (selectedLabs.length === 1 && selectedDate) {
      loadAvailableSlots(selectedLabs[0], selectedDate)
      loadBookedSchedule(selectedLabs[0], selectedDate)
    }
    // For multiple labs - load common free slots
    else if (selectedLabs.length > 1 && selectedDate) {
      loadCommonFreeSlots(selectedLabs, selectedDate)
    }
  }

  useEffect(() => {
    handleLabAndDateChange()
  }, [selectedLabs, selectedDate])

  const handleSubmit = async () => {
    if (loading) return // Prevent double submission
    const manualSelected = !selectedTimeSlot && startTime && endTime
    if (!selectedDepartment || !selectedFaculty || selectedLabs.length === 0 || !selectedDate || (!selectedTimeSlot && !manualSelected) || !purpose.trim() || !areAllResponsiblePersonsFilled()) {
      toast({ title: "Missing Information", description: "Please fill all required fields including person responsible details for each lab", variant: "destructive" })
      return
    }

    if (manualSelected) {
      if (hasConflict()) {
        toast({ title: "Time Conflict", description: "Selected time conflicts with existing bookings", variant: "destructive" })
        return
      }
      if (isInvalidTimeRange()) {
        toast({ title: "Invalid Time Range", description: "End time must be after start time", variant: "destructive" })
        return
      }
      if (isOutsideBusinessHours()) {
        toast({ title: "Invalid Time", description: "Lab bookings are only allowed between 8:00 AM and 8:00 PM", variant: "destructive" })
        return
      }
    }

    setLoading(true)
    try {
      const [sTime, eTime] = selectedTimeSlot ? selectedTimeSlot.split(' - ') : [startTime, endTime]
      if (!sTime || !eTime) throw new Error("Invalid time range")
      
      const isMultiLab = selectedLabs.length > 1
      const requestData = {
        lab_id: isMultiLab ? null : parseInt(selectedLabs[0]),
        lab_ids: isMultiLab ? selectedLabs.map(id => parseInt(id)) : null,
        is_multi_lab: isMultiLab,
        faculty_supervisor_id: parseInt(selectedFaculty),
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: sTime,
        end_time: eTime,
        purpose: purpose.trim(),
        responsible_persons: responsiblePersons.map(rp => ({
          lab_id: parseInt(rp.lab_id),
          name: rp.name.trim(),
          email: rp.email.trim().toLowerCase()
        }))
      }

      const res = await fetch("/api/student/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      const data = await res.json()

  if (!res.ok) throw new Error(data?.error || "Failed to submit request")

  const labText = isMultiLab ? `${selectedLabs.length} labs` : 'lab'
  setSuccessDialog({ 
    open: true, 
    message: `✓ ${labText.charAt(0).toUpperCase() + labText.slice(1)} booking request submitted successfully! Your request has been sent to the faculty supervisor for approval. You will be notified once it is reviewed.`
  })
      
      // Reset form
      setCurrentStep(1)
      setSelectedDepartment("")
      setSelectedFaculty("")
      setSelectedLabs([])
      setSelectedDate(undefined)
      setSelectedTimeSlot("")
  setStartTime("")
  setEndTime("")
      setPurpose("")
      setRemarks("")
      setResponsiblePersons([])
      
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error?.message || "Failed to submit request", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }


  const loadBookedSchedule = async (labId: string, date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/student/booked-slots?lab_id=${labId}&date=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setBookedSlots(data.booked_slots || [])
      } else {
        setBookedSlots([])
      }
    } catch {
      setBookedSlots([])
    }
  }

  const hasConflict = () => {
    if (!startTime || !endTime) return false
    const s = `${startTime}:00`
    const e = `${endTime}:00`
    
    // Check against booked slots
    const hasBookedConflict = bookedSlots.some(b => (s < `${b.end_time}:00` && e > `${b.start_time}:00`))
    if (hasBookedConflict) return true
    
    // For multi-lab bookings, also check if time falls within common free slots
    if (selectedLabs.length > 1 && availableSlots.length > 0) {
      // Check if the selected time is fully contained within any of the free slots
      const isWithinFreeSlots = availableSlots.some(slot => {
        const slotStart = slot.start_time.substring(0, 5) // HH:MM format
        const slotEnd = slot.end_time.substring(0, 5)
        // The selected time must be fully within a free slot
        return startTime >= slotStart && endTime <= slotEnd
      })
      
      // If not within any free slot, there's a conflict
      if (!isWithinFreeSlots) return true
    }
    
    return false
  }

  const isInvalidTimeRange = () => !!startTime && !!endTime && startTime >= endTime

  // Removed business hours restriction - users can book labs at any time
  const isOutsideBusinessHours = () => false

  // Validation for person responsible email
  const isValidResponsibleEmail = (email: string) => {
    if (!email) return false
    return email.toLowerCase().endsWith('@lnmiit.ac.in')
  }

  // Check if all responsible persons are filled
  const areAllResponsiblePersonsFilled = () => {
    if (responsiblePersons.length === 0) return false
    return responsiblePersons.every(rp => 
      rp.name.trim() !== '' && isValidResponsibleEmail(rp.email)
    )
  }

  const canProceedToStep2 = selectedDepartment && selectedFaculty && selectedLabs.length > 0
  const canProceedToStep3 = !!(canProceedToStep2 && selectedDate && (selectedTimeSlot || (startTime && endTime && !hasConflict() && !isInvalidTimeRange() && !isOutsideBusinessHours())))
  const canSubmit = !!(canProceedToStep3 && purpose.trim() && areAllResponsiblePersonsFilled())

  const getSelectedDepartmentName = () => departments.find(d => d.id.toString() === selectedDepartment)?.name || ""
  const getSelectedFacultyName = () => faculties.find(f => f.id.toString() === selectedFaculty)?.name || ""
  const getSelectedLabsText = () => {
    if (selectedLabs.length === 0) return ""
    if (selectedLabs.length === 1) return labs.find(l => l.id.toString() === selectedLabs[0])?.name || ""
    return `${selectedLabs.length} labs selected`
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Book Lab Session</h1>
          <p className="text-muted-foreground">Request a lab booking with faculty supervision</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <ArrowRight className={`h-4 w-4 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <ArrowRight className={`h-4 w-4 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Step 1: Select Department, Faculty & Lab */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Step 1: Select Department, Faculty & Lab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Department <span className="text-red-600">*</span></Label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDepartment && (
                <div>
                  <Label>Faculty Supervisor <span className="text-red-600">*</span></Label>
                  <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map(faculty => {
                        const salutationMap: { [key: string]: string } = {
                          'prof': 'Prof.',
                          'dr': 'Dr.',
                          'mr': 'Mr.',
                          'mrs': 'Mrs.',
                          'ms': 'Ms.'
                        }
                        const displayName = faculty.salutation && salutationMap[faculty.salutation.toLowerCase()] 
                          ? `${salutationMap[faculty.salutation.toLowerCase()]} ${faculty.name}` 
                          : faculty.name
                        return (
                          <SelectItem key={faculty.id} value={faculty.id.toString()}>
                            {displayName} ({faculty.email})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedDepartment && (
                <div>
                  <Label>Lab(s) <span className="text-red-600">*</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">Select one or multiple labs</p>
                  <Popover open={labSelectOpen} onOpenChange={setLabSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between"
                        role="combobox"
                      >
                        <span className="truncate">
                          {selectedLabs.length === 0 
                            ? "Select lab(s)" 
                            : selectedLabs.length === 1
                            ? labs.find(l => l.id.toString() === selectedLabs[0])?.name
                            : `${selectedLabs.length} labs selected`
                          }
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-3" align="start">
                      <div className="space-y-2">
                        {labs.map(lab => (
                          <div key={lab.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lab-${lab.id}`}
                              checked={selectedLabs.includes(lab.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Check if any lab is already selected from a different department
                                  if (selectedLabs.length > 0) {
                                    const firstSelectedLab = labs.find(l => l.id.toString() === selectedLabs[0])
                                    if (firstSelectedLab && firstSelectedLab.department_id !== lab.department_id) {
                                      toast({
                                        title: "Different Department",
                                        description: "You can only book labs from the same department in a multi-lab booking",
                                        variant: "destructive"
                                      })
                                      return
                                    }
                                  }
                                  setSelectedLabs([...selectedLabs, lab.id.toString()])
                                } else {
                                  setSelectedLabs(selectedLabs.filter(id => id !== lab.id.toString()))
                                }
                              }}
                            />
                            <label
                              htmlFor={`lab-${lab.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {lab.name} ({lab.code})
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedLabs.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="w-full"
                            onClick={() => setSelectedLabs([])}
                          >
                            Clear Selection
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {selectedLabs.length > 1 && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ Multi-lab booking: Common free slots will be shown
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!canProceedToStep2}
                  className="w-full"
                >
                  Next: Select Date & Time
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Date & Time */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Step 2: Select Date & Time Slot
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                <p>Department: <span className="font-medium">{getSelectedDepartmentName()}</span></p>
                <p>Faculty: <span className="font-medium">{getSelectedFacultyName()}</span></p>
                <p>Lab(s): <span className="font-medium">{getSelectedLabsText()}</span></p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date <span className="text-red-600">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div className="space-y-4">
                  {/* Show Available Slots for Multi-Lab */}
                  {selectedLabs.length > 1 && availableSlots.length > 0 && (
                    <div>
                      <Label>Common Available Time Slots</Label>
                      <div className="space-y-2 mt-2">
                        {availableSlots.map((slot, i) => {
                          const durationMinutes = slot.duration_minutes || 0
                          const hours = Math.floor(durationMinutes / 60)
                          const minutes = durationMinutes % 60
                          const durationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                          
                          return (
                            <div key={i} className="p-3 rounded border bg-green-50 border-green-200 text-sm">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">
                                    {slot.display || `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`}
                                  </span>
                                </div>
                                <Badge variant="outline" className="bg-white text-green-700">
                                  {durationText} free
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs mt-1">
                                Available across all {selectedLabs.length} selected labs
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Show message if no common slots for multi-lab */}
                  {selectedLabs.length > 1 && availableSlots.length === 0 && bookedSlots.length === 0 && (
                    <div className="p-4 border rounded-md bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">Fully Available</span>
                      </div>
                      <p className="text-sm text-green-600">
                        All selected labs are completely free on this date. You can book any time from 00:00 to 23:59.
                      </p>
                    </div>
                  )}
                  
                  {/* Only show booked slots for single lab selection */}
                  {selectedLabs.length === 1 && (
                    <div>
                      <Label>Booked/Scheduled Slots</Label>
                      {bookedSlots.length === 0 ? (
                        <div className="p-3 border rounded-md text-sm text-muted-foreground">No bookings or classes for this date.</div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {bookedSlots.map((s, i) => (
                            <div key={i} className={`p-3 rounded border text-sm ${s.type === 'booking' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{s.time_range}</span>
                                    <Badge variant="outline">{s.type === 'booking' ? 'Booking' : 'Class'}</Badge>
                                  </div>
                                  <div className="text-muted-foreground mb-1">{s.purpose}</div>
                                  {s.booker_name && s.type === 'booking' && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                      <User className="h-3 w-3" />
                                      <span>Booked by: {s.booker_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time (HH:MM)</Label>
                      <Input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setSelectedTimeSlot("") }} />
                    </div>
                    <div>
                      <Label>End Time (HH:MM)</Label>
                      <Input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setSelectedTimeSlot("") }} />
                    </div>
                  </div>
                  
                  {/* Validation Messages */}
                  {startTime && endTime && (
                    <div className="space-y-2">
                      {hasConflict() && (
                        <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          The selected time range overlaps with an existing booking or class.
                        </div>
                      )}
                      {isInvalidTimeRange() && (
                        <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          End time must be after start time.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  disabled={!canProceedToStep3}
                  className="flex-1"
                >
                  Next: Purpose & Submit
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Purpose & Submit */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Step 3: Purpose & Submit Request
              </CardTitle>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Department: <span className="font-medium">{getSelectedDepartmentName()}</span></p>
                <p>Faculty: <span className="font-medium">{getSelectedFacultyName()}</span></p>
                <p>Lab(s): <span className="font-medium">{getSelectedLabsText()}</span></p>
                <p>Date: <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : ""}</span></p>
                <p>Time: <span className="font-medium">{selectedTimeSlot || (startTime && endTime ? `${startTime} - ${endTime}` : "")}</span></p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Person Responsible Section - One for Each Lab */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-blue-900 font-medium">
                  <User className="h-4 w-4" />
                  <span>Person Responsible for {selectedLabs.length > 1 ? 'Each Lab' : 'Lab'}</span>
                </div>
                <p className="text-sm text-blue-800">
                  {selectedLabs.length > 1 
                    ? 'Each lab requires a responsible person who will be held accountable for any damages during the booking period.'
                    : 'This person will be held accountable for any damages to the lab during the booking period.'
                  }
                </p>
                
                <div className="space-y-4">
                  {responsiblePersons.map((rp, index) => (
                    <div key={rp.lab_id} className="p-3 bg-white border border-blue-200 rounded-md space-y-3">
                      <div className="font-medium text-sm text-blue-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {rp.lab_name}
                      </div>
                      
                      <div>
                        <Label className="text-sm">
                          Full Name <span className="text-red-600">*</span>
                        </Label>
                        <Input 
                          placeholder="Enter full name"
                          value={rp.name}
                          onChange={(e) => {
                            const updated = [...responsiblePersons]
                            updated[index].name = e.target.value
                            setResponsiblePersons(updated)
                          }}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">
                          Email Address <span className="text-red-600">*</span>
                        </Label>
                        <Input 
                          type="email"
                          placeholder="example@lnmiit.ac.in"
                          value={rp.email}
                          onChange={(e) => {
                            const updated = [...responsiblePersons]
                            updated[index].email = e.target.value
                            setResponsiblePersons(updated)
                          }}
                          className={`mt-1 ${rp.email && !isValidResponsibleEmail(rp.email) ? 'border-red-500' : ''}`}
                        />
                        {rp.email && !isValidResponsibleEmail(rp.email) && (
                          <p className="text-xs text-red-600 mt-1">
                            Email must end with @lnmiit.ac.in
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Purpose of Lab Use <span className="text-red-600">*</span></Label>
                <Textarea 
                  placeholder="Describe why you need the lab (e.g., project work, experiment, practice session, etc.)"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Additional Remarks (Optional)</Label>
                <Textarea 
                  placeholder="Any additional information for the approvers"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Approval process info removed as requested */}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canSubmit || loading}
                  className="flex-1"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Success!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {successDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setSuccessDialog({ open: false, message: '' })} className="w-24">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
