"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function SystemLogsPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{ action?: string; entityType?: string }>({})

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") { window.location.href = "/"; return }
    try { const parsed = u ? JSON.parse(u) : null; const r = parsed?.role ? String(parsed.role).replace(/_/g, "-") : null; setRole(r) } catch {}
    setAuthChecked(true)
  }, [])

  const canManage = role === "admin"

  const load = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.action) params.set("action", filters.action)
      if (filters.entityType) params.set("entityType", filters.entityType)
      const res = await fetch(`/api/admin/logs?${params.toString()}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load logs")
      setLogs(data.logs || [])
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "", variant: "destructive" })
    }
  }

  useEffect(() => { if (authChecked) load() }, [authChecked, filters.action, filters.entityType])

  const undo = async (logId: number) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/logs/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Undo failed")
      toast({ title: "Undo applied" })
      await load()
    } catch (e: any) {
      toast({ title: "Undo failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  if (!authChecked) return null
  if (!canManage) return <div className="p-6">Only Admin can access System Logs.</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">System Logs</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs block">Action</label>
          <Select value={filters.action || "all"} onValueChange={(v) => setFilters((s) => ({ ...s, action: v === "all" ? undefined : v }))}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["CREATE_LAB","UPDATE_LAB","DELETE_LAB","SET_LAB_STAFF","CREATE_DEPARTMENT","UPDATE_DEPARTMENT","DELETE_DEPARTMENT","SET_DEPARTMENT_HOD"].map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs block">Entity</label>
          <Select value={filters.entityType || "all"} onValueChange={(v) => setFilters((s) => ({ ...s, entityType: v === "all" ? undefined : v }))}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["lab","department","user","booking","inventory"].map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Undo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell>{l.user_name} ({l.user_email})</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.entity_type} #{l.entity_id}</TableCell>
                  <TableCell><pre className="whitespace-pre-wrap text-xs max-w-[36ch] overflow-hidden text-ellipsis">{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</pre></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" disabled={loading || !l.undoable || !l.withinTop10} onClick={() => undo(l.id)}>
                      {l.withinTop10 ? (l.undoable ? "Undo" : "N/A") : "Only last 10"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
