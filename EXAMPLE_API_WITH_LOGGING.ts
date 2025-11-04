/**
 * Example: Lab Booking API with Activity Logging
 * 
 * This shows how to integrate activity logging into your existing API routes
 */

import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"
import { getAuth } from "@/lib/auth"

// Example: Create a new lab booking
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getAuth(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()

    // Get user info for logging
    const userInfo = await getUserInfoForLogging(userId)

    // Create the booking
    const booking = await dbOperations.createBooking({
      labId: body.labId,
      bookedBy: userId,
      bookingDate: body.bookingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      purpose: body.purpose,
      expectedStudents: body.expectedStudents,
      equipmentNeeded: body.equipmentNeeded,
    })

    // Log the activity (don't await - fire and forget)
    logLabBookingActivity({
      bookingId: booking.id,
      labId: booking.lab_id,
      actorUserId: userInfo?.userId || null,
      actorName: userInfo?.name || null,
      actorEmail: userInfo?.email || null,
      actorRole: userInfo?.role || null,
      action: "created",
      actionDescription: `Created lab booking for ${booking.purpose}`,
      bookingSnapshot: booking,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      userAgent: req.headers.get("user-agent") || null,
    }).catch(err => console.error("Activity logging failed:", err))

    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error: any) {
    console.error("Error creating booking:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    )
  }
}

// Example: Approve a booking (HoD)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuth(req)
    if (!session?.user?.id || session.user.role !== "hod") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookingId = parseInt(params.id)
    const hodId = session.user.id
    const body = await req.json()

    // Get HoD info for logging
    const hodInfo = await getUserInfoForLogging(hodId)

    // Get current booking state before update
    const oldBooking = await dbOperations.getBookingById(bookingId)
    if (!oldBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Update the booking status
    // (You'll need to implement this in dbOperations if not already present)
    const updatedBooking = await updateBookingApproval(
      bookingId,
      hodId,
      "approved",
      body.remarks || null
    )

    // Log the approval activity
    logLabBookingActivity({
      bookingId: bookingId,
      labId: updatedBooking.lab_id,
      actorUserId: hodInfo?.userId || null,
      actorName: hodInfo?.name || null,
      actorEmail: hodInfo?.email || null,
      actorRole: hodInfo?.role || null,
      action: "approved",
      actionDescription: body.remarks 
        ? `Approved with remarks: ${body.remarks}` 
        : "Approved lab booking",
      bookingSnapshot: updatedBooking,
      changesMade: {
        approval_status: { 
          from: oldBooking.approval_status, 
          to: "approved" 
        },
        approved_by: { 
          from: oldBooking.approved_by, 
          to: hodId 
        },
        approval_remarks: { 
          from: oldBooking.approval_remarks, 
          to: body.remarks 
        },
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      userAgent: req.headers.get("user-agent") || null,
    }).catch(err => console.error("Activity logging failed:", err))

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    })
  } catch (error: any) {
    console.error("Error approving booking:", error)
    return NextResponse.json(
      { error: error.message || "Failed to approve booking" },
      { status: 500 }
    )
  }
}

// Helper function (add to dbOperations)
async function updateBookingApproval(
  bookingId: number,
  approverId: number,
  status: "approved" | "rejected",
  remarks: string | null
) {
  // This should be implemented in lib/database.ts
  // Example implementation:
  const { db } = await import("@/lib/database")
  
  await db.query(
    `UPDATE lab_bookings 
     SET approval_status = ?, 
         approved_by = ?, 
         approval_date = NOW(),
         approval_remarks = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [status, approverId, remarks, bookingId]
  )

  const result = await db.query(
    "SELECT * FROM lab_bookings WHERE id = ?",
    [bookingId]
  )
  
  return result.rows[0]
}
