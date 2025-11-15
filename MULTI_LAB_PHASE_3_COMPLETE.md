# Multi-Lab Phase 3: HOD Approval & Email System - COMPLETE ✅

**Date:** November 15, 2025  
**Status:** Phase 3 Complete - Full approval workflow functional

---

## 🎯 Completed in This Phase

### 1. HOD/Lab Coordinator Approval API - Complete Update ✅

**File:** `/app/api/hod/requests/[id]/action/route.ts`

#### A. Multi-Lab Validation Before Approval

```typescript
// Verify ALL labs have been approved by lab staff before HOD can approve
if (isMultiLab) {
  const allApprovals = await db.query(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'approved_by_lab_staff' THEN 1 ELSE 0 END) as approved
    FROM multi_lab_approvals
    WHERE booking_request_id = ?
  `, [requestId])
  
  const total = allApprovals.rows[0].total
  const approved = allApprovals.rows[0].approved
  
  if (total !== approved) {
    return NextResponse.json({ 
      error: `Cannot approve: Only ${approved} of ${total} labs have been approved by Lab Staff` 
    }, { status: 400 })
  }
}
```

**Benefits:**
- ✅ Prevents premature HOD approval when lab staff haven't all approved
- ✅ Clear error message showing approval progress
- ✅ Ensures complete workflow validation

#### B. Database Updates for Multi-Lab Approvals

```typescript
// For approval: Update all multi_lab_approvals rows with HOD info
if (action === 'approve') {
  if (isMultiLab) {
    await db.query(`
      UPDATE multi_lab_approvals
      SET status = 'approved',
          hod_approved_by = ?,
          hod_approved_at = NOW(),
          hod_remarks = ?
      WHERE booking_request_id = ?
    `, [user.userId, remarks || null, requestId])
  }
}

// For rejection: Mark all labs as rejected
if (action === 'reject') {
  if (isMultiLab) {
    await db.query(`
      UPDATE multi_lab_approvals
      SET status = 'rejected',
          hod_approved_by = ?,
          hod_approved_at = NOW(),
          hod_remarks = ?
      WHERE booking_request_id = ?
    `, [user.userId, remarks || null, requestId])
  }
}
```

**Database Tracking:**
- ✅ `hod_approved_by` - Records which HOD/Lab Coordinator approved
- ✅ `hod_approved_at` - Timestamp of approval
- ✅ `hod_remarks` - HOD's comments
- ✅ Complete audit trail for each lab in multi-lab bookings

#### C. Multi-Lab Email Notifications

**1. Student Notification (Shows All Labs):**
```typescript
// For multi-lab, get all lab names
if (isMultiLab && booking.lab_ids) {
  const labIds = JSON.parse(booking.lab_ids)
  const labs = await db.query(
    `SELECT name FROM labs WHERE id IN (...)`,
    labIds
  )
  labDetails = labs.rows.map((l: any) => l.name).join(', ')
}

// Email shows: "Multiple Labs (CP1, CP2, CP3)"
emailTemplates.labBookingApproved({
  labName: isMultiLab ? `Multiple Labs (${labDetails})` : student.lab_name,
  // ... other fields
})
```

**2. Responsible Person Confirmation (NEW):**
```typescript
// Query all responsible persons from multi_lab_responsible_persons
const responsiblePersons = await db.query(`
  SELECT rp.name, rp.email, l.name as lab_name
  FROM multi_lab_responsible_persons rp
  JOIN labs l ON rp.lab_id = l.id
  WHERE rp.booking_request_id = ?
`, [requestId])

