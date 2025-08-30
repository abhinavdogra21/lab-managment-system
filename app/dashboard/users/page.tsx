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
  const [newUser, setNewUser] = useState<{ role: "student" | "lab_staff"; name: string; email: string; department?: string; studentId?: string; employeeId?: string }>({ role: "student", name: "", email: "", department: undefined, studentId: "", employeeId: "" })

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

  const purgeAll = async () => {
    if (!confirm("Archive and purge ALL student users? This cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/purge-students", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to purge")
      setStudents([])
      toast({ title: "Purge completed", description: `${data.archived} archived, ${data.deleted} deleted` })
    } catch (e: any) {
      toast({ title: "Purge failed", description: e?.message || "", variant: "destructive" })
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
                <SelectItem value="hod">HOD</SelectItem>
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
                  <Label>Role</Label>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant={newUser.role === "student" ? "default" : "outline"} onClick={() => setNewUser((s) => ({ ...s, role: "student" }))}>Student</Button>
                    <Button type="button" variant={newUser.role === "lab_staff" ? "default" : "outline"} onClick={() => setNewUser((s) => ({ ...s, role: "lab_staff" }))}>Lab Staff</Button>
                  </div>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={newUser.department || "none"} onValueChange={(v) => setNewUser((s) => ({ ...s, department: v === "none" ? undefined : v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.code}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newUser.role === "student" ? (
                  <div>
                    <Label>Student ID (optional)</Label>
                    <Input value={newUser.studentId || ""} onChange={(e) => setNewUser((s) => ({ ...s, studentId: e.target.value }))} />
                  </div>
                ) : (
                  <div>
                    <Label>Employee ID (optional)</Label>
                    <Input value={newUser.employeeId || ""} onChange={(e) => setNewUser((s) => ({ ...s, employeeId: e.target.value }))} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button disabled={creating} onClick={async () => {
                  if (!newUser.name || !newUser.email) {
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
                        name: newUser.name,
                        role: newUser.role,
                        department: newUser.department || null,
                        studentId: newUser.role === "student" ? (newUser.studentId || null) : null,
                        employeeId: newUser.role === "lab_staff" ? (newUser.employeeId || null) : null,
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
                    setNewUser({ role: "student", name: "", email: "", department: undefined, studentId: "", employeeId: "" })
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
          <Button variant="destructive" disabled={loading} onClick={purgeAll}>Delete All Students</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Department</Label>
        <Select value={department || "all"} onValueChange={(v) => setDepartment(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
          <SelectItem value="all">All</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>{d.name} ({d.code})</SelectItem>
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
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department || "-"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => viewDetails(u)}>Details</Button>
                    <Button variant="destructive" size="sm" disabled={loading} onClick={() => deleteOne(u)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

