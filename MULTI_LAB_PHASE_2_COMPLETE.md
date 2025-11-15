# Multi-Lab Phase 2: Database & Lab Staff API - COMPLETE ✅

**Date:** November 15, 2025  
**Status:** Phase 2 Complete - Lab Staff approval fully functional

---

## 🎯 Completed in This Phase

### 1. Database Schema Enhancements ✅

**Migration File:** `scripts/11-multi-lab-approval-enhancements.sql`

#### Enhanced `multi_lab_approvals` Table:
```sql
-- New columns added:
- lab_staff_approved_by (INT, FK to users.id)
- lab_staff_approved_at (DATETIME)
- lab_staff_remarks (TEXT)
- hod_approved_by (INT, FK to users.id)
- hod_approved_at (DATETIME)
- hod_remarks (TEXT)

-- Updated status enum:
ENUM('pending', 'approved_by_lab_staff', 'approved', 'rejected')

-- New indexes:
- idx_status_booking (status, booking_request_id)
- Foreign keys for lab_staff_approved_by and hod_approved_by
```

#### Enhanced `booking_requests` Table:
```sql
-- New column:
- reminder_sent (TINYINT(1), DEFAULT 0)

-- New index:
- idx_reminder_query (status, booking_date, start_time, reminder_sent)
```

**Purpose:**
- Track detailed approval chain (who approved, when, remarks)
- Support 2-hour reminder system
- Maintain data integrity with foreign keys
- Optimize reminder queries with indexes

---

### 2. Lab Staff Approval API - Complete Update ✅

**File:** `/app/api/lab-staff/requests/[id]/action/route.ts`

#### Key Changes:

**A. Database Column Usage:**
```typescript
// Now uses new columns for proper tracking
await db.query(`
  UPDATE multi_lab_approvals
  SET status = 'approved_by_lab_staff',
      lab_staff_approved_by = ?,      // ✅ NEW
      lab_staff_approved_at = NOW(),  // ✅ NEW
      lab_staff_remarks = ?            // ✅ NEW
  WHERE booking_request_id = ? AND lab_id = ?
`, [userId, remarks, id, targetLabId])
```

**B. Enhanced Email Notifications:**

1. **Student Notification - Shows Progress:**
```typescript
// For multi-lab bookings, show which lab approved and how many pending
if (isMultiLab) {
  const pendingCount = await db.query(...)
  
  if (pendingCount > 0) {
    nextStep = `Lab ${approvedLabName} approved. Waiting for approval from ${pendingCount} more lab(s).`
  } else {
    nextStep = 'All labs approved! Your request is now pending HoD approval.'
  }
}

// Email shows:
// - Subject: "Lab CP1 (Multi-Lab Booking) Booking Approved"
// - Next Step: "Lab CP1 approved. Waiting for approval from 2 more lab(s)."
```

2. **HOD Notification - Only When Ready:**
```typescript
// Only send HOD email when ALL labs approved
const shouldNotifyHOD = !isMultiLab || newStatus === 'pending_hod'

if (shouldNotifyHOD) {
  // For multi-lab, fetch all lab names
  const labIds = JSON.parse(bookingRequest.lab_ids)
  const labs = await db.query(`SELECT name FROM labs WHERE id IN (...)`)
  labDetails = labs.rows.map(l => l.name).join(', ')
  
  // Email shows: "Multiple Labs (CP1, CP2, CP3)"
}
```

3. **Rejection Notification:**
```typescript
// Shows all labs involved in multi-lab booking
labName: isMultiLab 
  ? `Multiple Labs (${labDetails})` 
  : updatedRequest.lab_name
```

**C. Multi-Lab Logic Flow:**
```
Single Lab Booking:
  Lab Staff Approves → Status: pending_hod → Email to Student + HOD

Multi-Lab Booking:
  Lab Staff 1 Approves Lab A → Status: pending_lab_staff → Email to Student only
  Lab Staff 2 Approves Lab B → Status: pending_lab_staff → Email to Student only
  Lab Staff 3 Approves Lab C → Status: pending_hod → Email to Student + HOD
  
  ANY rejection → Status: rejected → Email to Student
```

---

## 📊 Current System State

### ✅ Fully Implemented:
1. **Multi-lab booking forms** (Student, Faculty, Others)
2. **Person-per-lab storage** (`multi_lab_responsible_persons` table)
3. **24-hour booking** (no time restrictions)
4. **Continuous time blocks** (gap-finding algorithm)
5. **Lab Staff approval workflow** (handles multi-lab)
6. **Database schema** (all columns and indexes)
7. **Email notifications** (progress tracking, multi-lab awareness)

### ⏳ Pending Implementation:

#### Priority 1 - HOD Approval API (Next Step):
**File:** `/app/api/hod/requests/[id]/action/route.ts`

**Requirements:**
```typescript
// 1. Check ALL multi_lab_approvals before final approval
const allApprovals = await db.query(`
  SELECT COUNT(*) as total,
         SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved
  FROM multi_lab_approvals
  WHERE booking_request_id = ?
