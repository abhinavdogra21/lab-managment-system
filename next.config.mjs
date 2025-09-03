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
      {
        source: "/:role(admin|student|faculty|lab-staff|hod|tnp)/dashboard",
        destination: "/dashboard",
      },
      {
        source: "/:role(admin|student|faculty|lab-staff|hod|tnp)/dashboard/:path*",
        destination: "/dashboard/:path*",
      },
    ]
  },
}

export default nextConfig
