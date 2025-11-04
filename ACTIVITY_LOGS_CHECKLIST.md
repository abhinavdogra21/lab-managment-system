# Activity Logs Setup Checklist

## ✅ Pre-Setup (Completed)

- [x] SQL schema created (`scripts/06-create-activity-logs.sql`)
- [x] TypeScript helper library created (`lib/activity-logger.ts`)
- [x] Setup script created and made executable (`scripts/setup-activity-logs.sh`)
- [x] Implementation guide written (`ACTIVITY_LOGS_IMPLEMENTATION.md`)
- [x] Example API code provided (`EXAMPLE_API_WITH_LOGGING.ts`)
- [x] Summary document created (`ACTIVITY_LOGS_SUMMARY.md`)

## 🔧 Database Setup (Do This First)

- [ ] **Step 1:** Backup your database
  ```bash
  mysqldump -u root -p lnmiit_lab_management > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Step 2:** Run the setup script
  ```bash
  cd /Users/abhinavdogra/Desktop/Projects/lab-managment-system
  ./scripts/setup-activity-logs.sh
  ```
  
  Or manually:
  ```bash
  mysql -u root -p lnmiit_lab_management < scripts/06-create-activity-logs.sql
  ```

- [ ] **Step 3:** Verify tables were created
  ```sql
  USE lnmiit_lab_management;
  SHOW TABLES LIKE '%activity_logs';
  -- Should show:
  -- component_activity_logs
  -- lab_booking_activity_logs
  ```

- [ ] **Step 4:** Check table structure
  ```sql
  DESCRIBE lab_booking_activity_logs;
  DESCRIBE component_activity_logs;
  ```

## 🧪 Test the Logger (Quick Test)

- [ ] **Step 5:** Test logging from Node.js console

  Create a test file `test-activity-logger.ts`:
  ```typescript
  import { logLabBookingActivity } from "./lib/activity-logger"
  
  async function test() {
    await logLabBookingActivity({
      bookingId: 999,
      labId: 1,
      actorUserId: 1,
      actorName: "Test User",
      actorEmail: "test@lnmiit.ac.in",
      actorRole: "faculty",
      action: "created",
      actionDescription: "Test log entry",
      bookingSnapshot: { test: true },
    })
    console.log("✓ Test log created successfully")
  }
  
  test().catch(console.error)
  ```

  Run it:
  ```bash
  npx tsx test-activity-logger.ts
  ```

- [ ] **Step 6:** Verify the test log was inserted
  ```sql
  SELECT * FROM lab_booking_activity_logs ORDER BY created_at DESC LIMIT 1;
  ```

## 📝 Code Integration (Update API Routes)

### Lab Bookings

- [ ] **Route:** `app/api/faculty/bookings/route.ts` (POST)
  - Add import: `import { logLabBookingActivity, getUserInfoForLogging } from "@/lib/activity-logger"`
  - Add logging after booking creation
  - Action: `"created"`

- [ ] **Route:** `app/api/hod/bookings/[id]/approve/route.ts` (PUT)
  - Add logging after approval
  - Action: `"approved"`
  - Include `changesMade` object

- [ ] **Route:** `app/api/hod/bookings/[id]/reject/route.ts` (PUT)
  - Add logging after rejection
  - Action: `"rejected"`

- [ ] **Route:** `app/api/faculty/bookings/[id]/cancel/route.ts` (PUT/DELETE)
  - Add logging when cancelled
  - Action: `"cancelled"`

- [ ] **Route:** `app/api/admin/bookings/[id]/route.ts` (DELETE)
  - Add logging before deletion (important!)
  - Action: `"deleted"`

### Component Requests

- [ ] **Route:** `app/api/student/component-requests/route.ts` (POST)
  - Add logging after request creation
  - Entity type: `"component_request"`
  - Action: `"created"`

- [ ] **Route:** `app/api/faculty/component-requests/[id]/approve/route.ts`
  - Add logging after faculty approval
  - Action: `"faculty_approved"`

- [ ] **Route:** `app/api/lab-staff/component-requests/[id]/approve/route.ts`
  - Add logging after lab staff approval
  - Action: `"lab_staff_approved"`

- [ ] **Route:** `app/api/hod/component-requests/[id]/approve/route.ts`
  - Add logging after HoD approval
  - Action: `"hod_approved"`

- [ ] **Route:** Component request rejection endpoints
  - Add logging when rejected
  - Action: `"rejected"`

- [ ] **Route:** Component request issue/return endpoints
  - Add logging for `"issued"` and `"returned"` actions

### Component Loans

- [ ] **Route:** `app/api/student/component-loans/route.ts` (POST)
  - Add logging after loan creation
  - Entity type: `"component_loan"`
  - Action: `"created"`

- [ ] **Route:** Lab staff approval endpoints for loans
  - Add logging for `"lab_staff_approved"`, `"issued"`, `"returned"`

## 🎨 UI Updates (HoD Dashboard)

- [ ] **Create HoD logs API endpoint**
  - File: `app/api/hod/activity-logs/route.ts`
  - Use: `getAllActivityLogsForDepartment()`
  - Return paginated logs

- [ ] **Create HoD logs page component**
  - File: `app/hod/dashboard/activity-logs/page.tsx`
  - Show table of recent activities
  - Add filters (date range, action type, lab)
  - Add pagination

- [ ] **Add navigation link**
  - Update sidebar to include "Activity Logs" menu item

## 🧹 Cleanup (Optional)

- [ ] **Migrate existing logs** (if you want historical data)
  - Uncomment migration SQL in `scripts/06-create-activity-logs.sql`
  - Run the script again
  - Verify logs were migrated: `SELECT COUNT(*) FROM lab_booking_activity_logs;`

- [ ] **Clean up old system_logs** (after migration)
  - Consider archiving or deleting old booking/component logs from `system_logs`
  - Keep other types of logs in `system_logs` for now

## ✅ Testing & Verification

- [ ] **Create a test booking**
  - Go to faculty dashboard
  - Create a lab booking
  - Check: `SELECT * FROM lab_booking_activity_logs WHERE action='created' ORDER BY created_at DESC LIMIT 1;`

- [ ] **Approve the booking as HoD**
  - Login as HoD
  - Approve the booking
  - Check: `SELECT * FROM lab_booking_activity_logs WHERE action='approved' ORDER BY created_at DESC LIMIT 1;`
  - Verify `changes_made` JSON has before/after values

- [ ] **Delete a user**
  - Create a test student
  - Have them create a booking
  - Delete the student
  - Check: Logs should still show their name/email (not NULL)

- [ ] **View HoD activity logs**
  - Login as HoD
  - Navigate to Activity Logs page
  - Should see all department activities

## 📊 Performance Check

- [ ] **Test query performance**
  ```sql
  -- Should be fast with indexes
  EXPLAIN SELECT * FROM lab_booking_activity_logs 
  WHERE lab_id = 1 
  ORDER BY created_at DESC 
  LIMIT 50;
  ```

- [ ] **Monitor log growth**
  - After a week: `SELECT COUNT(*) FROM lab_booking_activity_logs;`
  - After a month: Check table size
  - Plan archival strategy if needed (2+ years old logs)

## 📚 Documentation

- [ ] **Update team documentation**
  - Share `ACTIVITY_LOGS_IMPLEMENTATION.md` with team
  - Add to onboarding docs
  - Document API changes in changelog

- [ ] **Create runbook for ops team**
  - How to check logs
  - How to archive old logs
  - Troubleshooting common issues

## 🎯 Success Criteria

You're done when:

✅ Tables created and verified  
✅ Test log inserted successfully  
✅ At least one API route logging correctly  
✅ Logs preserved after user deletion  
✅ Logs preserved after booking deletion  
✅ HoD can view department activity logs  
✅ Performance is acceptable  

## 🆘 Troubleshooting

**Problem:** Setup script fails with "Table already exists"
- **Solution:** Run `DROP TABLE IF EXISTS lab_booking_activity_logs, component_activity_logs;` first

**Problem:** Logging fails silently
- **Solution:** Check console for errors, verify database connection, check table schema

**Problem:** HoD sees no logs
- **Solution:** Verify department_id is set on labs, check query filters

**Problem:** JSON fields are strings
- **Solution:** Use `JSON.parse()` when reading `booking_snapshot` or `changes_made`

## 📞 Need Help?

Refer to:
- `ACTIVITY_LOGS_IMPLEMENTATION.md` - Detailed implementation guide
- `ACTIVITY_LOGS_SUMMARY.md` - Overview and benefits
- `EXAMPLE_API_WITH_LOGGING.ts` - Code examples
