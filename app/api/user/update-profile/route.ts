import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { db } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await req.json()
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Get current user details
    const currentUser = await db.query(
      `SELECT name, email FROM users WHERE id = ?`,
      [user.userId]
    )

    if (currentUser.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const oldName = currentUser.rows[0].name

    // Update name
    await db.query(
      `UPDATE users SET name = ? WHERE id = ?`,
      [name.trim(), user.userId]
    )

    // Send email notification
    try {
      const emailData = {
        subject: 'Profile Updated - LNMIIT Lab Management',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">✏️ Profile Updated</h2>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p><strong>Your profile has been updated successfully.</strong></p>
              <p><strong>Previous Name:</strong> ${oldName}</p>
              <p><strong>New Name:</strong> ${name.trim()}</p>
              <p><strong>Update Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If you did not make this change, please contact the administrator immediately.</p>
            </div>
          </div>
        `
      }

      await sendEmail({
        to: [currentUser.rows[0].email],
        ...emailData
      }).catch(err => console.error('Email send failed:', err))
    } catch (emailError) {
      console.error('Failed to send profile update notification:', emailError)
    }

    return NextResponse.json({ 
      success: true,
      message: "Profile updated successfully",
      name: name.trim()
    })

  } catch (e) {
    console.error("update-profile error:", e)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