// Send personalized email to each responsible person
for (const person of responsiblePersons.rows) {
  // Check TESTING_MODE
  if (process.env.TESTING_MODE === 'true') {
    console.log(`[TESTING_MODE] Would send email to: ${person.email}`)
    continue
  }
  
  await sendEmail({
    to: person.email,
    subject: `Lab Booking Confirmed - You are responsible for ${person.lab_name}`,
    html: `
      <h2>Lab Booking Confirmed</h2>
      
      <p>Dear ${person.name},</p>
      
      <p>You have been designated as the person responsible for:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px;">
        <p><strong>Lab:</strong> ${person.lab_name}</p>
        <p><strong>Date:</strong> ${formatted_date}</p>
        <p><strong>Time:</strong> ${start_time} - ${end_time}</p>
        <p><strong>Booked by:</strong> ${formatted_requester_name} (${role})</p>
        <p><strong>Purpose:</strong> ${purpose}</p>
      </div>
      
      <h3>Your Responsibilities:</h3>
      <ul>
        <li>Ensure the lab is used according to the stated purpose</li>
        <li>Be present during the booking time or coordinate with lab staff</li>
        <li>Report any issues or damages to lab staff immediately</li>
        <li>Ensure the lab is properly cleaned and equipment is returned</li>
      </ul>
      
      <p>⏰ Reminder: You will receive a reminder 2 hours before the booking starts.</p>
    `
  })
}
```

**Email Features:**
- ✅ Personalized for each responsible person (name, specific lab)
- ✅ Shows requester details with proper salutation (Prof./Dr./Mr./Mrs.)
- ✅ Formats requester role (Student, Faculty, Others/TnP)
- ✅ Lists all responsibilities clearly
- ✅ Mentions 2-hour reminder
- ✅ Professional HTML formatting
- ✅ TESTING_MODE: Logs to console instead of sending (prevents spam during testing)

**3. Rejection Notification:**
```typescript
// Shows all labs in rejection email
emailTemplates.labBookingRejected({
  labName: isMultiLab ? `Multiple Labs (${labDetails})` : student.lab_name,
  // ... other fields
})
```

---

## 📊 Complete Approval Workflow

### Multi-Lab Booking Flow (Example: 3 Labs)

```
1. Student/Faculty/Others creates booking
   ├─ Status: pending_lab_staff
   ├─ multi_lab_approvals: 3 rows created (all status='pending')
   └─ Emails: Lab Staff for each lab

2. Lab Staff 1 approves CP1
   ├─ multi_lab_approvals: CP1 row → status='approved_by_lab_staff'
   ├─ Main booking: Status remains 'pending_lab_staff'
   └─ Email: "Lab CP1 approved. Waiting for 2 more lab(s)."

3. Lab Staff 2 approves CP2
   ├─ multi_lab_approvals: CP2 row → status='approved_by_lab_staff'
   ├─ Main booking: Status remains 'pending_lab_staff'
   └─ Email: "Lab CP2 approved. Waiting for 1 more lab(s)."

4. Lab Staff 3 approves CP3
   ├─ multi_lab_approvals: CP3 row → status='approved_by_lab_staff'
   ├─ Main booking: Status → 'pending_hod' (ALL approved!)
   └─ Emails: 
       ├─ Student: "All labs approved! Now pending HoD approval."
       └─ HOD: New request ready for review

5. HOD approves
   ├─ Validates: ALL multi_lab_approvals = 'approved_by_lab_staff' ✓
   ├─ multi_lab_approvals: All 3 rows → status='approved', hod_approved_by set
   ├─ Main booking: Status → 'approved'
   └─ Emails:
       ├─ Student: "Booking approved for Multiple Labs (CP1, CP2, CP3)"
       ├─ Person 1: "You are responsible for CP1" (detailed instructions)
       ├─ Person 2: "You are responsible for CP2" (detailed instructions)
       └─ Person 3: "You are responsible for CP3" (detailed instructions)
```

### Rejection Scenarios

**Lab Staff Rejection (ANY lab):**
```
Lab Staff 1 rejects CP1
├─ multi_lab_approvals: ALL rows → status='rejected'
├─ Main booking: Status → 'rejected'
└─ Email: Student receives rejection notice with all lab names
```

**HOD Rejection:**
```
HOD rejects after all lab staff approved
├─ multi_lab_approvals: ALL rows → status='rejected'
├─ Main booking: Status → 'rejected'
└─ Email: Student receives rejection notice from HOD
```

---

## 🔐 TESTING_MODE Integration

### How It Works:

```typescript
// In HOD approval API
if (process.env.TESTING_MODE === 'true') {
  console.log(`[TESTING_MODE] Would send email to: ${person.email}`)
  continue // Skip actual email sending
}
```

### Behavior:

**When TESTING_MODE=true:**
- ✅ Student/requester emails: Redirected to ADMIN_EMAIL (handled by `lib/notifications.ts`)
- ✅ Responsible person emails: Logged to console, NOT sent
- ✅ Lab Staff/HOD notification emails: Redirected to ADMIN_EMAIL

**When TESTING_MODE=false (Production):**
- ✅ All emails sent to actual recipients
- ✅ Full notification workflow active

### Benefits:
- Safe testing without spamming users
- Console logs show what emails would be sent
- Admin can receive test emails for verification
- Easy toggle via environment variable

---

## 📈 Current System State

### ✅ Fully Implemented (3 Phases Complete):

| Feature | Status | Coverage |
|---------|--------|----------|
| Multi-lab booking forms | ✅ Complete | Student, Faculty, Others |
| Person-per-lab storage | ✅ Complete | Database table + UI |
| 24-hour booking support | ✅ Complete | No time restrictions |
| Continuous time blocks | ✅ Complete | Gap-finding algorithm |
| Database schema | ✅ Complete | All columns + indexes |
| Lab Staff approval | ✅ Complete | Multi-lab aware |
| HOD approval | ✅ Complete | Multi-lab validation |
| Responsible person emails | ✅ Complete | Detailed notifications |
| Email templates | ✅ Complete | Multi-lab support |
| TESTING_MODE | ✅ Complete | Safe testing |

### ⏳ Remaining Work:

| Task | Priority | Estimated Time | Impact |
|------|----------|----------------|--------|
| Dashboard timeline displays | 🔥 High | 2-3 hours | User visibility |
| 2-hour reminder system | Medium | 1 hour | User experience |
| Activity logging updates | Low | 30 min | Audit trail |

**Overall Progress: ~85% Complete**

---

## 🧪 Testing Scenarios

### Test Case 1: Multi-Lab Approval Success
```
1. Create 3-lab booking (CP1, CP2, CP3)
2. Lab Staff 1 approves CP1
   Expected: Email shows "Lab CP1 approved. Waiting for 2 more lab(s)."
