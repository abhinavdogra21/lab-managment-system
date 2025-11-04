# Activity Logs API Documentation

## Overview
The activity logs system provides a complete audit trail for lab bookings and component requests, preserving historical data even when users or records are deleted.

## Migration Status
✅ **Migration Completed**: 2 lab booking logs migrated from system_logs (last 6 months)
✅ **Database Tables Created**: 
- `lab_booking_activity_logs`
- `component_activity_logs`

## API Endpoints

### 1. HoD Activity Logs
**Endpoint**: `GET /api/hod/activity-logs`

**Access**: HoD, Admin

**Query Parameters**:
- `type` (optional): Filter log type
  - `all` (default) - Both booking and component logs
  - `booking` - Lab booking logs only
  - `component` - Component request logs only
- `startDate` (optional): Filter logs from this date (YYYY-MM-DD)
- `endDate` (optional): Filter logs until this date (YYYY-MM-DD)
- `labId` (optional): Filter logs for specific lab
- `action` (optional): Filter by action type
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Examples**:
```bash
# Get all logs
GET /api/hod/activity-logs

# Get logs for last month
GET /api/hod/activity-logs?startDate=2025-10-01&endDate=2025-11-04

# Get only booking logs
GET /api/hod/activity-logs?type=booking&limit=20

# Get logs for specific lab in date range
GET /api/hod/activity-logs?labId=1&startDate=2025-10-01&endDate=2025-11-04

# Get logs for specific action
GET /api/hod/activity-logs?action=approved_by_hod
```

**Response**:
```json
{
  "type": "all",
  "filters": {
    "startDate": "2025-10-01",
    "endDate": "2025-11-04",
    "labId": null,
    "action": null
  },
  "bookingLogs": [...],
  "componentLogs": [...],
  "allLogs": [...],  // Only when type=all, sorted by date
  "totalCount": 10
}
```

### 2. Lab Staff Activity Logs
**Endpoint**: `GET /api/lab-staff/activity-logs`

**Access**: Lab Staff (only sees logs for assigned labs), Admin

**Query Parameters**: Same as HoD endpoint

**Additional Behavior**:
- Automatically filters to only show logs for labs assigned to the staff member
- Validates `labId` parameter is an assigned lab

## Logged Actions

### Lab Bookings:
- `created` - Booking created
- `approved_by_faculty` - Faculty approval
- `approved_by_lab_staff` - Lab staff approval
- `approved_by_hod` - HoD approval
- `rejected_by_faculty` - Faculty rejection
- `rejected_by_lab_staff` - Lab staff rejection
- `rejected_by_hod` - HoD rejection

### Component Requests:
- `created` - Request created
- `approved_by_faculty` - Faculty approval
- `approved_by_lab_staff` - Lab staff approval
- `approved_by_hod` - HoD approval
- `rejected_by_faculty` - Faculty rejection
- `rejected_by_lab_staff` - Lab staff rejection
- `rejected_by_hod` - HoD rejection

## Log Data Structure

### Lab Booking Activity Log:
```json
{
  "id": 1,
  "booking_id": 123,
  "lab_id": 5,
  "actor_user_id": 42,
  "actor_name": "John Doe",
  "actor_email": "john@example.com",
  "actor_role": "hod",
  "action": "approved_by_hod",
  "action_description": "Approved booking request: Looks good",
  "booking_snapshot": {
    "id": 123,
    "lab_id": 5,
    "status": "approved",
    // ... full booking data at time of action
  },
  "changes_made": null,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-11-04T15:30:00.000Z",
  "lab_name": "Computer Lab 1"
}
```

### Component Activity Log:
```json
{
  "id": 1,
  "entity_type": "component_request",
  "entity_id": 456,
  "lab_id": 5,
  "actor_user_id": 42,
  "actor_name": "John Doe",
  "actor_email": "john@example.com",
  "actor_role": "hod",
  "action": "approved_by_hod",
  "action_description": "Approved component request",
  "entity_snapshot": {
    "id": 456,
    "lab_id": 5,
    "status": "approved",
    "items": [
      { "name": "Resistor 10K", "quantity": 50 }
    ]
    // ... full request data with items
  },
  "changes_made": null,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-11-04T15:30:00.000Z",
  "lab_name": "Electronics Lab"
}
```

## Integration Status

### ✅ Integrated Endpoints:
1. **Student Bookings** - POST /api/student/bookings
2. **Faculty Bookings** - POST /api/faculty/bookings
3. **Faculty Approval** - POST /api/faculty/requests/[id]/action
4. **Lab Staff Approval** - POST /api/lab-staff/requests/[id]/action
5. **HoD Approval** - POST /api/hod/requests/[id]/action
6. **Student Component Requests** - POST /api/student/component-requests
7. **HoD Component Approval** - POST /api/hod/component-requests/[id]/action

### Key Features:
- **Fire-and-forget logging**: Never blocks API responses
- **Deletion-proof**: No foreign key constraints, data preserved forever
- **Denormalized**: Actor info stored directly, not dependent on users table
- **Complete snapshots**: Full record state captured at time of action
- **Metadata capture**: IP addresses, user agents, timestamps

## Notes

- Logs are permanent and cannot be deleted through the UI
- Snapshots include complete booking/request state at time of action
- Component logs include items array in the snapshot
- All dates are stored in UTC, displayed in local timezone
- Migration copied last 6 months of logs from old system_logs table
