# Activity Logs System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BEFORE (Problem)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐                                                         │
│   │  users   │                                                         │
│   │  id=123  │──┐                                                      │
│   │  name=   │  │ FK Constraint                                       │
│   │  "John"  │  │ ON DELETE CASCADE                                   │
│   └──────────┘  │                                                      │
│                 ↓                                                      │
│   ┌─────────────────────┐                                             │
│   │   system_logs       │                                             │
│   │   user_id = 123     │  ← Logs reference user                     │
│   │   action = "created"│                                             │
│   │   entity = "booking"│                                             │
│   └─────────────────────┘                                             │
│           ↓                                                            │
│      [User Deleted]                                                    │
│           ↓                                                            │
│   ┌─────────────────────┐                                             │
│   │   system_logs       │                                             │
│   │   user_id = NULL    │  ← Lost user info! ❌                       │
│   │   action = "created"│     OR entire log deleted                  │
│   │   entity = "booking"│                                             │
│   └─────────────────────┘                                             │
│                                                                         │
│   Problem: Can't tell WHO created the booking!                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         AFTER (Solution)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐                                                         │
│   │  users   │                                                         │
│   │  id=123  │    No FK constraint!                                   │
│   │  name=   │    Just a nullable reference                          │
│   │  "John"  │                                                         │
│   └──────────┘                                                         │
│        │                                                               │
│        │ When action happens, copy user info ↓                        │
│        │                                                               │
│   ┌────────────────────────────────────┐                              │
│   │  lab_booking_activity_logs         │                              │
│   │  ─────────────────────────────────  │                              │
│   │  booking_id = 456                  │                              │
│   │  lab_id = 1                        │                              │
│   │  actor_user_id = 123    ←──────────┘  Copy at time of action    │
│   │  actor_name = "John Doe"           │                              │
│   │  actor_email = "john@lnmiit.ac.in" │                              │
│   │  actor_role = "faculty"            │                              │
│   │  action = "created"                │                              │
│   │  booking_snapshot = {...}          │  ← Full snapshot             │
│   │  created_at = 2024-11-04           │                              │
│   └────────────────────────────────────┘                              │
│           ↓                                                            │
│      [User Deleted]                                                    │
│           ↓                                                            │
│   ┌────────────────────────────────────┐                              │
│   │  lab_booking_activity_logs         │                              │
│   │  ─────────────────────────────────  │                              │
│   │  booking_id = 456                  │                              │
│   │  lab_id = 1                        │                              │
│   │  actor_user_id = 123    (orphaned) │  ← Still have all info! ✅  │
│   │  actor_name = "John Doe"           │                              │
│   │  actor_email = "john@lnmiit.ac.in" │                              │
│   │  actor_role = "faculty"            │                              │
│   │  action = "created"                │                              │
│   │  booking_snapshot = {...}          │                              │
│   │  created_at = 2024-11-04           │                              │
│   └────────────────────────────────────┘                              │
│                                                                         │
│   Success: Complete history preserved! ✅                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      Data Flow Diagram                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   API Request (POST /api/faculty/bookings)                            │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  1. Get authenticated user       │                                │
│   │     userId = session.user.id     │                                │
│   └──────────────────────────────────┘                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  2. Fetch user details           │                                │
│   │     getUserInfoForLogging(userId)│                                │
│   │     → { id, name, email, role }  │                                │
│   └──────────────────────────────────┘                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  3. Create booking               │                                │
│   │     dbOperations.createBooking() │                                │
│   │     → booking object             │                                │
│   └──────────────────────────────────┘                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  4. Log activity (async)         │                                │
│   │     logLabBookingActivity({      │                                │
│   │       bookingId: booking.id,     │                                │
│   │       labId: booking.lab_id,     │                                │
│   │       actorUserId: userInfo.id,  │                                │
│   │       actorName: userInfo.name,  │                                │
│   │       actorEmail: userInfo.email,│                                │
│   │       actorRole: userInfo.role,  │                                │
│   │       action: "created",         │                                │
│   │       bookingSnapshot: booking,  │                                │
│   │       ipAddress: ...,            │                                │
│   │       userAgent: ...             │                                │
│   │     })                           │                                │
│   └──────────────────────────────────┘                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  5. Insert to activity log table │                                │
│   │     INSERT INTO                  │                                │
│   │     lab_booking_activity_logs    │                                │
│   └──────────────────────────────────┘                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────┐                                │
│   │  6. Return success to client     │                                │
│   └──────────────────────────────────┘                                │
│                                                                         │
│   Note: Logging doesn't block the response!                           │
│         Uses .catch() to handle errors silently                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    HoD Dashboard Query Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   HoD Dashboard Request                                                │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────────────────┐                    │
│   │  1. Get HoD's department_id                  │                    │
│   │     user.department → "Computer Science"     │                    │
│   │     departments table → department_id = 1    │                    │
│   └──────────────────────────────────────────────┘                    │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────────────────┐                    │
│   │  2. Call getAllActivityLogsForDepartment()   │                    │
│   │     departmentId: 1                          │                    │
│   │     startDate: "2024-11-01"                  │                    │
│   │     endDate: "2024-11-30"                    │                    │
│   │     limit: 50                                │                    │
│   └──────────────────────────────────────────────┘                    │
│          │                                                              │
│          ├────────────────────┬─────────────────────┐                 │
│          ↓                    ↓                     ↓                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐        │
│   │ Lab Booking     │  │ Component       │  │ Component    │        │
│   │ Activity Logs   │  │ Request Logs    │  │ Loan Logs    │        │
│   │                 │  │                 │  │              │        │
│   │ JOIN labs       │  │ JOIN labs       │  │ JOIN labs    │        │
│   │ WHERE           │  │ WHERE           │  │ WHERE        │        │
│   │ dept_id = 1     │  │ dept_id = 1     │  │ dept_id = 1  │        │
│   └─────────────────┘  └─────────────────┘  └──────────────┘        │
│          │                    │                     │                 │
│          └────────────────────┴─────────────────────┘                 │
│                               │                                        │
│                               ↓                                        │
│   ┌──────────────────────────────────────────────┐                    │
│   │  3. Combine and sort by created_at DESC      │                    │
│   │     [                                        │                    │
│   │       { logType: 'lab_booking', ... },       │                    │
│   │       { logType: 'component', ... },         │                    │
│   │       ...                                    │                    │
│   │     ]                                        │                    │
│   └──────────────────────────────────────────────┘                    │
│          │                                                              │
│          ↓                                                              │
│   ┌──────────────────────────────────────────────┐                    │
│   │  4. Return paginated results to dashboard    │                    │
│   └──────────────────────────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    Table Relationships                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐                                                     │
│   │    users     │ ─ ─ ─ ─ ─ ─ ─ ─ ┐                                  │
│   │              │  (no FK, just                                       │
│   │  id          │   nullable ref)  │                                  │
│   │  name        │                  ↓                                  │
│   │  email       │          ┌────────────────────────────┐             │
│   │  role        │          │ lab_booking_activity_logs  │             │
│   └──────────────┘          │                            │             │
│                             │  actor_user_id (nullable)  │             │
│   ┌──────────────┐          │  actor_name                │             │
│   │    labs      │ ─ ─ ─ ─ ─│  actor_email               │             │
│   │              │          │  actor_role                │             │
│   │  id          │  (no FK) │  action                    │             │
│   │  name        │          │  booking_snapshot (JSON)   │             │
│   │  dept_id  ───┼──┐       │  changes_made (JSON)       │             │
│   └──────────────┘  │       └────────────────────────────┘             │
│                     │                                                   │
│   ┌──────────────┐  │       ┌────────────────────────────┐             │
│   │ departments  │←─┘       │ component_activity_logs    │             │
│   │              │           │                            │             │
│   │  id          │           │  actor_user_id (nullable)  │             │
│   │  name        │           │  actor_name                │             │
│   │  hod_id      │           │  actor_email               │             │
│   └──────────────┘           │  actor_role                │             │
│                              │  entity_type               │             │
│   ┌──────────────┐           │  action                    │             │
│   │  lab_        │ ─ ─ ─ ─ ─│  entity_snapshot (JSON)    │             │
│   │  bookings    │  (no FK) │  changes_made (JSON)       │             │
│   │              │           └────────────────────────────┘             │
│   │  id          │                                                      │
│   │  lab_id      │                                                      │
│   │  booked_by   │                                                      │
│   └──────────────┘                                                      │
│                                                                         │
│   Key:                                                                  │
│   ──── = Actual foreign key constraint                                 │
│   ─ ─  = Nullable reference (no constraint)                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. **No Foreign Key Constraints**
- Activity logs use nullable integer references
- Prevents CASCADE deletion destroying logs
- Preserves orphaned references when entities deleted

### 2. **Denormalized User Data**
- Store user name, email, role at time of action
- Captures exact state when action happened
- Historical accuracy preserved even if user data changes

### 3. **JSON Snapshots**
- Store complete entity state at time of action
- Enables "time travel" - see exact state at any point
- Useful for auditing and compliance

### 4. **Separate Tables by Entity Type**
- Lab bookings in one table
- Component requests/loans in another
- Optimized indexes for common queries
- Better performance than single monolithic log table

### 5. **Fire-and-Forget Logging**
```typescript
// Don't await - prevents blocking the response
logLabBookingActivity({...}).catch(err => console.error(err))
```
- Logging failures don't break main operation
- Better user experience
- Logged errors for debugging

### 6. **Async Nature**
```
User Request → Create Booking → Return Success → Log Activity (async)
     ↓              ↓                 ↓              ↓
   Fast         Fast             Fast          Async (don't wait)
```

Benefits:
- Fast response times
- Non-blocking operations
- Resilient to logging failures
