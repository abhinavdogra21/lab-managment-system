import { NextResponse } from "next/server"
import { sendDigestEmail } from "@/lib/email"

// Simple endpoint that, when called (e.g., by a cron job), sends a digest email.
// In production, secure this route (auth, secret header, or cron provider's signature).
export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET
    const provided = req.headers.get("x-cron-secret")
    if (!secret || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { recipients, subject, html } = await req.json()
    if (!recipients?.length) return NextResponse.json({ error: "Recipients required" }, { status: 400 })
    await sendDigestEmail(recipients, subject || "LNMIIT Lab Digest", html || "<p>No content</p>")
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("send-digest error", e)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
