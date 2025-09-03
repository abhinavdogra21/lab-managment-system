"use client"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
type Department = { id: number; name: string; code: string }
import { useToast } from "@/components/ui/use-toast"

type User = { id: number; name: string; email: string; role: string; department?: string }

export default function UsersPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<string>("created_at_desc")
  const [selected, setSelected] = useState<User | null>(null)
  const [history, setHistory] = useState<any | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState<{ role: "student" | "lab_staff" | "faculty" | "hod" | "admin" | "tnp"; name: string; email: string; department?: string }>({ role: "student", name: "", email: "", department: undefined })
  const [addFirst, setAddFirst] = useState("")
  const [addMiddle, setAddMiddle] = useState("")
  const [addLast, setAddLast] = useState("")
  
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{ ok: number; fail: number } | null>(null)
  const [importFileName, setImportFileName] = useState<string>("")
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<{ id?: number; first: string; middle: string; last: string; email: string; role: User["role"]; department?: string | undefined } | null>(null)
  const [purgeDays, setPurgeDays] = useState(30)

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    setAuthChecked(true)
  }, [])

  useEffect(() => {
    if (!authChecked) return
    ;(async () => {
      try {
        const d = await fetch("/api/departments", { cache: "no-store" }).then((r) => r.json())
        setDepartments(d.departments || [])
      } catch {}
    })()
  }, [authChecked])

  useEffect(() => {
    if (!authChecked) return
    const load = async () => {
      try {
        const qs = new URLSearchParams()
        if (role) qs.set("role", role)
        if (department) qs.set("department", department)
        if (sort) qs.set("sort", sort)
        const res = await fetch(`/api/users?${qs.toString()}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to fetch users")
        setStudents(data.users || [])
      } catch (e: any) {
        toast({ title: "Load failed", description: e?.message || "", variant: "destructive" })
      }
    }
    load()
  }, [authChecked, role, department, sort])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((u) =>
      [u.name, u.email, u.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [search, students])

  // Department display preferences
  const orderIndex = (code: string) => {
    const map: Record<string, number> = { cce: 0, cse: 1, ece: 2, mme: 3, maths: 4, physics: 5, hss: 6 }
    return map[String(code).toLowerCase()] ?? 999
  }
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => orderIndex(a.code) - orderIndex(b.code))
  }, [departments])

  const displayDeptName = (name: string) => name.replace(/&/g, "and")

  const openEdit = (u: User) => {
    const parts = String(u.name || "").trim().split(/\s+/)
    const first = parts[0] || ""
    const last = parts.length > 1 ? parts[parts.length - 1] : ""
    const middle = parts.slice(1, -1).join(" ")
    setEditUser({ id: u.id, first, middle, last, email: u.email, role: u.role, department: u.department })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editUser?.id) return
    const fullName = [editUser.first, editUser.middle, editUser.last].filter(Boolean).join(" ").toUpperCase()
    try {
      const res = await fetch(`/api/users/${editUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fullName, email: editUser.email, role: editUser.role, department: editUser.department || null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update user")
      setStudents((prev) => prev.map((x) => (x.id === editUser.id ? { ...x, name: fullName, email: editUser.email, role: editUser.role, department: editUser.department } : x)))
      toast({ title: "User updated" })
      setEditOpen(false)
      setEditUser(null)
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    }
  }

  const downloadSample = async () => {
  const { utils, writeFile }: any = await import("xlsx")
  const wb = utils.book_new()
  const ws = utils.aoa_to_sheet([["Name", "RollNumber"], ["JOHN DOE", "23ucs123"]])
  utils.book_append_sheet(wb, ws, "Students")
  writeFile(wb, "students-import-sample.xlsx")
  }

  const importStudents = async (file: File) => {
    setImporting(true)
    try {
      const XLSX = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const [h1, h2] = rows[0] || []
      const nameCol = String(h1 || "").toLowerCase().includes("name") ? 0 : String(h2 || "").toLowerCase().includes("name") ? 1 : 0
      const rollCol = nameCol === 0 ? 1 : 0
      const toCreate = rows.slice(1).filter((r) => (r[nameCol] || "").toString().trim()).map((r) => ({ name: String(r[nameCol] || "").toUpperCase(), studentId: String(r[rollCol] || "").trim() }))
      let ok = 0, fail = 0
      for (const row of toCreate) {
        try {
          const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `${row.studentId}@lnmiit.ac.in`, name: row.name, role: "student", department: department || null, studentId: row.studentId }) })
          if (res.ok) {
            const data = await res.json()
            ok++
            setStudents((prev) => [data.user, ...prev])
          } else {
            fail++
          }
        } catch {
          fail++
        }
      }
  setImportSummary({ ok, fail })
  toast({ title: "Import finished", description: `${ok} created, ${fail} failed` })
  // Keep dialog open to show summary
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  const viewDetails = async (u: User) => {
    setSelected(u)
    setHistory(null)
    try {
      const res = await fetch(`/api/users/${u.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to fetch user details")
      setHistory(data)
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "", variant: "destructive" })
    }
  }

  const deleteOne = async (u: User) => {
    if (!confirm(`Delete student ${u.name}? This will deactivate their account.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      setStudents((prev) => prev.filter((x) => x.id !== u.id))
      toast({ title: "Student deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">User Management</h1>
        <div className="flex gap-2 items-center">
          <div className="min-w-48">
            <Label className="sr-only">Role</Label>
            <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="lab_staff">Lab Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tnp">TNP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>Add User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="md:col-span-2">
                  <Label>Role <span className="text-red-600">*</span></Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser((s) => ({ ...s, role: v as any }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="lab_staff">Lab Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="tnp">TNP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <Label>First Name <span className="text-red-600">*</span></Label>
                    <Input value={addFirst} required onChange={(e) => setAddFirst(e.target.value)} />
                  </div>
                  <div>
                    <Label>Middle Name</Label>
                    <Input value={addMiddle} onChange={(e) => setAddMiddle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={addLast} onChange={(e) => setAddLast(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Email <span className="text-red-600">*</span></Label>
                  <Input type="email" required value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                    <Label>Department</Label>
                    <Select value={newUser.department || "none"} onValueChange={(v) => setNewUser((s) => ({ ...s, department: v === "none" ? undefined : v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {sortedDepartments.map((d) => (
                          <SelectItem key={d.id} value={d.code}>{displayDeptName(d.name)} ({d.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Removed Student/Employee ID fields per requirements */}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button disabled={creating} onClick={async () => {
                  const fullName = [addFirst, addMiddle, addLast].filter(Boolean).join(" ").toUpperCase()
                  if (!fullName || !newUser.email) {
                    toast({ title: "Name and email are required", variant: "destructive" })
                    return
                  }
                  setCreating(true)
                  try {
                    const res = await fetch("/api/users", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: newUser.email,
                        name: fullName,
                        role: newUser.role,
                        department: newUser.department || null,
                        studentId: null,
                        employeeId: null,
                      }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data?.error || "Failed to create user")
                    // refresh or append if filter matches
                    const created: User = data.user
                    if (!role || role === created.role) {
                      setStudents((prev) => [created, ...prev])
                    }
                    setAddOpen(false)
                    setNewUser({ role: "student", name: "", email: "", department: undefined })
                    setAddFirst("")
                    setAddMiddle("")
                    setAddLast("")
                    toast({ title: "User created" })
                  } catch (e: any) {
                    toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
                  } finally {
                    setCreating(false)
                  }
                }}>{creating ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Import Students</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Import Students from Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Upload .xlsx with two columns: Name and RollNumber. Names will be stored in UPPERCASE.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={downloadSample}>Download Sample</Button>
                  <span className="text-xs text-muted-foreground">Sample includes header row.</span>
                </div>
                <div>
                  <Label>Department (optional)</Label>
                  <Select value={department || "all"} onValueChange={(v) => setDepartment(v === "all" ? undefined : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {sortedDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.code}>{displayDeptName(d.name)} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <input id="students-file" type="file" className="hidden" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImportFileName(f.name); importStudents(f) } }} />
                  <Button type="button" onClick={() => document.getElementById('students-file')?.click()} disabled={importing}>
                    {importing ? 'Importing…' : 'Choose .xlsx file'}
                  </Button>
                  <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={importFileName}>{importFileName}</span>
                </div>
                {importSummary && (
                  <div className="text-sm bg-muted/40 border rounded p-2">
                    Imported: <span className="font-medium">{importSummary.ok}</span> created, <span className="font-medium">{importSummary.fail}</span> failed.
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setImportOpen(false); setImportSummary(null); setImportFileName("") }}>Close</Button>
                <Button disabled={importing} onClick={() => { setImportOpen(false); setImportSummary(null); setImportFileName("") }}>{importing ? "Importing…" : "Done"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Purge inactive students */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">Purge inactive students with no logs or bookings in the last N days.</div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Days</Label>
              <Input type="number" className="w-24" min={7} max={365} value={purgeDays} onChange={(e) => setPurgeDays(Math.max(7, Math.min(365, Number(e.target.value) || 30)))} />
              <Button variant="destructive" onClick={async () => {
                try {
                  const res = await fetch('/api/admin/purge-inactive-students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: purgeDays }) })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data?.error || 'Failed')
                  // Refresh list after purge
                  const qs = new URLSearchParams(); if (role) qs.set('role', role); if (department) qs.set('department', department); if (sort) qs.set('sort', sort)
                  const refreshed = await fetch(`/api/users?${qs.toString()}`, { cache: 'no-store' }).then(r=>r.json())
                  setStudents(refreshed.users || [])
                  toast({ title: 'Purge complete', description: `${data.archived} archived and deleted` })
                } catch (e: any) {
                  toast({ title: 'Purge failed', description: e?.message || '', variant: 'destructive' })
                }
              }}>Purge Inactive Students</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Department</Label>
        <Select value={department || "all"} onValueChange={(v) => setDepartment(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
          <SelectItem value="all">All</SelectItem>
                  {sortedDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>{displayDeptName(d.name)} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Newest</SelectItem>
                  <SelectItem value="created_at_asc">Oldest</SelectItem>
                  <SelectItem value="name_asc">Name A→Z</SelectItem>
                  <SelectItem value="name_desc">Name Z→A</SelectItem>
                  <SelectItem value="email_asc">Email A→Z</SelectItem>
                  <SelectItem value="email_desc">Email Z→A</SelectItem>
                  <SelectItem value="role_asc">Role A→Z</SelectItem>
                  <SelectItem value="role_desc">Role Z→A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input placeholder="name/email/department" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{role ? role.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Users"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{String(u.name).toUpperCase()}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department || "-"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => viewDetails(u)}>Details</Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                    <Button variant="destructive" size="sm" disabled={loading} onClick={() => deleteOne(u)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>First Name <span className="text-red-600">*</span></Label>
                <Input required value={editUser.first} onChange={(e) => setEditUser((s) => s ? { ...s, first: e.target.value } : s)} />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input value={editUser.middle} onChange={(e) => setEditUser((s) => s ? { ...s, middle: e.target.value } : s)} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={editUser.last} onChange={(e) => setEditUser((s) => s ? { ...s, last: e.target.value } : s)} />
              </div>
              <div>
                <Label>Email <span className="text-red-600">*</span></Label>
                <Input type="email" required value={editUser.email} onChange={(e) => setEditUser((s) => s ? { ...s, email: e.target.value } : s)} />
              </div>
              <div>
                <Label>Role <span className="text-red-600">*</span></Label>
                <Select value={editUser.role} onValueChange={(v) => setEditUser((s) => s ? { ...s, role: v as any } : s)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="lab_staff">Lab Staff</SelectItem>
                    <SelectItem value="hod">HOD</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="tnp">TNP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={editUser.department || "none"} onValueChange={(v) => setEditUser((s) => s ? { ...s, department: v === "none" ? undefined : v } : s)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sortedDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.code}>{displayDeptName(d.name)} ({d.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>User Details: {selected.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {!history ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Bookings</h3>
                  <ul className="list-disc ml-5 text-sm">
                    {history.bookings?.length ? history.bookings.map((b: any) => (
                      <li key={b.id}>{b.booking_date} {b.start_time}-{b.end_time} • {b.lab_name}</li>
                    )) : <li>No bookings</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Recent Actions</h3>
                  <ul className="list-disc ml-5 text-sm">
                    {history.logs?.length ? history.logs.map((l: any) => (
                      <li key={l.id}>{l.created_at}: {l.action} {l.entity_type} {l.entity_id}</li>
                    )) : <li>No actions</li>}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

