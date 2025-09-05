"use client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Calendar,
  Package,
  Users,
  FileText,
  Settings,
  BarChart3,
  BookOpen,
  ClipboardList,
  UserCheck,
  Building,
  X,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface DashboardSidebarProps {
  user: User
  isOpen: boolean
  onClose: () => void
}

/**
 * DashboardSidebar Component
 *
 * Navigation sidebar with role-based menu items
 * Responsive design with mobile sheet overlay
 */
export function DashboardSidebar({ user, isOpen, onClose }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Compute optional role prefix from current URL (e.g., /admin, /student)
  const roleMatch = pathname?.match(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?:\/|$)/)
  const prefix = roleMatch ? `/${roleMatch[1]}` : ""

  const withPrefix = (p: string) => `${prefix}${p}`

  const getNavigationItems = (role: string) => {
    const baseItems = [{ name: "Dashboard", href: withPrefix("/dashboard"), icon: Home }]

    switch (role) {
      case "student":
        return [
          ...baseItems,
          { name: "Book Lab", href: withPrefix("/dashboard/book-lab"), icon: Calendar },
          { name: "My Requests", href: withPrefix("/dashboard/my-requests"), icon: Package },
        ]

      case "faculty":
        return [
          ...baseItems,
          { name: "Book Labs", href: withPrefix("/dashboard/book-labs"), icon: Calendar },
          { name: "Approve Requests", href: withPrefix("/dashboard/approve"), icon: UserCheck },
          { name: "My Bookings", href: withPrefix("/dashboard/bookings"), icon: BookOpen },
          { name: "Reports", href: withPrefix("/dashboard/reports"), icon: BarChart3 },
        ]

      case "lab-staff":
        return [
          ...baseItems,
          { name: "Review Requests", href: withPrefix("/dashboard/approve"), icon: UserCheck },
          { name: "Inventory", href: withPrefix("/dashboard/inventory"), icon: Package },
          { name: "Issue/Return", href: withPrefix("/dashboard/issue-return"), icon: ClipboardList },
          { name: "Attendance", href: withPrefix("/dashboard/attendance"), icon: UserCheck },
          { name: "Reports", href: withPrefix("/dashboard/reports"), icon: BarChart3 },
        ]

      case "hod":
        return [
          ...baseItems,
          { name: "Department Labs", href: withPrefix("/dashboard/labs"), icon: Building },
          { name: "Approvals", href: withPrefix("/dashboard/approvals"), icon: UserCheck },
          { name: "Reports", href: withPrefix("/dashboard/reports"), icon: BarChart3 },
          { name: "Analytics", href: withPrefix("/dashboard/analytics"), icon: BarChart3 },
        ]

      case "admin":
        return [
          ...baseItems,
          { name: "User Management", href: "/admin/users", icon: Users },
          { name: "Department and Lab Management", href: "/admin/dashboard/department-and-lab-management", icon: Building },
          { name: "Timetable", href: "/admin/dashboard/timetable", icon: Calendar },
          { name: "System Logs", href: withPrefix("/dashboard/logs"), icon: FileText },
          { name: "Reports", href: withPrefix("/dashboard/reports"), icon: BarChart3 },
          { name: "Analytics", href: withPrefix("/dashboard/analytics"), icon: BarChart3 },
        ]

      case "tnp":
        return [
          ...baseItems,
          { name: "Book Labs", href: withPrefix("/dashboard/book-labs"), icon: Calendar },
          { name: "Placement Events", href: withPrefix("/dashboard/events"), icon: Calendar },
          { name: "Reports", href: withPrefix("/dashboard/reports"), icon: BarChart3 },
        ]

      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems(user.role)

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="font-montserrat text-lg font-semibold">Navigation</h2>
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            // Normalize for active match across prefixed and non-prefixed URLs
            const normalized = pathname?.replace(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?=\/)/, "") || ""
            const itemPath = item.href.replace(prefix, "")
            const isDashboardRoot = itemPath === "/dashboard" || item.href === "/admin/users"
            const isExact = normalized === itemPath
            const isPrefix = normalized.startsWith(itemPath + "/")
            const active = item.href === "/admin/users" ? pathname === "/admin/users" : (isDashboardRoot ? isExact : (isExact || isPrefix))
            return (
              <Button
              key={item.name}
              variant={active ? "default" : "ghost"}
              className={`w-full justify-start gap-3 text-left overflow-hidden h-auto py-2 items-start ${active ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                router.push(item.href)
                onClose()
              }}
            >
              <item.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? 'text-primary-foreground' : ''}`} />
              <span className="flex-1 whitespace-normal break-words leading-snug">{item.name}</span>
            </Button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - fixed */}
      <div className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-border bg-card z-30">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
  <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
