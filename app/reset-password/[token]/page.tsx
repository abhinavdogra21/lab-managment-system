"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pw1 !== pw2) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw1 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Reset failed")
      } else {
        setSuccess(true)
        setTimeout(() => router.push("/"), 1200)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Enter a strong password you will remember.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-sm text-green-600">Password updated. Redirecting…</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Input type="password" placeholder="New password" value={pw1} onChange={(e) => setPw1(e.target.value)} required />
              <Input type="password" placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
