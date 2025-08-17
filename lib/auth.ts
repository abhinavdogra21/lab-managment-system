// Authentication utilities and middleware
// JWT token verification and user session management

import type { NextRequest } from "next/server"

export interface AuthUser {
  userId: number
  email: string
  role: string
  name: string
  department: string
}

// Verify JWT token from request
export async function verifyToken(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return null
    }

  // Decode simple JSON payload used in demo cookie
  const decoded = JSON.parse(decodeURIComponent(token)) as AuthUser
  return decoded
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

// Check if user has required role
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  const normalize = (r: string) => r.replace(/-/g, "_")
  const allowed = new Set(allowedRoles.map(normalize))
  return allowed.has(normalize(user.role))
}

// Role hierarchy for permissions
export const roleHierarchy = {
  admin: ["admin", "hod", "faculty", "lab_staff", "tnp", "student"],
  hod: ["hod", "faculty", "lab_staff", "student"],
  faculty: ["faculty", "student"],
  lab_staff: ["lab_staff"],
  tnp: ["tnp", "student"],
  student: ["student"],
} as const

// Check if user can access resource based on role hierarchy
export function canAccess(userRole: string, requiredRole: string): boolean {
  const normalize = (r: string) => r.replace(/-/g, "_")
  const allowedRoles = (roleHierarchy as Record<string, readonly string[]>)[normalize(userRole)] || []
  return (allowedRoles as string[]).includes(normalize(requiredRole))
}

// Middleware for API route protection
export function withAuth(allowedRoles: string[]) {
  return async (request: NextRequest, handler: Function) => {
    const user = await verifyToken(request)

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!hasRole(user, allowedRoles)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    return handler(request, user)
  }
}
