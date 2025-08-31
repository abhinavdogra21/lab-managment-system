import { NextResponse } from "next/server"
import crypto from "crypto"
import { dbOperations } from "@/lib/database"
import { sendPasswordResetEmail } from "@/lib/email"

// Helper: basic email sanity and student detection fallback if client role missing
function isLikelyStudentEmail(email: string) {
  return /^\d{2}[a-z]{3}\d{3}@lnmiit\.ac\.in$/.test(email)
}

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
    if (!email.endsWith("@lnmiit.ac.in")) {
      return NextResponse.json({ error: "Please use your LNMIIT email" }, { status: 400 })
    }

    let user = await dbOperations.getUserByEmail(email)
    if (!user) {
      const requestedRole = String(role || "").toLowerCase()
      const treatAsStudent = requestedRole === "student" || (!requestedRole && isLikelyStudentEmail(email))
      if (treatAsStudent) {
        // Auto-create student record
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
        // For non-student roles, require existing user
        return NextResponse.json({ error: "No such user exists" }, { status: 404 })
      }
    } else if (role && String(user.role) !== String(role)) {
      // Optional: guard mismatch between selected role and actual user role
      // This prevents someone selecting 'student' for a faculty email, etc.
      return NextResponse.json({ error: "User role mismatch" }, { status: 400 })
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
