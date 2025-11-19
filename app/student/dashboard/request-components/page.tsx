/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, Building2, ChevronLeft, Package, Search, User, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Department { id: number; name: string; code: string }
interface Faculty { id: number; name: string; email: string; department_name?: string }
interface Lab { id: number; name: string; code: string; department_id: number; capacity: number; location: string }
interface ComponentItem { id: number; name: string; category: string | null; model: string | null; condition_status: 'working'|'dead'|'consumable'; quantity_total: number; quantity_available: number }

export default function RequestComponentsPage() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [departments, setDepartments] = useState<Department[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [components, setComponents] = useState<ComponentItem[]>([])

  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [selectedFaculty, setSelectedFaculty] = useState<string>("")
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [purpose, setPurpose] = useState("")
  const [returnDate, setReturnDate] = useState<string>("")
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadDepartments() }, [])

  useEffect(() => {
    if (selectedDepartment) loadFaculties(selectedDepartment)
    // Load all labs (students can pick any)
    loadLabs()
  }, [selectedDepartment])

  useEffect(() => {
    if (selectedLab) loadComponents(Number(selectedLab))
  }, [selectedLab])

  const loadDepartments = async () => {
    try {
      const res = await fetch('/api/student/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data.departments || [])
      }
    } catch {}
  }
  const loadFaculties = async (departmentId: string) => {
    try {
      const res = await fetch(`/api/student/faculties?department_id=${departmentId}`)
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) {
        const data = JSON.parse(text)
        setFaculties(data.users || [])
      } else setFaculties([])
    } catch { setFaculties([]) }
  }
  const loadLabs = async () => {
    try {
      const res = await fetch(`/api/student/labs`)
      if (res.ok) { const data = await res.json(); setLabs(data.labs || []) } else setLabs([])
    } catch { setLabs([]) }
  }
  const loadComponents = async (labId: number) => {
    try {
      const res = await fetch(`/api/student/components?lab_id=${labId}`)
      if (res.ok) { const data = await res.json(); setComponents(data.components || []) } else setComponents([])
    } catch { setComponents([]) }
  }

  const canProceedStep1 = selectedDepartment && selectedFaculty && selectedLab
  const selectedLabName = useMemo(() => labs.find(l => l.id.toString() === selectedLab)?.name || '', [labs, selectedLab])
  const selectedFacultyName = useMemo(() => faculties.find(f => f.id.toString() === selectedFaculty)?.name || '', [faculties, selectedFaculty])

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components
    const q = searchQuery.toLowerCase()
    return components.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.model?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    )
  }, [components, searchQuery])

  const totalRequested = Object.entries(quantities).reduce((sum, [id, q]) => sum + (q || 0), 0)

  const adjustQuantity = (componentId: number, value: number, max: number) => {
    const v = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)))
    setQuantities(prev => ({ ...prev, [componentId]: v }))
  }

  const handleSubmit = async () => {
    if (!canProceedStep1 || totalRequested <= 0 || !purpose.trim()) {
      toast({ title: 'Missing information', description: 'Select lab, faculty, add at least one item and purpose.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const items = Object.entries(quantities)
        .map(([cid, qty]) => ({ component_id: Number(cid), quantity: Number(qty) }))
        .filter(it => it.quantity > 0)
      const res = await fetch('/api/student/component-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_id: Number(selectedLab), mentor_faculty_id: Number(selectedFaculty), purpose: purpose.trim(), return_date: returnDate, items })
      })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      setSuccessDialog({ 
        open: true, 
        message: '✓ Component request submitted successfully! Your request has been sent to the mentor faculty for approval. You will be notified of the status.'
      })
      // Reset
      setCurrentStep(1); setSelectedDepartment(''); setSelectedFaculty(''); setSelectedLab(''); setComponents([]); setQuantities({}); setPurpose(''); setReturnDate('')
    } catch (e: any) {
      toast({ title: 'Submit failed', description: e?.message || 'Could not submit request', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/student/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Request Lab Components</h1>
          <p className="text-muted-foreground">Select a lab, choose items and quantities, and submit via your mentor faculty</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
          <ArrowRight className={`h-4 w-4 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Step 1: Select Department, Mentor & Lab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Department <span className="text-red-600">*</span></Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (<SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.code})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDepartment && (
                <div>
                  <Label>Mentor Faculty <span className="text-red-600">*</span></Label>
                  <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                    <SelectTrigger><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                    <SelectContent>
                      {faculties.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.name} ({f.email})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedDepartment && (
                <div>
                  <Label>Lab <span className="text-red-600">*</span></Label>
                  <Select value={selectedLab} onValueChange={setSelectedLab}>
                    <SelectTrigger><SelectValue placeholder="Select Lab" /></SelectTrigger>
                    <SelectContent>
                      {labs.map(l => (<SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.code})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="pt-4">
                <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1} className="w-full">
                  Next: Pick Items <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Step 2: Choose Items & Submit</CardTitle>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Mentor: <span className="font-medium">{selectedFacultyName}</span></p>
                <p>Lab: <span className="font-medium">{selectedLabName}</span></p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {components.length === 0 ? (
                <div className="p-3 border rounded text-sm text-muted-foreground">No components found for this lab.</div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" /> Search Components
                    </Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search by name, model, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-3">
                    {filteredComponents.length === 0 ? (
                      <div className="p-3 border rounded text-sm text-muted-foreground">No components match your search.</div>
                    ) : (
                      filteredComponents.map(c => (
                        <div key={c.id} className="p-3 border rounded flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{c.name} {c.model ? `(${c.model})` : ''}</div>
                            <div className="text-xs text-muted-foreground">{c.category || 'Uncategorized'} • {c.condition_status} • Available: {c.quantity_available}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={0}
                              max={c.quantity_available}
                              value={quantities[c.id] ?? 0}
                              onChange={(e) => adjustQuantity(c.id, Number(e.target.value), c.quantity_available)}
                              className="w-24 h-8"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div>
                <Label>Purpose <span className="text-red-600">*</span></Label>
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="Describe why you need these components" />
              </div>

              <div>
                <Label htmlFor="returnDate">Return Date <span className="text-red-600">*</span></Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading || totalRequested === 0 || !purpose.trim() || !returnDate} className="flex-1">
                  {loading ? 'Submitting...' : 'Submit Request'}
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
