# Activity Logs - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create the Database Tables (1 minute)

```bash
cd /Users/abhinavdogra/Desktop/Projects/lab-managment-system
./scripts/setup-activity-logs.sh
```

Enter your MySQL password when prompted. The script will:
- ✅ Test database connection
- ✅ Create `lab_booking_activity_logs` table
- ✅ Create `component_activity_logs` table
- ✅ Add optimized indexes
- ✅ Show table structures

### Step 2: Test the Logger (1 minute)

Create a test file `test-logger.ts` in the project root:

```typescript
import { logLabBookingActivity, getUserInfoForLogging } from "./lib/activity-logger"

async function test() {
  console.log("Testing activity logger...")
  
  // Test 1: Log a simple action
  await logLabBookingActivity({
    bookingId: 999,
    labId: 1,
    actorUserId: 1,
    actorName: "Test User",
    actorEmail: "test@lnmiit.ac.in",
    actorRole: "faculty",
    action: "created",
    actionDescription: "Test log entry",
    bookingSnapshot: { test: true, timestamp: new Date().toISOString() },
  })
  
  console.log("✅ Test log created successfully!")
  
  // Test 2: Verify it was inserted
  const { db } = await import("./lib/database")
  const result = await db.query(
    "SELECT * FROM lab_booking_activity_logs ORDER BY created_at DESC LIMIT 1"
  )
  
  console.log("📋 Latest log entry:", result.rows[0])
  process.exit(0)
}

test().catch((err) => {
  console.error("❌ Error:", err)
  process.exit(1)
})
```

Run it:

```bash
npx tsx test-logger.ts
```

You should see:
```
Testing activity logger...
✅ Test log created successfully!
📋 Latest log entry: { id: 1, booking_id: 999, actor_name: 'Test User', ... }
```

### Step 3: Add to Your First API Route (3 minutes)

Let's update the faculty bookings creation route as an example.

**File:** `app/api/faculty/bookings/route.ts`

Add imports at the top:

```typescript
import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"
```

Find the booking creation code and add logging after it:

```typescript
// Existing code - create the booking
const booking = await dbOperations.createBooking({
  labId: body.labId,
  bookedBy: userId,
  bookingDate: body.bookingDate,
  startTime: body.startTime,
  endTime: body.endTime,
  purpose: body.purpose,
  expectedStudents: body.expectedStudents,
  equipmentNeeded: body.equipmentNeeded,
})

// NEW CODE - Log the activity
const userInfo = await getUserInfoForLogging(userId)
logLabBookingActivity({
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
}).catch(err => console.error("Activity logging failed:", err))

// Existing code - return the response
return NextResponse.json({ success: true, booking })
```

**That's it!** Your first API route is now logging activities.

### Step 4: Test It Live

1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Login as a faculty member

3. Create a lab booking through the UI

4. Check the database:
   ```sql
   SELECT 
     actor_name, 
     actor_email, 
     action, 
     action_description, 
     created_at 
   FROM lab_booking_activity_logs 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

   You should see your booking creation logged! 🎉

### Step 5: View in HoD Dashboard (Optional)

Create a simple API route to show logs:

**File:** `app/api/hod/activity-logs/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getAllActivityLogsForDepartment } from "@/lib/activity-logger"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "hod") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get HoD's department
    const userResult = await db.query(
      "SELECT department FROM users WHERE id = ?",
      [session.user.id]
    )
    const userDept = userResult.rows[0]?.department

    const deptResult = await db.query(
      "SELECT id FROM departments WHERE name = ?",
      [userDept]
    )
    const departmentId = deptResult.rows[0]?.id

    if (!departmentId) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    // Get activity logs
    const logs = await getAllActivityLogsForDepartment({
      departmentId,
      limit: 50,
    })

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
```

Test it by visiting (as HoD):
```
http://localhost:3000/api/hod/activity-logs
```

## 📚 Next Steps

1. **Add logging to more routes** - See `ACTIVITY_LOGS_CHECKLIST.md` for complete list

2. **Create UI for HoD dashboard** - Show activity logs in a table with filters

3. **Add component logging** - Use `logComponentActivity()` for component requests/loans

4. **Monitor performance** - Check query times, add indexes if needed

5. **Set up archival** - Plan for old log cleanup (optional)

## 🆘 Common Issues

### "Cannot find module '@/lib/activity-logger'"

Make sure you're importing from the correct path. The file is at:
```
/Users/abhinavdogra/Desktop/Projects/lab-managment-system/lib/activity-logger.ts
```

### "Table doesn't exist"

Run the setup script again:
```bash
./scripts/setup-activity-logs.sh
```

### "Logging fails silently"

Check the console for errors. The logging uses `.catch()` so it won't break your API, but errors will be logged to console.

### "No logs appearing"

1. Check the database directly: `SELECT * FROM lab_booking_activity_logs;`
2. Verify the API route is actually calling `logLabBookingActivity()`
3. Check console for errors
4. Make sure database connection is working

## 📖 Full Documentation

- **Architecture:** `ACTIVITY_LOGS_ARCHITECTURE.md`
- **Implementation:** `ACTIVITY_LOGS_IMPLEMENTATION.md`
- **Summary:** `ACTIVITY_LOGS_SUMMARY.md`
- **Checklist:** `ACTIVITY_LOGS_CHECKLIST.md`
- **Example Code:** `EXAMPLE_API_WITH_LOGGING.ts`

## ✅ Success!

You should now have:
- ✅ Database tables created
- ✅ Test log inserted
- ✅ One API route logging activities
- ✅ Verified logs in database

Time to add logging to the rest of your API routes! 🚀
