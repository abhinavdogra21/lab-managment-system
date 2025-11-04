# Activity Logs Implementation Guide

## Overview

This system implements separate activity log tables to preserve historical records even when users or bookings are deleted. The logs are stored independently with denormalized user information to maintain historical accuracy.

## Problem Solved

**Before:** When a user was deleted, all their associated logs in `system_logs` were either deleted (via CASCADE) or had `user_id` set to NULL, losing important historical context.

**After:** Activity logs store complete user information (name, email, role) at the time of the action, ensuring we can always see who did what, even if their account is deleted later.

## Database Tables

### 1. `lab_booking_activity_logs`
Stores all actions related to lab bookings.

**Key Fields:**
- `booking_id` - Reference to booking (nullable)
- `lab_id` - Reference to lab (nullable)
- `actor_user_id`, `actor_name`, `actor_email`, `actor_role` - User who performed the action
- `action` - Type of action (created, approved, rejected, cancelled, updated, deleted)
- `booking_snapshot` - JSON snapshot of booking at time of action
- `changes_made` - JSON object showing what changed (for updates)

### 2. `component_activity_logs`
Stores all actions related to component requests and loans.

**Key Fields:**
- `entity_type` - Either 'component_request' or 'component_loan'
- `entity_id` - Reference to the request/loan (nullable)
- `lab_id` - Reference to lab (nullable)
- `actor_user_id`, `actor_name`, `actor_email`, `actor_role` - User who performed the action
- `action` - Type of action (created, faculty_approved, lab_staff_approved, hod_approved, rejected, issued, returned, etc.)
- `entity_snapshot` - JSON snapshot at time of action
- `changes_made` - JSON object showing what changed

## Setup Instructions

### 1. Create the Tables

Run the setup script:

```bash
chmod +x scripts/setup-activity-logs.sh
./scripts/setup-activity-logs.sh
```

Or manually execute the SQL:

```bash
mysql -u root -p lnmiit_lab_management < scripts/06-create-activity-logs.sql
```

### 2. Verify Tables Were Created

```sql
SHOW TABLES LIKE '%activity_logs';
DESCRIBE lab_booking_activity_logs;
DESCRIBE component_activity_logs;
```

## Usage Examples

### Lab Booking Activity Logging

#### When creating a booking:

```typescript
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

// In your API route
const userInfo = await getUserInfoForLogging(userId)

// Create the booking first
const booking = await dbOperations.createBooking(bookingData)

// Log the activity
await logLabBookingActivity({
  bookingId: booking.id,
  labId: booking.lab_id,
  actorUserId: userInfo?.userId || null,
  actorName: userInfo?.name || null,
  actorEmail: userInfo?.email || null,
  actorRole: userInfo?.role || null,
  action: "created",
  actionDescription: `Created lab booking for ${booking.purpose}`,
  bookingSnapshot: booking,
  ipAddress: req.headers.get("x-forwarded-for") || null,
  userAgent: req.headers.get("user-agent") || null,
})
```

#### When approving a booking:

```typescript
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const userInfo = await getUserInfoForLogging(approverUserId)
const oldBooking = await getBookingById(bookingId) // Get current state

// Update the booking
await updateBookingStatus(bookingId, "approved")

const newBooking = await getBookingById(bookingId)

// Log the approval
await logLabBookingActivity({
  bookingId: bookingId,
  labId: newBooking.lab_id,
  actorUserId: userInfo?.userId || null,
  actorName: userInfo?.name || null,
  actorEmail: userInfo?.email || null,
  actorRole: userInfo?.role || null,
  action: "approved",
  actionDescription: `Approved lab booking`,
  bookingSnapshot: newBooking,
  changesMade: {
    approval_status: { from: oldBooking.approval_status, to: "approved" },
    approved_by: { from: null, to: approverUserId },
  },
  ipAddress: req.headers.get("x-forwarded-for") || null,
  userAgent: req.headers.get("user-agent") || null,
})
```

### Component Request/Loan Activity Logging

```typescript
import { logComponentActivity, getUserInfoForLogging } from "@/lib/activity-logger"

const userInfo = await getUserInfoForLogging(userId)

// When creating a component request
await logComponentActivity({
  entityType: "component_request",
  entityId: request.id,
  labId: request.lab_id,
  actorUserId: userInfo?.userId || null,
  actorName: userInfo?.name || null,
  actorEmail: userInfo?.email || null,
  actorRole: userInfo?.role || null,
  action: "created",
  actionDescription: `Created component request`,
  entitySnapshot: request,
  ipAddress: req.headers.get("x-forwarded-for") || null,
  userAgent: req.headers.get("user-agent") || null,
})

// When HoD approves
await logComponentActivity({
  entityType: "component_request",
  entityId: request.id,
  labId: request.lab_id,
  actorUserId: hodInfo?.userId || null,
  actorName: hodInfo?.name || null,
  actorEmail: hodInfo?.email || null,
  actorRole: hodInfo?.role || null,
  action: "hod_approved",
  actionDescription: `HoD approved component request`,
  entitySnapshot: updatedRequest,
  changesMade: {
    status: { from: "pending_hod", to: "approved" },
    hod_approver_id: { from: null, to: hodInfo.userId },
  },
  ipAddress: req.headers.get("x-forwarded-for") || null,
  userAgent: req.headers.get("user-agent") || null,
})
```

