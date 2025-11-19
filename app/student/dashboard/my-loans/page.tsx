/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, CornerDownLeft, Hourglass } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function MyLoansPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loans, setLoans] = useState<any[]>([])
  const [extDate, setExtDate] = useState<Record<number, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/student/component-loans', { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      const data = JSON.parse(text)
      setLoans(data.loans || [])
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message || 'Could not load your loans', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const act = async (id: number, action: string, payload?: any) => {
    try {
      const res = await fetch(`/api/student/component-loans/${id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
      const text = await res.text()
      if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
      toast({ title: 'Updated', description: `Action ${action} successful.` })
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Could not update loan', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">My Component Loans</h1>
      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : loans.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No loans found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {loans.map((l: any) => (
            <Card key={l.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{l.lab_name}</div>
                <Badge variant="outline">{l.status}</Badge>
              </div>
              <div className="text-sm flex items-center gap-2"><Calendar className="h-3 w-3"/> Due: {l.due_date}</div>
              {l.status === 'issued' && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => act(l.id, 'request_return')}><CornerDownLeft className="h-4 w-4 mr-1"/>Return</Button>
                </div>
              )}
              {l.status === 'issued' && (
                <div className="space-y-1 pt-2">
                  <div className="text-xs text-muted-foreground">Request extension</div>
                  <div className="flex gap-2">
                    <input type="date" className="border rounded px-2 text-sm" value={extDate[l.id] || ''} onChange={(e) => setExtDate(prev => ({ ...prev, [l.id]: e.target.value }))} />
                    <Button variant="outline" onClick={() => act(l.id, 'request_extension', { new_due_date: extDate[l.id] })}><Hourglass className="h-4 w-4 mr-1"/>Extend</Button>
                  </div>
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  )
}
