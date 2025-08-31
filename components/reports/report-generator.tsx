"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import {
  FileText,
  Download,
  CalendarIcon,
  Filter,
  BarChart3,
  Users,
  Package,
  BookOpen,
  Building,
  Briefcase,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface ReportGeneratorProps {
  user: User
}

/**
 * ReportGenerator Component
 *
 * Comprehensive report generation system with:
 * - Role-based report types
 * - Date range selection
 * - Multiple export formats (PDF, Excel)
 * - Advanced filtering options
 * - Real-time preview
 */
export function ReportGenerator({ user }: ReportGeneratorProps) {
  const [selectedReportType, setSelectedReportType] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedFormat, setSelectedFormat] = useState("pdf")
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [isGenerating, setIsGenerating] = useState(false)

  // Get available report types based on user role
  const getReportTypes = (role: string) => {
    const baseReports = [
      {
        id: "activity_summary",
        name: "Activity Summary",
        icon: BarChart3,
        description: "Overview of recent activities",
      },
    ]

    switch (role) {
      case "student":
        return [
          ...baseReports,
          {
            id: "personal_history",
            name: "Personal History",
            icon: FileText,
            description: "Complete history of requests and bookings",
          },
          {
            id: "item_requests",
            name: "Item Requests Report",
            icon: Package,
            description: "All item requests and their status",
          },
        ]

      case "faculty":
        return [
          ...baseReports,
          {
            id: "supervised_items",
            name: "Supervised Items",
            icon: Package,
            description: "Items supervised and their status",
          },
          {
            id: "lab_bookings",
            name: "Lab Bookings Report",
            icon: BookOpen,
            description: "All lab bookings and sessions",
          },
          {
            id: "student_approvals",
            name: "Student Approvals",
            icon: Users,
            description: "Approved/rejected student requests",
          },
        ]

      case "lab-staff":
        return [
          ...baseReports,
          {
            id: "inventory_report",
            name: "Inventory Report",
            icon: Package,
            description: "Current inventory status and utilization",
          },
          {
            id: "attendance_report",
            name: "Attendance Report",
            icon: Users,
            description: "Student attendance records",
          },
          {
            id: "marks_report",
            name: "Marks Report",
            icon: FileText,
            description: "Student marks and assessments",
          },
          {
            id: "issue_return_log",
            name: "Issue/Return Log",
            icon: Package,
            description: "Complete log of item issues and returns",
          },
        ]

      case "hod":
        return [
          ...baseReports,
          {
            id: "department_overview",
            name: "Department Overview",
            icon: Building,
            description: "Complete department statistics and utilization",
          },
          {
            id: "lab_utilization",
            name: "Lab Utilization Report",
            icon: BarChart3,
            description: "Lab usage statistics and trends",
          },
          {
            id: "faculty_performance",
            name: "Faculty Performance",
            icon: Users,
            description: "Faculty activity and performance metrics",
          },
          {
            id: "resource_allocation",
            name: "Resource Allocation",
            icon: Package,
            description: "Resource distribution and efficiency",
          },
        ]

      case "admin":
        return [
          ...baseReports,
          {
            id: "system_overview",
            name: "System Overview",
            icon: BarChart3,
            description: "Complete system statistics and health",
          },
          {
            id: "user_management",
            name: "User Management Report",
            icon: Users,
            description: "User activities and system access",
          },
          {
            id: "cross_department",
            name: "Cross-Department Analysis",
            icon: Building,
            description: "Comparative analysis across departments",
          },
          {
            id: "security_audit",
            name: "Security Audit Report",
            icon: FileText,
            description: "Security events and system access logs",
          },
        ]

      case "tnp":
        return [
          ...baseReports,
          {
            id: "placement_statistics",
            name: "Placement Statistics",
            icon: Briefcase,
            description: "Placement rates and company statistics",
          },
          {
            id: "event_summary",
            name: "Event Summary",
            icon: CalendarIcon,
            description: "Placement events and their outcomes",
          },
          {
            id: "company_feedback",
            name: "Company Feedback",
            icon: FileText,
            description: "Feedback from recruiting companies",
          },
        ]

      default:
        return baseReports
    }
  }

  const reportTypes = getReportTypes(user.role)

  // Get filter options based on selected report type
  const getFilterOptions = (reportType: string) => {
    switch (reportType) {
      case "lab_utilization":
      case "department_overview":
        return [
          { id: "lab", label: "Lab", type: "select", options: ["CP1", "CP2", "CP3", "CP4", "CP5", "CMLBDA"] },
          { id: "department", label: "Department", type: "select", options: ["CSE", "ECE", "MME", "CCE"] },
        ]

      case "inventory_report":
        return [
          { id: "category", label: "Item Category", type: "select", options: ["Electronics", "Tools", "Computers"] },
          { id: "status", label: "Status", type: "select", options: ["Available", "Issued", "Maintenance"] },
        ]

      case "attendance_report":
      case "marks_report":
        return [
          { id: "course", label: "Course", type: "select", options: ["DSA Lab", "DBMS Lab", "OS Lab"] },
          { id: "semester", label: "Semester", type: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8"] },
        ]

      case "placement_statistics":
        return [
          { id: "company", label: "Company", type: "select", options: ["TCS", "Infosys", "Microsoft", "Google"] },
          { id: "package_range", label: "Package Range", type: "select", options: ["0-5 LPA", "5-10 LPA", "10+ LPA"] },
        ]

      default:
        return []
    }
  }

  const filterOptions = getFilterOptions(selectedReportType)

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      alert("Please select a report type")
      return
    }

    setIsGenerating(true)

    // Build a small dataset snapshot for the export
    const payload = {
      type: selectedReportType,
      format: selectedFormat,
      from: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      to: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      filters,
      generatedAt: new Date().toISOString(),
      requestedBy: { name: user.name, email: user.email, role: user.role, department: user.department },
    }

    try {
      const fileBase = `${selectedReportType}_${format(new Date(), "yyyy-MM-dd")}`
      if (selectedFormat === "excel") {
        // Create a basic CSV for now (Excel-friendly)
        const rows: string[] = []
        rows.push("Key,Value")
        rows.push(`Type,${payload.type}`)
        rows.push(`From,${payload.from || ""}`)
        rows.push(`To,${payload.to || ""}`)
        rows.push(`Generated At,${payload.generatedAt}`)
        rows.push(`Requested By,${payload.requestedBy.name} (${payload.requestedBy.email})`)
        Object.entries(filters).forEach(([k, v]) => rows.push(`${k},${String(v)}`))
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `${fileBase}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
      } else {
        // PDF export using a tiny client-side generator
        const { jsPDF } = await import("jspdf")
        const doc = new jsPDF()
        doc.setFontSize(12)
        doc.text("LNMIIT Lab Management System", 14, 16)
        doc.setFontSize(10)
        doc.text(`Report: ${payload.type}`, 14, 24)
        doc.text(`Generated: ${new Date(payload.generatedAt).toLocaleString()}`, 14, 30)
        if (payload.from || payload.to) doc.text(`Range: ${payload.from || ""} to ${payload.to || ""}`, 14, 36)
        doc.text(`Requested by: ${payload.requestedBy.name} (${payload.requestedBy.role})`, 14, 42)
        doc.text("Filters:", 14, 50)
        let y = 56
        const entries = Object.entries(filters)
        if (entries.length === 0) {
          doc.text("(none)", 20, y)
          y += 6
        } else {
          for (const [k, v] of entries) {
            doc.text(`${k}: ${String(v)}`, 20, y)
            y += 6
            if (y > 280) {
              doc.addPage(); y = 16
            }
          }
        }

        doc.save(`${fileBase}.pdf`)
      }
    } catch (e) {
      console.error("Report export failed", e)
      alert("Failed to generate the report. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedReport = reportTypes.find((report) => report.id === selectedReportType)

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-foreground">Report Generator</h1>
        <p className="text-muted-foreground">Generate comprehensive reports based on your role and requirements</p>
      </div>

  <div className="grid gap-6 lg:grid-cols-3 max-w-full">
        {/* Report Configuration */}
  <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Report Type
              </CardTitle>
              <CardDescription>Choose the type of report you want to generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {reportTypes.map((report) => (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-colors ${
                      selectedReportType === report.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedReportType(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <report.icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{report.name}</h4>
                          <p className="text-xs text-muted-foreground">{report.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Date Range
              </CardTitle>
              <CardDescription>Select the time period for your report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start" side="bottom" avoidCollisions={false}>
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start" side="bottom" avoidCollisions={false}>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    setDateRange({ from: lastWeek, to: today })
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    setDateRange({ from: lastMonth, to: today })
                  }}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const startOfYear = new Date(today.getFullYear(), 0, 1)
                    setDateRange({ from: startOfYear, to: today })
                  }}
                >
                  This Year
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          {filterOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Customize your report with specific filters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {filterOptions.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <Label>{filter.label}</Label>
                      {filter.type === "select" && (
                        <Select
                          value={filters[filter.id] || "All"}
                          onValueChange={(value) => setFilters({ ...filters, [filter.id]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            {filter.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Format
              </CardTitle>
              <CardDescription>Choose your preferred export format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Card
                  className={`cursor-pointer transition-colors ${
                    selectedFormat === "pdf" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedFormat("pdf")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div>
                        <h4 className="font-medium">PDF Report</h4>
                        <p className="text-sm text-muted-foreground">Professional formatted document</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    selectedFormat === "excel" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedFormat("excel")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="font-medium">Excel Spreadsheet</h4>
                        <p className="text-sm text-muted-foreground">Data analysis and manipulation</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview/Summary */}
  <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>Preview of your report configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedReport ? (
                <>
                  <div>
                    <Label className="text-sm font-medium">Report Type</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReport.name}</p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Date Range</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                        : "No date range selected"}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Export Format</Label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedFormat}</p>
                  </div>

                  {Object.keys(filters).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">Applied Filters</Label>
                        <div className="mt-2 space-y-1">
                          {Object.entries(filters).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Generated By</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.name} ({user.role})
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a report type to see the summary</p>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedReportType || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Lab Utilization Report", date: "Jan 15, 2024", format: "PDF" },
                { name: "Attendance Report", date: "Jan 12, 2024", format: "Excel" },
                { name: "Activity Summary", date: "Jan 10, 2024", format: "PDF" },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {report.format}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
