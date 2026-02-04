/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 *
 * Sends automatic reminder emails to responsible persons and head lab staff
 * for all approved lab bookings (student, faculty, others) 2 hours before start.
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { sendEmail } from "@/lib/notifications"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  // Optional: Secure with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const today = now.toISOString().slice(0, 10)
    const nowTime = now.toTimeString().slice(0, 8)
    const twoHoursTime = twoHoursLater.toTimeString().slice(0, 8)

    // Find all approved bookings for today, starting in 2 hours, not reminded
    const upcomingBookings = await db.query(`
      SELECT br.*, u.name as requester_name, u.email as requester_email
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      WHERE br.status = 'approved'
        AND br.booking_date = ?
        AND br.start_time BETWEEN ? AND ?
        AND br.reminder_sent = 0
        AND br.request_type = 'lab_booking'
    `, [today, nowTime, twoHoursTime])

    let remindersSent = 0
    for (const booking of upcomingBookings.rows) {
      // Get all labs for this booking (multi-lab or single)
      let labIds: number[] = []
      if (booking.is_multi_lab) {
        if (Buffer.isBuffer(booking.lab_ids)) {
          labIds = JSON.parse(booking.lab_ids.toString('utf-8'))
        } else if (typeof booking.lab_ids === 'string') {
          labIds = JSON.parse(booking.lab_ids)
        } else if (Array.isArray(booking.lab_ids)) {
          labIds = booking.lab_ids
        }
      } else {
        labIds = [booking.lab_id]
      }

      // Get responsible persons for each lab
      const responsiblePersons = await db.query(`
        SELECT rp.name, rp.email, rp.lab_id, l.name as lab_name
        FROM multi_lab_responsible_persons rp
        JOIN labs l ON rp.lab_id = l.id
        WHERE rp.booking_request_id = ?
      `, [booking.id])

      // Get head lab staff for each lab
      const labStaff = await db.query(`
        SELECT u.name, u.email, l.id as lab_id, l.name as lab_name
        FROM labs l
        JOIN users u ON l.staff_id = u.id
        WHERE l.id IN (${labIds.map(() => '?').join(',')})
      `, labIds)

      // Send reminder to responsible persons
      for (const person of responsiblePersons.rows) {
        await sendEmail({
          to: person.email,
          subject: `Reminder: You are responsible for ${person.lab_name} in 2 hours`,
          html: `<h2>Lab Booking Reminder</h2>
            <p>Dear ${person.name},</p>
            <p>This is a reminder that you are the person responsible for ${person.lab_name} with a booking starting in 2 hours:</p>
            <ul>
              <li><strong>Date:</strong> ${booking.booking_date}</li>
              <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
              <li><strong>Booked by:</strong> ${booking.requester_name} (${booking.requester_email})</li>
              <li><strong>Purpose:</strong> ${booking.purpose}</li>
            </ul>
            <p>Please ensure you are available or have made necessary arrangements.</p>`
        }).catch(err => console.error(`Failed to send reminder to ${person.email}:`, err))
        remindersSent++
      }

      // Send reminder to head lab staff
      for (const staff of labStaff.rows) {
        await sendEmail({
          to: staff.email,
          subject: `Reminder: Lab Booking in 2 Hours - ${staff.lab_name}`,
          html: `<h2>Upcoming Lab Booking Reminder</h2>
            <p>Dear ${staff.name},</p>
            <p>This is a reminder that ${staff.lab_name} has a booking starting in approximately 2 hours:</p>
            <ul>
              <li><strong>Date:</strong> ${booking.booking_date}</li>
              <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
              <li><strong>Booked by:</strong> ${booking.requester_name}</li>
              <li><strong>Purpose:</strong> ${booking.purpose}</li>
            </ul>
            <p><strong>Responsible Persons:</strong></p>
            <ul>
              ${responsiblePersons.rows
                .filter(rp => rp.lab_id === staff.lab_id)
                .map(rp => `<li>${rp.name} (${rp.email})</li>`)
                .join('')}
            </ul>`
        }).catch(err => console.error(`Failed to send reminder to ${staff.email}:`, err))
        remindersSent++
      }

      // Mark reminder as sent
      await db.query(`UPDATE booking_requests SET reminder_sent = 1 WHERE id = ?`, [booking.id])
    }

    return NextResponse.json({ success: true, remindersSent })
  } catch (error) {
    console.error('Reminder cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
