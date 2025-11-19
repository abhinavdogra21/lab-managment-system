/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"

/**
 * LoginForm Component
 *
 * Provides authentication interface for LNMIIT Lab Management System
 * Supports multiple user roles: Student, Faculty, Lab Staff, HoD, Admin, Others
 *
 * Features:
 * - Role-based login selection
 * - Email validation for @lnmiit.ac.in domain
 * - Password visibility toggle
 * - Clean, professional UI matching LNMIIT branding
 */
export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userRole, setUserRole] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const u = new URL(window.location.href)
    if (u.searchParams.get("reset") === "1") {
      setResetSuccess(true)
      // clear flag from URL without a navigation
      u.searchParams.delete("reset")
      window.history.replaceState({}, "", u.toString())
    }
  }, [])

  // User roles available in the system
  const userRoles = [
    { value: "admin", label: "Administrator" },
    { value: "lab-staff", label: "Lab Staff" },
    { value: "faculty", label: "Faculty" },
    { value: "hod", label: "Head of Department (HoD)" },
    { value: "lab-coordinator", label: "Lab Coordinator" },
    { value: "student", label: "Student" },
    { value: "others", label: "Others" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate email domain for LNMIIT
    if (!email.endsWith("@lnmiit.ac.in")) {
      alert("Please use your LNMIIT email address (@lnmiit.ac.in)")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          userRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user data in localStorage for client-side access
        localStorage.setItem("user", JSON.stringify(data.user))

        // Redirect to role-scoped dashboard
        const role = data?.user?.role || ""
        const target = role ? `/${role}/dashboard` : "/"
        window.location.href = target
      } else {
        alert(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!email) {
      alert("Enter your LNMIIT email first")
      return
    }
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        alert("Reset link sent.")
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to send reset link")
      }
    } catch (e) {
      console.error(e)
      alert("Failed to send reset link")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* LNMIIT Logo and Header */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <Image
              src="/lnmiit-logo.png"
              alt="LNMIIT Logo"
              width={300}
              height={120}
              className="h-auto w-auto max-w-[280px]"
              priority
            />
          </div>
          <h1 className="font-montserrat text-3xl font-bold text-foreground">Lab Management System</h1>
          <p className="mt-2 text-base text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        {/* Reset success banner */}
        {resetSuccess && (
          <div className="mx-auto max-w-md">
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Password updated. You can now sign in with your new password.
            </div>
          </div>
        )}

        {/* Login Form Card */}
        <Card className="border-border bg-card shadow-lg">
          {/* Header removed per requirement (no "Welcome Back")} */}
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="font-medium">
                  <User className="mr-2 inline h-4 w-4" />
                  Select Your Role
                </Label>
                <Select value={userRole} onValueChange={setUserRole} required>
                  <SelectTrigger id="role" className="h-11">
                    <SelectValue placeholder="Choose your role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@lnmiit.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium">
                  <Lock className="mr-2 inline h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="h-11 w-full bg-primary font-medium hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              {/* Forgot Password Link */}
                <div className="text-center">
                  <Button type="button" variant="link" className="text-sm text-secondary hover:text-secondary/80" onClick={() => (window.location.href = "/forgot-password")}>Forgot your password?</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2025 The LNM Institute of Information Technology</p>
          <p className="mt-1">Lab Management System v1.0</p>
        </div>
      </div>
    </div>
  )
}
