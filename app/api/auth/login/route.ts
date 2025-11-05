import { type NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { dbOperations, Database } from "@/lib/database"


export async function POST(request: NextRequest) {
  try {
    const { email, password, userRole } = await request.json()

    // Validate input
    if (!email || !password || !userRole) {
      return NextResponse.json({ error: "Email, password, and role are required" }, { status: 400 })
    }

    // Validate LNMIIT email domain
    if (!email.endsWith("@lnmiit.ac.in")) {
      return NextResponse.json({ error: "Please use your LNMIIT email address" }, { status: 400 })
    }

  // normalize role: convert hyphens to underscores and compare case-insensitively
  const normalizedRole = String(userRole).replace(/-/g, "_").toLowerCase()

    // DB-backed auth when enabled
    if (process.env.USE_DB_AUTH === "true") {
      const dbUser = await dbOperations.getUserByEmail(email)
      if (!dbUser) {
        return NextResponse.json({ error: "Invalid credentials or role" }, { status: 401 })
      }
      // Compare role (normalize hyphen/underscore differences)
      if (String(dbUser.role).toLowerCase() !== normalizedRole) {
        return NextResponse.json({ error: "Invalid credentials or role" }, { status: 401 })
      }
      // Verify password (scrypt format: salt:hash) or legacy sha256
      const stored: string | null = dbUser.password_hash || null
      if (!stored) {
        return NextResponse.json({ error: "Please set your password via the reset link" }, { status: 401 })
      }
      let ok = false
      if (stored.includes(":")) {
        const [saltHex, hashHex] = stored.split(":")
        try {
          const salt = Buffer.from(saltHex, "hex")
          const calc = crypto.scryptSync(password, salt, 64)
          ok = crypto.timingSafeEqual(Buffer.from(hashHex, "hex"), calc)
        } catch {
          ok = false
        }
      } else {
        const legacy = crypto.createHash("sha256").update(password).digest("hex")
        ok = legacy === stored
      }
      if (!ok) {
        return NextResponse.json({ error: "Invalid credentials or role" }, { status: 401 })
      }

      // Format display name with salutation for all users
      let displayName = dbUser.name
      let userSalutation = dbUser.salutation || 'none'
      
      // For HoD users, get the actual name and salutation of the person assigned as HoD for this department
      if (dbUser.role === 'hod') {
        try {
          const db = Database.getInstance()
          const result = await db.query(
            "SELECT u.name, u.salutation FROM departments d JOIN users u ON d.hod_id = u.id WHERE d.code = ?",
            [dbUser.department]
          )
          console.log("HoD name lookup result:", result.rows)
          if (result.rows.length > 0 && result.rows[0].name) {
            displayName = result.rows[0].name
            userSalutation = result.rows[0].salutation || 'none'
            console.log("Updated HoD info - name:", displayName, "salutation:", userSalutation)
          }
        } catch (error) {
          console.log("Could not fetch HoD name, using default:", error)
          // Fall back to default name if query fails
        }
      }

      const tokenPayload = {
        userId: Number.parseInt(String(dbUser.id), 10),
        email: dbUser.email,
        role: String(dbUser.role),  // Keep database role format (lab_staff) for middleware
        name: displayName,
        salutation: userSalutation,
        department: dbUser.department,
      }
      const token = encodeURIComponent(JSON.stringify(tokenPayload))
      const response = NextResponse.json({
        success: true,
        user: {
          id: String(dbUser.id),
          email: dbUser.email,
          name: displayName,
          salutation: userSalutation,
          role: String(dbUser.role).replace(/_/g, "-"),
          department: dbUser.department,
          studentId: dbUser.student_id || null,
        },
      })
      response.cookies.set("auth-token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      return response
    }

  // Fallback: Find user in mock database
    // Fallback mock lookup: normalize role in mock users too so case/hyphen differences don't block login
    const user = mockUsers.find((u) => {
      const mockRoleNorm = String(u.role).replace(/-/g, "_").toLowerCase()
      return u.email === email && u.password === password && mockRoleNorm === normalizedRole
    })
    if (!user) return NextResponse.json({ error: "Invalid credentials or role" }, { status: 401 })

  // Create encoded session payload and set as httpOnly cookie for API auth (demo only)
  const tokenPayload = {
      userId: Number.parseInt(user.id, 10),
      email: user.email,
      role: normalizedRole,  // Use normalized role (lab_staff) for middleware compatibility
      name: user.name,
      department: user.department,
    }

  const token = encodeURIComponent(JSON.stringify(tokenPayload))

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        studentId: user.studentId || null,
      },
    })

    // Secure cookie flags vary by env; keeping lax for local dev
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
