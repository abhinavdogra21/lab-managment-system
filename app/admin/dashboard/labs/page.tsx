"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Department = { id: number; name: string; code: string; hod_id?: number | null; hod_name?: string | null; hod_email?: string | null }
type Lab = { id: number; name: string; code: string; department_id: number; department_name?: string; staff_id?: number | null; staff_name?: string | null; staff_ids_csv?: string | null; staff_names_csv?: string | null; capacity?: number; location?: string }

export default function LabsPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [labStaffOptions, setLabStaffOptions] = useState<{ id: number; name: string; email: string }[]>([])
  const [hodOptions, setHodOptions] = useState<{ id: number; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [labForm, setLabForm] = useState({ name: "", code: "", departmentId: "", capacity: "", location: "" })
  const [deptForm, setDeptForm] = useState({ name: "", code: "", hodEmail: "" })

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    if (u) {
      try { const parsed = JSON.parse(u); setCurrentUser(parsed) } catch {}
    }
    setAuthChecked(true)
  }, [])

  const loadAll = async () => {
    try {
      const [dRes, lRes, staffRes, hodRes] = await Promise.all([
        fetch("/api/admin/departments", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/labs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/users?role=lab_staff", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/users?role=faculty", { cache: "no-store" }).then((r) => r.json()),
      ])
      setDepartments(dRes.departments || [])
      setLabs(lRes.labs || [])
      setLabStaffOptions((staffRes.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
      setHodOptions((hodRes.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
    } catch (e: any) {
      toast({ title: "Failed to load", description: e?.message || "Could not fetch data", variant: "destructive" })
    }
  }

  useEffect(() => { if (authChecked) loadAll() }, [authChecked])

  const onCreateDepartment = async () => {
    if (!deptForm.name || !deptForm.code) { toast({ title: "Enter name and code", variant: "destructive" }); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: deptForm.name, code: deptForm.code, hodEmail: deptForm.hodEmail || null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed")
      await loadAll()
      setDeptForm({ name: "", code: "", hodEmail: "" })
      toast({ title: "Department created" })
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const onCreateLab = async () => {
    if (!labForm.name || !labForm.code || !labForm.departmentId) { toast({ title: "Fill required fields", description: "Name, Code, Department", variant: "destructive" }); return }
    setLoading(true)
    try {
      const payload = { name: labForm.name, code: labForm.code, departmentId: Number(labForm.departmentId), capacity: labForm.capacity ? Number(labForm.capacity) : undefined, location: labForm.location || undefined }
      const res = await fetch("/api/admin/labs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || (res.status === 403 ? "Forbidden: admin or HOD only" : "Failed"))
      await loadAll()
      setLabForm({ name: "", code: "", departmentId: "", capacity: "", location: "" })
      toast({ title: "Lab created" })
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const onDeleteLab = async (id: number) => {
    if (!confirm("Delete this lab and all its records?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/labs?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      await loadAll()
      toast({ title: "Lab deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const onAssignLabStaff = async (labId: number, staffIds: number[]) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/labs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId, staffIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to set lab staff")
      const staffList: Array<{ id: number; name: string; email: string }> = data.staff || []
      const idsCsv = staffList.map((s) => s.id).join(",")
      const namesCsv = staffList.map((s) => s.name).join(", ")
      setLabs((prev) => prev.map((l) => (l.id === labId ? { ...l, staff_ids_csv: idsCsv, staff_names_csv: namesCsv } : l)))
      toast({ title: "Lab staff updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const onAssignHod = async (departmentId: number, hodId: number | null) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/departments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId, hodId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to set HOD")
      setDepartments((prev) => prev.map((d) => (d.id === departmentId ? { ...d, hod_id: data.department.hod_id, hod_name: data.department.hod_name, hod_email: data.department.hod_email } : d)))
      toast({ title: "HOD updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const onDeleteDepartment = async (id: number) => {
    if (!confirm("Delete this department, all its labs, and related records?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/departments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete department")
      await loadAll()
      toast({ title: "Department deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally { setLoading(false) }
  }

  if (!authChecked) return null

  const role = (currentUser?.role || "").replace(/_/g, "-")
  const canManage = role === "admin" || role === "hod"
  const hasDepartments = departments.length > 0

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Lab and Department Management</h1>

      {!canManage && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          You have read-only access. Only Admins or HODs can create or delete departments and labs.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" value={deptForm.name} onChange={(e) => setDeptForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dept-code">Code</Label>
              <Input id="dept-code" value={deptForm.code} onChange={(e) => setDeptForm((s) => ({ ...s, code: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dept-hod-email">HOD Email <span className="text-red-600">*</span></Label>
              <Input id="dept-hod-email" required type="email" placeholder="hod.name@lnmiit.ac.in" value={deptForm.hodEmail} onChange={(e) => setDeptForm((s) => ({ ...s, hodEmail: e.target.value }))} />
            </div>
            <Button disabled={loading || !canManage || !deptForm.name || !deptForm.code || !deptForm.hodEmail} onClick={onCreateDepartment}>
              {loading ? "Creating..." : "Create Department"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Lab</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lab-name">Name</Label>
              <Input id="lab-name" value={labForm.name} onChange={(e) => setLabForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="lab-code">Code</Label>
              <Input id="lab-code" value={labForm.code} onChange={(e) => setLabForm((s) => ({ ...s, code: e.target.value }))} />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={labForm.departmentId} onValueChange={(v) => setLabForm((s) => ({ ...s, departmentId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={hasDepartments ? "Select department" : "No departments available"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lab-capacity">Capacity</Label>
                <Input id="lab-capacity" type="number" value={labForm.capacity} onChange={(e) => setLabForm((s) => ({ ...s, capacity: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lab-location">Location</Label>
                <Input id="lab-location" value={labForm.location} onChange={(e) => setLabForm((s) => ({ ...s, location: e.target.value }))} />
              </div>
            </div>
            {!hasDepartments && (
              <div className="text-sm text-muted-foreground">Add a department to enable lab creation.</div>
            )}
            <Button
              disabled={loading || !canManage || !hasDepartments || !labForm.name || !labForm.code || !labForm.departmentId}
              onClick={onCreateLab}
            >
              {loading ? "Creating..." : canManage ? "Create Lab" : "Insufficient permissions"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>All Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Lab Staff</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((lab) => {
                  const currentIds = (lab.staff_ids_csv || "").split(",").filter(Boolean).map((s) => Number(s))
                  return (
                    <TableRow key={lab.id}>
                      <TableCell>{lab.name}</TableCell>
                      <TableCell>{lab.code}</TableCell>
                      <TableCell>{lab.department_name || lab.department_id}</TableCell>
                      <TableCell className="min-w-64">
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!canManage || loading}>
                                {currentIds.length ? `${currentIds.length} selected` : "Assign staff"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-64 overflow-y-auto min-w-80">
                              {labStaffOptions.map((u) => {
                                const checked = currentIds.includes(u.id)
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={u.id}
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const next = new Set(currentIds)
                                      if (v) next.add(u.id)
                                      else next.delete(u.id)
                                      onAssignLabStaff(lab.id, Array.from(next))
                                    }}
                                  >
                                    {u.name} ({u.email})
                                  </DropdownMenuCheckboxItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <div className="text-xs text-muted-foreground truncate" title={lab.staff_names_csv || "Unassigned"}>
                            {lab.staff_names_csv || "Unassigned"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{lab.capacity ?? "-"}</TableCell>
                      <TableCell>{lab.location ?? "-"}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" disabled={loading || !canManage} onClick={() => onDeleteLab(lab.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
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
                      <Select
                        value={d.hod_id ? String(d.hod_id) : "none"}
                        onValueChange={(v) => onAssignHod(d.id, v === "none" ? null : Number(v))}
                        disabled={!canManage || loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign HOD" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {hodOptions.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" disabled={loading || !canManage} onClick={() => onDeleteDepartment(d.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
