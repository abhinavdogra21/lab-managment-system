"use client"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  studentId?: string
}

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        setUser(JSON.parse(userData))
      } else {
        window.location.href = "/"
      }
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <DashboardLayout user={user}>{children}</DashboardLayout>
}