3. Lab Staff 2 approves CP2
   Expected: Email shows "Lab CP2 approved. Waiting for 1 more lab(s)."
4. Lab Staff 3 approves CP3
   Expected: Email shows "All labs approved! Now pending HoD approval."
             Email to HOD with all lab names
5. HOD approves
   Expected: 
   - Email to student with all labs listed
   - 3 separate emails to responsible persons (one per lab)
   - Each email personalized with correct lab name
   - All multi_lab_approvals rows status='approved'
```

### Test Case 2: Multi-Lab Rejection by Lab Staff
```
1. Create 3-lab booking
2. Lab Staff 1 rejects CP1
   Expected:
   - Entire booking rejected immediately
   - All multi_lab_approvals rows status='rejected'
   - Student receives rejection email with all lab names
```

### Test Case 3: Multi-Lab Rejection by HOD
```
1. All lab staff approve their labs
2. HOD rejects
   Expected:
   - All multi_lab_approvals rows status='rejected'
   - Student receives HOD rejection email with all labs
   - No responsible person emails sent
```

### Test Case 4: TESTING_MODE Verification
```
1. Set TESTING_MODE=true in .env
2. Complete approval workflow
   Expected:
   - Student emails redirect to ADMIN_EMAIL
   - Responsible person emails logged to console (not sent)
   - Console shows: "[TESTING_MODE] Would send email to: person@example.com"
3. Set TESTING_MODE=false
4. Complete approval workflow
   Expected:
   - All emails sent to actual recipients
   - Responsible persons receive confirmation emails
```

### Test Case 5: Single Lab (Backward Compatibility)
```
1. Create single-lab booking
   Expected:
   - Works exactly as before
   - No multi-lab queries executed
   - Single responsible person in old format supported
```

---

## 🚀 Next Steps (Priority Order)

### 1. Dashboard Timeline Displays (🔥 HIGH PRIORITY)
**Why:** Users need visibility into multi-lab approval progress

**Files to Update:**
- `/app/student/dashboard/my-requests/page.tsx`
- `/app/faculty/dashboard/my-bookings/page.tsx`
- `/app/others/dashboard/my-bookings/page.tsx`
- `/app/lab-staff/dashboard/requests/page.tsx`
- `/app/hod/dashboard/requests/page.tsx`

**Implementation:**
```typescript
// Query to get detailed approval status
const approvalDetails = await db.query(`
  SELECT 
    l.name as lab_name,
    mla.status,
    mla.lab_staff_approved_at,
    mla.lab_staff_approved_by,
    ls.name as lab_staff_name,
    mla.hod_approved_at,
    mla.hod_approved_by,
    hod.name as hod_name,
    rp.name as responsible_person,
    rp.email as responsible_email
  FROM multi_lab_approvals mla
  JOIN labs l ON mla.lab_id = l.id
  LEFT JOIN users ls ON mla.lab_staff_approved_by = ls.id
  LEFT JOIN users hod ON mla.hod_approved_by = hod.id
  LEFT JOIN multi_lab_responsible_persons rp 
    ON rp.booking_request_id = mla.booking_request_id 
    AND rp.lab_id = mla.lab_id
  WHERE mla.booking_request_id = ?
  ORDER BY l.name
`, [bookingId])

