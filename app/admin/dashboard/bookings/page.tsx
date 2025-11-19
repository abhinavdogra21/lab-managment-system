/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"
export default function MyBookingsPage() {
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
  if (!user && typeof window !== "undefined") window.location.href = "/"
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">My Bookings</h1>
      <p className="text-sm text-muted-foreground">Coming soon: bookings list</p>
    </div>
  )
}
