"use client"

import { useEffect, useState } from "react"

export default function ResetPasswordPage() {
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get("token") || ""
    setToken(t)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return setMsg("Invalid reset link")
    if (password !== confirm) return setMsg("Passwords do not match")
    setLoading(true)
    setMsg(null)
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    })
    const data = await res.json()
    if (res.ok) setMsg("Password updated. You can now log in.")
    else setMsg(data.error || "Failed to reset password")
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Reset Password</h1>
        <input
          className="w-full rounded border p-2"
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button disabled={loading} className="w-full rounded bg-primary p-2 text-white disabled:opacity-50">
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  )
}
