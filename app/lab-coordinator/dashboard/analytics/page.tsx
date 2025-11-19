/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Search, TrendingDown, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface LabStat {
  lab_id: number
  lab_name: string
  department_name: string
  component_id: number
  component_name: string
  quantity_total: number
  quantity_available: number
  times_requested: number
  total_quantity_requested: number
  utilization_percentage: number
}

interface ComponentStat {
  component_id: number
  component_name: string
  category: string
  quantity_total: number
  quantity_available: number
  times_requested: number
  total_quantity_requested: number
  utilization_percentage: number
  labs_count: number
}

interface Lab {
  lab_id: number
  lab_name: string
  department_name: string
}

export default function LabCoordinatorAnalyticsPage() {
  const getDefaultDates = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear
    const endYear = startYear + 1
    
    const startDateDefault = `${startYear}-08-01`
    const endDateDefault = `${endYear}-07-31`
    
    return { startDateDefault, endDateDefault }
  }
  
  const { startDateDefault, endDateDefault } = getDefaultDates()
  
  const [labStats, setLabStats] = useState<LabStat[]>([])
  const [componentStats, setComponentStats] = useState<ComponentStat[]>([])
  const [allLabs, setAllLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest">("highest")
  const [selectedLab, setSelectedLab] = useState<string>("all")
  const [startDate, setStartDate] = useState(startDateDefault)
  const [endDate, setEndDate] = useState(endDateDefault)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const url = params.toString() 
        ? `/api/lab-coordinator/analytics/component-utilization?${params.toString()}`
        : '/api/lab-coordinator/analytics/component-utilization'
        
      const res = await fetch(url)
      const data = await res.json()
      setLabStats(data.labStats || [])
      setComponentStats(data.componentStats || [])
      setAllLabs(data.allLabs || [])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    fetchData()
  }

  const uniqueLabs = allLabs.map(lab => lab.lab_name)

  const labsWithComponents = new Set(labStats.map(stat => stat.lab_id))
  const labsWithoutComponents = allLabs.filter(lab => !labsWithComponents.has(lab.lab_id))

  const filteredLabStats = labStats
    .filter(stat => {
      const matchesSearch = stat.component_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           stat.lab_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLab = selectedLab === "all" || stat.lab_name === selectedLab
      return matchesSearch && matchesLab
    })
    .sort((a, b) => {
      if (sortOrder === "highest") {
        return b.utilization_percentage - a.utilization_percentage || b.times_requested - a.times_requested
      } else {
        return a.utilization_percentage - b.utilization_percentage || a.times_requested - b.times_requested
      }
    })

  const filteredComponentStats = componentStats
    .filter(stat => stat.component_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "highest") {
        return b.utilization_percentage - a.utilization_percentage || b.times_requested - a.times_requested
      } else {
        return a.utilization_percentage - b.utilization_percentage || a.times_requested - b.times_requested
      }
    })

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 75) return "destructive"
    if (percentage >= 50) return "default"
    if (percentage >= 25) return "secondary"
    return "outline"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Component Utilization Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track component usage across your department labs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="search">Search Component</Label>
              <Input
                id="search"
                placeholder="Search by component or lab name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="sort">Sort Order</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "highest" | "lowest")}>
                <SelectTrigger id="sort" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Highest to Lowest
                    </div>
                  </SelectItem>
                  <SelectItem value="lowest">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Lowest to Highest
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lab">Filter by Lab</Label>
              <Select value={selectedLab} onValueChange={setSelectedLab}>
                <SelectTrigger id="lab" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labs</SelectItem>
                  {uniqueLabs.map((lab) => (
                    <SelectItem key={lab} value={lab}>
                      {lab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} disabled={loading}>
              Apply Date Filters
            </Button>
            {(startDate !== startDateDefault || endDate !== endDateDefault) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate(startDateDefault)
                  setEndDate(endDateDefault)
                  setTimeout(fetchData, 100)
                }}
              >
                Reset to Default Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lab-wise Component Utilization
          </CardTitle>
          <CardDescription>
            Component usage breakdown by lab. Formula: (Total Quantity Requested / Total Quantity Available) × 100. Shows how much of the available inventory has been requested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLabStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No component utilization data found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab Name</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                    <TableHead className="text-right">Times Requested</TableHead>
                    <TableHead className="text-right">Total Qty Requested</TableHead>
                    <TableHead className="text-right">Utilization %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLabStats.map((stat, index) => (
                    <TableRow key={`${stat.lab_id}-${stat.component_id}-${index}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{stat.lab_name}</div>
                          <div className="text-xs text-muted-foreground">{stat.department_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{stat.component_name}</TableCell>
                      <TableCell className="text-right">{stat.quantity_total}</TableCell>
                      <TableCell className="text-right">{stat.quantity_available}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{stat.times_requested}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{stat.total_quantity_requested}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getUtilizationColor(stat.utilization_percentage)}>
                          {stat.utilization_percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && labsWithoutComponents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Labs with No Component Requests
              </h3>
              <div className="flex flex-wrap gap-2">
                {labsWithoutComponents
                  .filter(lab => selectedLab === "all" || lab.lab_name === selectedLab)
                  .map((lab) => (
                    <Badge key={lab.lab_id} variant="outline" className="px-3 py-1">
                      {lab.lab_name} ({lab.department_name})
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Component Utilization
          </CardTitle>
          <CardDescription>
            Most used components across all labs in your department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredComponentStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No component utilization data found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Labs Using</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                    <TableHead className="text-right">Times Requested</TableHead>
                    <TableHead className="text-right">Total Qty Requested</TableHead>
                    <TableHead className="text-right">Utilization %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponentStats.map((stat, index) => (
                    <TableRow key={stat.component_id ? `comp-${stat.component_id}` : `comp-null-${stat.component_name}-${index}`}>
                      <TableCell className="font-medium">{stat.component_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{stat.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{stat.labs_count}</TableCell>
                      <TableCell className="text-right">{stat.quantity_total}</TableCell>
                      <TableCell className="text-right">{stat.quantity_available}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{stat.times_requested}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{stat.total_quantity_requested}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getUtilizationColor(stat.utilization_percentage)}>
                          {stat.utilization_percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
