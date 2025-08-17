"use client"
import { useEffect, useState } from "react"
import { ReportGenerator } from "@/components/reports/report-generator"

export default function ReportsPage() {
  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      window.location.href = "/"
      return
    }
    setUser(JSON.parse(stored))
  }, [])

  if (!user) return null

  return (
    <div className="container mx-auto p-6">
      <ReportGenerator user={user} />
    </div>
  )
}
