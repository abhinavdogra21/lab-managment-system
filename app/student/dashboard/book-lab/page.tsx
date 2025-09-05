"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowRight, Clock, MapPin, User, Building2, ChevronLeft } from "lucide-react"
import { format } from "date-fns"

interface Department {
  id: number
  name: string
  code: string
}

interface Faculty {
  id: number
  name: string
  email: string
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
}

interface BookedSlotItem {
  start_time: string
  end_time: string
  time_range: string
  purpose: string
  type: 'booking' | 'class'
}

export default function BookLabPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
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
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [purpose, setPurpose] = useState("")
  const [remarks, setRemarks] = useState("")

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

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value)
    setSelectedFaculty("")
    setSelectedLab("")
    setFaculties([])
    setLabs([])
    loadFaculties(value)
    loadLabs(value)
  }

  const handleLabAndDateChange = () => {
    if (selectedLab && selectedDate) {
  loadAvailableSlots(selectedLab, selectedDate)
  loadBookedSchedule(selectedLab, selectedDate)
    }
  }

  useEffect(() => {
    handleLabAndDateChange()
  }, [selectedLab, selectedDate])

  const handleSubmit = async () => {
    const manualSelected = !selectedTimeSlot && startTime && endTime
    if (!selectedDepartment || !selectedFaculty || !selectedLab || !selectedDate || (!selectedTimeSlot && !manualSelected) || !purpose.trim()) {
      toast({ title: "Missing Information", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const [sTime, eTime] = selectedTimeSlot ? selectedTimeSlot.split(' - ') : [startTime, endTime]
      if (!sTime || !eTime) throw new Error("Invalid time range")
      if (manualSelected && (hasConflict())) {
        throw new Error("Selected time conflicts with schedule")
      }
      const requestData = {
        lab_id: parseInt(selectedLab),
        faculty_supervisor_id: parseInt(selectedFaculty),
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: sTime,
        end_time: eTime,
        purpose: purpose.trim()
      }

      const res = await fetch("/api/student/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to submit request")

      toast({ title: "Request Submitted", description: "Your lab booking request has been submitted successfully" })
      
      // Reset form
      setCurrentStep(1)
      setSelectedDepartment("")
      setSelectedFaculty("")
      setSelectedLab("")
      setSelectedDate(undefined)
      setSelectedTimeSlot("")
  setStartTime("")
  setEndTime("")
      setPurpose("")
      setRemarks("")
      
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
    return bookedSlots.some(b => (s < `${b.end_time}:00` && e > `${b.start_time}:00`))
  }

  const isInvalidTimeRange = () => !!startTime && !!endTime && startTime >= endTime

  const canProceedToStep2 = selectedDepartment && selectedFaculty && selectedLab
  const canProceedToStep3 = !!(canProceedToStep2 && selectedDate && (selectedTimeSlot || (startTime && endTime && !hasConflict() && !isInvalidTimeRange())))
  const canSubmit = !!(canProceedToStep3 && purpose.trim())

  const getSelectedDepartmentName = () => departments.find(d => d.id.toString() === selectedDepartment)?.name || ""
  const getSelectedFacultyName = () => faculties.find(f => f.id.toString() === selectedFaculty)?.name || ""
  const getSelectedLabName = () => labs.find(l => l.id.toString() === selectedLab)?.name || ""

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
                      {faculties.map(faculty => (
                        <SelectItem key={faculty.id} value={faculty.id.toString()}>
                          {faculty.name} ({faculty.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedDepartment && (
                <div>
                  <Label>Lab <span className="text-red-600">*</span></Label>
                  <Select value={selectedLab} onValueChange={setSelectedLab}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {labs.map(lab => (
                        <SelectItem key={lab.id} value={lab.id.toString()}>
                          {lab.name} - {lab.location} (Capacity: {lab.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <p>Lab: <span className="font-medium">{getSelectedLabName()}</span></p>
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div className="space-y-4">
                  <div>
                    <Label>Booked/Scheduled Slots</Label>
                    {bookedSlots.length === 0 ? (
                      <div className="p-3 border rounded-md text-sm text-muted-foreground">No bookings or classes for this date.</div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {bookedSlots.map((s, i) => (
                          <div key={i} className={`p-2 rounded border text-sm ${s.type === 'booking' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex justify-between">
                              <span className="font-medium">{s.time_range}</span>
                              <Badge variant="outline">{s.type === 'booking' ? 'Booking' : 'Class'}</Badge>
                            </div>
                            <div className="text-muted-foreground">{s.purpose}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time (HH:MM)</Label>
                      <Input type="time" min="08:00" max="18:00" value={startTime} onChange={(e) => { setStartTime(e.target.value); setSelectedTimeSlot("") }} />
                    </div>
                    <div>
                      <Label>End Time (HH:MM)</Label>
                      <Input type="time" min="08:00" max="18:00" value={endTime} onChange={(e) => { setEndTime(e.target.value); setSelectedTimeSlot("") }} />
                    </div>
                  </div>
                  {hasConflict() && (
                    <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded">
                      The selected time range overlaps with an existing booking or class.
                    </div>
                  )}
                  {startTime && endTime && (startTime < '08:00' || endTime > '18:00') && (
                    <div className="p-3 border border-amber-200 bg-amber-50 text-sm text-amber-800 rounded">
                      Time must be between 08:00 and 18:00.
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
                <p>Lab: <span className="font-medium">{getSelectedLabName()}</span></p>
                <p>Date: <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : ""}</span></p>
                <p>Time: <span className="font-medium">{selectedTimeSlot || (startTime && endTime ? `${startTime} - ${endTime}` : "")}</span></p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
    </div>
  )
}
