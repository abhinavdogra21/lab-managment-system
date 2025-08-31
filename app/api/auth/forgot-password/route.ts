import { NextResponse } from "next/server"
import crypto from "crypto"
import { dbOperations } from "@/lib/database"
import { sendPasswordResetEmail } from "@/lib/email"

// New behavior:
// - Do NOT auto-create users
// - Allow all roles to request a reset
// - Return 404 if email is not found (explicit "no such user")
function isLikelyStudentEmail(email: string) {
  // Heuristic for LNMIIT student emails, e.g., 21ucs001@lnmiit.ac.in, 21uec123@...
  // Assumption: two digits + three lowercase letters + three digits
  return /^\d{2}[a-z]{3}\d{3}@lnmiit\.ac\.in$/.test(email)
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
    if (!email.endsWith("@lnmiit.ac.in")) {
      return NextResponse.json({ error: "Please use your LNMIIT email" }, { status: 400 })
    }

    let user = await dbOperations.getUserByEmail(email)
    if (!user) {
      // Auto-create only for student emails
      if (isLikelyStudentEmail(email)) {
        const local = email.split("@")[0]
        const displayName = local
          .replace(/\./g, " ")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (m: string) => m.toUpperCase()) || "Student"
        user = await dbOperations.createUser({
          email,
          passwordHash: null,
          name: displayName,
          role: "student",
          department: null,
          phone: null,
          studentId: null,
          employeeId: null,
        })
      } else {
        return NextResponse.json({ error: "No such user exists" }, { status: 404 })
      }
    }

    const token = crypto.randomBytes(32).toString("hex")
    // DB layer sets 60m expiry; expiresAt argument is unused but kept for clarity
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
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
