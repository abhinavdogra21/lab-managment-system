# Activity Logs System - Summary

## Problem Statement

**Issue:** When users or bookings are deleted from the database, their associated logs are also lost due to CASCADE deletion or NULL foreign keys. This makes it impossible to track historical activities and creates audit trail gaps.

Specifically:
- Lab booking logs lost when bookings are deleted
- Component request/loan logs lost when requests are deleted
- All user activity lost when user accounts are deleted
- HoD dashboard cannot show complete activity history

## Solution

Created **separate activity log tables** that store denormalized user information, ensuring logs are preserved even after related entities are deleted.

## Files Created

### 1. Database Schema
**File:** `scripts/06-create-activity-logs.sql`

Creates two new tables:
- `lab_booking_activity_logs` - Tracks all lab booking activities
- `component_activity_logs` - Tracks all component request/loan activities

**Key Features:**
- No foreign key constraints (nullable references only)
- Stores complete user info (name, email, role) at time of action
- JSON snapshots of entities at time of action
- Tracks what changed (for updates)
- Includes IP address and user agent for security auditing

### 2. TypeScript Helper Library
**File:** `lib/activity-logger.ts`

Provides functions for:
- `logLabBookingActivity()` - Log lab booking actions
- `logComponentActivity()` - Log component request/loan actions
- `getLabBookingActivityLogs()` - Retrieve lab booking logs with filters
- `getComponentActivityLogs()` - Retrieve component logs with filters
- `getLabBookingActivityLogsForDepartment()` - HoD dashboard queries
- `getComponentActivityLogsForDepartment()` - HoD dashboard queries
- `getAllActivityLogsForDepartment()` - Combined view for dashboards
- `getUserInfoForLogging()` - Helper to fetch user details

### 3. Setup Script
**File:** `scripts/setup-activity-logs.sh`

Bash script to:
- Check database connectivity
- Verify existing tables
- Create activity log tables
- Show table structures
- Provide setup instructions

**Usage:**
```bash
./scripts/setup-activity-logs.sh
```

### 4. Implementation Guide
**File:** `ACTIVITY_LOGS_IMPLEMENTATION.md`

Comprehensive guide with:
- Problem explanation
- Table structures
- Setup instructions
- Usage examples for all scenarios
- API routes to update
- Testing procedures
- Maintenance guidelines

### 5. Example API Code
**File:** `EXAMPLE_API_WITH_LOGGING.ts`

Shows how to integrate activity logging into API routes:
- Creating bookings with logging
- Approving bookings with change tracking
- Helper functions
- Best practices

## Database Tables Structure

### lab_booking_activity_logs

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT | Primary key |
| booking_id | INT NULL | Reference to booking (nullable) |
| lab_id | INT NULL | Reference to lab (nullable) |
| actor_user_id | INT NULL | User ID who performed action |
| actor_name | VARCHAR(255) | User's name at time of action |
| actor_email | VARCHAR(255) | User's email at time of action |
| actor_role | ENUM | User's role at time of action |
| action | VARCHAR(100) | Action type (created, approved, etc.) |
| action_description | TEXT | Human-readable description |
| booking_snapshot | JSON | Full booking state at time |
| changes_made | JSON | What changed (for updates) |
| ip_address | VARCHAR(45) | Request IP address |
| user_agent | TEXT | Request user agent |
| created_at | DATETIME | When action occurred |

**Indexes:**
- `idx_lab_booking_logs_booking` on booking_id
- `idx_lab_booking_logs_lab` on lab_id
- `idx_lab_booking_logs_actor` on actor_user_id
- `idx_lab_booking_logs_action` on action
- `idx_lab_booking_logs_created` on created_at

### component_activity_logs

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT | Primary key |
| entity_type | ENUM | 'component_request' or 'component_loan' |
| entity_id | INT NULL | Reference to request/loan (nullable) |
| lab_id | INT NULL | Reference to lab (nullable) |
| actor_user_id | INT NULL | User ID who performed action |
| actor_name | VARCHAR(255) | User's name at time of action |
| actor_email | VARCHAR(255) | User's email at time of action |
| actor_role | ENUM | User's role at time of action |
| action | VARCHAR(100) | Action type |
| action_description | TEXT | Human-readable description |
| entity_snapshot | JSON | Full entity state at time |
| changes_made | JSON | What changed (for updates) |
| ip_address | VARCHAR(45) | Request IP address |
| user_agent | TEXT | Request user agent |
| created_at | DATETIME | When action occurred |

**Indexes:**
- `idx_component_logs_entity` on (entity_type, entity_id)
- `idx_component_logs_lab` on lab_id
- `idx_component_logs_actor` on actor_user_id
- `idx_component_logs_action` on action
- `idx_component_logs_created` on created_at

## Setup Instructions

### Step 1: Create Tables

Run the setup script:

```bash
cd /Users/abhinavdogra/Desktop/Projects/lab-managment-system
./scripts/setup-activity-logs.sh
```

Or manually:

