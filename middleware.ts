import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  // Skip if already role-prefixed
  const rolePref = pathname.match(/^\/(admin|student|faculty|lab-staff|hod|tnp)(?:\/|$)/)
  if (rolePref) return NextResponse.next()

  // Only handle /dashboard* paths
  if (!pathname.startsWith("/dashboard")) return NextResponse.next()

  // Get role from cookie (same format used elsewhere: JSON-encoded in auth-token)
  const token = req.cookies.get("auth-token")?.value
  if (!token) return NextResponse.next()
  try {
    const user = JSON.parse(decodeURIComponent(token)) as { role?: string }
    const role = user?.role
    if (!role) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = `/${role}${pathname}`
    url.search = search
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
  ],
}
