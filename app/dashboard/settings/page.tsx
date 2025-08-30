"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  const [ready, setReady] = useState(false)
  const [systemName, setSystemName] = useState("LNMIIT Lab Management")
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [smtpHost, setSmtpHost] = useState("smtp.example.com")
  const [fromEmail, setFromEmail] = useState("noreply@example.com")

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      window.location.href = "/"
      return
    }
    // Load saved settings if any
    const saved = localStorage.getItem("settings")
    if (saved) {
      const s = JSON.parse(saved)
      setSystemName(s.systemName || systemName)
      setSessionTimeout(s.sessionTimeout || sessionTimeout)
      setSmtpHost(s.smtpHost || smtpHost)
      setFromEmail(s.fromEmail || fromEmail)
    }
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">System Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">System Name</label>
            <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Session Timeout (minutes)</label>
            <Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">SMTP Host</label>
            <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">From Email</label>
            <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={() => {
                localStorage.setItem(
                  "settings",
                  JSON.stringify({ systemName, sessionTimeout, smtpHost, fromEmail })
                )
                alert("Settings saved locally.")
              }}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