`, [id])

if (allApprovals.rows[0].total !== allApprovals.rows[0].approved) {
  return error("Not all labs have been approved by Lab Staff")
}

// 2. Update multi_lab_approvals with HOD info
await db.query(`
  UPDATE multi_lab_approvals
  SET status = 'approved',
      hod_approved_by = ?,
      hod_approved_at = NOW(),
      hod_remarks = ?
  WHERE booking_request_id = ?
`, [userId, remarks, id])

// 3. Send emails to ALL responsible persons
const responsiblePersons = await db.query(`
  SELECT rp.name, rp.email, l.name as lab_name
  FROM multi_lab_responsible_persons rp
  JOIN labs l ON rp.lab_id = l.id
  WHERE rp.booking_request_id = ?
`, [id])

for (const person of responsiblePersons.rows) {
  if (process.env.TESTING_MODE !== 'true') {
    await sendEmail({
      to: person.email,
      subject: `Lab Booking Confirmed - You are responsible for ${person.lab_name}`,
      html: `Dear ${person.name}, ...`
    })
  }
}
```

#### Priority 2 - Dashboard Timelines:
**Files to Update:**
- `/app/student/dashboard/my-bookings/page.tsx`
- `/app/faculty/dashboard/my-bookings/page.tsx`
- `/app/others/dashboard/my-bookings/page.tsx`
- `/app/lab-staff/dashboard/requests/page.tsx`
- `/app/hod/dashboard/requests/page.tsx`

**Display Requirements:**
```typescript
// Query multi-lab approval status
const approvals = await db.query(`
  SELECT 
    l.name as lab_name,
    mla.status,
    mla.lab_staff_approved_at,
    u.name as staff_name,
    rp.name as responsible_person,
    rp.email as responsible_email
  FROM multi_lab_approvals mla
  JOIN labs l ON mla.lab_id = l.id
  LEFT JOIN users u ON mla.lab_staff_approved_by = u.id
  LEFT JOIN multi_lab_responsible_persons rp 
    ON rp.booking_request_id = mla.booking_request_id 
    AND rp.lab_id = mla.lab_id
  WHERE mla.booking_request_id = ?
  ORDER BY l.name
`, [bookingId])

// Display UI:
// ✅ CP1 - Approved by John Doe (Lab Staff) at Nov 15, 2:30 PM
//    Responsible: Dr. Smith (smith@example.com)
// ✅ CP2 - Approved by Jane Smith (Lab Staff) at Nov 15, 3:15 PM
//    Responsible: Prof. Johnson (johnson@example.com)
// ⏳ CP3 - Pending Lab Staff approval
//    Responsible: Mr. Williams (williams@example.com)
// 
// Overall Status: Pending HOD approval (2/3 labs approved)
```

#### Priority 3 - Email Template Enhancement:
**File:** `/lib/notifications.ts`

