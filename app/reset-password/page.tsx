"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [noToken, setNoToken] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get("token")
    if (t) {
      // Normalize to the dynamic route
      router.replace(`/reset-password/${t}`)
    } else {
      setNoToken(true)
    }
  }, [router])

  if (!noToken) return null
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-muted-foreground">Missing token. Please use the link from your email.</p>
      </div>
    </div>
  )
}
