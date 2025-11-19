/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { db } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"
import crypto from "crypto"

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":")
  const hashBuffer = Buffer.from(hash, "hex")
  const saltBuffer = Buffer.from(salt, "hex")
  const newHash = crypto.scryptSync(password, saltBuffer, 64)
  return crypto.timingSafeEqual(hashBuffer, newHash)
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 })
    }

    // Enforce password policy
    const policy = [/.{8,}/, /[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/]
    const ok = policy.every((r) => r.test(newPassword))
    if (!ok) {
      return NextResponse.json({ 
        error: "Password must be 8+ characters and include uppercase, lowercase, number, and special character." 
      }, { status: 400 })
    }

    // Get current user
    const currentUser = await db.query(
      `SELECT id, name, email, password_hash FROM users WHERE id = ?`,
      [user.userId]
    )

    if (currentUser.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = currentUser.rows[0]

    // Verify current password
    if (!userData.password_hash || !verifyPassword(currentPassword, userData.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash and update new password
    const newPasswordHash = hashPassword(newPassword)
    await db.query(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [newPasswordHash, user.userId]
    )

    // Send email notification
    try {
      const emailData = emailTemplates.passwordResetSuccess({
        userName: userData.name || 'User',
        userEmail: userData.email
      })

      await sendEmail({
        to: [userData.email],
        ...emailData
      }).catch(err => console.error('Email send failed:', err))
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError)
    }

    return NextResponse.json({ 
      success: true,
      message: "Password changed successfully"
    })

  } catch (e) {
    console.error("change-password error:", e)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
