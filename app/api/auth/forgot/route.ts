/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { dbOperations } from "@/lib/database"
// Non-password emails disabled; keep mailer import commented
// import { sendMail } from "@/lib/mailer"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const user = await dbOperations.getUserByEmail(email)
    // Always respond success to avoid email enumeration; only proceed if user exists
    if (user) {
      const token = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString() // 30 min
      await dbOperations.upsertPasswordReset(user.id, token, expiresAt)

      // Route retained for backward compatibility, but email sending is disabled here.
      // Password reset emails are handled via /api/auth/forgot-password which remains enabled.
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Forgot password error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
