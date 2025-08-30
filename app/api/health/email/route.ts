import { NextResponse } from "next/server"
import { isSmtpConfigured, verifySmtp } from "@/lib/email"

export async function GET() {
  const cfg = isSmtpConfigured()
  if (!cfg.configured) return NextResponse.json({ ok: false, configured: false, details: cfg })
  const ver = await verifySmtp()
  return NextResponse.json({ ok: ver.ok, configured: true, verify: ver, details: cfg }, { status: ver.ok ? 200 : 500 })
}
