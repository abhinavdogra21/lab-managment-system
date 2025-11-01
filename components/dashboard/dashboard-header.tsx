"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Settings, LogOut } from "lucide-react"

interface DashboardHeaderProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    department: string
  }
  onMenuClick: () => void
}

/**
 * DashboardHeader Component
 *
 * Top navigation bar with LNMIIT branding, notifications, and user menu
 * Responsive design with mobile menu toggle
 */
export function DashboardHeader({ user, onMenuClick }: DashboardHeaderProps) {
  const router = useRouter()
  
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      student: "Student",
      faculty: "Faculty",
      "lab-staff": "Lab Staff",
      hod: "Head of Department",
      admin: "Administrator",
      tnp: "Training & Placement",
    }
    return roleMap[role] || role
  }

  const getSettingsPath = (role: string) => {
    const roleMap: Record<string, string> = {
      student: "/student/dashboard/settings",
      faculty: "/faculty/dashboard/settings",
      "lab-staff": "/lab-staff/dashboard/settings",
      "lab_staff": "/lab-staff/dashboard/settings",
      hod: "/hod/dashboard/settings",
      admin: "/admin/dashboard/settings",
      tnp: "/tnp/dashboard/settings",
      "non-teaching": "/non-teaching/dashboard/settings",
      "non_teaching": "/non-teaching/dashboard/settings",
    }
    return roleMap[role] || "/dashboard/settings"
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      localStorage.removeItem("user")
      window.location.href = "/"
    } catch (error) {
      console.error("Logout error:", error)
      // Still redirect even if API call fails
      localStorage.removeItem("user")
      window.location.href = "/"
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left Section - Menu and Logo */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Image src="/lnmiit-logo.png" alt="LNMIIT" width={120} height={40} className="h-8 w-auto" />
          <div className="hidden md:block">
            <h1 className="font-montserrat text-lg font-semibold text-foreground">Lab Management System</h1>
          </div>
        </div>
      </div>

      {/* Right Section - User Menu */}
      <div className="flex items-center gap-4">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {getRoleDisplayName(user.role)} • {user.department}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(getSettingsPath(user.role))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