### Retrieving Activity Logs for HoD Dashboard

```typescript
import { 
  getAllActivityLogsForDepartment,
  getLabBookingActivityLogsForDepartment,
  getComponentActivityLogsForDepartment 
} from "@/lib/activity-logger"

// Get all activities for a department
const allLogs = await getAllActivityLogsForDepartment({
  departmentId: departmentId,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  limit: 50,
  offset: 0,
})

// Or get specific types
const labBookingLogs = await getLabBookingActivityLogsForDepartment({
  departmentId: departmentId,
  limit: 50,
})

const componentLogs = await getComponentActivityLogsForDepartment({
  departmentId: departmentId,
  limit: 50,
})
```

## Migration from Existing Logs (Optional)

If you want to migrate existing logs from `system_logs`:

1. Edit `scripts/06-create-activity-logs.sql`
2. Uncomment the migration section at the bottom
3. Run the migration:

```bash
mysql -u root -p lnmiit_lab_management < scripts/06-create-activity-logs.sql
```

**Note:** This will only migrate logs from the last 6 months. Adjust the date filter if needed.

## API Routes to Update

You should add activity logging to these routes:

### Lab Bookings:
- ✅ `POST /api/faculty/bookings` - When creating a booking
- ✅ `PUT /api/hod/bookings/[id]/approve` - When approving
- ✅ `PUT /api/hod/bookings/[id]/reject` - When rejecting
- ✅ `PUT /api/faculty/bookings/[id]/cancel` - When cancelling
- ✅ `DELETE /api/admin/bookings/[id]` - When deleting

### Component Requests:
- ✅ `POST /api/student/component-requests` - When creating
- ✅ `PUT /api/faculty/component-requests/[id]/approve` - Faculty approval
- ✅ `PUT /api/lab-staff/component-requests/[id]/approve` - Lab staff approval
- ✅ `PUT /api/hod/component-requests/[id]/approve` - HoD approval
- ✅ `PUT /api/.../component-requests/[id]/reject` - Rejections
- ✅ `PUT /api/lab-staff/component-requests/[id]/issue` - When issuing
- ✅ `PUT /api/student/component-requests/[id]/return` - When returning

### Component Loans:
- ✅ `POST /api/student/component-loans` - When creating
- ✅ `PUT /api/lab-staff/component-loans/[id]/approve` - Lab staff approval
- ✅ `PUT /api/lab-staff/component-loans/[id]/issue` - When issuing
- ✅ `PUT /api/student/component-loans/[id]/return` - When returning

## Benefits

1. **Data Integrity**: Logs are never lost, even when users or bookings are deleted
2. **Historical Accuracy**: Complete user information preserved at time of action
3. **Audit Trail**: Full history of who did what, when, and why
4. **Department Filtering**: Easy to query logs for specific departments/labs
5. **Performance**: Separate tables prevent slow queries on main `system_logs` table
6. **Snapshots**: JSON snapshots allow you to see exact state at time of action

## Testing

```typescript
// Test creating a log
import { logLabBookingActivity } from "@/lib/activity-logger"

await logLabBookingActivity({
  bookingId: 1,
  labId: 1,
  actorUserId: 123,
  actorName: "Dr. Test User",
  actorEmail: "test@lnmiit.ac.in",
  actorRole: "faculty",
  action: "created",
  actionDescription: "Test log entry",
  bookingSnapshot: { test: true },
})

// Test retrieving logs
import { getLabBookingActivityLogs } from "@/lib/activity-logger"

const logs = await getLabBookingActivityLogs({
  bookingId: 1,
  limit: 10,
})
console.log(logs)
```

## Maintenance

### Cleanup Old Logs (Optional)

If you want to archive very old logs (e.g., older than 2 years):

```sql
-- Archive logs older than 2 years to a separate table
CREATE TABLE archived_lab_booking_activity_logs LIKE lab_booking_activity_logs;

INSERT INTO archived_lab_booking_activity_logs
SELECT * FROM lab_booking_activity_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);

DELETE FROM lab_booking_activity_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

## Troubleshooting

### Tables not created
```bash
# Check if script has execute permissions
chmod +x scripts/setup-activity-logs.sh

# Run with verbose output
bash -x scripts/setup-activity-logs.sh
```

### Logging failures
- Check database connection
- Verify table structure matches the schema
- Check for JSON syntax errors in snapshots
- Ensure user info is being fetched correctly

### Performance issues
- Add indexes on frequently queried fields
- Use pagination (limit/offset) for large result sets
- Consider archiving old logs periodically
