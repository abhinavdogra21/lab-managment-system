"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("student")
  const [name, setName] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, name: role === "student" ? name : undefined }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to send reset link")
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Image src="/lnmiit-logo.png" alt="LNMIIT Logo" width={120} height={40} className="h-10 w-auto" />
          </div>
          <CardTitle className="text-3xl">Forgot password</CardTitle>
          <CardDescription className="text-base">Enter your LNMIIT email and select your user type to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">We've sent a reset link to your email.</p>
              <p className="text-xs text-muted-foreground">Didn't get it? Check spam or try again.</p>
              <Button variant="link" className="mt-2" onClick={() => (window.location.href = "/")}>Back to login</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="your.email@lnmiit.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">Use your @lnmiit.ac.in address.</p>
              </div>
              {role === "student" && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={role === "student"}
                  />
                  <p className="text-sm text-muted-foreground">We'll create your student account with this name.</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-base font-medium">User type</label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="hod">HOD</option>
                  <option value="lab_staff">Lab Staff</option>
                  <option value="tnp">T&P</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => (window.location.href = "/")}>Back to login</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
