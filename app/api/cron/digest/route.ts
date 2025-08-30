import { NextResponse } from "next/server"
import { db } from "@/lib/database"
import { sendMail } from "@/lib/mailer"

// Example digest: send unread notifications count to each active user
export async function GET() {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, COUNT(n.*) AS unread
       FROM users u
       LEFT JOIN notifications n ON n.user_id = u.id AND n.is_read = false
       WHERE u.is_active = true
       GROUP BY u.id, u.email, u.name`
    )

    await Promise.all(
      result.rows.map((r: any) =>
        sendMail({
          to: r.email,
          subject: "Your LNMIIT LMS digest",
          html: `<p>Hello ${r.name || ""},</p><p>You have ${r.unread} unread notifications.</p>`,
        })
      )
    )

    return NextResponse.json({ success: true, sent: result.rows.length })
  } catch (e) {
    console.error("Digest error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
