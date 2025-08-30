import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { dbOperations } from "@/lib/database"
import { sendMail } from "@/lib/mailer"

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

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`
      await sendMail({
        to: user.email,
        subject: "Reset your LNMIIT LMS password",
        html: `<p>Hello ${user.name || ""},</p><p>Click the link below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Forgot password error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
