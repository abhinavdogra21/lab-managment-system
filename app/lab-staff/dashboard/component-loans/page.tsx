"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Check, Clock, X, Bell, CheckCircle2 } from "lucide-react"

export default function ComponentLoansPage() {
  const { toast } = useToast()
  const [active, setActive] = useState<'pending'|'issued'|'return_requested'|'overdue5'>('pending')
  const [loading, setLoading] = useState(false)
  const [loans, setLoans] = useState<any[]>([])
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lab-staff/component-loans', { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      const data = JSON.parse(text)
      setLoans(data.loans || [])
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message || 'Could not load loans', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const act = async (id: number, action: string) => {
    try {
      const res = await fetch(`/api/lab-staff/component-loans/${id}/action`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ action }) })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      
      // Show success dialog based on action
      let successMessage = ''
      switch(action) {
        case 'approve':
          successMessage = '✓ Component loan approved successfully! The requester has been notified.'
          break
        case 'reject':
          successMessage = '✓ Component loan rejected successfully. The requester has been notified.'
          break
        case 'approve_extension':
          successMessage = '✓ Extension approved successfully! The due date has been updated.'
          break
        case 'reject_extension':
          successMessage = '✓ Extension rejected successfully. The requester has been notified.'
          break
        case 'approve_return':
          successMessage = '✓ Component return confirmed successfully! Components are now available.'
          break
        default:
          successMessage = '✓ Action completed successfully!'
      }
      
      setSuccessDialog({ open: true, message: successMessage })
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Could not update loan', variant: 'destructive' })
    }
  }

  const sendReminder = async (id: number) => {
    // Prevent double-click
    if (processingIds.has(id)) {
      return
    }
    
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      
      const res = await fetch(`/api/lab-staff/component-loans/${id}/send-reminder`, { method: 'POST' })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      const data = JSON.parse(text)
      setSuccessDialog({ open: true, message: `✓ ${data.message || 'Reminder email sent successfully!'}` })
    } catch (e: any) {
      toast({ title: 'Failed to send reminder', description: e?.message || 'Could not send reminder email', variant: 'destructive' })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const filtered = loans.filter((l) => {
    if (active === 'pending') return l.status === 'pending_lab_staff'
    if (active === 'issued') return l.status === 'issued'
    if (active === 'return_requested') return l.status === 'return_requested'
    // overdue 5+ days
    if (active === 'overdue5') {
      const due = l.due_date ? new Date(l.due_date) : null
      if (!due) return false
      const today = new Date()
      const diff = Math.floor((today.getTime() - due.getTime()) / (24*3600*1000))
      return l.status === 'issued' && diff >= 5
    }
    return false
  })

  const badge = (status: string) => {
    switch (status) {
      case 'pending_lab_staff': return <Badge variant="outline" className="text-blue-600 border-blue-300">Pending</Badge>
      case 'issued': return <Badge variant="outline" className="text-green-600 border-green-300">Issued</Badge>
      case 'return_requested': return <Badge variant="outline" className="text-orange-600 border-orange-300">Return Requested</Badge>
      case 'returned': return <Badge variant="outline" className="text-gray-600 border-gray-300">Returned</Badge>
      case 'rejected': return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Component Loans</h1>
      <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="space-y-3">
        <TabsList className="grid grid-cols-4 max-w-xl h-8">
          <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          <TabsTrigger value="issued" className="text-xs">Issued</TabsTrigger>
          <TabsTrigger value="return_requested" className="text-xs">Return Requests</TabsTrigger>
          <TabsTrigger value="overdue5" className="text-xs">Overdue 5+</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending loans</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((l: any) => (
                <Card key={l.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{l.lab_name} • <span className="text-muted-foreground">{l.requester_name}</span></div>
                    {badge(l.status)}
                  </div>
                  <div className="text-sm flex items-center gap-2"><Calendar className="h-3 w-3" /> Due: {l.due_date}</div>
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => act(l.id, 'approve')}><Check className="h-4 w-4 mr-1"/>Approve</Button>
                    <Button className="flex-1" variant="destructive" onClick={() => act(l.id, 'reject')}><X className="h-4 w-4 mr-1"/>Reject</Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="issued">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No issued loans</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((l: any) => (
                <Card key={l.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{l.lab_name} • <span className="text-muted-foreground">{l.requester_name}</span></div>
                    {badge(l.status)}
                  </div>
                  <div className="text-sm flex items-center gap-2"><Calendar className="h-3 w-3" /> Due: {l.due_date}</div>
                  {/* Extension info */}
                  {l.extension_status === 'pending' && l.extension_requested_due_date && (
                    <div className="text-xs bg-yellow-50 border-l-2 border-yellow-300 p-2 rounded">Extension requested to <b>{l.extension_requested_due_date}</b></div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {l.extension_status === 'pending' && (
                      <>
                        <Button className="flex-1" onClick={() => act(l.id, 'approve_extension')}><Check className="h-4 w-4 mr-1"/>Approve Extension</Button>
                        <Button className="flex-1" variant="destructive" onClick={() => act(l.id, 'reject_extension')}><X className="h-4 w-4 mr-1"/>Reject Extension</Button>
                      </>
                    )}
                    {l.extension_status !== 'pending' && (
                      <Button variant="outline" className="w-full" onClick={() => sendReminder(l.id)} disabled={processingIds.has(l.id)}>
                        {processingIds.has(l.id) ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Bell className="h-4 w-4 mr-2"/>Send Return Reminder
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="return_requested">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No return requests</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((l: any) => (
                <Card key={l.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{l.lab_name} • <span className="text-muted-foreground">{l.requester_name}</span></div>
                    {badge(l.status)}
                  </div>
                  <div className="text-sm flex items-center gap-2"><Clock className="h-3 w-3" /> Due: {l.due_date}</div>
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => act(l.id, 'approve_return')}><Check className="h-4 w-4 mr-1"/>Confirm Return</Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue5">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No overdue 5+ day loans</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((l: any) => (
                <Card key={l.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{l.lab_name} • <span className="text-muted-foreground">{l.requester_name}</span></div>
                    {badge(l.status)}
                  </div>
                  <div className="text-sm flex items-center gap-2"><Clock className="h-3 w-3" /> Due: {l.due_date}</div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="w-full" onClick={() => sendReminder(l.id)} disabled={processingIds.has(l.id)}>
                      {processingIds.has(l.id) ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2"/>Send Return Reminder
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Success!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {successDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setSuccessDialog({ open: false, message: '' })} className="w-full sm:w-auto">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
