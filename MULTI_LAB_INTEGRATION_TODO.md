# Multi-Lab Integration - Remaining Tasks

## ✅ COMPLETED
1. Multi-lab UI for Student, Faculty, Others forms
2. Person-per-lab implementation
3. 24-hour booking (removed time restrictions)
4. Continuous time blocks algorithm
5. `multi_lab_responsible_persons` database table
6. Common-free-slots APIs for all user types
7. **Lab Staff approval logic** - Updated to handle multi-lab approvals

## 🔄 IN PROGRESS

### 1. Lab Staff Approval API (`/app/api/lab-staff/requests/[id]/action/route.ts`)
**STATUS**: Partially updated
**WHAT'S DONE**:
- Authorization check updated for multi-lab
- Approval logic checks `multi_lab_approvals` table
- Waits for ALL lab staff to approve before moving to HOD
- If ANY lab staff rejects, entire booking is rejected

**WHAT'S NEEDED**:
- [ ] Update email notifications to show which lab was approved
- [ ] Send emails to all responsible persons when fully approved
- [ ] Add TESTING_MODE condition already handled in `lib/notifications.ts`

---

## 📋 REMAINING TASKS

### 2. HOD/Lab Coordinator Approval API
**FILE**: `/app/api/hod/requests/[id]/action/route.ts`

**CHANGES NEEDED**:
```typescript
// When HOD approves:
if (isMultiLab) {
  // Update all multi_lab_approvals to 'approved'
  await db.query(`
    UPDATE multi_lab_approvals
    SET status = 'approved',
        hod_approved_by = ?,
        hod_approved_at = NOW()
    WHERE booking_request_id = ?
  `, [userId, id])
}

// Send emails to ALL responsible persons
const responsiblePersons = await db.query(`
  SELECT rp.name, rp.email, l.name as lab_name
  FROM multi_lab_responsible_persons rp
  JOIN labs l ON rp.lab_id = l.id
  WHERE rp.booking_request_id = ?
`, [id])

for (const person of responsiblePersons.rows) {
  await sendEmail({
    to: person.email,
    subject: 'Lab Booking Approved - You are Responsible',
    html: `
      Dear ${person.name},
      
      Your lab booking for ${person.lab_name} has been approved.
      Date: ${bookingDate}
      Time: ${startTime} - ${endTime}
      
      You are listed as the person responsible for ${person.lab_name}.
      You will be held accountable for any damages during this period.
      
      Best regards,
      Lab Management System
    `
  })
}
```

---

### 3. Dashboard/Timeline Display Updates

#### A. Student Dashboard (`/app/student/dashboard/my-bookings/page.tsx` or similar)
**CHANGES NEEDED**:
```typescript
// Fetch multi-lab data
const bookings = await db.query(`
  SELECT br.*,
         GROUP_CONCAT(l.name) as lab_names,
         br.is_multi_lab
  FROM booking_requests br
  LEFT JOIN multi_lab_approvals mla ON br.id = mla.booking_request_id
  LEFT JOIN labs l ON mla.lab_id = l.id
  WHERE br.requested_by = ?
  GROUP BY br.id
`, [userId])

// Display:
// If is_multi_lab: Show "Labs: CP1, CP2, CP3"
// Show status: "2/3 labs approved by Lab Staff"
```

#### B. Faculty/Others Dashboard
Same changes as Student dashboard

#### C. Lab Staff Dashboard (`/app/lab-staff/dashboard/requests/page.tsx`)
**CHANGES NEEDED**:
```typescript
// Filter requests for staff's labs
const requests = await db.query(`
  SELECT br.*,
         l.name as lab_name,
         mla.status as lab_approval_status,
         mla.lab_id
  FROM booking_requests br
  LEFT JOIN multi_lab_approvals mla ON br.id = mla.booking_request_id
  JOIN labs l ON mla.lab_id = l.id OR br.lab_id = l.id
  WHERE (l.staff_id = ? OR EXISTS(
    SELECT 1 FROM lab_staff_assignments lsa
    WHERE lsa.lab_id = l.id AND lsa.staff_id = ?
  ))
  AND br.status = 'pending_lab_staff'
`, [userId, userId])

// Display:
// Show "Approve for CP1 Lab" (specific lab they're responsible for)
// If multi-lab: "This booking requires approval from multiple labs"
```

