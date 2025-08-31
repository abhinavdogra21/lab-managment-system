"use client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useRouter } from "next/navigation"
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

  const getNavigationItems = (role: string) => {
    const baseItems = [{ name: "Dashboard", href: "/dashboard", icon: Home }]

    switch (role) {
      case "student":
        return [
          ...baseItems,
          { name: "Request Items", href: "/dashboard/requests", icon: Package },
          { name: "My Bookings", href: "/dashboard/bookings", icon: Calendar },
          { name: "History", href: "/dashboard/history", icon: FileText },
        ]

      case "faculty":
        return [
          ...baseItems,
          { name: "Book Labs", href: "/dashboard/book-labs", icon: Calendar },
          { name: "Approve Requests", href: "/dashboard/approve", icon: UserCheck },
          { name: "My Bookings", href: "/dashboard/bookings", icon: BookOpen },
          { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        ]

      case "lab-staff":
        return [
          ...baseItems,
          { name: "Inventory", href: "/dashboard/inventory", icon: Package },
          { name: "Issue/Return", href: "/dashboard/issue-return", icon: ClipboardList },
          { name: "Attendance", href: "/dashboard/attendance", icon: UserCheck },
          { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        ]

      case "hod":
        return [
          ...baseItems,
          { name: "Department Labs", href: "/dashboard/labs", icon: Building },
          { name: "Approvals", href: "/dashboard/approvals", icon: UserCheck },
          { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
          { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        ]

      case "admin":
        return [
          ...baseItems,
          { name: "User Management", href: "/dashboard/users", icon: Users },
          { name: "Organization", href: "/dashboard/organization", icon: Building },
          { name: "All Labs", href: "/dashboard/labs", icon: Building },
          { name: "System Settings", href: "/dashboard/settings", icon: Settings },
          { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
          { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        ]

      case "tnp":
        return [
          ...baseItems,
          { name: "Book Labs", href: "/dashboard/book-labs", icon: Calendar },
          { name: "Placement Events", href: "/dashboard/events", icon: Calendar },
          { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
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
          {navigationItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start gap-3 text-left"
              onClick={() => {
                router.push(item.href)
                onClose()
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden w-64 border-r border-border bg-card md:block">
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
