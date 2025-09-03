"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

type Department = { id: number; name: string; code: string; hod_id?: number | null; hod_name?: string | null; hod_email?: string | null }
type Lab = { id: number; name: string; code: string; department_id: number; department_name?: string; staff_id?: number | null; staff_name?: string | null; staff_ids_csv?: string | null; staff_names_csv?: string | null; capacity?: number; location?: string }
type User = { id: number; name: string; email: string; role: string; department?: string | null }

export default function OrganizationPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [faculties, setFaculties] = useState<User[]>([])
  const [hods, setHods] = useState<User[]>([])
  const [labStaff, setLabStaff] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"departments" | "labs" | "staff">("departments")
  // Dialogs and forms
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [deptDialogMode, setDeptDialogMode] = useState<"create" | "edit">("create")
  const [deptForm, setDeptForm] = useState<{ id?: number; name: string; code: string; hodId?: number | null; hodEmail?: string | null }>({ name: "", code: "", hodEmail: "" })
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false)
  const [facultyDept, setFacultyDept] = useState<Department | null>(null)
  const [facultyForm, setFacultyForm] = useState<{ existingId?: number | "" }>({})
  const [labDialogOpen, setLabDialogOpen] = useState(false)
  const [labDialogMode, setLabDialogMode] = useState<"create" | "edit">("create")
  const [labForm, setLabForm] = useState<{ id?: number; name: string; code: string; departmentId: number | ""; capacity?: number | ""; location?: string }>({ name: "", code: "", departmentId: "" })
  const [labsDeptFilter, setLabsDeptFilter] = useState<string | "all">("all")
  const [labsQuery, setLabsQuery] = useState("")
  // Lab Staff tab
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [staffForm, setStaffForm] = useState<{ first: string; middle: string; last: string; email: string; labId?: number | "" }>({ first: "", middle: "", last: "", email: "" })
  const [staffDeptFilter, setStaffDeptFilter] = useState<string | "all" | "unassigned">("all")
  const [staffQuery, setStaffQuery] = useState("")
  const [facultyQuery, setFacultyQuery] = useState("")

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    try {
      const parsed = u ? JSON.parse(u) : null
      const r = parsed?.role ? String(parsed.role).replace(/_/g, "-") : null
      setRole(r)
    } catch {}
    setAuthChecked(true)
  }, [])

  const canManage = role === "admin"

  const loadAll = async () => {
    const [dRes, lRes, fRes, sRes, hRes] = await Promise.all([
      fetch("/api/departments", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/labs", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users?role=faculty", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users?role=lab_staff", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users?role=hod", { cache: "no-store" }).then((r) => r.json()),
    ])
    setDepartments(dRes.departments || [])
    setLabs(lRes.labs || [])
    setFaculties(fRes.users || [])
    setLabStaff(sRes.users || [])
    setHods(hRes.users || [])
  }

  useEffect(() => {
    if (!authChecked) return
    loadAll().catch((e) => toast({ title: "Load failed", description: e?.message || "", variant: "destructive" }))
  }, [authChecked])

  const assignHod = async (departmentId: number, hodId: number | null) => {
    setLoading(true)
    try {
      const res = await fetch("/api/departments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId, hodId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to set HOD")
      setDepartments((prev) => prev.map((d) => (d.id === departmentId ? { ...d, hod_id: data.department.hod_id, hod_name: data.department.hod_name, hod_email: data.department.hod_email } : d)))
      toast({ title: "HOD updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }
  const openCreateDept = () => {
    setDeptDialogMode("create")
    setDeptForm({ name: "", code: "", hodEmail: "" })
    setDeptDialogOpen(true)
  }
  const openEditDept = (d: Department) => {
    setDeptDialogMode("edit")
    setDeptForm({ id: d.id, name: d.name, code: d.code, hodId: d.hod_id ?? null, hodEmail: d.hod_email ?? "" })
    setDeptDialogOpen(true)
  }
  const saveDeptDialog = async () => {
    // create or update
    if (!deptForm.name.trim() || !deptForm.code.trim() || !String(deptForm.hodEmail || "").trim()) {
      toast({ title: "Name, code and HOD email are required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      // optional domain check for HOD email if provided
      if (deptForm.hodEmail && !/^[^@\s]+@lnmiit\.ac\.in$/i.test(deptForm.hodEmail)) {
        throw new Error("HOD email must be an lnmiit.ac.in address")
      }
      if (deptDialogMode === "create") {
  const res = await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: deptForm.name, code: deptForm.code, hodEmail: deptForm.hodEmail || null }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to create department")
        setDepartments((prev) => [...prev, data.department])
        toast({ title: "Department created" })
      } else {
  const res = await fetch("/api/departments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deptForm.id, name: deptForm.name, code: deptForm.code, hodEmail: deptForm.hodEmail ?? null }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to update department")
        setDepartments((prev) => prev.map((x) => (x.id === deptForm.id ? { ...x, ...data.department } : x)))
        toast({ title: "Department updated" })
      }
      setDeptDialogOpen(false)
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }
  const deleteDepartment = async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete department")
      setDepartments((prev) => prev.filter((x) => x.id !== id))
      // Remove labs under this department
      setLabs((prev) => prev.filter((l) => l.department_id !== id))
      toast({ title: "Department deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const removeFacultyFromDept = async (userId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update faculty")
      setFaculties((prev) => prev.map((u) => (u.id === userId ? { ...u, department: null } : u)))
      toast({ title: "Removed from department" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }
  const deleteFaculty = async (userId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete user")
      setFaculties((prev) => prev.filter((u) => u.id !== userId))
      toast({ title: "User deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Replace staff assignments for a lab with the given list
  const assignLabStaff = async (labId: number, staffIds: number[]) => {
    setLoading(true)
    try {
      const res = await fetch("/api/labs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId, staffIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to set lab staff")
      const staffList: Array<{ id: number; name: string }> = data.staff || []
      const idsCsv = staffList.map((s) => s.id).join(",")
      const namesCsv = staffList.map((s) => s.name).join(", ")
      setLabs((prev) => prev.map((l) => (l.id === labId ? { ...l, staff_ids_csv: idsCsv, staff_names_csv: namesCsv } : l)))
      toast({ title: "Lab staff updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const setFacultyDepartment = async (userId: number, deptCode: string | null) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: deptCode }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to set faculty department")
      setFaculties((prev) => prev.map((u) => (u.id === userId ? { ...u, department: data.user.department } : u)))
      toast({ title: "Faculty updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) return null
  if (!canManage) return <div className="p-6">Only Admin can access Organization panel.</div>

  const openManageFaculty = (d: Department) => {
    setFacultyDept(d)
    setFacultyForm({ existingId: "" })
    setFacultyDialogOpen(true)
  }

  // Note: Adding new faculty is intentionally disabled here. Use Users panel to create, then assign existing here.

  const addExistingFaculty = async () => {
    if (!facultyDept) return
    const fid = facultyForm.existingId
    if (!fid || typeof fid !== "number") return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${fid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: facultyDept.code }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to assign faculty")
      setFaculties((prev) => prev.map((u) => (u.id === fid ? { ...u, department: facultyDept.code } : u)))
      setFacultyForm((s) => ({ ...s, existingId: "" }))
      toast({ title: "Faculty assigned" })
    } catch (e: any) {
      toast({ title: "Assign failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const openCreateLab = () => {
    setLabDialogMode("create")
    setLabForm({ name: "", code: "", departmentId: "" })
    setLabDialogOpen(true)
  }
  const openEditLab = (l: Lab) => {
    setLabDialogMode("edit")
    setLabForm({ id: l.id, name: l.name, code: l.code, departmentId: l.department_id, capacity: l.capacity ?? "", location: l.location ?? "" })
    setLabDialogOpen(true)
  }
  const saveLabDialog = async () => {
    if (!labForm.name.trim() || !labForm.code.trim() || !labForm.departmentId) {
      toast({ title: "Name, code, department required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      if (labDialogMode === "create") {
        const res = await fetch("/api/labs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...labForm, capacity: labForm.capacity === "" ? undefined : labForm.capacity }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to create lab")
        setLabs((prev) => [...prev, data.lab])
        toast({ title: "Lab created" })
      } else {
  const payload: any = {
          id: labForm.id,
          name: labForm.name,
          code: labForm.code,
          capacity: labForm.capacity === "" ? null : labForm.capacity ?? null,
          location: labForm.location ?? null,
        }
        const res = await fetch("/api/labs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to update lab")
        setLabs((prev) => prev.map((x) => (x.id === labForm.id ? { ...x, ...data.lab } : x)))
        toast({ title: "Lab updated" })
      }
      setLabDialogOpen(false)
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
  <h1 className="text-xl font-semibold">Department and Labs Management</h1>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="staff">Lab Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Departments</CardTitle>
              <Button onClick={openCreateDept}>Add Department</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-64">Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>HOD</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.code}</TableCell>
                      <TableCell className="min-w-56">
                        <div className="space-y-1">
                          <Select value={d.hod_id ? String(d.hod_id) : "none"} onValueChange={(v) => assignHod(d.id, v === "none" ? null : Number(v))}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Assign HOD" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {hods.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground">Dept HOD Email: {d.hod_email || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDept(d)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => openManageFaculty(d)}>Manage Faculty</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteDepartment(d.id)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader className="flex items-center justify-between gap-4">
              <CardTitle>Labs</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Department</Label>
                  <Select value={labsDeptFilter} onValueChange={(v) => setLabsDeptFilter(v as any)}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="w-60" placeholder="Search labs" value={labsQuery} onChange={(e) => setLabsQuery(e.target.value)} />
                <Button onClick={openCreateLab}>Add Lab</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Lab</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs
                    .slice()
                    .filter((l) => labsDeptFilter === "all" ? true : String(l.department_id) === labsDeptFilter)
                    .filter((l) => {
                      const q = labsQuery.trim().toLowerCase()
                      if (!q) return true
                      return (
                        l.name.toLowerCase().includes(q) ||
                        l.code.toLowerCase().includes(q) ||
                        String(l.department_name || "").toLowerCase().includes(q) ||
                        String(l.location || "").toLowerCase().includes(q)
                      )
                    })
                    .sort((a, b) => String(a.department_name || a.department_id).localeCompare(String(b.department_name || b.department_id)) || String(a.name).localeCompare(String(b.name)))
                    .map((lab) => (
                      <TableRow key={lab.id}>
                        <TableCell>{lab.department_name || lab.department_id}</TableCell>
                        <TableCell>{lab.name}</TableCell>
                        <TableCell>{lab.code}</TableCell>
                        <TableCell className="min-w-64">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground truncate" title={lab.staff_names_csv || "Unassigned"}>
                              {lab.staff_names_csv || "Unassigned"}
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-background">
                              {labStaff.map((u) => {
                                const currentIds = (lab.staff_ids_csv || "").split(",").filter(Boolean).map((s) => Number(s))
                                const checked = currentIds.includes(u.id)
                                return (
                                  <label key={u.id} className="flex items-center gap-2 text-sm py-1">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4"
                                      checked={checked}
                                      disabled={loading}
                                      onChange={(e) => {
                                        const next = new Set(currentIds)
                                        if (e.target.checked) next.add(u.id)
                                        else next.delete(u.id)
                                        assignLabStaff(lab.id, Array.from(next))
                                      }}
                                    />
                                    <span>{u.name} ({u.email})</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{lab.capacity ?? "-"}</TableCell>
                        <TableCell>{lab.location ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditLab(lab)}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete lab?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {lab.name} and related records. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    setLoading(true)
                                    try {
                                      const res = await fetch(`/api/labs?id=${lab.id}`, { method: "DELETE" })
                                      const data = await res.json()
                                      if (!res.ok) throw new Error(data?.error || "Failed to delete lab")
                                      setLabs((prev) => prev.filter((x) => x.id !== lab.id))
                                      toast({ title: "Lab deleted" })
                                    } catch (e: any) {
                                      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
                                    } finally {
                                      setLoading(false)
                                    }
                                  }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex items-center justify-between gap-4">
              <CardTitle>Lab Staff</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Department</Label>
                  <Select value={staffDeptFilter} onValueChange={(v) => setStaffDeptFilter(v as any)}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="w-60" placeholder="Search staff" value={staffQuery} onChange={(e) => setStaffQuery(e.target.value)} />
                <Button onClick={() => { setStaffForm({ first: "", middle: "", last: "", email: "", labId: "" }); setStaffDialogOpen(true) }}>Add Staff</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-64">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Lab</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labStaff.filter((s) => {
                    const assignedLabs = labs.filter((l) => (l.staff_ids_csv || "").split(",").filter(Boolean).map(Number).includes(s.id))
                    if (staffDeptFilter === "all") return true
                    if (staffDeptFilter === "unassigned") return assignedLabs.length === 0
                    return assignedLabs.some((l) => String(l.department_id) === staffDeptFilter)
                  }).filter((s) => {
                    const q = staffQuery.trim().toLowerCase()
                    if (!q) return true
                    const assignedLab = labs.find((l) => (l.staff_ids_csv || "").split(",").filter(Boolean).map(Number).includes(s.id))
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.email.toLowerCase().includes(q) ||
                      (assignedLab ? assignedLab.name.toLowerCase().includes(q) : false)
                    )
                  }).map((s) => {
                    const assignedLabs = labs.filter((l) => (l.staff_ids_csv || "").split(",").filter(Boolean).map(Number).includes(s.id))
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell className="min-w-64">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground truncate" title={assignedLabs.map((l) => l.name).join(", ") || "Unassigned"}>
                              {assignedLabs.length ? assignedLabs.map((l) => l.name).join(", ") : "Unassigned"}
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-background">
                              {labs.map((l) => {
                                const currentIds = (l.staff_ids_csv || "").split(",").filter(Boolean).map(Number)
                                const checked = currentIds.includes(s.id)
                                return (
                                  <label key={l.id} className="flex items-center gap-2 text-sm py-1">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4"
                                      checked={checked}
                                      disabled={loading}
                                      onChange={async (e) => {
                                        setLoading(true)
                                        try {
                                          const next = new Set(currentIds)
                                          if (e.target.checked) next.add(s.id)
                                          else next.delete(s.id)
                                          const res = await fetch(`/api/labs`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId: l.id, staffIds: Array.from(next) }) })
                                          const data = await res.json()
                                          if (!res.ok) throw new Error(data?.error || "Failed to update lab")
                                          const staffList: Array<{ id: number; name: string }> = data.staff || []
                                          const idsCsv = staffList.map((x) => x.id).join(",")
                                          const namesCsv = staffList.map((x) => x.name).join(", ")
                                          setLabs((prev) => prev.map((lab) => (lab.id === l.id ? { ...lab, staff_ids_csv: idsCsv, staff_names_csv: namesCsv } : lab)))
                                          toast({ title: "Assignment updated" })
                                        } catch (e: any) {
                                          toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
                                        } finally {
                                          setLoading(false)
                                        }
                                      }}
                                    />
                                    <span>{l.name} {l.department_name ? `- ${l.department_name}` : ""}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete staff user?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {s.name}. If assigned to a lab, they will be unassigned first.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => {
                                    setLoading(true)
                                    try {
                                      const currentLab = labs.find((l) => l.staff_id === s.id)
                                      if (currentLab) {
                                        const res1 = await fetch(`/api/labs`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId: currentLab.id, staffId: null }) })
                                        const data1 = await res1.json()
                                        if (!res1.ok) throw new Error(data1?.error || "Failed to unassign staff")
                                        setLabs((prev) => prev.map((x) => (x.id === currentLab.id ? { ...x, staff_id: null, staff_name: null } as any : x)))
                                      }
                                      const res = await fetch(`/api/users/${s.id}`, { method: "DELETE" })
                                      const data = await res.json()
                                      if (!res.ok) throw new Error(data?.error || "Failed to delete user")
                                      setLabStaff((prev) => prev.filter((u) => u.id !== s.id))
                                      toast({ title: "Staff deleted" })
                                    } catch (e: any) {
                                      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
                                    } finally {
                                      setLoading(false)
                                    }
                                  }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department create/edit dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deptDialogMode === "create" ? "Add Department" : "Edit Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={deptForm.name} onChange={(e) => setDeptForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={deptForm.code} onChange={(e) => setDeptForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="e.g. CSE" className="w-40" />
            </div>
            <div>
              <Label className="text-xs">Department HOD Email <span className="text-red-600">*</span></Label>
              <Input type="email" value={deptForm.hodEmail ?? ""} onChange={(e) => setDeptForm((s) => ({ ...s, hodEmail: e.target.value }))} placeholder="hod.dept@lnmiit.ac.in" />
              <div className="text-xs text-muted-foreground mt-1">This is the canonical HOD email for the department entity (not the personal email of the assigned HOD user).</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDeptDialog} disabled={loading || !deptForm.name.trim() || !deptForm.code.trim() || !String(deptForm.hodEmail || "").trim()}>{deptDialogMode === "create" ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Faculty dialog */}
      <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Faculty {facultyDept ? `for ${facultyDept.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Search faculty</Label>
              <Input className="mt-1" placeholder="Search by name or email" value={facultyQuery} onChange={(e) => setFacultyQuery(e.target.value)} />
            </div>
            {/* Existing faculty list */}
            <div>
              <Label className="text-xs">Faculty in department</Label>
              <div className="mt-2 space-y-2">
                {faculties
                  .filter((f) => (f.department || "") === (facultyDept?.code || ""))
                  .filter((u) => {
                    const q = facultyQuery.trim().toLowerCase()
                    if (!q) return true
                    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                  })
                  .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 border rounded p-2">
                    <div className="truncate" title={`${u.name} (${u.email})`}>{u.name} ({u.email})</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => removeFacultyFromDept(u.id)}>Remove</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete faculty user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {u.name}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFaculty(u.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Add existing faculty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Label className="text-xs">Add existing faculty</Label>
                <Select value={facultyForm.existingId === undefined ? "" : (facultyForm.existingId === "" ? "" : String(facultyForm.existingId))} onValueChange={(v) => setFacultyForm((s) => ({ ...s, existingId: v === "" ? "" : Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculties
                      .filter((u) => (u.department || "") !== (facultyDept?.code || ""))
                      .filter((u) => {
                        const q = facultyQuery.trim().toLowerCase()
                        if (!q) return true
                        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                      })
                      .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email}) {u.department ? `- ${u.department}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button className="w-full" onClick={addExistingFaculty} disabled={loading || !facultyForm.existingId}>Add Existing</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacultyDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab create/edit dialog */}
      <Dialog open={labDialogOpen} onOpenChange={setLabDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labDialogMode === "create" ? "Add Lab" : "Edit Lab"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={labForm.name} onChange={(e) => setLabForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. CP Lab" />
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={labForm.code} onChange={(e) => setLabForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="e.g. CP1" className="w-40" />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={labForm.departmentId ? String(labForm.departmentId) : ""} onValueChange={(v) => setLabForm((s) => ({ ...s, departmentId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Capacity</Label>
              <Input type="number" value={labForm.capacity ?? ""} onChange={(e) => setLabForm((s) => ({ ...s, capacity: e.target.value === "" ? "" : Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={labForm.location ?? ""} onChange={(e) => setLabForm((s) => ({ ...s, location: e.target.value }))} />
            </div>
            {/* Staff assignment is managed in the Labs table via multi-select checkboxes */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLabDialog} disabled={loading}>{labDialogMode === "create" ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff create dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lab Staff</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:col-span-2">
              <div>
                <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
                <Input value={staffForm.first} onChange={(e) => setStaffForm((s) => ({ ...s, first: e.target.value }))} placeholder="First name" />
              </div>
              <div>
                <Label className="text-xs">Middle Name</Label>
                <Input value={staffForm.middle} onChange={(e) => setStaffForm((s) => ({ ...s, middle: e.target.value }))} placeholder="Middle name" />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input value={staffForm.last} onChange={(e) => setStaffForm((s) => ({ ...s, last: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={staffForm.email} onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))} placeholder="name@lnmiit.ac.in" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Assign to Lab (optional)</Label>
              <Select value={staffForm.labId ? String(staffForm.labId) : ""} onValueChange={(v) => setStaffForm((s) => ({ ...s, labId: v === "" ? "" : Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {labs.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name} {l.department_name ? `- ${l.department_name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button disabled={loading} onClick={async () => {
              const fullName = [staffForm.first, staffForm.middle, staffForm.last].filter(Boolean).join(" ").toUpperCase()
              if (!staffForm.first.trim() || !staffForm.email.trim()) { toast({ title: "First name and email required", variant: "destructive" }); return }
              setLoading(true)
              try {
                const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fullName, email: staffForm.email, role: "lab_staff" }) })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || "Failed to add staff")
                setLabStaff((prev) => [...prev, data.user])
                if (staffForm.labId) {
                  const res2 = await fetch(`/api/labs`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId: staffForm.labId, staffId: data.user.id }) })
                  const data2 = await res2.json()
                  if (!res2.ok) throw new Error(data2?.error || "Failed to assign staff to lab")
                  setLabs((prev) => prev.map((x) => (x.id === staffForm.labId ? { ...x, staff_id: data.user.id, staff_name: data.user.name } : x)))
                }
                setStaffDialogOpen(false)
                setStaffForm({ first: "", middle: "", last: "", email: "" })
                toast({ title: "Staff added" })
              } catch (e: any) {
                toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
              } finally {
                setLoading(false)
              }
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
