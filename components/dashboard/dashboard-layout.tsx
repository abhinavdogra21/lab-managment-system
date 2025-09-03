"use client"
import { ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { StudentDashboard } from "./student-dashboard"
import { FacultyDashboard } from "./faculty-dashboard"
import { LabStaffDashboard } from "./lab-staff-dashboard"
import { HODDashboard } from "./hod-dashboard"
import { AdminDashboard } from "./admin-dashboard"
import { TNPDashboard } from "./tnp-dashboard"
import { DashboardHeader } from "./dashboard-header"
import { DashboardSidebar } from "./dashboard-sidebar"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface DashboardLayoutProps {
  user: User
  children?: ReactNode
}

/**
 * DashboardLayout Component
 *
 * Main dashboard container that renders appropriate dashboard based on user role
 * Includes header, sidebar, and role-specific content
 *
 * Supported roles: student, faculty, lab-staff, hod, admin, tnp
 */
export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Redirect bare /dashboard to role-scoped URL for clarity if a role prefix is not present
  useEffect(() => {
    if (!pathname) return
    const rolePrefix = pathname.match(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?:\/|$)/)?.[1]
    if (!rolePrefix && pathname === "/dashboard") {
      // Navigate to role-prefixed dashboard home
      const prefix = `/${user.role}`
      router.replace(`${prefix}/dashboard`)
    }
  }, [pathname, router, user.role])

  // Normalize path for deciding whether to render role dashboard or page children
  const normalizedPath = pathname?.replace(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?=\/)/, "") || pathname || ""
  const isDashboardHome = normalizedPath === "/dashboard" || normalizedPath === "/dashboard/"

  const renderDashboard = () => {
    switch (user.role) {
      case "student":
        return <StudentDashboard user={user} />
      case "faculty":
        return <FacultyDashboard user={user} />
      case "lab-staff":
        return <LabStaffDashboard user={user} />
      case "hod":
        return <HODDashboard user={user} />
      case "admin":
        return <AdminDashboard user={user} />
      case "tnp":
        return <TNPDashboard user={user} />
      default:
        return <div>Invalid user role</div>
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
        {/* Header */}
        <DashboardHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

  {/* Dashboard Content */}
  <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">{isDashboardHome ? renderDashboard() : children}</main>
      </div>
    </div>
  )
}
