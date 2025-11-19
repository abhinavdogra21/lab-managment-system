/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
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

type Department = { 
  id: number; 
  name: string; 
  code: string; 
  hod_id?: number | null; 
  hod_name?: string | null; 
  hod_email?: string | null;
  highest_approval_authority?: 'hod' | 'lab_coordinator' | null;
  lab_coordinator_id?: number | null;
  lab_coordinator_name?: string | null;
}
type Lab = { id: number; name: string; code: string; department_id: number; department_name?: string; staff_id?: number | null; staff_name?: string | null; staff_ids_csv?: string | null; staff_names_csv?: string | null; capacity?: number; location?: string }
type User = { id: number; name: string; email: string; role: string; department?: string | null }

export default function DepartmentAndLabManagementPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [faculties, setFaculties] = useState<User[]>([])
  const [labStaff, setLabStaff] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"departments" | "labs" | "staff">("departments")

  // Dialogs and forms
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [deptDialogMode, setDeptDialogMode] = useState<"create" | "edit">("create")
  const [deptForm, setDeptForm] = useState<{ id?: number; name: string; code: string; hodId?: number | null; hodEmail?: string | null }>({ name: "", code: "", hodEmail: "" })
  const [labDialogOpen, setLabDialogOpen] = useState(false)
  const [labDialogMode, setLabDialogMode] = useState<"create" | "edit">("create")
  const [labForm, setLabForm] = useState<{ id?: number; name: string; code: string; departmentId: number | ""; capacity?: number | ""; location?: string }>({ name: "", code: "", departmentId: "" })
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [staffDialogMode, setStaffDialogMode] = useState<"create" | "edit">("create")
  const [staffForm, setStaffForm] = useState<{ id?: number; firstName: string; middleName?: string; lastName: string; email: string; salutation?: string; department?: string }>({ firstName: "", lastName: "", email: "" })
  const [labsDeptFilter, setLabsDeptFilter] = useState<string | "all">("all")
  const [labsQuery, setLabsQuery] = useState("")
  const [staffQuery, setStaffQuery] = useState("")
  const [staffLabFilter, setStaffLabFilter] = useState<string | "all">("all")
  const [hodPopoverOpen, setHodPopoverOpen] = useState<{ [key: number]: boolean }>({})
  const [coordinatorPopoverOpen, setCoordinatorPopoverOpen] = useState<{ [key: number]: boolean }>({})
  const [labStaffPopoverOpen, setLabStaffPopoverOpen] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!u && typeof window !== "undefined") {
      window.location.href = "/"
      return
    }
    setAuthChecked(true)
  }, [])

  const loadAll = async () => {
    try {
      const [dRes, lRes, fRes, sRes] = await Promise.all([
        fetch("/api/admin/departments", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/labs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/users?role=faculty", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/users?role=lab_staff", { cache: "no-store" }).then((r) => r.json()),
      ])
      setDepartments(dRes.departments || [])
      setLabs(lRes.labs || [])
      setFaculties(fRes.users || [])
      setLabStaff(sRes.users || [])
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (!authChecked) return
    loadAll()
  }, [authChecked])

  const assignHod = async (departmentId: number, hodId: number | null) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/departments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId, hodId }) })
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

  const updateApprovalAuthority = async (
    departmentId: number, 
    highestApprovalAuthority?: 'hod' | 'lab_coordinator',
    labCoordinatorId?: number | null
  ) => {
    setLoading(true)
    
    // Show processing toast
    toast({ 
      title: "⏳ Processing...",
      description: "Updating approval authority and sending email notifications...",
      duration: 3000,
    })
    
    try {
      const payload: any = { departmentId }
      if (highestApprovalAuthority !== undefined) payload.highestApprovalAuthority = highestApprovalAuthority
      if (labCoordinatorId !== undefined) payload.labCoordinatorId = labCoordinatorId
      
      const res = await fetch("/api/admin/departments", { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update approval authority")
      
      setDepartments((prev) => prev.map((d) => (
        d.id === departmentId 
          ? { 
              ...d, 
              highest_approval_authority: data.department.highest_approval_authority,
              lab_coordinator_id: data.department.lab_coordinator_id,
              lab_coordinator_name: data.department.lab_coordinator_name
            } 
          : d
      )))
      
      // Show success message with notification info
      toast({ 
        title: "✅ Successfully changed!",
        description: "Both HOD and Lab Coordinator have been notified via email.",
        duration: 5000,
        className: "bg-green-50 border-green-200",
      })
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const openCreateDept = () => { setDeptDialogMode("create"); setDeptForm({ name: "", code: "", hodEmail: "" }); setDeptDialogOpen(true) }
  const openEditDept = (d: Department) => { setDeptDialogMode("edit"); setDeptForm({ id: d.id, name: d.name, code: d.code, hodId: d.hod_id ?? null, hodEmail: d.hod_email ?? "" }); setDeptDialogOpen(true) }

  const saveDeptDialog = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim() || !String(deptForm.hodEmail || "").trim()) {
      toast({ title: "Name, code and HOD email are required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      if (deptDialogMode === "create") {
        const res = await fetch("/api/admin/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: deptForm.name, code: deptForm.code, hodEmail: deptForm.hodEmail || null }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to create department")
        setDepartments((prev) => [...prev, data.department])
        toast({ title: "Department created" })
      } else {
        const res = await fetch("/api/admin/departments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deptForm.id, name: deptForm.name, code: deptForm.code, hodEmail: deptForm.hodEmail ?? null }) })
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
      const res = await fetch(`/api/admin/departments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete department")
      setDepartments((prev) => prev.filter((x) => x.id !== id))
      setLabs((prev) => prev.filter((l) => l.department_id !== id))
      toast({ title: "Department deleted" })
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
      const res = await fetch("/api/admin/labs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId, staffIds }) })
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

  const openCreateLab = () => { setLabDialogMode("create"); setLabForm({ name: "", code: "", departmentId: "" }); setLabDialogOpen(true) }
  const openEditLab = (l: Lab) => { setLabDialogMode("edit"); setLabForm({ id: l.id, name: l.name, code: l.code, departmentId: l.department_id, capacity: l.capacity ?? "", location: l.location ?? "" }); setLabDialogOpen(true) }

  const saveLabDialog = async () => {
    if (!labForm.name.trim() || !labForm.code.trim() || !labForm.departmentId) {
      toast({ title: "Name, code, department required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      if (labDialogMode === "create") {
        const res = await fetch("/api/admin/labs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...labForm, capacity: labForm.capacity === "" ? undefined : labForm.capacity }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to create lab")
        setLabs((prev) => [...prev, data.lab])
        toast({ title: "Lab created" })
      } else {
        const payload: any = { id: labForm.id, name: labForm.name, code: labForm.code, capacity: labForm.capacity === "" ? null : labForm.capacity ?? null, location: labForm.location ?? null }
        const res = await fetch("/api/admin/labs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
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

  // Staff management functions
  const openCreateStaff = () => { setStaffDialogMode("create"); setStaffForm({ firstName: "", lastName: "", email: "" }); setStaffDialogOpen(true) }
  const openEditStaff = (staff: User) => { 
    setStaffDialogMode("edit"); 
    // Split the name back into parts (assuming space-separated)
    const nameParts = staff.name.split(' ')
    const firstName = nameParts[0] || ""
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ""
    
    setStaffForm({ 
      id: staff.id, 
      firstName,
      middleName,
      lastName,
      email: staff.email, 
      salutation: "", // API might not return salutation
      department: staff.department || "" 
    }); 
    setStaffDialogOpen(true) 
  }

  const saveStaffDialog = async () => {
    // Combine atomic name fields
    const fullName = [staffForm.firstName, staffForm.middleName, staffForm.lastName]
      .filter(part => part && part.trim())
      .join(' ')
    
    if (!staffForm.firstName.trim() || !staffForm.email.trim()) {
      toast({ title: "First name and email are required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      if (staffDialogMode === "create") {
        const payload = {
          name: fullName,
          email: staffForm.email,
          role: "lab_staff",
          salutation: staffForm.salutation || undefined,
          department: staffForm.department || undefined
        }
        const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to create lab staff")
        setLabStaff((prev) => [...prev, data.user])
        toast({ title: "Lab staff created" })
      } else {
        const payload = {
          id: staffForm.id,
          name: fullName,
          email: staffForm.email,
          salutation: staffForm.salutation || undefined,
          department: staffForm.department || undefined
        }
        const res = await fetch(`/api/admin/users/${staffForm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to update lab staff")
        setLabStaff((prev) => prev.map((s) => (s.id === staffForm.id ? { ...s, ...data.user } : s)))
        toast({ title: "Lab staff updated" })
      }
      setStaffDialogOpen(false)
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const deleteStaff = async (staff: User) => {
    // Check if staff is assigned to any labs
    const assignedLabs = labs.filter(lab => 
      lab.staff_ids_csv?.split(',').map(id => parseInt(id.trim())).includes(staff.id)
    )
    
    if (assignedLabs.length > 0) {
      toast({ 
        title: "Cannot delete staff", 
        description: `This staff member is assigned to ${assignedLabs.length} lab(s). Please unassign them first.`,
        variant: "destructive" 
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${staff.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete lab staff")
      setLabStaff((prev) => prev.filter((s) => s.id !== staff.id))
      toast({ title: "Lab staff deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Filter functions for staff
  const filteredStaff = labStaff.filter((staff) => {
    const matchesQuery = staffQuery === "" || 
      staff.name.toLowerCase().includes(staffQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(staffQuery.toLowerCase()) ||
      (staff.department && staff.department.toLowerCase().includes(staffQuery.toLowerCase()))
    
    if (staffLabFilter === "all") return matchesQuery
    
    if (staffLabFilter === "unassigned") {
      const isAssigned = labs.some(lab => 
        lab.staff_ids_csv?.split(',').map(id => parseInt(id.trim())).includes(staff.id)
      )
      return matchesQuery && !isAssigned
    }
    
    // Filter by specific lab
    const isAssignedToLab = labs.some(lab => 
      lab.code === staffLabFilter && 
      lab.staff_ids_csv?.split(',').map(id => parseInt(id.trim())).includes(staff.id)
    )
    return matchesQuery && isAssignedToLab
  })

  if (!authChecked) return null

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
                    <TableHead>Lab Coordinator</TableHead>
                    <TableHead>Highest Approval Authority</TableHead>
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
                          <Popover 
                            open={hodPopoverOpen[d.id] || false} 
                            onOpenChange={(open) => setHodPopoverOpen(prev => ({ ...prev, [d.id]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={hodPopoverOpen[d.id] || false}
                                className="w-full justify-between"
                              >
                                {d.hod_id ? (
                                  (() => {
                                    const hod = faculties.find(f => f.id === d.hod_id)
                                    return hod ? (
                                      <span className="truncate">{hod.name}</span>
                                    ) : "Unknown"
                                  })()
                                ) : "Assign HOD"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Search faculty..." />
                                <CommandList>
                                  <CommandEmpty>No faculty found.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value="none"
                                      onSelect={() => {
                                        assignHod(d.id, null)
                                        setHodPopoverOpen(prev => ({ ...prev, [d.id]: false }))
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          !d.hod_id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      Unassigned
                                    </CommandItem>
                                    {faculties.filter((u) => u.department === d.code).map((u) => (
                                      <CommandItem
                                        key={u.id}
                                        value={`${u.name} ${u.email}`}
                                        onSelect={() => {
                                          assignHod(d.id, u.id)
                                          setHodPopoverOpen(prev => ({ ...prev, [d.id]: false }))
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            d.hod_id === u.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium">{u.name}</span>
                                          <span className="text-xs text-muted-foreground">{u.email}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <div className="text-xs text-muted-foreground">
                            <div>Dept HOD Email: {d.hod_email || "—"}</div>
                            {/* Removed per requirement */}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-56">
                        <Popover 
                          open={coordinatorPopoverOpen[d.id] || false} 
                          onOpenChange={(open) => setCoordinatorPopoverOpen(prev => ({ ...prev, [d.id]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={coordinatorPopoverOpen[d.id] || false}
                              className="w-full justify-between"
                            >
                              {d.lab_coordinator_id ? (
                                (() => {
                                  const coordinator = faculties.find(f => f.id === d.lab_coordinator_id)
                                  return coordinator ? (
                                    <span className="truncate">{coordinator.name}</span>
                                  ) : "Unknown"
                                })()
                              ) : "Assign Coordinator"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search faculty..." />
                              <CommandList>
                                <CommandEmpty>No faculty found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="none"
                                    onSelect={() => {
                                      updateApprovalAuthority(d.id, d.highest_approval_authority || 'hod', null)
                                      setCoordinatorPopoverOpen(prev => ({ ...prev, [d.id]: false }))
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !d.lab_coordinator_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    Unassigned
                                  </CommandItem>
                                  {faculties.filter((u) => u.department === d.code).map((u) => (
                                    <CommandItem
                                      key={u.id}
                                      value={`${u.name} ${u.email}`}
                                      onSelect={() => {
                                        updateApprovalAuthority(d.id, d.highest_approval_authority || 'hod', u.id)
                                        setCoordinatorPopoverOpen(prev => ({ ...prev, [d.id]: false }))
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          d.lab_coordinator_id === u.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{u.name}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="min-w-48">
                        <Select
                          value={d.highest_approval_authority || "hod"}
                          onValueChange={(v: 'hod' | 'lab_coordinator') => {
                            updateApprovalAuthority(d.id, v, d.lab_coordinator_id)
                          }}
                          disabled={!d.hod_id || !d.lab_coordinator_id}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select authority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hod">HOD</SelectItem>
                            <SelectItem value="lab_coordinator">Lab Coordinator</SelectItem>
                          </SelectContent>
                        </Select>
                        {(!d.hod_id || !d.lab_coordinator_id) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Assign both HOD and Lab Coordinator first
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDept(d)}>Edit</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Department?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{d.name}" department and all associated labs. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteDepartment(d.id)}
                                >
                                  Delete Department
                                </AlertDialogAction>
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
                <Button onClick={() => { setLabDialogMode("create"); setLabForm({ name: "", code: "", departmentId: "" }); setLabDialogOpen(true) }}>Add Lab</Button>
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
                    <TableHead>Head Staff</TableHead>
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
                        <TableCell className="min-w-32">
                          <div className="space-y-2">
                            <Popover 
                              open={labStaffPopoverOpen[lab.id] || false} 
                              onOpenChange={(open) => setLabStaffPopoverOpen(prev => ({ ...prev, [lab.id]: open }))}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-between"
                                >
                                  {(() => {
                                    const staffCount = (lab.staff_ids_csv || "").split(",").filter(Boolean).length
                                    return staffCount > 0 ? `${staffCount} Staff` : "Assign Staff"
                                  })()}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[350px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search lab staff..." />
                                  <CommandList>
                                    <CommandEmpty>No lab staff found.</CommandEmpty>
                                    <CommandGroup>
                                      {labStaff.map((u) => {
                                        const currentIds = (lab.staff_ids_csv || "").split(",").filter(Boolean).map((s) => Number(s))
                                        const checked = currentIds.includes(u.id)
                                        return (
                                          <CommandItem
                                            key={u.id}
                                            value={`${u.name} ${u.email}`}
                                            onSelect={() => {
                                              const next = new Set(currentIds)
                                              if (checked) next.delete(u.id)
                                              else next.add(u.id)
                                              assignLabStaff(lab.id, Array.from(next))
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                checked ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex flex-col">
                                              <span className="font-medium">{u.name}</span>
                                              <span className="text-xs text-muted-foreground">{u.email}</span>
                                            </div>
                                          </CommandItem>
                                        )
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-48">
                          {(() => {
                            const currentIds = (lab.staff_ids_csv || "").split(",").filter(Boolean).map((s) => Number(s))
                            const candidates = labStaff.filter((u) => currentIds.includes(u.id))
                            const currentHead = candidates.find((u) => u.id === (lab.staff_id || 0)) || null
                            return (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={lab.staff_id ? String(lab.staff_id) : "none"}
                                  onValueChange={async (v) => {
                                    try {
                                      const payload: any = { id: lab.id, staffId: v === "none" ? null : Number(v) }
                                      const res = await fetch("/api/admin/labs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
                                      const data = await res.json()
                                      if (!res.ok) throw new Error(data?.error || "Failed to set head lab staff")
                                      setLabs((prev) => prev.map((x) => (x.id === lab.id ? { ...x, staff_id: data.lab.staff_id, staff_name: data.lab.staff_name } : x)))
                                      toast({ title: "Head lab staff updated" })
                                    } catch (e: any) {
                                      toast({ title: "Update failed", description: e?.message || "", variant: "destructive" })
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select head" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {candidates.length === 0 ? (
                                      <SelectItem value="none">No staff assigned</SelectItem>
                                    ) : (
                                      <>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {candidates.map((u) => (
                                          <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name} <span className="text-xs text-muted-foreground">({u.email})</span>
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>{lab.capacity ?? "-"}</TableCell>
                        <TableCell>{lab.location ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setLabDialogMode("edit"); setLabForm({ id: lab.id, name: lab.name, code: lab.code, departmentId: lab.department_id, capacity: lab.capacity ?? "", location: lab.location ?? "" }); setLabDialogOpen(true) }}>Edit</Button>
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
                                      const res = await fetch(`/api/admin/labs?id=${lab.id}`, { method: "DELETE" })
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
              <CardTitle>Lab Staff Management</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Filter by Lab</Label>
                  <Select value={staffLabFilter} onValueChange={(v) => setStaffLabFilter(v as any)}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="unassigned">Unassigned Staff</SelectItem>
                      {labs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.code}>
                          <span className="font-medium">{lab.code}</span>
                          {lab.name !== lab.code && (
                            <span className="text-muted-foreground ml-2">- {lab.name}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input 
                  className="w-60" 
                  placeholder="Search staff by name, email, department..." 
                  value={staffQuery} 
                  onChange={(e) => setStaffQuery(e.target.value)} 
                />
                <Button onClick={openCreateStaff}>Add Lab Staff</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Assigned Labs</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {staffQuery || staffLabFilter !== "all" ? "No lab staff match your search criteria." : "No lab staff found. Add lab staff using the button above."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => {
                      // Find labs assigned to this staff member
                      const assignedLabs = labs.filter(lab => 
                        lab.staff_ids_csv?.split(',').map(id => parseInt(id.trim())).includes(staff.id)
                      )
                      
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell>{staff.email}</TableCell>
                          <TableCell>{staff.department || 'N/A'}</TableCell>
                          <TableCell>
                            {assignedLabs.length > 0 ? (
                              <div className="space-y-1">
                                {assignedLabs.length <= 3 ? (
                                  // Show all labs if 3 or fewer
                                  <div className="flex flex-wrap gap-1">
                                    {assignedLabs.map((lab) => (
                                      <span 
                                        key={lab.id} 
                                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                      >
                                        {lab.code}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  // Show compact view for 4+ labs
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">
                                      {assignedLabs.length} labs assigned
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {assignedLabs.slice(0, 2).map(lab => lab.code).join(", ")}
                                      {assignedLabs.length > 2 && `, +${assignedLabs.length - 2} more`}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No labs assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditStaff(staff)}>
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Lab Staff?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{staff.name}" from the system. 
                                      {assignedLabs.length > 0 && (
                                        <span className="text-red-600 font-medium">
                                          <br />Warning: This staff member is assigned to {assignedLabs.length} lab(s). 
                                          They will be unassigned from all labs.
                                        </span>
                                      )}
                                      <br />This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => deleteStaff(staff)}
                                    >
                                      Delete Staff
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDeptDialog} disabled={loading || !deptForm.name.trim() || !deptForm.code.trim() || !String(deptForm.hodEmail || "").trim()}>{deptDialogMode === "create" ? "Create" : "Save"}</Button>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLabDialog} disabled={loading}>{labDialogMode === "create" ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff create/edit dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{staffDialogMode === "create" ? "Add Lab Staff" : "Edit Lab Staff"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Salutation</Label>
              <Select value={staffForm.salutation || "none"} onValueChange={(v) => setStaffForm((s) => ({ ...s, salutation: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Salutation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Salutation</SelectItem>
                  <SelectItem value="prof">Prof.</SelectItem>
                  <SelectItem value="dr">Dr.</SelectItem>
                  <SelectItem value="mr">Mr.</SelectItem>
                  <SelectItem value="mrs">Mrs.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">First Name <span className="text-red-600">*</span></Label>
              <Input 
                value={staffForm.firstName} 
                onChange={(e) => setStaffForm((s) => ({ ...s, firstName: e.target.value }))} 
                placeholder="e.g. John" 
              />
            </div>
            <div>
              <Label className="text-xs">Middle Name</Label>
              <Input 
                value={staffForm.middleName || ""} 
                onChange={(e) => setStaffForm((s) => ({ ...s, middleName: e.target.value }))} 
                placeholder="e.g. Michael" 
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input 
                value={staffForm.lastName} 
                onChange={(e) => setStaffForm((s) => ({ ...s, lastName: e.target.value }))} 
                placeholder="e.g. Doe" 
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Email <span className="text-red-600">*</span></Label>
              <Input 
                type="email"
                value={staffForm.email} 
                onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))} 
                placeholder="e.g. john.doe@lnmiit.ac.in" 
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Department</Label>
              <Select value={staffForm.department || "none"} onValueChange={(v) => setStaffForm((s) => ({ ...s, department: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveStaffDialog} 
              disabled={loading || !staffForm.firstName.trim() || !staffForm.email.trim()}
            >
              {staffDialogMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
