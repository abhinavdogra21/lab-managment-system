"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, ChevronLeft, Package, Search, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Lab { id: number; name: string; code: string; department_id: number; capacity: number; location: string }
interface ComponentItem { id: number; name: string; category: string | null; model: string | null; condition_status: 'working'|'dead'|'consumable'; quantity_total: number; quantity_available: number }

export default function FacultyRequestComponentsPage() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [labs, setLabs] = useState<Lab[]>([])
  const [components, setComponents] = useState<ComponentItem[]>([])
  const [labsLoading, setLabsLoading] = useState(true)

  const [selectedLab, setSelectedLab] = useState<string>("")
  const [purpose, setPurpose] = useState("")
  const [returnDate, setReturnDate] = useState<string>("")
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => { 
    loadLabs()
  }, [])

  useEffect(() => {
    if (selectedLab) loadComponents(Number(selectedLab))
  }, [selectedLab])

  const loadLabs = async () => {
    setLabsLoading(true)
    try {
      const res = await fetch(`/api/faculty/labs`)
      if (res.ok) { 
        const data = await res.json()
        setLabs(data.labs || []) 
      } else {
        const errorText = await res.text()
        toast({ 
          title: 'Failed to load labs', 
          description: `Error ${res.status}: ${errorText}`, 
          variant: 'destructive' 
        })
        setLabs([])
      }
    } catch (e: any) { 
      toast({ 
        title: 'Error', 
        description: e?.message || 'Could not load labs', 
        variant: 'destructive' 
      })
      setLabs([]) 
    } finally {
      setLabsLoading(false)
    }
  }

  const loadComponents = async (labId: number) => {
    try {
      const res = await fetch(`/api/faculty/components?lab_id=${labId}`)
      if (res.ok) { const data = await res.json(); setComponents(data.components || []) } else setComponents([])
    } catch { setComponents([]) }
  }

  const canProceedStep1 = selectedLab
  const selectedLabName = useMemo(() => labs.find(l => l.id.toString() === selectedLab)?.name || '', [labs, selectedLab])

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
    if (!canProceedStep1 || totalRequested <= 0 || !purpose.trim() || !returnDate) {
      toast({ title: 'Missing information', description: 'Select lab, add at least one item, purpose, and return date.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const items = Object.entries(quantities)
        .map(([cid, qty]) => ({ component_id: Number(cid), quantity: Number(qty) }))
        .filter(it => it.quantity > 0)
      const res = await fetch('/api/faculty/component-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_id: Number(selectedLab), purpose: purpose.trim(), return_date: returnDate, items })
      })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      setSuccessDialog({ 
        open: true, 
        message: '✓ Component request submitted successfully! Your request has been sent to Lab Staff for review and approval.'
      })
      // Reset
      setCurrentStep(1); setSelectedLab(''); setComponents([]); setQuantities({}); setPurpose(''); setReturnDate('')
    } catch (e: any) {
      toast({ title: 'Submit failed', description: e?.message || 'Could not submit request', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Request Lab Components</h1>
          <p className="text-muted-foreground">Select a lab, choose items and quantities, and submit your request</p>
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
              <CardTitle>Step 1: Select Lab</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="lab">Lab *</Label>
                {labsLoading ? (
                  <div className="w-full px-3 py-2 border rounded-md text-muted-foreground">
                    Loading labs...
                  </div>
                ) : labs.length === 0 ? (
                  <div className="w-full px-3 py-2 border rounded-md text-destructive">
                    No labs available
                  </div>
                ) : (
                  <select
                    id="lab"
                    value={selectedLab}
                    onChange={e => setSelectedLab(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Select a lab --</option>
                    {labs.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 2: Select Components</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Change Lab
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p><strong>Lab:</strong> {selectedLabName}</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Components List */}
              <div className="border rounded-md max-h-96 overflow-y-auto">
                {filteredComponents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No components found</p>
                  </div>
                ) : (
                  filteredComponents.map(comp => {
                    const requested = quantities[comp.id] || 0
                    return (
                      <div key={comp.id} className="p-3 border-b last:border-0 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{comp.name} {comp.model ? `(${comp.model})` : ''}</div>
                          <div className="text-xs text-muted-foreground">{comp.category || 'Uncategorized'} • Available: {comp.quantity_available}/{comp.quantity_total}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => adjustQuantity(comp.id, requested - 1, comp.quantity_available)} disabled={requested <= 0}>-</Button>
                          <Input
                            type="number"
                            min={0}
                            max={comp.quantity_available}
                            value={requested}
                            onChange={e => adjustQuantity(comp.id, Number(e.target.value), comp.quantity_available)}
                            className="w-16 text-center"
                          />
                          <Button size="sm" variant="outline" onClick={() => adjustQuantity(comp.id, requested + 1, comp.quantity_available)} disabled={requested >= comp.quantity_available}>+</Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Purpose */}
              <div>
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Enter purpose of requesting these components..."
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Return Date */}
              <div>
                <Label htmlFor="returnDate">Expected Return Date *</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Summary */}
              {totalRequested > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                  <p className="font-medium">Total components requested: {totalRequested}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button onClick={handleSubmit} disabled={totalRequested <= 0 || loading || !purpose.trim() || !returnDate}>
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
