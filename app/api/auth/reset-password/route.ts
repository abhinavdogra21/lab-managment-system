import { NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import crypto from "crypto"

function hashPassword(password: string) {
  // For demo: use scrypt. In production, prefer bcrypt/argon2.
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    // Enforce password policy: 8+ length, upper, lower, number, special
    const policy = [/.{8,}/, /[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/]
    const ok = policy.every((r) => r.test(password))
    if (!ok) {
      return NextResponse.json({ error: "Password must be 8+ chars and include upper, lower, number, and special character." }, { status: 400 })
    }

    const pr = await dbOperations.getPasswordResetByToken(token)
    if (!pr) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })

  // pr.expires_at can be a MySQL DATETIME returned as Date or string; handle both without TZ shift
  const expiresMs = (() => {
    const v = pr.expires_at as any
    if (v instanceof Date) return v.getTime()
    if (typeof v === "string") return new Date(v.replace(" ", "T")).getTime()
    return Date.parse(v)
  })()
  const isExpired = Number.isFinite(expiresMs) ? expiresMs < Date.now() : true
    const alreadyUsed = !!pr.used_at
    if (isExpired || alreadyUsed) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })

    const passwordHash = hashPassword(password)
    await dbOperations.updateUserPassword(pr.user_id, passwordHash)
    await dbOperations.markPasswordResetUsed(pr.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("reset-password error", e)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
