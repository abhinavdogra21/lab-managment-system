"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [strength, setStrength] = useState(0)
  const [policyMsg, setPolicyMsg] = useState<string | null>(null)

  const evaluate = (pw: string) => {
    const rules = [
      /.{8,}/, // length
      /[A-Z]/, // uppercase
      /[a-z]/, // lowercase
      /\d/, // digit
      /[^A-Za-z0-9]/, // special
    ]
    const passed = rules.reduce((acc, r) => acc + (r.test(pw) ? 1 : 0), 0)
    setStrength((passed / rules.length) * 100)
    if (!pw) setPolicyMsg(null)
    else if (passed < rules.length) setPolicyMsg("Password must be 8+ chars and include upper, lower, number, and special character.")
    else setPolicyMsg(null)
  }

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
        setTimeout(() => router.push("/?reset=1"), 1200)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-1">
            <Image src="/lnmiit-logo.png" alt="LNMIIT Logo" width={120} height={40} className="h-10 w-auto" />
          </div>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription className="text-base">Enter a strong password you will remember.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-sm text-green-600">Password updated. Redirecting…</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={pw1}
                  onChange={(e) => { setPw1(e.target.value); evaluate(e.target.value) }}
                  required
                />
                <Progress value={strength} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Must be 8+ chars with uppercase, lowercase, number, and special character.
                </p>
                {policyMsg && <p className="text-xs text-red-600">{policyMsg}</p>}
              </div>
              <Input type="password" placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
