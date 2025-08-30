import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { dbOperations } from "@/lib/database"

// Simple password hashing placeholder; replace with bcrypt/argon2 in production
function hashPassword(pwd: string) {
  return crypto.createHash("sha256").update(pwd).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json()
    if (!token || !newPassword) return NextResponse.json({ error: "Token and newPassword required" }, { status: 400 })

    const pr = await dbOperations.getPasswordResetByToken(token)
    if (!pr) return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    if (pr.used_at) return NextResponse.json({ error: "Token already used" }, { status: 400 })
    if (new Date(pr.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Token expired" }, { status: 400 })

    const hash = hashPassword(newPassword)
    await dbOperations.updateUserPassword(pr.user_id, hash)
    await dbOperations.markPasswordResetUsed(pr.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Reset password error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
