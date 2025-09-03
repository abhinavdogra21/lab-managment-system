"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function SystemLogsPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
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

  const formatDescription = useMemo(() => {
    const listUpdates = (obj: any, keys: string[]) => {
      const parts = keys
        .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
        .map((k) => `${k}=${obj[k]}`)
      return parts.length ? parts.join(", ") : "fields updated"
    }
    return (l: any) => {
      const parse = (d: any) => { try { return typeof d === "string" ? JSON.parse(d) : d } catch { return d } }
      const d = parse(l.details) || {}
      const id = l.entity_id
      const action = String(l.action || "")
      const entity = String(l.entity_type || "")

      switch (action) {
        case "CREATE_LAB":
          return `Created lab "${d.name || `#${id}`}" (code ${d.code || "—"}) in department ${d.departmentId ?? "—"}`
        case "UPDATE_LAB":
          return `Updated lab #${id}: ${listUpdates(d, ["name","code","capacity","location","staffId"])}`
        case "DELETE_LAB":
          return `Deleted lab #${id}${d.cascade ? " (cascade)" : ""}`
        case "SET_LAB_STAFF": {
          if (Array.isArray(d.staffIds)) return `Set ${d.staffIds.length} staff member(s) for lab #${id}`
          if (d.staffId === null) return `Cleared lab staff for lab #${id}`
          if (d.staffId) return `Assigned staff #${d.staffId} to lab #${id}`
          return `Updated lab staff for lab #${id}`
        }
        case "CREATE_DEPARTMENT":
          return `Created department "${d.name || `#${id}`}" (code ${d.code || "—"})`
        case "UPDATE_DEPARTMENT":
          return `Updated department #${id}: ${listUpdates(d, ["name","code","hodEmail"])}`
        case "DELETE_DEPARTMENT":
          return `Deleted department #${id}${d.cascade ? " (cascade)" : ""}`
        case "SET_DEPARTMENT_HOD":
          return d.hodId === null ? `Cleared HOD for department #${id}` : `Set HOD to user #${d.hodId} for department #${id}`
        case "CREATE_BOOKING": {
          const when = [d.bookingDate, d.startTime && d.endTime ? `${d.startTime}-${d.endTime}` : null].filter(Boolean).join(" ")
          return `Created booking #${id} for lab #${d.labId ?? "—"} on ${when} (${d.purpose || "no purpose"})`
        }
        case "DELETE_USER":
          return `Deleted user #${id}`
        case "HARD_DELETE_USER":
          return `Hard-deleted user #${id}${d.archiveId ? ` (archived snapshot #${d.archiveId})` : ""}`
        default: {
          const fallback = typeof l.details === "string" ? l.details : JSON.stringify(l.details)
          return fallback || `${action} on ${entity} #${id}`
        }
      }
    }
  }, [])

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
              {["CREATE_LAB","UPDATE_LAB","DELETE_LAB","SET_LAB_STAFF","CREATE_DEPARTMENT","UPDATE_DEPARTMENT","DELETE_DEPARTMENT","SET_DEPARTMENT_HOD","CREATE_BOOKING","DELETE_USER","HARD_DELETE_USER"].map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
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
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell>{l.user_name} ({l.user_email})</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.entity_type} #{l.entity_id}</TableCell>
                  <TableCell className="text-sm"><div className="max-w-[60ch] whitespace-pre-wrap break-words">{formatDescription(l)}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