```bash
mysql -u root -p lnmiit_lab_management < scripts/06-create-activity-logs.sql
```

### Step 2: Verify Tables

```sql
USE lnmiit_lab_management;
SHOW TABLES LIKE '%activity_logs';
DESCRIBE lab_booking_activity_logs;
DESCRIBE component_activity_logs;
```

### Step 3: Update API Routes

Add logging to these routes (examples in `EXAMPLE_API_WITH_LOGGING.ts`):

**Lab Bookings:**
- `POST /api/faculty/bookings` - Creating
- `PUT /api/hod/bookings/[id]/approve` - Approving
- `PUT /api/hod/bookings/[id]/reject` - Rejecting
- `DELETE /api/admin/bookings/[id]` - Deleting

**Component Requests:**
- `POST /api/student/component-requests` - Creating
- `PUT /api/faculty/component-requests/[id]/approve` - Faculty approval
- `PUT /api/lab-staff/component-requests/[id]/approve` - Lab staff approval
- `PUT /api/hod/component-requests/[id]/approve` - HoD approval
- All rejection/issue/return endpoints

**Component Loans:**
- `POST /api/student/component-loans` - Creating
- `PUT /api/lab-staff/component-loans/[id]/approve` - Approving
- `PUT /api/lab-staff/component-loans/[id]/issue` - Issuing
- All return endpoints

### Step 4: Update HoD Dashboard

Add activity logs display to HoD dashboard:

```typescript
import { getAllActivityLogsForDepartment } from "@/lib/activity-logger"

// In your HoD dashboard API
const activityLogs = await getAllActivityLogsForDepartment({
  departmentId: hodDepartmentId,
  limit: 50,
  offset: 0,
})
```

## Usage Example

```typescript
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"

// Get user info
const userInfo = await getUserInfoForLogging(userId)

// Log an action
await logLabBookingActivity({
  bookingId: booking.id,
  labId: booking.lab_id,
  actorUserId: userInfo?.userId || null,
  actorName: userInfo?.name || null,
  actorEmail: userInfo?.email || null,
  actorRole: userInfo?.role || null,
  action: "created",
  actionDescription: "Created lab booking",
  bookingSnapshot: booking,
  ipAddress: req.headers.get("x-forwarded-for") || null,
  userAgent: req.headers.get("user-agent") || null,
})
```

## Benefits

1. ✅ **Data Preservation** - Logs never deleted with users/bookings
2. ✅ **Historical Accuracy** - Complete user info at time of action
3. ✅ **Audit Compliance** - Full trail of who did what, when
4. ✅ **Department Filtering** - Easy HoD dashboard queries
5. ✅ **Performance** - Separate tables, optimized indexes
6. ✅ **Snapshots** - See exact state at any point in time
7. ✅ **Change Tracking** - Know exactly what changed in updates
8. ✅ **No FK Constraints** - Won't break when entities deleted

## Action Types

### Lab Bookings
- `created` - Booking created
- `approved` - Booking approved by HoD
- `rejected` - Booking rejected
- `cancelled` - Booking cancelled by user
- `updated` - Booking details updated
- `deleted` - Booking deleted by admin

### Component Requests
- `created` - Request submitted
- `faculty_approved` - Approved by mentor faculty
- `lab_staff_approved` - Approved by lab staff
- `hod_approved` - Approved by HoD
- `rejected` - Rejected at any stage
- `issued` - Components issued
- `returned` - Components returned
- `extension_requested` - Extension requested
- `extension_approved` - Extension approved

### Component Loans
- `created` - Loan request created
- `lab_staff_approved` - Approved by lab staff
- `rejected` - Loan rejected
- `issued` - Components issued
- `returned` - Components returned
- `overdue` - Loan became overdue

## Migration (Optional)

To migrate existing logs from `system_logs` table:

1. Edit `scripts/06-create-activity-logs.sql`
2. Uncomment the migration SQL at the bottom
3. Run the script again

This will copy the last 6 months of logs. Adjust the date filter if needed.

## Testing Checklist

- [ ] Tables created successfully
- [ ] Can insert activity logs
- [ ] Can retrieve logs by booking_id
- [ ] Can retrieve logs by lab_id
- [ ] Can retrieve logs by actor_user_id
- [ ] Can filter by date range
- [ ] HoD dashboard shows department activities
- [ ] Logs preserved after user deletion
- [ ] Logs preserved after booking deletion
- [ ] JSON snapshots parse correctly
- [ ] Performance acceptable with pagination

## Next Steps

1. **Run the setup script** to create the tables
2. **Update one API route** as a test (e.g., POST /api/faculty/bookings)
3. **Test the logging** by creating a booking and checking the logs table
4. **Update remaining API routes** systematically
5. **Add logs display** to HoD dashboard
6. **Optional:** Migrate existing logs from system_logs
7. **Monitor** log growth and set up archival if needed

## Questions?

See `ACTIVITY_LOGS_IMPLEMENTATION.md` for detailed implementation guide and examples.
