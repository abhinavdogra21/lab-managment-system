"use client"

import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
      
      if (!user) {
        // No user data, redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/"
        }
        return
      }

      try {
        const parsed = JSON.parse(user)
        const role = parsed?.role ? String(parsed.role).replace(/_/g, "-") : null

        if (!role) {
          // No valid role, redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
          return
        }

        // Redirect to role-specific dashboard
        const roleMapping: Record<string, string> = {
                    "admin": "/admin/dashboard",
          "hod": "/hod/dashboard", 
          "faculty": "/faculty/dashboard",
          "lab_staff": "/lab-staff/dashboard",
          "lab-staff": "/lab-staff/dashboard",
          "student": "/student/dashboard",
          "others": "/others/dashboard",
          "non_teaching": "/non-teaching/dashboard",
          "non-teaching": "/non-teaching/dashboard"
        }

        const dashboardPath = roleMapping[role]
        
        if (dashboardPath && typeof window !== "undefined") {
          window.location.href = dashboardPath
        } else {
          // Unknown role, redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
        }
      } catch (error) {
        // Invalid user data, redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/"
        }
      }
    }

    checkAuthAndRedirect()
    setAuthChecked(true)
  }, [])

  // Show loading state while checking auth and redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
