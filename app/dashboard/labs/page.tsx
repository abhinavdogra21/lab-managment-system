"use client"
export default function LabsPage() {
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
  if (!user && typeof window !== "undefined") window.location.href = "/"
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Labs</h1>
      <p className="text-sm text-muted-foreground">Coming soon: department labs list</p>
    </div>
  )
}
