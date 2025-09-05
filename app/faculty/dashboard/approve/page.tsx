"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Check, X } from 'lucide-react'

interface RequestItem {
  id: number
  student_name: string
  student_email: string
  lab_name: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: string
}

export default function FacultyApprovePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<RequestItem[]>([])
  const [remarks, setRemarks] = useState<Record<number, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/faculty/requests?status=pending_faculty', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setItems(data.requests || [])
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const takeAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/faculty/requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks: remarks[id] || '' })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: action === 'approve' ? 'Approved' : 'Rejected' })
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Try again', variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Approve Requests</h1>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No pending requests</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {r.lab_name}
                  <Badge variant="secondary">Pending Faculty</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p><b>Student:</b> {r.student_name} ({r.student_email})</p>
                  <p><b>Date:</b> {new Date(r.booking_date).toLocaleDateString()} <Calendar className="inline h-4 w-4 ml-1" /></p>
                  <p><b>Time:</b> {r.start_time} - {r.end_time} <Clock className="inline h-4 w-4 ml-1" /></p>
                  <p><b>Purpose:</b> {r.purpose}</p>
                </div>

                <div>
                  <Textarea placeholder="Remarks (optional)" value={remarks[r.id] || ''} onChange={(e) => setRemarks((s) => ({ ...s, [r.id]: e.target.value }))} />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => takeAction(r.id, 'approve')}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => takeAction(r.id, 'reject')}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
