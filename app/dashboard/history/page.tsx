"use client"
export default function HistoryPage() {
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
  if (!user && typeof window !== "undefined") window.location.href = "/"
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">History</h1>
      <p className="text-sm text-muted-foreground">Coming soon: personal history</p>
    </div>
  )
}
