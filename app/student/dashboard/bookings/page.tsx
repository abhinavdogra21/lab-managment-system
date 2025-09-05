"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentBookingsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the book lab page
    router.replace("/student/dashboard/book-lab")
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to lab booking...</p>
      </div>
    </div>
  )
}
