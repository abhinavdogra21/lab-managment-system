/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

type Department = { id: number; name: string; code: string }

type User = { id: number; name: string; email: string; role: string; department?: string; salutation?: 'prof'|'dr'|'mr'|'mrs'|'none' }

export default function UsersPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<string>("created_at_desc")
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [history, setHistory] = useState<any | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<{ id?: number; first: string; middle: string; last: string; email: string; role: User["role"]; salutation: User['salutation']; department?: string | undefined } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addUser, setAddUser] = useState<{ first: string; middle: string; last: string; email: string; role: string; salutation: User['salutation']; department?: string | undefined }>({ first: "", middle: "", last: "", email: "", role: "student", salutation: 'none', department: undefined })
  const [addingUser, setAddingUser] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{ created: number; reactivated: number; skipped: number } | null>(null)
  const [importFileName, setImportFileName] = useState<string>("")
  const [departments, setDepartments] = useState<Department[]>([])
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
        const d = await fetch("/api/admin/departments", { cache: "no-store" }).then((r) => r.json())
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
        const res = await fetch(`/api/admin/users?${qs.toString()}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to fetch users")
  setUsers(data.users || [])
      } catch (e: any) {
        toast({ title: "Load failed", description: e?.message || "", variant: "destructive" })
      }
    }
    load()
  }, [authChecked, role, department, sort, toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => [u.name, u.email, u.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
  }, [search, users])

  const orderIndex = (code: string) => {
    const map: Record<string, number> = { cce: 0, cse: 1, ece: 2, mme: 3, maths: 4, physics: 5, hss: 6 }
    return map[String(code).toLowerCase()] ?? 999
  }
  const sortedDepartments = useMemo(() => [...departments].sort((a, b) => orderIndex(a.code) - orderIndex(b.code)), [departments])
  const displayDeptName = (name: string) => name.replace(/&/g, "and")
  const formatSalutation = (s?: User['salutation']) => {
    if (!s || s === 'none') return '-'
    const map: Record<NonNullable<User['salutation']>, string> = { prof: 'Prof', dr: 'Dr', mr: 'Mr', mrs: 'Mrs', none: '-' }
    return map[s] || '-'
  }

  const openEdit = (u: User) => {
    const parts = String(u.name || "").trim().split(/\s+/)
    const first = parts[0] || ""
    const last = parts.length > 1 ? parts[parts.length - 1] : ""
    const middle = parts.slice(1, -1).join(" ")
  setEditUser({ id: u.id, first, middle, last, email: u.email, role: u.role, salutation: (u.salutation || 'none') as any, department: u.department })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editUser?.id) return
    const fullName = [editUser.first, editUser.middle, editUser.last].filter(Boolean).join(" ").toUpperCase()
    try {
  const res = await fetch(`/api/admin/users/${editUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fullName, email: editUser.email, role: editUser.role, salutation: editUser.salutation, department: editUser.department || null }) })
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data?.error || "Failed to update user"
        throw new Error(errorMsg)
      }
  setUsers((prev) => prev.map((x) => (x.id === editUser.id ? { ...x, name: fullName, email: editUser.email, role: editUser.role, salutation: editUser.salutation, department: editUser.department } : x)))
      toast({ title: "User updated successfully" })
      setEditOpen(false)
      setEditUser(null)
    } catch (e: any) {
      const errorMessage = e?.message || 'An unexpected error occurred'
      toast({ 
        title: "Failed to Update User", 
        description: errorMessage, 
        variant: "destructive",
        duration: 5000
      })
    }
  }

  const downloadSample = async () => {
    // Create CSV content
    const csvContent = "Name,RollNumber\nJOHN DOE,23ucs123\nJANE SMITH,23ucs124"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'students-import-sample.csv'
    link.click()
  }

  const importStudents = async (file: File) => {
    setImporting(true)
    try {
      // Read CSV file
      const text = await file.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row')
      }
      
      // Parse header
      const header = lines[0].split(',').map(h => h.trim())
      const findCol = (pred: (v: string) => boolean, fallback: number) => {
        for (let i = 0; i < header.length; i++) {
          const v = String(header[i] ?? '').toLowerCase()
          if (pred(v)) return i
        }
        return fallback
      }
      const nameCol = findCol((v) => v.includes("name"), 0)
      const rollCol = findCol((v) => v.includes("roll"), nameCol === 0 ? 1 : 0)
      
      // Parse data rows
      const toCreate = lines
        .slice(1)
        .map(line => {
          const values = line.split(',').map(v => v.trim())
          return {
            name: String(values[nameCol] || "").toUpperCase(),
            studentId: String(values[rollCol] || "").trim()
          }
        })
        .filter(r => r.name)
      
      const res = await fetch("/api/admin/users/bulk", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ department: department || null, rows: toCreate }) 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Bulk import failed")
      const { created, reactivated = 0, skipped, users: createdUsers } = data
      if (Array.isArray(createdUsers) && createdUsers.length) {
        setUsers((prev) => [...createdUsers, ...prev])
      }
      setImportSummary({ created: Number(created || 0), reactivated: Number(reactivated || 0), skipped: Number(skipped || 0) })
      const totalOk = Number(created || 0) + Number(reactivated || 0)
      toast({ title: "Import finished", description: `${totalOk} added (created: ${created}, reactivated: ${reactivated}), ${skipped} skipped` })
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  const viewDetails = async (u: User) => {
    setSelected(u)
    setHistory(null)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to fetch user details")
      setHistory(data)
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "", variant: "destructive" })
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
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>
  <Button onClick={() => { setAddUser({ first: "", middle: "", last: "", email: "", role: "student", salutation: 'none', department: undefined }); setAddOpen(true) }}>Add User</Button>
  <Button variant="secondary" onClick={() => setImportOpen(true)}>Import Students</Button>
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
              <Button variant="destructive" onClick={() => setPurgeConfirmOpen(true)}>Purge Inactive Students</Button>
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
                <TableHead>Salutation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{String(u.name).toUpperCase()}</TableCell>
                  <TableCell>{formatSalutation(u.salutation)}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {u.role.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                    </span>
                  </TableCell>
                  <TableCell>{u.department || "-"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                    <Button variant="destructive" size="sm" disabled={loading} onClick={() => setDeleteTarget(u)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>User Details{selected ? `: ${selected.name}` : ""}</DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Salutation</Label>
                <Select value={editUser.salutation || 'none'} onValueChange={(v) => setEditUser((s) => s ? { ...s, salutation: v as any } : s)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="prof">Prof</SelectItem>
                    <SelectItem value="dr">Dr</SelectItem>
                    <SelectItem value="mr">Mr</SelectItem>
                    <SelectItem value="mrs">Mrs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role <span className="text-red-600">*</span></Label>
                <Select value={editUser.role} onValueChange={(v) => setEditUser((s) => s ? { ...s, role: v as any } : s)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="lab_staff">Lab Staff</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Salutation</Label>
              <Select value={addUser.salutation || 'none'} onValueChange={(v) => setAddUser((s) => ({ ...s, salutation: v as any }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="prof">Prof</SelectItem>
                  <SelectItem value="dr">Dr</SelectItem>
                  <SelectItem value="mr">Mr</SelectItem>
                  <SelectItem value="mrs">Mrs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role <span className="text-red-600">*</span></Label>
              <Select value={addUser.role} onValueChange={(v) => setAddUser((s) => ({ ...s, role: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="lab_staff">Lab Staff</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Name <span className="text-red-600">*</span></Label>
              <Input required value={addUser.first} onChange={(e) => setAddUser((s) => ({ ...s, first: e.target.value }))} />
            </div>
            <div>
              <Label>Middle Name</Label>
              <Input value={addUser.middle} onChange={(e) => setAddUser((s) => ({ ...s, middle: e.target.value }))} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={addUser.last} onChange={(e) => setAddUser((s) => ({ ...s, last: e.target.value }))} />
            </div>
            <div>
              <Label>Email <span className="text-red-600">*</span></Label>
              <Input type="email" required value={addUser.email} onChange={(e) => setAddUser((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={addUser.department || "none"} onValueChange={(v) => setAddUser((s) => ({ ...s, department: v === "none" ? undefined : v }))}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addingUser}>Cancel</Button>
            <Button disabled={!addUser.first.trim() || !addUser.email.trim() || addingUser} onClick={async () => {
              const fullName = [addUser.first, addUser.middle, addUser.last].filter(Boolean).join(" ").toUpperCase()
              setAddingUser(true)
              try {
                const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fullName, email: addUser.email, role: addUser.role, salutation: addUser.salutation || 'none', department: addUser.department || null }) })
                const data = await res.json()
                if (!res.ok) {
                  const errorMsg = data?.error || 'Failed to create user'
                  throw new Error(errorMsg)
                }
                setUsers((prev) => [data.user, ...prev])
                toast({ title: 'User created', description: 'Welcome email sent to ' + addUser.email })
                setAddOpen(false)
                setAddUser({ first: '', middle: '', last: '', email: '', role: 'student', salutation: 'none', department: undefined })
              } catch (e: any) {
                const errorMessage = e?.message || 'An unexpected error occurred'
                toast({ 
                  title: 'Failed to Create User', 
                  description: errorMessage, 
                  variant: 'destructive',
                  duration: 5000
                })
              } finally {
                setAddingUser(false)
              }
            }}>{addingUser ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import students dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Import Students from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Upload .csv with two columns: Name and RollNumber. Names will be stored in UPPERCASE.</p>
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
              <input id="students-file-admin" type="file" className="hidden" accept=".csv" onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { setImportFileName(f.name); importStudents(f) } }} />
              <Button type="button" onClick={() => document.getElementById('students-file-admin')?.click()} disabled={importing}>
                {importing ? 'Importing…' : 'Choose .csv file'}
              </Button>
              <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={importFileName}>{importFileName}</span>
            </div>
            {importSummary && (
              <div className="text-sm bg-muted/40 border rounded p-2 space-y-0.5">
                <div>Created: <span className="font-medium">{importSummary.created}</span></div>
                <div>Reactivated: <span className="font-medium">{importSummary.reactivated}</span></div>
                <div>Skipped (duplicates): <span className="font-medium">{importSummary.skipped}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportSummary(null); setImportFileName("") }}>Close</Button>
            <Button disabled={importing} onClick={() => { setImportOpen(false); setImportSummary(null); setImportFileName("") }}>{importing ? "Importing…" : "Done"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Are you sure you want to permanently delete ${String(deleteTarget.name).toUpperCase()}?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteTarget) return
                setLoading(true)
                try {
                  const res = await fetch(`/api/admin/users/${deleteTarget.id}/hard-delete`, { method: 'DELETE' })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data?.error || 'Failed to delete')
                  setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id))
                  toast({ title: 'User deleted' })
                } catch (e: any) {
                  toast({ title: 'Delete failed', description: e?.message || '', variant: 'destructive' })
                } finally {
                  setLoading(false)
                  setDeleteTarget(null)
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm purge */}
      <AlertDialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge inactive students</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete inactive students with no logs or bookings in the last {purgeDays} days?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                setPurgeConfirmOpen(false)
                try {
                  const res = await fetch('/api/admin/purge-inactive-students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: purgeDays }) })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data?.error || 'Failed')
                  const qs = new URLSearchParams(); if (role) qs.set('role', role); if (department) qs.set('department', department); if (sort) qs.set('sort', sort)
                  const refreshed = await fetch(`/api/admin/users?${qs.toString()}`, { cache: 'no-store' }).then(r=>r.json())
                  setUsers(refreshed.users || [])
                  toast({ title: 'Purge complete', description: `${data.archived} archived and deleted` })
                } catch (e: any) {
                  toast({ title: 'Purge failed', description: e?.message || '', variant: 'destructive' })
                }
              }}
            >Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
