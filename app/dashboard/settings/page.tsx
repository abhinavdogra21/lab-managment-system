"use client"
export default function SettingsPage() {
  if (typeof window !== "undefined") {
    const path = window.location.pathname
    const roleMatch = path.match(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?:\/|$)/)
    const prefix = roleMatch ? `/${roleMatch[1]}` : ""
    window.location.replace(`${prefix}/dashboard`)
  }
  return null
}