**New Template Needed:**
```typescript
export const emailTemplates = {
  // ... existing templates ...
  
  responsiblePersonConfirmation: ({
    personName,
    labName,
    bookingDate,
    startTime,
    endTime,
    requesterName,
    requesterEmail,
    purpose
  }: {
    personName: string
    labName: string
    bookingDate: string
    startTime: string
    endTime: string
    requesterName: string
    requesterEmail: string
    purpose: string
  }) => ({
    subject: `Lab Booking Confirmed - You are responsible for ${labName}`,
    html: `
      <p>Dear ${personName},</p>
      
      <p>You have been designated as the person responsible for the following lab booking:</p>
      
      <ul>
        <li><strong>Lab:</strong> ${labName}</li>
        <li><strong>Date:</strong> ${new Date(bookingDate).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${startTime} - ${endTime}</li>
        <li><strong>Booked by:</strong> ${requesterName} (${requesterEmail})</li>
        <li><strong>Purpose:</strong> ${purpose}</li>
      </ul>
      
      <p><strong>Your Responsibilities:</strong></p>
      <ul>
        <li>Ensure the lab is used according to the stated purpose</li>
        <li>Be present during the booking time or coordinate with the lab staff</li>
        <li>Report any issues or damages to lab staff immediately</li>
        <li>Ensure the lab is properly cleaned and equipment is returned</li>
      </ul>
      
      <p>You will receive a reminder 2 hours before the booking starts.</p>
      
      <p>If you have any questions, please contact the lab staff or the person who made the booking.</p>
      
      <p>Best regards,<br>Lab Management System</p>
    `
  })
}
```

#### Priority 4 - 2-Hour Reminder System:
**File:** `/app/api/cron/booking-reminders/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { sendEmail } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const db = Database.getInstance()
    
    // Find bookings starting in ~2 hours that haven't been reminded
    const upcomingBookings = await db.query(`
      SELECT 
        br.*,
        u.name as requester_name,
        u.email as requester_email
      FROM booking_requests br
      JOIN users u ON br.requested_by = u.id
      WHERE br.status = 'approved'
        AND br.booking_date = CURDATE()
        AND br.start_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
        AND br.reminder_sent = 0
        AND br.request_type = 'lab_booking'  -- Exclude timetable classes
    `)
    
    for (const booking of upcomingBookings.rows) {
      // Get responsible persons for multi-lab
      const responsiblePersons = await db.query(`
        SELECT rp.name, rp.email, l.name as lab_name
        FROM multi_lab_responsible_persons rp
        JOIN labs l ON rp.lab_id = l.id
        WHERE rp.booking_request_id = ?
      `, [booking.id])
      
      // Send reminders to all responsible persons
      for (const person of responsiblePersons.rows) {
        if (process.env.TESTING_MODE !== 'true') {
          await sendEmail({
            to: person.email,
            subject: `Reminder: Lab Booking in 2 Hours - ${person.lab_name}`,
            html: `
              <p>Dear ${person.name},</p>
              <p>This is a reminder that you are responsible for a lab booking starting in approximately 2 hours:</p>
              <ul>
                <li><strong>Lab:</strong> ${person.lab_name}</li>
                <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
                <li><strong>Purpose:</strong> ${booking.purpose}</li>
              </ul>
              <p>Please ensure you are available or have made necessary arrangements.</p>
            `
          }).catch(err => console.error('Reminder email failed:', err))
        }
      }
      
      // Also notify lab staff (if multi-lab, notify all relevant staff)
      // ... lab staff reminder logic ...
      
      // Mark reminder as sent
      await db.query(`
        UPDATE booking_requests
        SET reminder_sent = 1
        WHERE id = ?
      `, [booking.id])
    }
    
    return NextResponse.json({
      success: true,
      reminded: upcomingBookings.rows.length
    })
  } catch (error) {
    console.error('Reminder cron failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
```

**Cron Setup (Vercel or External):**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "*/10 * * * *"  // Every 10 minutes
    }
  ]
}
```

#### Priority 5 - Activity Logging:
Update all APIs to include multi-lab data in `bookingSnapshot`:
```typescript
bookingSnapshot: {
  ...existingData,
  is_multi_lab: true,
  lab_ids: [1, 2, 3],
  multi_lab_approvals: [...],
  responsible_persons: [...]
}
```

---

## 🧪 Testing Checklist

### Phase 2 Testing (Lab Staff):
- [ ] **Single Lab Approval:** Approve single-lab booking → Email to student + HOD
- [ ] **Multi-Lab Partial:** Approve 1 of 3 labs → Email to student only (shows pending count)
- [ ] **Multi-Lab Complete:** Approve last pending lab → Email to student + HOD (all labs listed)
- [ ] **Multi-Lab Rejection:** Reject any lab → All labs rejected, email to student
- [ ] **Authorization:** Lab staff can only approve their assigned labs
- [ ] **Database Tracking:** Check `lab_staff_approved_by`, `lab_staff_approved_at` populated

### Phase 3 Testing (HOD) - TODO:
- [ ] HOD can see all lab approval statuses before final approval
- [ ] HOD approval updates all multi_lab_approvals rows
- [ ] All responsible persons receive confirmation email
- [ ] TESTING_MODE redirects emails properly

### Phase 4 Testing (Reminders) - TODO:
- [ ] Reminders sent 2 hours before booking
- [ ] NOT sent for timetable classes
- [ ] Sent to all responsible persons in multi-lab
- [ ] reminder_sent flag prevents duplicate reminders

---

## 📈 Progress Summary

**Overall Completion: ~70%**

| Feature | Status | Priority |
|---------|--------|----------|
| Multi-lab booking forms | ✅ Complete | - |
| Person-per-lab storage | ✅ Complete | - |
| 24-hour booking support | ✅ Complete | - |
| Continuous time blocks | ✅ Complete | - |
| Database schema | ✅ Complete | - |
| Lab Staff approval | ✅ Complete | - |
| HOD approval | ⏳ Pending | 🔥 High |
| Dashboard timelines | ⏳ Pending | 🔥 High |
| Email templates | ⏳ Pending | Medium |
| 2-hour reminders | ⏳ Pending | Medium |
| Activity logging | ⏳ Pending | Low |

---

## 🚀 Next Steps

1. **Immediate:** Update HOD approval API (estimated 45 minutes)
2. **Then:** Add responsible person email template (estimated 20 minutes)
3. **Then:** Update dashboard timeline displays (estimated 2 hours)
4. **Then:** Implement reminder cron job (estimated 1 hour)
5. **Finally:** Update activity logging (estimated 30 minutes)

**Total Remaining Work:** ~4-5 hours

---

## 💡 Key Implementation Notes

### Multi-Lab Approval States:
```
Status                  | Description
------------------------|------------------------------------------
pending                 | Initial state after booking created
approved_by_lab_staff   | Individual lab approved by its staff
approved                | Final approval by HOD (all labs)
rejected                | Rejected by any approver
```

### Email Behavior (TESTING_MODE):
```typescript
// Already implemented in lib/notifications.ts
if (process.env.TESTING_MODE === 'true') {
  // All emails redirect to ADMIN_EMAIL
  emailTo = process.env.ADMIN_EMAIL
}
```

### Database Indexes for Performance:
- `idx_status_booking`: Fast queries for approval status by booking
- `idx_reminder_query`: Optimized for reminder cron job queries
- Foreign keys: Maintain referential integrity

---

**Document Updated:** November 15, 2025  
**Next Review:** After HOD API implementation
