"use client"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

type Department = { id: number; name: string; code: string }
type Lab = { id: number; name: string; code: string; department_id: number; department_name?: string; capacity?: number; location?: string }

export default function LabsPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [labForm, setLabForm] = useState({ name: "", code: "", departmentId: "", capacity: "", location: "" })
  const [deptForm, setDeptForm] = useState({ name: "", code: "" })

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    if (u) {
      try {
        const parsed = JSON.parse(u)
        setCurrentUser(parsed)
      } catch {}
    }
    setAuthChecked(true)
  }, [])

  const loadAll = async () => {
    try {
      const [dRes, lRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/labs", { cache: "no-store" }).then((r) => r.json()),
      ])
      setDepartments(dRes.departments || [])
      setLabs(lRes.labs || [])
    } catch (e: any) {
      toast({ title: "Failed to load", description: e?.message || "Could not fetch data", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (!authChecked) return
    loadAll()
  }, [authChecked])

  const onCreateDepartment = async () => {
    if (!deptForm.name || !deptForm.code) {
      toast({ title: "Enter name and code", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deptForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed")
  // re-fetch to sync and show in list
  await loadAll()
      setDeptForm({ name: "", code: "" })
      toast({ title: "Department created" })
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onCreateLab = async () => {
    if (!labForm.name || !labForm.code || !labForm.departmentId) {
      toast({ title: "Fill required fields", description: "Name, Code, Department", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: labForm.name,
        code: labForm.code,
        departmentId: Number(labForm.departmentId),
        capacity: labForm.capacity ? Number(labForm.capacity) : undefined,
        location: labForm.location || undefined,
      }
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        // surface specific messages like duplicate code or forbidden
        throw new Error(data?.error || (res.status === 403 ? "Forbidden: admin or HOD only" : "Failed"))
      }
  // re-fetch to sync and show in list
  await loadAll()
      setLabForm({ name: "", code: "", departmentId: "", capacity: "", location: "" })
      toast({ title: "Lab created" })
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onDeleteLab = async (id: number) => {
    if (!confirm("Delete this lab and all its records?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/labs?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      await loadAll()
      toast({ title: "Lab deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onDeleteDepartment = async (id: number) => {
    if (!confirm("Delete this department, all its labs, and related records?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete department")
      await loadAll()
      toast({ title: "Department deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) return null

  const role = (currentUser?.role || "").replace(/_/g, "-")
  const canManage = role === "admin" || role === "hod"
  const hasDepartments = departments.length > 0

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Labs & Departments</h1>

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
            <Button disabled={loading || !canManage || !deptForm.name || !deptForm.code} onClick={onCreateDepartment}>
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
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((lab) => (
                  <TableRow key={lab.id}>
                    <TableCell>{lab.name}</TableCell>
                    <TableCell>{lab.code}</TableCell>
                    <TableCell>{lab.department_name || lab.department_id}</TableCell>
                    <TableCell>{lab.capacity ?? "-"}</TableCell>
                    <TableCell>{lab.location ?? "-"}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" disabled={loading || !canManage} onClick={() => onDeleteLab(lab.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.code}</TableCell>
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

