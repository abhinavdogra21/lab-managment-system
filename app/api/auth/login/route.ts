import { type NextRequest, NextResponse } from "next/server"
// Using a simple encoded JSON cookie for auth in this demo environment

// Mock user database for testing
const mockUsers = [
  {
    id: "1",
    email: "admin@lnmiit.ac.in",
    password: "admin123",
    name: "System Administrator",
    role: "admin",
    department: "IT",
  },
  {
    id: "2",
    email: "hod.cse@lnmiit.ac.in",
    password: "admin123",
    name: "Dr. Rajesh Kumar",
    role: "hod",
    department: "CSE",
  },
  {
    id: "7",
    email: "hod.ece@lnmiit.ac.in",
    password: "admin123",
    name: "Dr. Priya Sharma",
    role: "hod",
    department: "ECE",
  },
  {
    id: "3",
    email: "faculty1@lnmiit.ac.in",
    password: "admin123",
    name: "Prof. Amit Singh",
    role: "faculty",
    department: "CSE",
  },
  {
    id: "8",
    email: "faculty2@lnmiit.ac.in",
    password: "admin123",
    name: "Dr. Neha Gupta",
    role: "faculty",
    department: "ECE",
  },
  {
    id: "4",
    email: "labstaff1@lnmiit.ac.in",
    password: "admin123",
    name: "Mr. Suresh Patel",
    role: "lab-staff",
    department: "CSE",
  },
  {
    id: "9",
    email: "labstaff2@lnmiit.ac.in",
    password: "admin123",
    name: "Ms. Kavita Jain",
    role: "lab-staff",
    department: "ECE",
  },
  {
    id: "5",
    email: "21ucs001@lnmiit.ac.in",
    password: "admin123",
    name: "Rahul Agarwal",
    role: "student",
    department: "CSE",
    studentId: "21UCS001",
  },
  {
    id: "10",
    email: "21uec001@lnmiit.ac.in",
    password: "admin123",
    name: "Priyanka Mehta",
    role: "student",
    department: "ECE",
    studentId: "21UEC001",
  },
  {
    id: "6",
    email: "tnp@lnmiit.ac.in",
    password: "admin123",
    name: "T&P Officer",
    role: "tnp",
    department: "T&P",
  },
]

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

    // Find user in mock database
    const user = mockUsers.find((u) => u.email === email && u.password === password && u.role === userRole)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials or role" }, { status: 401 })
    }

  // Create encoded session payload and set as httpOnly cookie for API auth (demo only)
  const tokenPayload = {
      userId: Number.parseInt(user.id, 10),
      email: user.email,
      role: user.role,
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
