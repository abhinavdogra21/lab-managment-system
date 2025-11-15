# Multi-Lab Booking Feature - Implementation Guide

## Overview
This document outlines the implementation of multi-lab booking functionality where users can book multiple labs simultaneously with common free slot detection and person responsible tracking.

## Requirements Confirmed

### 1. Multi-Lab Selection
- Users can select multiple labs (CP1, CP2, CP3, etc.) in single request
- When multiple labs selected: Show **only common free slots** across all labs
- When single lab selected: Show **booked slots** (existing behavior)

### 2. Person Responsible (NEW - applies to ALL bookings)
- Add fields: Name + Email (@lnmiit.ac.in validation)
- Person is accountable for damages
- Must receive confirmation email when booking approved
- Manual entry (can delegate to someone else)

### 3. Approval Workflow
**Single Lab:** Student → Faculty → Lab Staff → HOD/Lab Coordinator → Approved
**Multi-Lab:** Student → Faculty → ALL Lab Staff (CP1, CP2, CP3) → HOD (only after ALL approve) → Approved
- If ANY lab staff rejects → entire booking rejected
- Same purpose for all labs

### 4. Reminder System
- Send email 2 hours before booking slot to:
  - Person Responsible
  - All Lab Staff of booked labs
  - Faculty supervisor
- Respects TESTING_MODE=true (sends only to admin email for testing)

---

## Database Schema Changes

### File: `scripts/09-add-multi-lab-booking.sql`

```sql
-- booking_requests table
ALTER TABLE booking_requests ADD:
  - responsible_person_name VARCHAR(255)
  - responsible_person_email VARCHAR(255)
  - is_multi_lab TINYINT(1) DEFAULT 0
  - lab_ids JSON (array of lab IDs)

-- New table: multi_lab_approvals
Tracks individual lab approvals in multi-lab bookings
Columns: booking_request_id, lab_id, lab_staff_id, status, approved_at, remarks

-- New table: booking_reminders  
Schedules and tracks 2-hour reminder emails
Columns: booking_request_id, reminder_type, scheduled_time, sent_at, status, recipients

-- View: v_multi_lab_bookings
Aggregates multi-lab booking status for easy querying
```

**Apply with:** `mysql -u root -p lnmiit_lab_management < scripts/09-add-multi-lab-booking.sql`

---

## Implementation Phases

### Phase 1: Database Setup ✅
- [x] Create SQL migration file
- [ ] Apply to database (user action required)

### Phase 2: Update Booking Form UI
**Files to modify:**
- `/app/student/dashboard/book-lab/page.tsx`
- `/app/faculty/dashboard/book-lab/page.tsx` (if exists)
- `/app/others/dashboard/book-lab/page.tsx` (if exists)

**Changes:**
1. Add multi-select for labs (checkbox dropdown)
2. Add "Person Responsible" fields (name + email with validation)
3. Conditional slot display:
   - Single lab: Show booked slots (existing)
   - Multi-lab: Show only common free slots (NEW)

### Phase 3: API Endpoints

#### 3.1 Common Free Slots API (NEW)
**Endpoint:** `GET /api/student/common-free-slots`
**Query Params:** `lab_ids=[1,2,3]&date=2025-11-15`
**Returns:** Array of time slots free across ALL selected labs

#### 3.2 Update Booking Creation API
**Endpoint:** `POST /api/student/booking-requests`
**Modifications:**
- Accept `responsible_person_name`, `responsible_person_email`
- Accept `lab_ids` array for multi-lab
- Validate email ends with @lnmiit.ac.in
- For multi-lab: Create entries in `multi_lab_approvals` table
- Schedule reminder in `booking_reminders` table

### Phase 4: Multi-Lab Approval Logic

#### 4.1 Lab Staff Approval
**Files:** `/app/api/lab-staff/approve/route.ts`
**Changes:**
- Check if multi-lab booking
- Update specific lab in `multi_lab_approvals` table
- Only proceed to HOD when ALL lab staff approved
- Send notifications to other pending lab staff

#### 4.2 HOD Approval  
**Files:** `/app/api/hod/approve/route.ts`
**Changes:**
- For multi-lab: Approve all labs simultaneously
- Send confirmation to person responsible
- Create activity logs for each lab

### Phase 5: Email Notifications

#### 5.1 Update Notification Templates
**File:** `/lib/notifications.ts`
**Add templates:**
- `multiLabBookingCreated` - Notify all lab staff
- `personResponsibleConfirmation` - To person responsible
- `bookingReminder2Hours` - 2-hour reminder

