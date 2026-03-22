/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 *
 * Sends automatic reminder emails to the person who booked and head lab staff
 * for all approved lab bookings 1 hour before start.
 *
 * Performance optimizations:
 *  - Single batched SQL query with JOINs (no N+1)
 *  - Parallel email dispatch via Promise.allSettled
 *  - Batch UPDATE for reminder_sent flag
 *  - Tracks reminders in booking_reminders table
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { sendEmail, emailTemplates } from "@/lib/notifications"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  // Optional: Secure with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use IST (Asia/Kolkata) explicitly — the DB stores times in IST
    const now = new Date()
    const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    const istTimeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

    const today = istFormatter.format(now) // YYYY-MM-DD in IST
    const nowTimeIST = istTimeFormatter.format(now) // HH:MM:SS in IST

    // Look for bookings starting between NOW and NOW+62min
    // To send EXACTLY 1 hour before, this requires the cron job to run every minute (* * * * *).
    // The +62min gives a 2-minute buffer to ensure we catch it right when it enters the 1-hour window.
    const nowTime = new Date(now.getTime() - 5 * 60 * 1000) // Buffer just in case cron lags
    const sixtyTwoMinLater = new Date(now.getTime() + 62 * 60 * 1000)
    const windowStart = istTimeFormatter.format(nowTime)
    const windowEnd = istTimeFormatter.format(sixtyTwoMinLater)

    console.log(`[Reminder Cron] Running at IST ${nowTimeIST}, looking for bookings on ${today} starting between ${windowStart} and ${windowEnd}`)

    // ── 1. Single efficient query: fetch all upcoming bookings that need reminders ──
    const upcomingBookings = await db.query(`
      SELECT
        br.id,
        br.booking_date,
        br.start_time,
        br.end_time,
        br.purpose,
        br.lab_id,
        br.is_multi_lab,
        br.lab_ids,
        br.responsible_person_name,
        br.responsible_person_email,
        u.id AS requester_id,
        u.name AS requester_name,
        u.email AS requester_email,
        u.salutation AS requester_salutation
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      WHERE br.status = 'approved'
        AND br.booking_date = ?
        AND br.start_time BETWEEN ? AND ?
        AND br.reminder_sent = 0
        AND br.request_type = 'lab_booking'
    `, [today, windowStart, windowEnd])

    if (upcomingBookings.rows.length === 0) {
      return NextResponse.json({ success: true, remindersSent: 0, message: 'No upcoming bookings need reminders' })
    }

    // ── 2. Collect all lab IDs across all bookings for batch lab staff lookup ──
    const allLabIds = new Set<number>()
    const bookingLabMap = new Map<number, number[]>() // bookingId -> labIds

    for (const booking of upcomingBookings.rows) {
      let labIds: number[] = []
      if (booking.is_multi_lab) {
        try {
          let raw = booking.lab_ids
          if (Buffer.isBuffer(raw)) raw = raw.toString('utf-8')
          if (typeof raw === 'string') labIds = JSON.parse(raw)
          else if (Array.isArray(raw)) labIds = raw
        } catch { labIds = [booking.lab_id] }
      } else {
        labIds = [booking.lab_id]
      }
      labIds = labIds.map(Number).filter(Boolean)
      bookingLabMap.set(booking.id, labIds)
      labIds.forEach(id => allLabIds.add(id))
    }

    // ── 3. Single batch query: get head lab staff + lab names for ALL labs at once ──
    const labIdArray = Array.from(allLabIds)
    const labPlaceholders = labIdArray.map(() => '?').join(',')

    const labStaffResult = await db.query(`
      SELECT l.id AS lab_id, l.name AS lab_name,
             u.id AS staff_id, u.name AS staff_name, u.email AS staff_email, u.salutation AS staff_salutation
      FROM labs l
      LEFT JOIN users u ON l.staff_id = u.id
      WHERE l.id IN (${labPlaceholders})
    `, labIdArray)

    // Build lookup maps
    const labNameMap = new Map<number, string>()
    const labStaffMap = new Map<number, { name: string; email: string; salutation?: string }>()
    for (const row of labStaffResult.rows) {
      labNameMap.set(row.lab_id, row.lab_name)
      if (row.staff_email) {
        labStaffMap.set(row.lab_id, {
          name: row.staff_name,
          email: row.staff_email,
          salutation: row.staff_salutation
        })
      }
    }

    // ── 4. Batch query: get responsible persons for multi-lab bookings ──
    const multiLabBookingIds = upcomingBookings.rows
      .filter((b: any) => b.is_multi_lab)
      .map((b: any) => b.id)

    const rpMap = new Map<number, Array<{ name: string; email: string; lab_id: number }>>()
    if (multiLabBookingIds.length > 0) {
      const rpPlaceholders = multiLabBookingIds.map(() => '?').join(',')
      const rpResult = await db.query(`
        SELECT rp.booking_request_id, rp.name, rp.email, rp.lab_id
        FROM multi_lab_responsible_persons rp
        WHERE rp.booking_request_id IN (${rpPlaceholders})
      `, multiLabBookingIds)
      for (const rp of rpResult.rows) {
        if (!rpMap.has(rp.booking_request_id)) rpMap.set(rp.booking_request_id, [])
        rpMap.get(rp.booking_request_id)!.push({ name: rp.name, email: rp.email, lab_id: rp.lab_id })
      }
    }

    // ── 5. Build all email tasks in memory, then fire in parallel ──
    const emailTasks: Array<{ to: string | string[]; subject: string; html: string; bookingId: number; type: string }> = []
    const processedBookingIds: number[] = []

    for (const booking of upcomingBookings.rows) {
      const labIds = bookingLabMap.get(booking.id) || [booking.lab_id]
      const labNames = labIds.map(id => labNameMap.get(id) || `Lab ${id}`).join(', ')

      // Email to the person who booked
      const bookerEmail = emailTemplates.bookingReminderForBooker({
        bookerName: booking.requester_name,
        bookerSalutation: booking.requester_salutation,
        labNames,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        purpose: booking.purpose
      })
      emailTasks.push({
        to: booking.requester_email,
        subject: bookerEmail.subject,
        html: bookerEmail.html,
        bookingId: booking.id,
        type: 'booker'
      })

      // Responsible persons for this booking
      let responsiblePersonsList: Array<{ name: string; email: string; lab_id: number }> = []
      if (booking.is_multi_lab) {
        responsiblePersonsList = rpMap.get(booking.id) || []
      } else if (booking.responsible_person_name && booking.responsible_person_email) {
        responsiblePersonsList = [{
          name: booking.responsible_person_name,
          email: booking.responsible_person_email,
          lab_id: booking.lab_id
        }]
      }

      // Email to head lab staff of EACH booked lab
      const staffEmailed = new Set<string>() // avoid duplicate emails if same staff manages multiple labs
      for (const labId of labIds) {
        const staff = labStaffMap.get(labId)
        if (staff && !staffEmailed.has(staff.email)) {
          staffEmailed.add(staff.email)
          const rpForLab = responsiblePersonsList
            .filter(rp => rp.lab_id === labId)
            .map(rp => ({ name: rp.name, email: rp.email }))

          const staffEmail = emailTemplates.bookingReminderForLabStaff({
            staffName: staff.name,
            staffSalutation: staff.salutation,
            labName: labNameMap.get(labId) || `Lab ${labId}`,
            bookerName: booking.requester_name,
            bookerEmail: booking.requester_email,
            bookingDate: booking.booking_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            purpose: booking.purpose,
            responsiblePersons: rpForLab.length > 0 ? rpForLab : undefined
          })
          emailTasks.push({
            to: staff.email,
            subject: staffEmail.subject,
            html: staffEmail.html,
            bookingId: booking.id,
            type: 'lab_staff'
          })
        }
      }

      processedBookingIds.push(booking.id)
    }

    // ── 6. Fire all emails in parallel ──
    const emailResults = await Promise.allSettled(
      emailTasks.map(task =>
        sendEmail({ to: task.to, subject: task.subject, html: task.html })
          .then(result => ({ ...result, bookingId: task.bookingId, type: task.type, to: task.to }))
      )
    )

    let remindersSent = 0
    let remindersFailed = 0
    for (const result of emailResults) {
      if (result.status === 'fulfilled' && result.value?.success) {
        remindersSent++
      } else {
        remindersFailed++
        const reason = result.status === 'rejected' ? result.reason : result.value?.error
        console.error('❌ Reminder email failed:', reason)
      }
    }

    // ── 7. Batch update reminder_sent flag ──
    if (processedBookingIds.length > 0) {
      const updatePlaceholders = processedBookingIds.map(() => '?').join(',')
      await db.query(
        `UPDATE booking_requests SET reminder_sent = 1 WHERE id IN (${updatePlaceholders})`,
        processedBookingIds
      )
    }

    // ── 8. Track in booking_reminders table ──
    for (const bookingId of processedBookingIds) {
      const recipientEmails = emailTasks
        .filter(t => t.bookingId === bookingId)
        .map(t => Array.isArray(t.to) ? t.to.join(', ') : t.to)

      const allSuccessful = emailResults
        .filter((_, idx) => emailTasks[idx].bookingId === bookingId)
        .every(r => r.status === 'fulfilled' && (r.value as any)?.success)

      await db.query(`
        INSERT INTO booking_reminders (booking_request_id, reminder_type, scheduled_time, sent_at, status, recipients)
        VALUES (?, '1_hour_before', NOW(), NOW(), ?, ?)
      `, [
        bookingId,
        allSuccessful ? 'sent' : 'failed',
        JSON.stringify(recipientEmails)
      ]).catch(err => console.error('Failed to log reminder:', err))
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      remindersFailed,
      bookingsProcessed: processedBookingIds.length
    })
  } catch (error) {
    console.error('Reminder cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
