import { NextRequest, NextResponse } from "next/server"

// Centralized role map for pages and APIs
const roleMap: Array<{ pattern: RegExp; roles: string[] }> = [
  // Pages
  { pattern: /^\/admin(?:\/|$)/, roles: ["admin"] },
  { pattern: /^\/hod(?:\/|$)/, roles: ["faculty", "admin"] },
  { pattern: /^\/faculty(?:\/|$)/, roles: ["faculty", "admin"] },
  { pattern: /^\/lab-staff(?:\/|$)/, roles: ["lab_staff", "admin"] },
  { pattern: /^\/student(?:\/|$)/, roles: ["student", "admin"] },
  { pattern: /^\/tnp(?:\/|$)/, roles: ["tnp", "admin"] },
  { pattern: /^\/non-teaching(?:\/|$)/, roles: ["non_teaching", "admin"] },
  // APIs (canonical)
  { pattern: /^\/api\/admin(?:\/|$)/, roles: ["admin"] },
  { pattern: /^\/api\/hod(?:\/|$)/, roles: ["faculty", "admin"] },
  { pattern: /^\/api\/student(?:\/|$)/, roles: ["student", "admin"] },
  { pattern: /^\/api\/faculty(?:\/|$)/, roles: ["faculty", "admin"] },
  { pattern: /^\/api\/lab-staff(?:\/|$)/, roles: ["lab_staff", "admin"] },
  { pattern: /^\/api\/non-teaching(?:\/|$)/, roles: ["non_teaching", "admin"] },
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Legacy fallback: redirect /dashboard/* to role-scoped equivalent
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("auth-token")?.value
    if (!token) return NextResponse.redirect(new URL("/", req.url))
    try {
      const user = JSON.parse(decodeURIComponent(token)) as { role?: string }
      let role = user?.role || ""
      // Map backend role codes to path segments
      if (role === "lab_staff") role = "lab-staff"
      if (role === "non_teaching") role = "non-teaching"
      if (!role) return NextResponse.redirect(new URL("/", req.url))
      const rest = pathname.slice("/dashboard".length) || ""
      return NextResponse.redirect(new URL(`/${role}/dashboard${rest}`, req.url))
    } catch {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Role gate for pages and APIs
  const match = roleMap.find((m) => m.pattern.test(pathname))
  if (!match) return NextResponse.next()

  // Extract role from cookie (JWT payload pre-parsed into cookie as earlier)
  const token = req.cookies.get("auth-token")?.value
  if (!token) return NextResponse.redirect(new URL("/", req.url))
  try {
    const user = JSON.parse(decodeURIComponent(token)) as { role?: string }
    const role = user?.role
    if (!role || !match.roles.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url))
    }
  } catch {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
  "/dashboard/:path*",
    "/admin/:path*",
  "/hod/:path*",
    "/faculty/:path*",
    "/lab-staff/:path*",
    "/student/:path*",
    "/tnp/:path*",
    "/non-teaching/:path*",
    "/api/:path*",
  ],
}
