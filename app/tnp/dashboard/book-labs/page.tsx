"use client"

import { useEffect, useState } from "react"
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
import { CalendarIcon, ArrowRight, Clock, User, Building2, ChevronLeft } from "lucide-react"
import { format } from "date-fns"

interface Lab { id: number; name: string; code: string; department_id: number; capacity: number; location: string }
interface TimeSlot { start_time: string; end_time: string; is_available: boolean; display?: string }
interface BookedSlotItem { start_time: string; end_time: string; time_range: string; purpose: string; booker_name?: string; type: 'booking'|'class' }

export default function TNPBookLabsPage() {
	const { toast } = useToast()
	const [currentStep, setCurrentStep] = useState(1)
	const [labs, setLabs] = useState<Lab[]>([])
	const [selectedLab, setSelectedLab] = useState<string>("")
	const [selectedDate, setSelectedDate] = useState<Date>()
	const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
	const [bookedSlots, setBookedSlots] = useState<BookedSlotItem[]>([])
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
	const [startTime, setStartTime] = useState("")
	const [endTime, setEndTime] = useState("")
	const [purpose, setPurpose] = useState("")
	const [loading, setLoading] = useState(false)

	useEffect(() => { loadLabs() }, [])

	const loadLabs = async () => {
		try {
			const res = await fetch(`/api/tnp/labs`)
			if (res.ok) {
				const data = await res.json()
				setLabs(data.labs || [])
			}
		} catch {}
	}

	const loadAvailable = async (labId: string, date: Date) => {
		try {
			const dateStr = format(date, 'yyyy-MM-dd')
			const res = await fetch(`/api/tnp/available-slots?lab_id=${labId}&date=${dateStr}`)
			if (res.ok) {
				const data = await res.json()
				setAvailableSlots(data.availableSlots || [])
			} else setAvailableSlots([])
		} catch { setAvailableSlots([]) }
	}

	const loadBooked = async (labId: string, date: Date) => {
		try {
			const dateStr = format(date, 'yyyy-MM-dd')
			const res = await fetch(`/api/tnp/booked-slots?lab_id=${labId}&date=${dateStr}`)
			if (res.ok) {
				const data = await res.json()
				setBookedSlots(data.booked_slots || [])
			} else setBookedSlots([])
		} catch { setBookedSlots([]) }
	}

	useEffect(() => {
		if (selectedLab && selectedDate) {
			loadAvailable(selectedLab, selectedDate)
			loadBooked(selectedLab, selectedDate)
		}
	}, [selectedLab, selectedDate])

	const hasConflict = () => {
		if (!startTime || !endTime) return false
		const s = `${startTime}:00`
		const e = `${endTime}:00`
		return bookedSlots.some(b => (s < `${b.end_time}:00` && e > `${b.start_time}:00`))
	}
	const isInvalidTimeRange = () => !!startTime && !!endTime && startTime >= endTime
	const isOutsideBusinessHours = () => {
		if (!startTime || !endTime) return false
		const [sh, sm] = startTime.split(':').map(Number)
		const [eh, em] = endTime.split(':').map(Number)
		const s = sh*60+sm, e = eh*60+em
		return s < 8*60 || e > 20*60
	}

	const canProceed2 = !!selectedLab
	const canProceed3 = !!(canProceed2 && selectedDate && (selectedTimeSlot || (startTime && endTime && !hasConflict() && !isInvalidTimeRange() && !isOutsideBusinessHours())))
	const canSubmit = !!(canProceed3 && purpose.trim())

	const handleSubmit = async () => {
		const manualSelected = !selectedTimeSlot && startTime && endTime
		if (!canSubmit) return
		setLoading(true)
		try {
			const [sTime, eTime] = selectedTimeSlot ? selectedTimeSlot.split(' - ') : [startTime, endTime]
			const payload = {
				lab_id: parseInt(selectedLab),
				booking_date: format(selectedDate!, 'yyyy-MM-dd'),
				start_time: sTime,
				end_time: eTime,
				purpose: purpose.trim()
			}
			const res = await fetch('/api/tnp/booking-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			const data = await res.json()
			if (!res.ok) throw new Error(data?.error || 'Failed to submit')
			setCurrentStep(1)
			setSelectedLab("")
			setSelectedDate(undefined)
			setSelectedTimeSlot("")
			setStartTime("")
			setEndTime("")
			setPurpose("")
			toast({ title: 'Request raised successfully!', description: 'Your lab booking request has been submitted and is pending Lab Staff review.' })
		} catch (e: any) {
			toast({ title: 'Submission failed', description: e?.message || 'Failed to submit request', variant: 'destructive' })
		} finally { setLoading(false) }
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
					<p className="text-muted-foreground">TnP can raise a booking that goes to Lab Staff, then HOD</p>
				</div>
			</div>

			{/* Steps */}
			<div className="flex items-center justify-center mb-8">
				<div className="flex items-center space-x-4">
					<div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
					<ArrowRight className={`h-4 w-4 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`} />
					<div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
					<ArrowRight className={`h-4 w-4 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`} />
					<div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>3</div>
				</div>
			</div>

			<div className="max-w-2xl mx-auto">
				{currentStep === 1 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Step 1: Select Lab
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Lab <span className="text-red-600">*</span></Label>
								<Select value={selectedLab} onValueChange={setSelectedLab}>
									<SelectTrigger>
										<SelectValue placeholder="Select Lab" />
									</SelectTrigger>
									<SelectContent>
										{labs.map(lab => (
											<SelectItem key={lab.id} value={lab.id.toString()}>
												{lab.name} ({lab.code})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="pt-4">
								<Button onClick={() => setCurrentStep(2)} disabled={!canProceed2} className="w-full">
									Next: Select Date & Time <ArrowRight className="h-4 w-4 ml-2" />
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{currentStep === 2 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Step 2: Select Date & Time Slot
							</CardTitle>
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
										<Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(d) => d < new Date()} initialFocus />
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

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Start Time (HH:MM)</Label>
											<Input type="time" min="08:00" max="20:00" value={startTime} onChange={(e) => { setStartTime(e.target.value); setSelectedTimeSlot("") }} />
										</div>
										<div>
											<Label>End Time (HH:MM)</Label>
											<Input type="time" min="08:00" max="20:00" value={endTime} onChange={(e) => { setEndTime(e.target.value); setSelectedTimeSlot("") }} />
										</div>
									</div>

									{startTime && endTime && (
										<div className="space-y-2">
											{hasConflict() && (
												<div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded flex items-center gap-2">
													<Clock className="h-4 w-4" /> The selected time range overlaps with an existing booking or class.
												</div>
											)}
											{isInvalidTimeRange() && (
												<div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded flex items-center gap-2">
													<Clock className="h-4 w-4" /> End time must be after start time.
												</div>
											)}
											{isOutsideBusinessHours() && (
												<div className="p-3 border border-amber-200 bg-amber-50 text-sm text-amber-800 rounded flex items-center gap-2">
													<Clock className="h-4 w-4" /> Lab bookings are only allowed between 8:00 AM and 8:00 PM.
												</div>
											)}
										</div>
									)}
								</div>
							)}

							<div className="flex gap-2 pt-4">
								<Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1"><ChevronLeft className="h-4 w-4 mr-2" />Back</Button>
								<Button onClick={() => setCurrentStep(3)} disabled={!canProceed3} className="flex-1">Next: Purpose & Submit <ArrowRight className="h-4 w-4 ml-2" /></Button>
							</div>
						</CardContent>
					</Card>
				)}

				{currentStep === 3 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" /> Step 3: Purpose & Submit Request
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Purpose of Lab Use <span className="text-red-600">*</span></Label>
								<Textarea placeholder="Describe why you need the lab (e.g., Placement Drive, Training Session)" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={4} />
							</div>
							<div className="flex gap-2 pt-4">
								<Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1"><ChevronLeft className="h-4 w-4 mr-2" />Back</Button>
								<Button onClick={handleSubmit} disabled={!canSubmit || loading} className="flex-1">{loading ? 'Submitting...' : 'Submit Request'}</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}

