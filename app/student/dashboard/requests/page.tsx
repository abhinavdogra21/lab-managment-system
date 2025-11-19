/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentRequestsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the actual my-requests page
    router.replace("/student/dashboard/my-requests")
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to your requests...</p>
      </div>
    </div>
  )
}
