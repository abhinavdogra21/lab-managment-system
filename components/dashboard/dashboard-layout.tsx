"use client"
import React, { ReactNode, useState } from "react"
import { DashboardHeader } from "./dashboard-header"
import { DashboardSidebar } from "./dashboard-sidebar"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface DashboardLayoutProps { user: User; children?: ReactNode }

/**
 * DashboardLayout Component
 *
 * Main dashboard container with header and sidebar.
 * Role-specific content is provided by the route's page component (children).
 */
export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
        {/* Header */}
        <DashboardHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  )
}
