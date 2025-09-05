/** @type {import('next').NextConfig} */
const nextConfig = {
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
