"use client"
export default function SettingsPage() {
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
  if (!user && typeof window !== "undefined") window.location.href = "/"
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">System Settings</h1>
      <p className="text-sm text-muted-foreground">Coming soon: system settings</p>
    </div>
  )
}
