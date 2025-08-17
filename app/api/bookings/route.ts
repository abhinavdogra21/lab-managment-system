// Bookings API endpoint
// Lab booking management with approval workflow

import { type NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

// GET - Fetch bookings (filtered by user role)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const labId = searchParams.get("labId")

    let bookings

    if (hasRole(user, ["admin", "hod"])) {
      // Admin/HOD can see all bookings
      bookings = await dbOperations.getAllBookings({ status, labId })
    } else if (user.role === "faculty" || user.role === "tnp") {
      // Faculty/TnP can see their own bookings
      bookings = await dbOperations.getBookingsByUser(user.userId)
    } else {
      // Students can only see their own bookings
      bookings = await dbOperations.getBookingsByUser(user.userId)
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error("Bookings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new booking
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !hasRole(user, ["faculty", "tnp", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const bookingData = await request.json()

    // Validate required fields
    if (
      !bookingData.labId ||
      !bookingData.bookingDate ||
      !bookingData.startTime ||
      !bookingData.endTime ||
      !bookingData.purpose
    ) {
      return NextResponse.json({ error: "Lab, date, time, and purpose are required" }, { status: 400 })
    }

    // Add user ID to booking data
    bookingData.bookedBy = user.userId

    // Check for conflicts
    const conflicts = await dbOperations.checkBookingConflicts(bookingData)
    if (conflicts.length > 0) {
      return NextResponse.json({ error: "Time slot already booked" }, { status: 409 })
    }

    // Create booking
    const booking = await dbOperations.createBooking(bookingData)

    // Log the action
    await dbOperations.createLog({
      userId: user.userId,
      action: "CREATE_BOOKING",
      entityType: "booking",
      entityId: booking.id,
      details: bookingData,
      ipAddress: request.ip || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error("Booking creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
