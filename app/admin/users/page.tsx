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
  const [importUsersOpen, setImportUsersOpen] = useState(false)
  const [importingUsers, setImportingUsers] = useState(false)
  const [importUsersResult, setImportUsersResult] = useState<any>(null)
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

  const downloadUsersSample = () => {
    const csvContent = "firstName,middleName,lastName,email,role,salutation,department\nJohn,,Doe,john.doe@lnmiit.ac.in,faculty,dr,CSE\nJane,Marie,Smith,jane.smith@lnmiit.ac.in,lab_staff,mrs,ECE\nRam,Kumar,Sharma,23ucs123@lnmiit.ac.in,student,none,CSE\nOther,,Staff,other@lnmiit.ac.in,others,mr,CCE"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'users-import-sample.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const importUsers = async (file: File) => {
    setImportingUsers(true)
    setImportUsersResult(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row')
      }
      
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        header.forEach((h, i) => {
          row[h] = values[i] || ''
        })
        // Combine firstName, middleName, lastName into name
        const firstName = row.firstname || row.firstName || ''
        const middleName = row.middlename || row.middleName || ''
        const lastName = row.lastname || row.lastName || ''
        row.name = [firstName, middleName, lastName].filter(Boolean).join(' ')
        return row
      })
      
      const res = await fetch("/api/admin/users/import", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ rows }) 
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data?.error || "Import failed")
      
      setImportUsersResult(data)
      
      // Refresh users list
      const qs = new URLSearchParams()
      if (role) qs.set("role", role)
      if (department) qs.set("department", department)
      if (sort) qs.set("sort", sort)
      const refreshed = await fetch(`/api/admin/users?${qs.toString()}`, { cache: "no-store" })
      const refreshedData = await refreshed.json()
      setUsers(refreshedData.users || [])
      
      toast({ 
        title: "Import completed", 
        description: `Created: ${data.summary.created}, Updated: ${data.summary.updated}, Errors: ${data.summary.errors}` 
      })
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setImportingUsers(false)
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
  <Button variant="outline" onClick={() => setImportUsersOpen(true)}>Import Users</Button>
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

      {/* Import Users Dialog */}
      <Dialog open={importUsersOpen} onOpenChange={setImportUsersOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Upload a CSV file with the following columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>firstName</strong> - First name (required)</li>
                <li><strong>middleName</strong> - Middle name (optional)</li>
                <li><strong>lastName</strong> - Last name (optional)</li>
                <li><strong>email</strong> - Email ending with @lnmiit.ac.in (required)</li>
                <li><strong>role</strong> - student, faculty, lab_staff, hod, or others (required)</li>
                <li><strong>salutation</strong> - prof, dr, mr, mrs, or none (optional, defaults to none)</li>
                <li><strong>department</strong> - Department code like CSE, ECE, CCE, MME (optional)</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadUsersSample}>
                Download Sample CSV
              </Button>
            </div>

            <div>
              <Label htmlFor="import-users-file">Select CSV File</Label>
              <Input
                id="import-users-file"
                type="file"
                accept=".csv"
                disabled={importingUsers}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    importUsers(file)
                  }
                }}
              />
            </div>

            {importingUsers && (
              <div className="text-sm text-muted-foreground">Importing users...</div>
            )}

            {importUsersResult && (
              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Import Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Processed:</div>
                      <div className="font-semibold">{importUsersResult.summary.total}</div>
                      
                      <div className="text-green-600">Successfully Created:</div>
                      <div className="font-semibold text-green-600">{importUsersResult.summary.created}</div>
                      
                      <div className="text-blue-600">Updated Existing:</div>
                      <div className="font-semibold text-blue-600">{importUsersResult.summary.updated}</div>
                      
                      <div className="text-yellow-600">Skipped:</div>
                      <div className="font-semibold text-yellow-600">{importUsersResult.summary.skipped}</div>
                      
                      <div className="text-red-600">Errors:</div>
                      <div className="font-semibold text-red-600">{importUsersResult.summary.errors}</div>
                    </div>
                  </CardContent>
                </Card>

                {importUsersResult.details.created.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-green-600">Created Users ({importUsersResult.details.created.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                        {importUsersResult.details.created.map((u: any, i: number) => (
                          <div key={i} className="flex justify-between border-b pb-1">
                            <span>{u.name}</span>
                            <span className="text-muted-foreground">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {importUsersResult.details.updated.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-blue-600">Updated Users ({importUsersResult.details.updated.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                        {importUsersResult.details.updated.map((u: any, i: number) => (
                          <div key={i} className="flex justify-between border-b pb-1">
                            <span>{u.name}</span>
                            <span className="text-muted-foreground">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {importUsersResult.details.errors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-red-600">Errors ({importUsersResult.details.errors.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                        {importUsersResult.details.errors.map((err: any, i: number) => (
                          <div key={i} className="border-b pb-2">
                            <div className="font-semibold text-red-600">{err.reason}</div>
                            <div className="text-muted-foreground mt-1">
                              {err.row.name && <span>Name: {err.row.name}, </span>}
                              {err.row.email && <span>Email: {err.row.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setImportUsersOpen(false)
              setImportUsersResult(null)
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
