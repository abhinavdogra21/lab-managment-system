/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Avoid double-renders in production
  poweredByHeader: false, // Remove unnecessary X-Powered-By header
  compress: true,         // Enable gzip compression
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Legacy path to new admin route
      {
        source: "/admin/dashboard/organization",
        destination: "/admin/dashboard/department-and-lab-management",
      },
    ]
  },
}

export default nextConfig