#### D. HOD/Lab Coordinator Dashboard
**CHANGES NEEDED**:
```typescript
// Show multi-lab approval timeline
const approvals = await db.query(`
  SELECT l.name, mla.status, mla.lab_staff_approved_at, u.name as staff_name
  FROM multi_lab_approvals mla
  JOIN labs l ON mla.lab_id = l.id
  LEFT JOIN users u ON mla.lab_staff_approved_by = u.id
  WHERE mla.booking_request_id = ?
`, [bookingId])

// Display timeline:
// ✅ CP1 - Approved by John (Lab Staff) at 2:30 PM
// ✅ CP2 - Approved by Sarah (Lab Staff) at 3:15 PM  
// ⏳ CP3 - Pending Lab Staff approval
```

---

### 4. Email Notifications

#### A. Update Lab Staff Notification
**FILE**: `/lib/notifications.ts`

**ADD NEW TEMPLATE**:
```typescript
labBookingCreatedMultiLab: ({
  labName, // Specific lab they're approving
  allLabNames, // All labs in booking
  requesterName,
  bookingDate,
  startTime,
  endTime,
  purpose,
  requestId
}) => ({
  subject: `Lab Booking Request - ${labName}`,
  html: `
    <h2>Lab Booking Request for ${labName}</h2>
    <p><strong>Note:</strong> This is a multi-lab booking request for: ${allLabNames}</p>
    <p>You need to approve for: <strong>${labName}</strong></p>
    ...
  `
})
```

#### B. Add Responsible Person Confirmation Email
```typescript
responsiblePersonConfirmation: ({
  personName,
  labName,
  bookingDate,
  startTime,
  endTime,
  requesterName
}) => ({
  subject: `You are Responsible for ${labName} Booking`,
  html: `
    <h2>Lab Booking Confirmation - You are Responsible</h2>
    <p>Dear ${personName},</p>
    <p>You have been designated as the person responsible for:</p>
    <ul>
      <li><strong>Lab:</strong> ${labName}</li>
      <li><strong>Date:</strong> ${bookingDate}</li>
      <li><strong>Time:</strong> ${startTime} - ${endTime}</li>
    </ul>
    <p><strong>Important:</strong> You will be held accountable for any damages to the lab during this period.</p>
    ...
  `
})
```

---

### 5. 2-Hour Reminder System

#### A. Create Reminder Cron Job
**FILE**: `/app/api/cron/booking-reminders/route.ts` (create new)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { sendEmail } from "@/lib/notifications"

