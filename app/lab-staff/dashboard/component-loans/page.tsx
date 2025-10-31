"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Check, Clock, X } from "lucide-react"

export default function ComponentLoansPage() {
  const { toast } = useToast()
  const [active, setActive] = useState<'pending'|'issued'|'return_requested'|'overdue5'>('pending')
  const [loading, setLoading] = useState(false)
  const [loans, setLoans] = useState<any[]>([])

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
      toast({ title: 'Updated', description: `Action ${action} successful.` })
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Could not update loan', variant: 'destructive' })
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
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
