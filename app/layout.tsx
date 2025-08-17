import type React from "react"
import type { Metadata } from "next"
import { Inter, Montserrat } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "600", "700"],
})

export const metadata: Metadata = {
  title: "LNMIIT Lab Management System",
  description: "College Lab Management System for The LNM Institute of Information Technology",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
  <html lang="en" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
