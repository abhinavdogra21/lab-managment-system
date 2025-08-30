import { NextResponse } from "next/server"
import crypto from "crypto"
import { dbOperations } from "@/lib/database"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
    if (!email.endsWith("@lnmiit.ac.in")) {
      // Keep the same response to avoid enumeration
      return NextResponse.json({ ok: true })
    }

  let user = await dbOperations.getUserByEmail(email)
    // For student onboarding: if user not found, create a minimal student account
    if (!user) {
      const local = email.split("@")[0]
      const displayName = local
        .replace(/\./g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m: string) => m.toUpperCase()) || "Student"
      const created = await dbOperations.createUser({
        email,
        passwordHash: null,
        name: displayName,
        role: "student",
        department: null,
        phone: null,
        studentId: null,
        employeeId: null,
      })
      user = created
    } else if (String(user.role) !== "student") {
      // Only students can use self-service reset; others are admin-managed
      return NextResponse.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 minutes
  await dbOperations.upsertPasswordReset(user.id, token, expiresAt)
  const hostHeader = (req.headers as any).get?.("x-forwarded-host") || (req.headers as any).get?.("host") || undefined
  const proto = (req.headers as any).get?.("x-forwarded-proto") || "http"
  const baseUrl = hostHeader ? `${proto}://${hostHeader}` : undefined
  await sendPasswordResetEmail(user.email, token, baseUrl)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("forgot-password error", e)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
