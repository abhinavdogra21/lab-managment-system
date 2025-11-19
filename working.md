# How the System Works (Detailed Request Flows)

## Table of Contents
1. [Lab Booking Workflow](#1-lab-booking-workflow)
2. [Component Request Workflow](#2-component-request-workflow)
3. [Multi-Lab Booking Deep Dive](#3-multi-lab-booking-deep-dive)
4. [Approval Authority Logic](#4-approval-authority-logic)
5. [Email Notification Triggers](#5-email-notification-triggers)
6. [Automated Reminder System](#6-automated-reminder-system)
7. [Timeline Construction](#7-timeline-construction)
8. [Activity Logging](#8-activity-logging)
9. [Code References](#9-code-references)

---

## 1. Lab Booking Workflow

### 1.1 Student Lab Booking (Complete Flow)

#### **Step 1: Submission**
**User Action:**
- Student navigates to `/student/dashboard/book-lab`
- Fills form: purpose, date/time, lab selection (single or multiple), faculty supervisor, responsible person per lab
- Clicks "Submit"

**Backend Process:**
```typescript
// File: app/api/student/booking-requests/route.ts
1. Authenticate user and verify role = 'student'
2. Validate required fields (faculty_supervisor_id, purpose, booking_date, time_from, time_to)
3. Parse lab_ids (JSON array)
4. Insert into booking_requests:
   - status: 'pending_faculty'
   - request_type: 'lab_booking'
   - is_multi_lab: true/false (based on lab count)
   - created_by: student_id
5. For multi-lab:
   - Insert into multi_lab_approvals (one row per lab, status='pending_lab_staff')
   - Insert into multi_lab_responsible_persons (one row per lab)
6. Log activity in system_logs (action: 'created_booking')
7. Send email to faculty supervisor (emailTemplates.labBookingCreated)
```

**Database State:**
```sql
booking_requests: {
  id: 123,
  request_type: 'lab_booking',
  status: 'pending_faculty',
  is_multi_lab: true,
  lab_ids: [1, 2, 3],
  created_by: student_id,
  faculty_supervisor_id: faculty_id,
  ...
}

multi_lab_approvals: [
  { booking_id: 123, lab_id: 1, status: 'pending_lab_staff', lab_staff_approved_by: null },
  { booking_id: 123, lab_id: 2, status: 'pending_lab_staff', lab_staff_approved_by: null },
  { booking_id: 123, lab_id: 3, status: 'pending_lab_staff', lab_staff_approved_by: null }
]

multi_lab_responsible_persons: [
  { booking_id: 123, lab_id: 1, name: 'Person A', email: 'a@lnmiit.ac.in', ... },
  { booking_id: 123, lab_id: 2, name: 'Person B', email: 'b@lnmiit.ac.in', ... },
  { booking_id: 123, lab_id: 3, name: 'Person C', email: 'c@lnmiit.ac.in', ... }
]
```

---

#### **Step 2: Faculty Approval**
**User Action:**
- Faculty logs in, sees notification/dashboard alert
- Navigates to `/faculty/dashboard/requests`
- Reviews request details (purpose, date, labs, student)
- Clicks "Approve" or "Reject" with optional comment

**Backend Process:**
```typescript
// File: app/api/faculty/requests/[id]/action/route.ts
1. Authenticate faculty and verify supervisor relationship
2. Update booking_requests:
   - If approve: status: 'pending_lab_staff', faculty_approved_at: NOW(), faculty_approved_by: faculty_id
   - If reject: status: 'rejected', rejection_reason: comment
3. Log activity (action: 'approved_by_faculty' or 'rejected_by_faculty')
4. Send email:
   - To student: labBookingApproved or labBookingRejected
   - To lab staff (if approved): labBookingCreated (for their review)
```

**Database State (if approved):**
```sql
booking_requests: {
  id: 123,
  status: 'pending_lab_staff',
  faculty_approved_at: '2024-01-15 10:30:00',
  faculty_approved_by: faculty_id,
  ...
}
```

**Timeline Update:**
- Student sees: "✅ Approved by Prof. [Name] on Jan 15, 2024 at 10:30 AM"

---

#### **Step 3: Lab Staff Approval (Per Lab)**
**User Action:**
- Head lab staff of Lab 1 logs in
- Navigates to `/lab-staff/dashboard/approve`
- Sees ONLY requests for Lab 1 (filtered by `labs.staff_id = current_user.id`)
- Reviews request, checks availability, resources
- Clicks "Approve" or "Reject" for Lab 1

**Backend Process:**
```typescript
// File: app/api/lab-staff/requests/[id]/action/route.ts
1. Authenticate lab staff and verify they are head staff of the requested lab
2. For multi-lab:
   - Update multi_lab_approvals WHERE booking_id=123 AND lab_id=1:
     - status: 'approved' or 'rejected'
     - lab_staff_approved_by: staff_id, lab_staff_approved_at: NOW()
   - Check if ALL labs approved:
     - Query: SELECT COUNT(*) WHERE booking_id=123 AND status='approved'
     - If count == total labs: Update booking_requests.status = 'pending_hod'
     - Else: Keep status = 'pending_lab_staff'
3. For single-lab:
   - Update booking_requests.status = 'pending_hod'
4. Log activity (action: 'approved_by_lab_staff_lab_1')
5. Send email:
   - To student (if all labs approved): labBookingForwarded to HOD
   - To HOD/Coordinator: labBookingCreated (for final approval)
```

**Database State (Lab 1 approved, Labs 2 & 3 pending):**
```sql
multi_lab_approvals: [
  { booking_id: 123, lab_id: 1, status: 'approved', lab_staff_approved_by: 10, lab_staff_approved_at: NOW() },
  { booking_id: 123, lab_id: 2, status: 'pending_lab_staff', ... },
  { booking_id: 123, lab_id: 3, status: 'pending_lab_staff', ... }
]

booking_requests: {
  status: 'pending_lab_staff' (still waiting for Labs 2 & 3)
}
```

**Process for Labs 2 & 3:**
- Head lab staff of Lab 2 and Lab 3 repeat the same process
- Once all approve, `booking_requests.status` becomes `'pending_hod'`

---

#### **Step 4: HOD/Coordinator Final Approval**
**User Action:**
- HOD/Coordinator logs in
- Navigates to `/hod/dashboard/requests` or `/lab-coordinator/dashboard/requests`
- Sees request with all lab approvals completed
- Reviews timeline: Faculty ✅, Lab Staff (Lab 1) ✅, Lab Staff (Lab 2) ✅, Lab Staff (Lab 3) ✅
- Clicks "Approve" or "Reject"

**Backend Process:**
```typescript
// File: app/api/hod/requests/[id]/action/route.ts
1. Authenticate HOD/Coordinator and verify department authority
2. Check department.highest_approval_authority:
   - If 'hod': Require user.role = 'hod'
   - If 'lab_coordinator': Allow user.role = 'lab_coordinator'
3. Update booking_requests:
   - If approve: status: 'approved', hod_approved_at: NOW(), hod_approved_by: user_id
   - If reject: status: 'rejected', rejection_reason: comment
4. Log activity (action: 'approved_by_hod' or 'rejected_by_hod')
5. Send email:
   - To student: labBookingApproved (with final confirmation)
   - To faculty supervisor: labBookingApproved
   - To all responsible persons: labBookingApproved
```

**Database State (Final Approval):**
```sql
booking_requests: {
  id: 123,
  status: 'approved',
  hod_approved_at: '2024-01-15 15:00:00',
  hod_approved_by: hod_id,
  ...
}
```

**Timeline Final View:**
```
✅ Submitted by John Doe on Jan 15, 2024 at 9:00 AM
✅ Approved by Prof. Jane Smith (Faculty) on Jan 15, 2024 at 10:30 AM
✅ Approved by Mr. A (Lab Staff, Lab 1) on Jan 15, 2024 at 12:00 PM
✅ Approved by Mr. B (Lab Staff, Lab 2) on Jan 15, 2024 at 13:00 PM
✅ Approved by Mr. C (Lab Staff, Lab 3) on Jan 15, 2024 at 14:00 PM
✅ Approved by Dr. X (HOD) on Jan 15, 2024 at 3:00 PM
```

---

#### **Step 5: 2-Hour Reminder (Automated)**
**Trigger:** Cron job runs hourly

**Backend Process:**
```typescript
// File: app/api/cron/booking-reminders/route.ts
1. Query: Find bookings WHERE:
   - status = 'approved'
   - request_type = 'lab_booking'
   - reminder_sent = 0
   - booking_date + time_from BETWEEN NOW() AND NOW() + 2 hours
2. For each booking:
   - Parse lab_ids
   - Fetch head lab staff for each lab (labs.staff_id)
   - Fetch responsible persons from multi_lab_responsible_persons
   - Filter responsible persons by lab_id (ensures Lab 1 staff gets Lab 1 person only)
3. Send email (emailTemplates.labBookingReminder) to:
   - Each head lab staff
   - Each responsible person
4. Update booking_requests.reminder_sent = 1
```

**Email Recipients:**
- Head Lab Staff of Lab 1 (from `labs.staff_id`)
- Responsible Person A (from `multi_lab_responsible_persons` WHERE `lab_id=1`)
- Head Lab Staff of Lab 2
- Responsible Person B (WHERE `lab_id=2`)
- Head Lab Staff of Lab 3
- Responsible Person C (WHERE `lab_id=3`)

---

### 1.2 Faculty Lab Booking (Self-Booking)

#### **Difference from Student Flow:**
- **No faculty approval step** (skips pending_faculty)
- **Flow:** Submit → Pending Lab Staff → Pending HOD → Approved
- Status sequence: `'pending_lab_staff'` → `'pending_hod'` → `'approved'`

#### **Code Reference:**
```typescript
// File: app/api/faculty/booking-requests/route.ts
// Initial status is set to 'pending_lab_staff' instead of 'pending_faculty'
status: 'pending_lab_staff'
```

---

### 1.3 Others (T&P) Lab Booking

#### **Difference from Student Flow:**
- **No faculty approval** (like faculty self-booking)
- **Flow:** Submit → Pending Lab Staff → Pending HOD → Approved
- Status sequence: Same as faculty

#### **Code Reference:**
```typescript
// File: app/api/others/booking-requests/route.ts
// Same logic as faculty booking
```

---

## 2. Component Request Workflow

### 2.1 Student Component Request (Complete Flow)

#### **Step 1: Request Submission**
**User Action:**
- Student navigates to `/student/dashboard/request-components`
- Selects component name, quantity, purpose, faculty mentor
- Clicks "Submit"

**Backend Process:**
```typescript
// File: app/api/student/component-requests/route.ts
1. Validate fields (component_name, quantity, purpose, faculty_id)
2. Insert into component_requests:
   - status: 'pending_faculty'
   - request_type: 'component'
   - requested_by: student_id
3. Log activity (action: 'created_component_request')
4. Send email to faculty (emailTemplates.componentRequestCreated)
```

---

#### **Step 2: Faculty Approval**
**User Action:**
- Faculty reviews request in `/faculty/dashboard/component-requests`
- Approves or rejects

**Backend Process:**
```typescript
// File: app/api/faculty/component-requests/[id]/action/route.ts
1. Update component_requests:
   - If approve: status: 'pending_lab_staff', faculty_approved_at: NOW()
   - If reject: status: 'rejected'
2. Log activity
3. Send email to student and lab staff
```

---

#### **Step 3: Lab Staff Approval**
**Backend Process:**
```typescript
// File: app/api/lab-staff/component-requests/[id]/action/route.ts
1. Update component_requests:
   - If approve: status: 'pending_hod'
   - If reject: status: 'rejected'
2. Send email to HOD
```

---

#### **Step 4: HOD Final Approval**
**Backend Process:**
```typescript
// File: app/api/hod/component-requests/[id]/action/route.ts
1. Update component_requests:
   - If approve: status: 'approved'
2. Send email to lab staff (ready to issue)
```

---

#### **Step 5: Lab Staff Issues Components**
**User Action:**
- Lab staff navigates to `/lab-staff/dashboard/component-requests`
- Reviews approved requests
- Issues components to student

**Backend Process:**
```typescript
// File: app/api/lab-staff/component-requests/[id]/issue/route.ts
1. Update component_requests.status = 'issued'
2. Insert into component_loans:
   - due_date, quantity, issued_by, issued_to
3. Update lab inventory (decrement quantity)
4. Send email (emailTemplates.componentsIssued) to student
5. Log activity
```

---

#### **Step 6: Return Request**
**User Action:**
- Student navigates to `/student/dashboard/my-component-loans`
- Clicks "Request Return"

**Backend Process:**
```typescript
// File: app/api/student/component-loans/[id]/request-return/route.ts
1. Update component_loans.return_request_status = 'pending'
2. Update component_requests.status = 'return_requested'
3. Send email to lab staff (emailTemplates.returnRequested)
```

---

#### **Step 7: Return Approval**
**User Action:**
- Lab staff reviews return request
- Approves return

**Backend Process:**
```typescript
// File: app/api/lab-staff/component-loans/[id]/action/route.ts
1. Update component_loans:
   - return_request_status: 'approved'
   - returned_at: NOW()
2. Update component_requests.status = 'returned'
3. Restore inventory (increment quantity)
4. Send email to student (emailTemplates.returnApproved)
5. Log activity
```

---

### 2.2 Extension Request Workflow

#### **Step 1: Request Extension**
**User Action:**
- Student sees overdue warning or approaching due date
- Clicks "Request Extension" and specifies new date + reason

**Backend Process:**
```typescript
// File: app/api/student/component-loans/[id]/request-extension/route.ts
1. Update component_loans:
   - extension_requested_due_date: new_date
   - extension_reason: reason
   - extension_status: 'pending'
2. Send email to faculty (emailTemplates.extensionRequested)
```

---

#### **Step 2: Faculty Reviews Extension**
**Backend Process:**
```typescript
// File: app/api/faculty/component-loans/[id]/extension-action/route.ts
1. Update component_loans:
   - If approve: extension_status: 'approved', due_date: extension_requested_due_date
   - If reject: extension_status: 'rejected'
2. Send email to student (emailTemplates.extensionApproved or extensionRejected)
3. Log activity
```

---

## 3. Multi-Lab Booking Deep Dive

### 3.1 Database Schema for Multi-Lab

#### **booking_requests table:**
```sql
id: 123
is_multi_lab: 1 (true)
lab_ids: "[1,2,3]" (JSON array)
status: 'pending_lab_staff' (global status)
```

#### **multi_lab_approvals table:**
```sql
[
  { id: 1, booking_id: 123, lab_id: 1, status: 'approved', lab_staff_approved_by: 10 },
  { id: 2, booking_id: 123, lab_id: 2, status: 'approved', lab_staff_approved_by: 11 },
  { id: 3, booking_id: 123, lab_id: 3, status: 'pending_lab_staff', lab_staff_approved_by: null }
]
```

#### **multi_lab_responsible_persons table:**
```sql
[
  { booking_id: 123, lab_id: 1, name: 'John', email: 'john@lnmiit.ac.in', phone: '1234567890' },
  { booking_id: 123, lab_id: 2, name: 'Jane', email: 'jane@lnmiit.ac.in', phone: '0987654321' },
  { booking_id: 123, lab_id: 3, name: 'Bob', email: 'bob@lnmiit.ac.in', phone: '5555555555' }
]
```

---

### 3.2 Lab Staff Approval Logic (Per Lab)

**Query to Find Relevant Requests:**
```sql
-- File: app/api/lab-staff/bookings/route.ts
SELECT br.* 
FROM booking_requests br
JOIN multi_lab_approvals mla ON mla.booking_id = br.id
JOIN labs l ON l.id = mla.lab_id
WHERE l.staff_id = [current_user_id]
AND mla.status = 'pending_lab_staff'
```

**Approval Process:**
```typescript
// File: app/api/lab-staff/requests/[id]/action/route.ts
// 1. Update only the row for the lab the staff manages
UPDATE multi_lab_approvals 
SET status = 'approved', lab_staff_approved_by = [staff_id], lab_staff_approved_at = NOW()
WHERE booking_id = 123 AND lab_id = [staff's_lab_id]

// 2. Check if all labs approved
SELECT COUNT(*) as approved_count 
FROM multi_lab_approvals 
WHERE booking_id = 123 AND status = 'approved'

// 3. If approved_count == total_labs, update global status
UPDATE booking_requests SET status = 'pending_hod' WHERE id = 123
```

---

### 3.3 HOD View (Aggregated)

**Query to Show All Lab Approvals:**
```typescript
// File: app/api/hod/requests/[id]/route.ts
SELECT 
  mla.lab_id, 
  l.lab_name, 
  mla.status, 
  mla.lab_staff_approved_by,
  u.name as approver_name
FROM multi_lab_approvals mla
JOIN labs l ON l.id = mla.lab_id
LEFT JOIN users u ON u.id = mla.lab_staff_approved_by
WHERE mla.booking_id = 123
```

**HOD Dashboard Display:**
```
Lab 1: ✅ Approved by Mr. A on Jan 15, 2024
Lab 2: ✅ Approved by Mr. B on Jan 15, 2024
Lab 3: ⏳ Pending approval
```

---

### 3.4 Reminder System for Multi-Lab

**Query:**
```sql
-- File: app/api/cron/booking-reminders/route.ts
SELECT br.*, l.id as lab_id, l.staff_id, u.email as staff_email
FROM booking_requests br
JOIN multi_lab_approvals mla ON mla.booking_id = br.id
JOIN labs l ON l.id = mla.lab_id
JOIN users u ON u.id = l.staff_id
WHERE br.status = 'approved' 
AND br.reminder_sent = 0
AND CONCAT(br.booking_date, ' ', br.time_from) BETWEEN NOW() AND NOW() + INTERVAL 2 HOUR
```

**Responsible Person Query:**
```sql
SELECT * FROM multi_lab_responsible_persons
WHERE booking_id = 123
```

**Email Send Logic:**
```typescript
// Group by lab_id to send one email per lab staff
const staffEmailsByLab = labStaff.reduce((acc, staff) => {
  if (!acc[staff.lab_id]) {
    acc[staff.lab_id] = { email: staff.staff_email, lab_id: staff.lab_id }
  }
  return acc
}, {})

// Get responsible persons for each lab
const responsiblePersonsForThisLab = responsiblePersons.filter(
  rp => rp.lab_id === staff.lab_id
)

// Send email to staff + responsible persons
await sendEmail({
  to: [staff.email, ...responsiblePersonsForThisLab.map(rp => rp.email)],
  subject: '2-Hour Reminder: Lab Booking',
  html: emailTemplates.labBookingReminder(...)
})
```

---

## 4. Approval Authority Logic

### 4.1 Department-Level Settings

**Database Field:**
```sql
-- Table: departments
highest_approval_authority: ENUM('hod', 'lab_coordinator')
hod_id: INT (references users.id)
lab_coordinator_id: INT (references users.id)
```

**Logic:**
```typescript
// File: app/api/hod/requests/[id]/action/route.ts
const department = await query(
  'SELECT highest_approval_authority FROM departments WHERE id = ?',
  [booking.department_id]
)

if (department.highest_approval_authority === 'hod') {
  // Only HOD can approve
  if (user.role !== 'hod') {
    return res.status(403).json({ error: 'Only HOD can approve' })
  }
} else if (department.highest_approval_authority === 'lab_coordinator') {
  // Lab Coordinator can approve
  if (user.role !== 'lab_coordinator') {
    return res.status(403).json({ error: 'Only Lab Coordinator can approve' })
  }
}
```

---

### 4.2 Lab Staff Authorization

**Query to Verify Head Lab Staff:**
```sql
-- Only head lab staff (assigned via labs.staff_id) can approve
SELECT * FROM labs WHERE id = [lab_id] AND staff_id = [current_user_id]
```

**Code:**
```typescript
// File: app/api/lab-staff/requests/[id]/action/route.ts
const lab = await query('SELECT * FROM labs WHERE id = ? AND staff_id = ?', [lab_id, user.id])
if (!lab) {
  return res.status(403).json({ error: 'You are not authorized to approve for this lab' })
}
```

---

## 5. Email Notification Triggers

### 5.1 All Email Triggers (Complete List)

| Action | Trigger | Template | Recipients |
|--------|---------|----------|------------|
| Booking Created | Student submits | `labBookingCreated` | Faculty supervisor |
| Faculty Approved | Faculty approves | `labBookingForwarded` | Lab staff |
| Lab Staff Approved (all labs) | All labs approve | `labBookingForwarded` | HOD/Coordinator |
| HOD Approved | HOD approves | `labBookingApproved` | Student, Faculty, Responsible Persons |
| Booking Rejected | Any stage rejects | `labBookingRejected` | Student, Faculty |
| 2-Hour Reminder | Cron job | `labBookingReminder` | Lab staff, Responsible Persons |
| Component Created | Student submits | `componentRequestCreated` | Faculty |
| Faculty Approved (Component) | Faculty approves | `componentRequestForwarded` | Lab staff |
| Lab Staff Approved (Component) | Lab staff approves | `componentRequestForwarded` | HOD |
| HOD Approved (Component) | HOD approves | `componentRequestApprovedForLabStaff` | Lab staff |
| Components Issued | Lab staff issues | `componentsIssued` | Student |
| Return Requested | Student requests | `returnRequested` | Lab staff |
| Return Approved | Lab staff approves | `returnApproved` | Student |
| Extension Requested | Student requests | `extensionRequested` | Faculty |
| Extension Approved | Faculty approves | `extensionApproved` | Student |
| Extension Rejected | Faculty rejects | `extensionRejected` | Student |
| Password Reset | User resets password | `passwordResetSuccess` | User |

---

### 5.2 Email Template Structure

**Example: labBookingApproved**
```typescript
// File: lib/notifications.ts
labBookingApproved: ({ requesterName, requesterSalutation, requesterRole, purpose, bookingDate, timeFrom, timeTo, labNames }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
      <h1>Lab Booking Approved</h1>
    </div>
    <div style="padding: 30px; background-color: #f9f9f9;">
      <p>Dear ${requesterSalutation} ${requesterName},</p>
      <p>Your lab booking request has been <strong>approved</strong>!</p>
      <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Purpose:</strong> ${purpose}</p>
        <p><strong>Date:</strong> ${formatDate(bookingDate)}</p>
        <p><strong>Time:</strong> ${timeFrom} - ${timeTo}</p>
        <p><strong>Lab(s):</strong> ${labNames}</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/${requesterRole === 'student' ? 'student' : requesterRole === 'faculty' ? 'faculty' : 'others'}/dashboard" style="...">
        View Dashboard
      </a>
    </div>
  </div>
`
```

**Salutation Support:**
```typescript
// Database: users.salutation = 'Prof.' | 'Dr.' | 'Mr.' | 'Mrs.' | 'Ms.'
// Email displays: "Dear Prof. John Doe" or "Dear Dr. Jane Smith"
```

---

## 6. Automated Reminder System

### 6.1 Booking Reminder Cron Job

**File:** `app/api/cron/booking-reminders/route.ts`

**Cron Schedule:** Every hour (recommended)

**Query:**
```sql
SELECT 
  br.*,
  u.name as requester_name,
  u.email as requester_email
FROM booking_requests br
JOIN users u ON u.id = br.created_by
WHERE br.status = 'approved'
AND br.request_type = 'lab_booking'
AND br.reminder_sent = 0
AND CONCAT(br.booking_date, ' ', br.time_from) 
    BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
```

**Process:**
```typescript
for (const booking of bookings) {
  // Parse lab_ids
  const labIds = JSON.parse(booking.lab_ids)
  
  // Fetch lab staff for each lab
  const labStaff = await query(`
    SELECT l.id as lab_id, l.staff_id, u.email as staff_email, u.name as staff_name
    FROM labs l
    JOIN users u ON u.id = l.staff_id
    WHERE l.id IN (?)
  `, [labIds])
  
  // Fetch responsible persons
  const responsiblePersons = await query(`
    SELECT * FROM multi_lab_responsible_persons 
    WHERE booking_id = ?
  `, [booking.id])
  
  // Send emails grouped by lab
  for (const staff of labStaff) {
    const rpForThisLab = responsiblePersons.filter(rp => rp.lab_id === staff.lab_id)
    await sendEmail({
      to: [staff.staff_email, ...rpForThisLab.map(rp => rp.email)],
      subject: 'Lab Booking Reminder - 2 Hours',
      html: emailTemplates.labBookingReminder({
        staffName: staff.staff_name,
        requesterName: booking.requester_name,
        purpose: booking.purpose,
        bookingDate: booking.booking_date,
        timeFrom: booking.time_from,
        timeTo: booking.time_to,
        labName: staff.lab_name,
        responsiblePersons: rpForThisLab
      })
    })
  }
  
  // Mark as sent
  await query('UPDATE booking_requests SET reminder_sent = 1 WHERE id = ?', [booking.id])
}
```

---

### 6.2 Equipment Loan Reminder Cron Job

**File:** `app/api/cron/loan-reminders/route.ts`

**Query:**
```sql
SELECT 
  cl.*,
  u.name as borrower_name,
  u.email as borrower_email
FROM component_loans cl
JOIN users u ON u.id = cl.issued_to
WHERE cl.return_request_status != 'approved'
AND cl.due_date <= DATE_ADD(NOW(), INTERVAL 1 DAY)
```

**Email Logic:**
```typescript
// Send reminder if due within 24 hours
if (dueDate - now < 24 hours) {
  await sendEmail({
    to: borrower.email,
    subject: 'Equipment Return Due Soon',
    html: 'Please return equipment by [due_date]'
  })
}

// Send overdue notice
if (dueDate < now) {
  await sendEmail({
    to: [borrower.email, labStaff.email],
    subject: 'URGENT: Equipment Overdue',
    html: 'Equipment return is overdue. Please return immediately.'
  })
}
```

---

## 7. Timeline Construction

### 7.1 Student Timeline API

**File:** `app/api/student/my-requests-new/route.ts`

**Query:**
```sql
SELECT 
  br.*,
  u_faculty.name as faculty_name,
  u_faculty.salutation as faculty_salutation,
  u_hod.name as hod_name,
  u_hod.salutation as hod_salutation
FROM booking_requests br
LEFT JOIN users u_faculty ON u_faculty.id = br.faculty_approved_by
LEFT JOIN users u_hod ON u_hod.id = br.hod_approved_by
WHERE br.created_by = [student_id]
```

**Timeline Construction:**
```typescript
const timeline = []

// Step 1: Submission
timeline.push({
  step: 'Submitted',
  status: 'completed',
  timestamp: booking.created_at,
  user: booking.requester_name,
  icon: 'check'
})

// Step 2: Faculty Approval
if (booking.faculty_approved_at) {
  timeline.push({
    step: 'Approved by Faculty',
    status: 'completed',
    timestamp: booking.faculty_approved_at,
    user: `${booking.faculty_salutation} ${booking.faculty_name}`,
    icon: 'check'
  })
} else if (booking.status === 'pending_faculty') {
  timeline.push({
    step: 'Pending Faculty Approval',
    status: 'pending',
    icon: 'clock'
  })
}

// Step 3: Lab Staff Approvals (for multi-lab, show each lab)
if (booking.is_multi_lab) {
  const labApprovals = await query(`
    SELECT mla.*, l.lab_name, u.name as approver_name, u.salutation
    FROM multi_lab_approvals mla
    JOIN labs l ON l.id = mla.lab_id
    LEFT JOIN users u ON u.id = mla.lab_staff_approved_by
    WHERE mla.booking_id = ?
  `, [booking.id])
  
  labApprovals.forEach(la => {
    if (la.status === 'approved') {
      timeline.push({
        step: `Approved by Lab Staff (${la.lab_name})`,
        status: 'completed',
        timestamp: la.lab_staff_approved_at,
        user: `${la.salutation} ${la.approver_name}`,
        icon: 'check'
      })
    } else {
      timeline.push({
        step: `Pending Lab Staff (${la.lab_name})`,
        status: 'pending',
        icon: 'clock'
      })
    }
  })
}

// Step 4: HOD Approval
if (booking.hod_approved_at) {
  timeline.push({
    step: 'Approved by HOD',
    status: 'completed',
    timestamp: booking.hod_approved_at,
    user: `${booking.hod_salutation} ${booking.hod_name}`,
    icon: 'check'
  })
} else if (booking.status === 'pending_hod') {
  timeline.push({
    step: 'Pending HOD Approval',
    status: 'pending',
    icon: 'clock'
  })
}

// Step 5: Rejection (if any)
if (booking.status === 'rejected') {
  timeline.push({
    step: 'Rejected',
    status: 'rejected',
    reason: booking.rejection_reason,
    icon: 'x'
  })
}

return timeline
```

---

### 7.2 Timeline Display (Frontend)

**File:** `app/student/dashboard/my-requests/page.tsx`

```tsx
<div className="space-y-4">
  {timeline.map((step, index) => (
    <div key={index} className="flex items-start gap-4">
      <div className={`p-2 rounded-full ${
        step.status === 'completed' ? 'bg-green-100' :
        step.status === 'pending' ? 'bg-yellow-100' :
        'bg-red-100'
      }`}>
        {step.icon === 'check' && <CheckIcon />}
        {step.icon === 'clock' && <ClockIcon />}
        {step.icon === 'x' && <XIcon />}
      </div>
      <div>
        <p className="font-semibold">{step.step}</p>
        {step.user && <p className="text-sm text-gray-600">by {step.user}</p>}
        {step.timestamp && <p className="text-xs text-gray-500">{formatDate(step.timestamp)}</p>}
        {step.reason && <p className="text-sm text-red-600">Reason: {step.reason}</p>}
      </div>
    </div>
  ))}
</div>
```

---

## 8. Activity Logging

### 8.1 Log Structure

**Table:** `system_logs`
```sql
CREATE TABLE system_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

### 8.2 Logging Function

**File:** `lib/activity-logger.ts`

```typescript
export async function logBookingActivity({
  userId,
  action,
  bookingId,
  details,
  req
}: {
  userId: number
  action: 'created_booking' | 'approved_by_faculty' | 'approved_by_lab_staff' | 'approved_by_hod' | 'rejected_booking'
  bookingId: number
  details?: any
  req?: NextRequest
}) {
  const ipAddress = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || 'unknown'
  const userAgent = req?.headers.get('user-agent') || 'unknown'
  
  await query(`
    INSERT INTO system_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
    VALUES (?, ?, 'booking_request', ?, ?, ?, ?)
  `, [userId, action, bookingId, JSON.stringify(details), ipAddress, userAgent])
}
```

---

### 8.3 Usage in API Routes

```typescript
// File: app/api/hod/requests/[id]/action/route.ts
await logBookingActivity({
  userId: user.id,
  action: 'approved_by_hod',
  bookingId: booking.id,
  details: {
    booking_id: booking.id,
    lab_ids: booking.lab_ids,
    purpose: booking.purpose,
    approved_at: new Date().toISOString()
  },
  req
})
```

---

### 8.4 Viewing Logs

**API:** `app/api/hod/labs/booking-logs/route.ts`

**Query:**
```sql
SELECT 
  sl.*,
  u.name as user_name,
  u.role as user_role
FROM system_logs sl
JOIN users u ON u.id = sl.user_id
WHERE sl.entity_type = 'booking_request'
AND sl.entity_id = ?
ORDER BY sl.created_at DESC
```

**Frontend Display:**
```tsx
// File: app/hod/dashboard/logs/page.tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Action</TableHead>
      <TableHead>User</TableHead>
      <TableHead>Timestamp</TableHead>
      <TableHead>IP Address</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {logs.map(log => (
      <TableRow key={log.id}>
        <TableCell>{log.action}</TableCell>
        <TableCell>{log.user_name} ({log.user_role})</TableCell>
        <TableCell>{formatDate(log.created_at)}</TableCell>
        <TableCell>{log.ip_address}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 9. Code References

### 9.1 Key API Routes

| Functionality | File Path |
|---------------|-----------|
| Student Booking Submission | `app/api/student/booking-requests/route.ts` |
| Faculty Approval | `app/api/faculty/requests/[id]/action/route.ts` |
| Lab Staff Approval | `app/api/lab-staff/requests/[id]/action/route.ts` |
| HOD Approval | `app/api/hod/requests/[id]/action/route.ts` |
| Lab Coordinator Approval | `app/api/lab-coordinator/requests/[id]/action/route.ts` |
| Component Issue | `app/api/lab-staff/component-requests/[id]/issue/route.ts` |
| Return Request | `app/api/student/component-loans/[id]/request-return/route.ts` |
| Extension Request | `app/api/student/component-loans/[id]/request-extension/route.ts` |
| Booking Reminders | `app/api/cron/booking-reminders/route.ts` |
| Loan Reminders | `app/api/cron/loan-reminders/route.ts` |
| Timeline API (Student) | `app/api/student/my-requests-new/route.ts` |
| Timeline API (Faculty) | `app/api/faculty/my-requests-new/route.ts` |
| Activity Logs | `app/api/hod/labs/booking-logs/route.ts` |

---

### 9.2 Key Library Files

| Purpose | File Path |
|---------|-----------|
| Database Connection | `lib/database.ts` |
| Email Templates | `lib/notifications.ts` |
| Activity Logging | `lib/activity-logger.ts` |
| Authentication | `lib/auth.ts` |
| Role Checking | `lib/roles.ts` |
| Utilities | `lib/utils.ts` |

---

### 9.3 Frontend Components

| Component | File Path |
|-----------|-----------|
| Lab Staff Approval UI | `app/lab-staff/dashboard/approve/page.tsx` |
| HOD Requests View | `app/hod/dashboard/requests/page.tsx` |
| Student Timeline | `app/student/dashboard/my-requests/page.tsx` |
| Faculty Requests | `app/faculty/dashboard/requests/page.tsx` |
| Component Loans | `app/student/dashboard/my-component-loans/page.tsx` |

---

## 10. Summary

This system implements a **comprehensive, multi-role, multi-step approval workflow** for lab bookings and equipment requests. Key features:

1. **Role-Based Workflows:** Different approval chains for students, faculty, and others
2. **Multi-Lab Support:** Handle bookings across multiple labs with individual approvals
3. **Automated Reminders:** 2-hour booking reminders and equipment due date reminders
4. **Activity Logging:** Complete audit trail of all approvals and actions
5. **Email Notifications:** Professional email templates for all workflow stages
6. **Timeline Tracking:** Real-time status updates visible to all stakeholders
7. **Flexible Authority:** HOD or Lab Coordinator can be final approver per department
8. **Testing Mode:** Safe email testing in development environments

All workflows follow a consistent pattern:
- **Submit** → **Approve/Reject at each level** → **Final Approval** → **Automated Reminders** → **Complete/Return**

For implementation details, refer to the code references above.
