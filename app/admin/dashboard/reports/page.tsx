/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"
import { useEffect, useState } from "react"
import { ReportGenerator } from "./components/report-generator"

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
    <div className="mx-auto w-full max-w-7xl p-6 overflow-x-hidden">
      <ReportGenerator user={user} />
    </div>
  )
}