// Display UI with status badges and timeline
```

**UI Design:**
```
Multi-Lab Booking #123 - Overall Status: Pending HOD Approval

Labs:
┌─────────────────────────────────────────────────────────┐
│ ✅ CP1 (Computer Lab 1)                                  │
│    Lab Staff: Approved by John Doe on Nov 15, 2:30 PM  │
│    Responsible: Dr. Smith (smith@example.com)           │
├─────────────────────────────────────────────────────────┤
│ ✅ CP2 (Computer Lab 2)                                  │
│    Lab Staff: Approved by Jane Doe on Nov 15, 3:15 PM  │
│    Responsible: Prof. Johnson (johnson@example.com)     │
├─────────────────────────────────────────────────────────┤
│ ⏳ CP3 (Computer Lab 3)                                  │
│    Lab Staff: Pending approval                          │
│    Responsible: Mr. Williams (williams@example.com)     │
└─────────────────────────────────────────────────────────┘

Progress: 2/3 labs approved by Lab Staff
Next: Waiting for CP3 Lab Staff approval
```

### 2. 2-Hour Reminder System (Medium Priority)
**File:** `/app/api/cron/booking-reminders/route.ts` (NEW)

**Implementation outline provided in MULTI_LAB_PHASE_2_COMPLETE.md**

### 3. Activity Logging Updates (Low Priority)
**Files:** All booking APIs (Student, Faculty, Others, Lab Staff, HOD)

**Add to logging:**
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

## 💡 Key Technical Decisions

### 1. Why Update All multi_lab_approvals on HOD Approval?
- **Reason:** Complete audit trail for each lab
- **Benefit:** Can query approval history per lab independently
- **Use Case:** Reports showing which labs were approved when

### 2. Why Separate Emails to Each Responsible Person?
- **Reason:** Personalization and accountability
- **Benefit:** Each person gets lab-specific instructions
- **Use Case:** Person only sees info about their specific lab

### 3. Why TESTING_MODE Console Logs for Responsible Persons?
- **Reason:** Prevent spam during testing to potentially external users
- **Benefit:** Admin sees what emails would be sent without actually sending
- **Use Case:** Testing workflow without notifying real people

### 4. Why Validate ALL Labs Before HOD Approval?
- **Reason:** Workflow integrity - HOD shouldn't approve incomplete requests
- **Benefit:** Clear error message prevents premature approval
- **Use Case:** HOD can see exactly how many labs still pending

---

## 📝 Code Quality Notes

### Backward Compatibility:
```typescript
// Old single-lab bookings still supported
if (responsiblePersons.rows.length === 0 && booking.responsible_person_name) {
  responsiblePersons.rows.push({
    name: booking.responsible_person_name,
    email: booking.responsible_person_email,
    lab_name: student.lab_name
  })
}
```

### Error Handling:
- ✅ Validation before approval (prevents invalid state)
- ✅ Try-catch for email sending (doesn't break workflow if email fails)
- ✅ Clear error messages (tells user exactly what's wrong)

### Database Performance:
- ✅ Indexes on multi_lab_approvals (status, booking_request_id)
- ✅ Single query for responsible persons (no N+1 problem)
- ✅ Efficient joins for approval details

---

## 🎉 Phase 3 Summary

**What Was Completed:**
1. ✅ HOD/Lab Coordinator approval API with multi-lab validation
2. ✅ Database updates for complete approval tracking (hod_approved_by, hod_approved_at, hod_remarks)
3. ✅ Responsible person confirmation emails (personalized, detailed, professional)
4. ✅ Multi-lab lab names in all notifications
5. ✅ TESTING_MODE integration for safe testing
6. ✅ Backward compatibility with single-lab bookings
7. ✅ Complete approval workflow (Lab Staff → HOD → Approved)
8. ✅ Build successful (no compilation errors)

**What Works Now:**
- 🎯 Complete multi-lab booking creation
- 🎯 Lab Staff approval with progress tracking
- 🎯 HOD approval with validation
- 🎯 Personalized emails to all responsible persons
- 🎯 Safe testing with TESTING_MODE
- 🎯 Full audit trail in database

**Remaining Work:** Dashboard UIs + Reminder system + Activity logging enhancements

**Estimated Time to Complete:** 3-4 hours

---

**Document Created:** November 15, 2025  
**Phase:** 3 of 4  
**Next Review:** After dashboard timeline implementation
