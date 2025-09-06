"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

type Lab = {
  id: number
  name: string
  code: string
  department_id: number
  department_name?: string
  staff_id?: number | null
  staff_name?: string | null
  staff_ids_csv?: string | null
  staff_names_csv?: string | null
  capacity?: number
  location?: string
}

type Department = {
  id: number
  name: string
  code: string
}

export default function LabsPage() {
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [labs, setLabs] = useState<Lab[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [deptFilter, setDeptFilter] = useState<string | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

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

  const loadData = async () => {
    try {
      setLoading(true)
      const [labsRes, deptsRes] = await Promise.all([
        fetch("/api/admin/labs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/departments", { cache: "no-store" }).then((r) => r.json()),
      ])
      
      setLabs(labsRes.labs || [])
      setDepartments(deptsRes.departments || [])
    } catch (error: any) {
      toast({
        title: "Failed to load data",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authChecked) return
    loadData()
  }, [authChecked])

  const filteredLabs = labs.filter((lab) => {
    const matchesDept = deptFilter === "all" || lab.department_id === parseInt(deptFilter)
    const matchesQuery = !searchQuery || 
      lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.department_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.location?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesDept && matchesQuery
  })

  if (!authChecked || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Labs</h1>
        <p className="text-muted-foreground">
          View and manage laboratory information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laboratory Directory</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search labs by name, code, department, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLabs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || deptFilter !== "all" ? "No labs match your filters" : "No labs found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lab Code</TableHead>
                  <TableHead>Lab Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Staff Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabs.map((lab) => (
                  <TableRow key={lab.id}>
                    <TableCell className="font-mono">{lab.code}</TableCell>
                    <TableCell className="font-medium">{lab.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lab.department_name || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{lab.location || "Not specified"}</TableCell>
                    <TableCell>
                      {lab.capacity ? `${lab.capacity} seats` : "Not specified"}
                    </TableCell>
                    <TableCell>
                      {lab.staff_names_csv ? (
                        <div className="space-y-1">
                          {lab.staff_names_csv.split(",").map((staff, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {staff.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No staff assigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labs.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Labs with Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {labs.filter(lab => lab.staff_names_csv && lab.staff_names_csv.trim()).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
