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

export default function BookLabPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  
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
      const res = await fetch("/api/admin/departments")
      if (res.ok) {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setDepartments(data.departments || [])
        } catch (parseError) {
          console.error("JSON parse error for departments:", parseError)
          // Provide fallback departments
          setDepartments([
            { id: 1, name: "Computer Science", code: "CS" },
            { id: 2, name: "Electronics & Communication", code: "ECE" },
            { id: 3, name: "Mechanical Engineering", code: "ME" },
            { id: 4, name: "Civil Engineering", code: "CE" }
          ])
        }
      } else {
        console.error("Failed to fetch departments:", res.status)
        // Provide fallback departments
        setDepartments([
          { id: 1, name: "Computer Science", code: "CS" },
          { id: 2, name: "Electronics & Communication", code: "ECE" },
          { id: 3, name: "Mechanical Engineering", code: "ME" },
          { id: 4, name: "Civil Engineering", code: "CE" }
        ])
      }
    } catch (error) {
      console.error("Failed to load departments:", error)
      // Provide fallback departments
      setDepartments([
        { id: 1, name: "Computer Science", code: "CS" },
        { id: 2, name: "Electronics & Communication", code: "ECE" },
        { id: 3, name: "Mechanical Engineering", code: "ME" },
        { id: 4, name: "Civil Engineering", code: "CE" }
      ])
    }
  }

  const loadFaculties = async (departmentId: string) => {
    if (!departmentId) return
    try {
      const res = await fetch(`/api/admin/users?role=faculty&department_id=${departmentId}`)
      if (res.ok) {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setFaculties(data.users || [])
        } catch (parseError) {
          console.error("JSON parse error for faculties:", parseError)
          // Provide fallback faculty
          setFaculties([
            { id: 6, name: "Prof. Amit Singh", email: "amit@lnmiit.ac.in", department_id: parseInt(departmentId) },
            { id: 7, name: "Dr. Neha Gupta", email: "neha@lnmiit.ac.in", department_id: parseInt(departmentId) }
          ])
        }
      } else {
        console.error("Failed to fetch faculties:", res.status)
        // Provide fallback faculty
        setFaculties([
          { id: 6, name: "Prof. Amit Singh", email: "amit@lnmiit.ac.in", department_id: parseInt(departmentId) },
          { id: 7, name: "Dr. Neha Gupta", email: "neha@lnmiit.ac.in", department_id: parseInt(departmentId) }
        ])
      }
    } catch (error) {
      console.error("Failed to load faculties:", error)
      // Provide fallback faculty
      setFaculties([
        { id: 6, name: "Prof. Amit Singh", email: "amit@lnmiit.ac.in", department_id: parseInt(departmentId) },
        { id: 7, name: "Dr. Neha Gupta", email: "neha@lnmiit.ac.in", department_id: parseInt(departmentId) }
      ])
    }
  }

  const loadLabs = async (departmentId: string) => {
    if (!departmentId) return
    try {
      const res = await fetch(`/api/admin/labs?department_id=${departmentId}`)
      if (res.ok) {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setLabs(data.labs || [])
        } catch (parseError) {
          console.error("JSON parse error for labs:", parseError)
          // Provide fallback labs
          setLabs([
            { id: 1, name: "CP1", code: "CP1", department_id: parseInt(departmentId), capacity: 40, location: "Block A" },
            { id: 2, name: "CP2", code: "CP2", department_id: parseInt(departmentId), capacity: 30, location: "Block B" }
          ])
        }
      } else {
        console.error("Failed to fetch labs:", res.status)
        // Provide fallback labs
        setLabs([
          { id: 1, name: "CP1", code: "CP1", department_id: parseInt(departmentId), capacity: 40, location: "Block A" },
          { id: 2, name: "CP2", code: "CP2", department_id: parseInt(departmentId), capacity: 30, location: "Block B" }
        ])
      }
    } catch (error) {
      console.error("Failed to load labs:", error)
      // Provide fallback labs
      setLabs([
        { id: 1, name: "CP1", code: "CP1", department_id: parseInt(departmentId), capacity: 40, location: "Block A" },
        { id: 2, name: "CP2", code: "CP2", department_id: parseInt(departmentId), capacity: 30, location: "Block B" }
      ])
    }
  }

  const loadAvailableSlots = async (labId: string, date: Date) => {
    if (!labId || !date) return
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/student/available-slots?lab_id=${labId}&date=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error("Failed to load available slots:", error)
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
    }
  }

  useEffect(() => {
    handleLabAndDateChange()
  }, [selectedLab, selectedDate])

  const handleSubmit = async () => {
    if (!selectedDepartment || !selectedFaculty || !selectedLab || !selectedDate || !selectedTimeSlot || !purpose.trim()) {
      toast({ title: "Missing Information", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const [startTime, endTime] = selectedTimeSlot.split(' - ')
      const requestData = {
        lab_id: parseInt(selectedLab),
        faculty_supervisor_id: parseInt(selectedFaculty),
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
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
      setPurpose("")
      setRemarks("")
      
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error?.message || "Failed to submit request", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const canProceedToStep2 = selectedDepartment && selectedFaculty && selectedLab
  const canProceedToStep3 = canProceedToStep2 && selectedDate && selectedTimeSlot
  const canSubmit = canProceedToStep3 && purpose.trim()

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
                <div>
                  <Label>Available Time Slots <span className="text-red-600">*</span></Label>
                  {availableSlots.length === 0 ? (
                    <div className="p-4 border rounded-lg text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No available slots for selected date</p>
                      <p className="text-sm">Please select a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant={selectedTimeSlot === `${slot.start_time} - ${slot.end_time}` ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setSelectedTimeSlot(`${slot.start_time} - ${slot.end_time}`)}
                          disabled={!slot.is_available}
                        >
                          {slot.start_time} - {slot.end_time}
                          {!slot.is_available && <Badge variant="destructive" className="ml-2">Booked</Badge>}
                        </Button>
                      ))}
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
                <p>Time: <span className="font-medium">{selectedTimeSlot}</span></p>
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

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Approval Process</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>1. Faculty Supervisor will review and approve/reject</p>
                  <p>2. Lab Staff will verify availability and approve/reject</p>
                  <p>3. HOD will give final approval</p>
                  <p>4. You'll receive email notifications at each step</p>
                </div>
              </div>

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