#### 5.2 Person Responsible Email
Send when booking finally approved with:
- List of labs booked
- Date/time
- Responsibility notice
- Contact information

### Phase 6: Reminder Cron Job

#### 6.1 Create Cron API
**File:** `/app/api/cron/send-reminders/route.ts`
**Logic:**
```typescript
1. Query booking_reminders where:
   - status = 'pending'
   - scheduled_time <= NOW()
2. For each reminder:
   - Fetch booking details
   - Get recipients (person responsible, lab staff, faculty)
   - Send reminder email
   - Mark as 'sent' with timestamp
3. Respect TESTING_MODE env variable
```

#### 6.2 Setup Cron Trigger
**Options:**
- Vercel Cron Jobs (cron: "*/15 * * * *") - every 15 minutes
- Or external cron service hitting endpoint
- Add authentication token for security

### Phase 7: UI Updates

#### 7.1 Student Dashboard - My Requests
**File:** `/app/student/dashboard/my-requests/page.tsx`
**Changes:**
- Display multi-lab bookings clearly (badge showing count)
- Show individual approval status for each lab
- Timeline shows all lab staff approvals

#### 7.2 Lab Staff Dashboard
**File:** `/app/lab-staff/dashboard/approve/page.tsx`
**Changes:**
- Show "This is a multi-lab booking" indicator
- Display other labs in the request
- Show which other lab staff have approved/pending

#### 7.3 Faculty Dashboard
**File:** `/app/faculty/dashboard/approve/page.tsx`
**Changes:**
- Show all labs in multi-lab requests
- Display person responsible information

### Phase 8: Activity Logging
**Files:** Activity logger for all actions
**Log events:**
- Multi-lab booking created
- Each lab staff approval/rejection
- HOD final approval
- Reminder sent
- Person responsible notified

---

## Testing Checklist

### Single Lab Booking (with Person Responsible)
- [ ] Can submit booking with person responsible
- [ ] Email validation works (@lnmiit.ac.in)
- [ ] Person responsible receives confirmation email
- [ ] Reminder sent 2 hours before (TESTING_MODE respected)

### Multi-Lab Booking
- [ ] Can select multiple labs
- [ ] Common free slots displayed correctly
- [ ] All lab staff receive notification
- [ ] Individual lab staff can approve/reject
- [ ] HOD sees request only after ALL lab staff approve
- [ ] If one lab staff rejects, entire booking rejected
- [ ] Timeline shows all approvals clearly

### Reminder System
- [ ] Reminders scheduled correctly (2 hours before start_time)
- [ ] Cron job sends reminders
- [ ] TESTING_MODE redirects to admin email
- [ ] Reminders marked as sent after delivery
- [ ] No duplicate reminders sent

---

## API Endpoints Summary

### New Endpoints
```
GET  /api/student/common-free-slots?lab_ids=[1,2,3]&date=2025-11-15
POST /api/cron/send-reminders (protected)
```

### Modified Endpoints
```
POST /api/student/booking-requests
  - Add: responsible_person_name, responsible_person_email, lab_ids[]
  
POST /api/lab-staff/approve
  - Handle multi-lab approval logic
  
POST /api/hod/approve  
  - Handle multi-lab approval logic
  
GET  /api/student/my-requests
  - Include multi-lab data
```

---

## Environment Variables Required
```env
# Existing
TESTING_MODE=true  # For email testing
ADMIN_EMAIL=abhinavdogra1974@gmail.com

# New (if using Vercel Cron)
CRON_SECRET=your-secret-token  # To protect cron endpoint
```

---

## Migration Steps for Production

1. **Backup database**
   ```bash
   mysqldump -u root -p lnmiit_lab_management > backup_before_multilab.sql
   ```

2. **Apply schema changes**
   ```bash
   mysql -u root -p lnmiit_lab_management < scripts/09-add-multi-lab-booking.sql
   ```

3. **Deploy code changes**
   - Deploy all modified files
   - Test in staging first

4. **Setup cron job**
   - Configure Vercel Cron or external cron
   - Test reminder delivery

5. **Monitor**
   - Check `booking_reminders` table
   - Verify emails being sent
   - Monitor error logs

---

## Next Steps

**Ready to implement Phase 2:** Update booking form UI with person responsible fields and multi-lab selection.

**Awaiting:** Database schema application (user must run SQL file manually).