const db = Database.getInstance()

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find bookings starting in 2 hours
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    const upcomingBookings = await db.query(`
      SELECT br.*,
             u.name as requester_name,
             u.email as requester_email
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      WHERE br.status = 'approved'
        AND br.booking_date = CURDATE()
        AND br.start_time BETWEEN ? AND ?
        AND br.reminder_sent = 0
    `, [
      now.toTimeString().slice(0, 8),
      twoHoursLater.toTimeString().slice(0, 8)
    ])

    for (const booking of upcomingBookings.rows) {
      const isMultiLab = booking.is_multi_lab === 1
      
      // Get lab staff emails
      let labStaffEmails = []
      if (isMultiLab) {
        const labIds = JSON.parse(booking.lab_ids)
        const staff = await db.query(`
          SELECT DISTINCT u.email, u.name, l.name as lab_name
          FROM labs l
          JOIN users u ON l.staff_id = u.id
          WHERE l.id IN (${labIds.map(() => '?').join(',')})
        `, labIds)
        labStaffEmails = staff.rows
      } else {
        const staff = await db.query(`
          SELECT u.email, u.name, l.name as lab_name
          FROM labs l
          JOIN users u ON l.staff_id = u.id
          WHERE l.id = ?
        `, [booking.lab_id])
        labStaffEmails = staff.rows
      }

      // Get responsible persons
      const responsiblePersons = await db.query(`
        SELECT rp.name, rp.email, l.name as lab_name
        FROM multi_lab_responsible_persons rp
        JOIN labs l ON rp.lab_id = l.id
        WHERE rp.booking_request_id = ?
      `, [booking.id])

      // Send reminder to lab staff
      for (const staff of labStaffEmails) {
        await sendEmail({
          to: staff.email,
          subject: `Reminder: Lab Booking in 2 Hours - ${staff.lab_name}`,
          html: `
            <h2>Upcoming Lab Booking Reminder</h2>
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
                .filter(rp => rp.lab_name === staff.lab_name)
                .map(rp => `<li>${rp.name} (${rp.email})</li>`)
                .join('')}
            </ul>
          `
        }).catch(err => console.error(`Failed to send reminder to ${staff.email}:`, err))
      }

      // Send reminder to responsible persons
      for (const person of responsiblePersons.rows) {
        await sendEmail({
          to: person.email,
          subject: `Reminder: You are responsible for ${person.lab_name} in 2 hours`,
          html: `
            <h2>Lab Booking Reminder</h2>
            <p>Dear ${person.name},</p>
            <p>This is a reminder that you are the person responsible for ${person.lab_name} with a booking starting in 2 hours:</p>
            <ul>
              <li><strong>Date:</strong> ${booking.booking_date}</li>
              <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
            </ul>
            <p><strong>Remember:</strong> You are accountable for any damages to the lab during this period.</p>
          `
        }).catch(err => console.error(`Failed to send reminder to ${person.email}:`, err))
      }

      // Mark reminder as sent
      await db.query(`
        UPDATE booking_requests
        SET reminder_sent = 1
        WHERE id = ?
      `, [booking.id])
    }

    return NextResponse.json({
      success: true,
      remindersSent: upcomingBookings.rows.length
    })

  } catch (error) {
    console.error('Reminder cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### B. Add `reminder_sent` Column
**SQL Migration**:
```sql
ALTER TABLE booking_requests
ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0 AFTER status;
```

#### C. Setup Vercel Cron or External Cron
**File**: `/vercel.json` (add)
```json
{
  "crons": [{
    "path": "/api/cron/booking-reminders",
    "schedule": "*/10 * * * *"
  }]
}
```

---

### 6. Activity Logging Updates

**FILES TO UPDATE**:
- `/app/api/faculty/booking-requests/route.ts`
- `/app/api/student/booking-requests/route.ts`
- `/app/api/others/booking-requests/route.ts`
- `/app/api/lab-staff/requests/[id]/action/route.ts` ✅ (already has logging)
- `/app/api/hod/requests/[id]/action/route.ts`

**ADD TO LOGGING**:
```typescript
logLabBookingActivity({
  bookingId: Number(bookingId),
  labId: isMultiLab ? null : labId, // null for multi-lab
  actorUserId: userId,
  action: 'created_multi_lab_booking',
  actionDescription: isMultiLab 
    ? `Created multi-lab booking for labs: ${labIds.join(', ')}`
    : `Created single-lab booking`,
  bookingSnapshot: {
    ...bookingData,
    is_multi_lab: isMultiLab,
    lab_ids: isMultiLab ? labIds : null,
    responsible_persons: responsiblePersons
  },
  ...
})
```

---

## 🎯 PRIORITY ORDER

1. **HIGH**: HOD approval API updates (needed for complete workflow)
2. **HIGH**: Email to responsible persons when approved
3. **MEDIUM**: Dashboard timeline displays
4. **MEDIUM**: 2-hour reminder system
5. **LOW**: Activity logging enhancements

---

## 🧪 TESTING CHECKLIST

- [ ] Multi-lab booking creation (Student, Faculty, Others)
- [ ] Lab staff can only approve their specific lab
- [ ] Booking stays "pending_lab_staff" until ALL labs approved
- [ ] If one lab staff rejects, entire booking rejected
- [ ] HOD sees all lab approvals before final approval
- [ ] All responsible persons receive confirmation email
- [ ] 2-hour reminder goes to lab staff (not for timetable classes)
- [ ] TESTING_MODE=true sends all emails to admin
- [ ] Activity logs capture multi-lab actions
- [ ] Timeline shows individual lab approval status

---

## 📝 NOTES

- `TESTING_MODE` env variable already implemented in `/lib/notifications.ts`
- When `TESTING_MODE=true`, all emails go to `ADMIN_EMAIL`
- Responsible persons are stored in `multi_lab_responsible_persons` table
- Multi-lab approval status tracked in `multi_lab_approvals` table
- Regular timetable classes should NOT trigger reminders (check `request_type = 'lab_booking'`)
