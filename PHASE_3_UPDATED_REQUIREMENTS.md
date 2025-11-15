# Phase 3 Updates: Multi-Lab Booking Enhancements

## Updated Requirements (Nov 15, 2025)

Based on user feedback, the multi-lab booking feature needs the following enhancements:

### ✅ COMPLETED

1. **Multi-Lab Selection for Faculty** ✅
   - Applied checkbox multi-select UI to Faculty booking form
   - Added `loadCommonFreeSlots()` function
   - Created `/api/faculty/common-free-slots` endpoint
   - Updated `/api/faculty/booking-requests` to handle `lab_ids` array
   - Faculty can now book multiple labs simultaneously

2. **Multi-Lab Booking API for Faculty** ✅
   - Checks conflicts in ALL selected labs
   - Creates `multi_lab_approvals` entries
   - Validates timetable conflicts
   - Sends appropriate error messages with lab names

### 🔄 IN PROGRESS

3. **Multi-Lab Selection for Others/TnP Users** 🔄
   - Need to apply same checkbox UI
   - Create `/api/others/common-free-slots` endpoint
   - Update `/app/api/others/booking-requests` API

### ❌ PENDING (Critical Changes)

4. **Show ALL Available Time Blocks (Not Just 1-Hour Slots)** ❌ **HIGH PRIORITY**
   
   **Current Behavior:**
   - Shows only 1-hour slots: 8-9 AM, 9-10 AM, etc.
   - User must select from predefined hourly intervals
   
   **Required Behavior:**
   - Show ALL continuous free time blocks during the day
   - Example: "8:00 AM - 12:30 PM (4.5 hours available)"
   - Example: "2:00 PM - 5:45 PM (3.75 hours available)"
   - User can then pick ANY start/end time within these blocks
   
   **Implementation Plan:**
   - Update `/api/student/common-free-slots` algorithm
   - Update `/api/faculty/common-free-slots` algorithm  
   - Update `/api/others/common-free-slots` algorithm
   - Instead of filtering predefined slots, find gaps between bookings
   - Merge adjacent free slots into continuous blocks
   - Display as ranges instead of discrete hour options

5. **UNIQUE Person Responsible for EACH Lab** ❌ **HIGH PRIORITY**
   
   **Current Behavior:**
   - One person responsible applies to ALL labs in multi-lab booking
   - Only one name + email collected
   
   **Required Behavior:**
   - Each lab must have its OWN person responsible
   - If booking CP1, CP2, CP3 → collect 3 sets of name+email
   - UI should show:
     ```
     Person Responsible for Each Lab:
     
     📍 CP1 - Computer Programming Lab 1
     Name: [John Doe      ]
     Email: [john@lnmiit.ac.in]
     
     📍 CP2 - Computer Programming Lab 2  
     Name: [Jane Smith    ]
     Email: [jane@lnmiit.ac.in]
     
     📍 CP3 - Computer Programming Lab 3
     Name: [Bob Wilson    ]
     Email: [bob@lnmiit.ac.in]
     ```
   
   **Implementation Plan:**
   - Change state from single object to array:
     ```typescript
     const [responsiblePersons, setResponsiblePersons] = useState<{
       lab_id: string,
       lab_name: string,
       name: string,
       email: string
     }[]>([])
     ```
   - When labs selected, initialize array with lab info
   - Create accordion/section for each lab
   - Validate ALL emails end with @lnmiit.ac.in
   - Store in database as:
     - Option A: JSON array in `booking_requests.responsible_persons`
     - Option B: New table `multi_lab_responsible_persons` with columns:
       ```sql
       CREATE TABLE multi_lab_responsible_persons (
         id INT PRIMARY KEY AUTO_INCREMENT,
         booking_request_id INT,
         lab_id INT,
         name VARCHAR(255),
         email VARCHAR(255),
         FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id),
         FOREIGN KEY (lab_id) REFERENCES labs(id)
       );
       ```

6. **Timeline Showing Individual Lab Approval Status** ❌ **MEDIUM PRIORITY**
   
   **Required Display:**
   ```
   Multi-Lab Booking Status:
   
   ✅ CP1 - Computer Programming Lab 1
      └─ Approved by John Smith (Lab Staff) on Nov 14, 2:30 PM
   
   ⏳ CP2 - Computer Programming Lab 2
      └─ Pending approval from Lab Staff
   
   ❌ CP3 - Computer Programming Lab 3
      └─ Rejected by Sarah Johnson (Lab Staff) on Nov 14, 3:15 PM
      └─ Reason: Equipment maintenance scheduled
   
   Overall Status: REJECTED (All labs must be approved)
   ```
   
   **Implementation:**
   - Create component: `/components/multi-lab-approval-timeline.tsx`
   - Query `multi_lab_approvals` table joined with labs and users
   - Show icon, lab name, status, approver name, timestamp
   - Display rejection reason if any
   - Overall status logic:
     - If ANY lab rejected → Show "REJECTED"
     - If ALL labs approved → Show "APPROVED - Sent to HOD"
     - Otherwise → Show "PENDING - X of Y labs approved"

---

## Database Schema Changes Needed

### Option A: Store person responsible in JSON (Simpler)
```sql
ALTER TABLE booking_requests
ADD COLUMN responsible_persons JSON COMMENT 'Array of {lab_id, name, email} for multi-lab bookings';
```

### Option B: Separate Table (More Normalized)
```sql
CREATE TABLE multi_lab_responsible_persons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_request_id INT NOT NULL,
  lab_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (lab_id) REFERENCES labs(id),
  UNIQUE KEY unique_booking_lab (booking_request_id, lab_id)
);

CREATE INDEX idx_booking_id ON multi_lab_responsible_persons(booking_request_id);
```

**Recommendation**: Use Option B (separate table) for better data integrity and querying.

---

## Updated Implementation Priority

### Phase 3A: Complete Multi-Lab Selection (Current)
- [x] Student form multi-lab selection
- [x] Student API multi-lab support
- [x] Faculty form multi-lab selection  
- [x] Faculty API multi-lab support
- [ ] Others/TnP form multi-lab selection
- [ ] Others/TnP API multi-lab support

### Phase 3B: Show ALL Available Time Blocks ⚠️ **CRITICAL**
- [ ] Update common-free-slots algorithm (all 3 APIs)
- [ ] Change from hourly slots to continuous blocks
- [ ] Update UI to display time ranges instead of discrete options
- [ ] Allow manual time entry within free blocks

### Phase 3C: Unique Person Responsible Per Lab ⚠️ **CRITICAL**
- [ ] Create database table `multi_lab_responsible_persons`
- [ ] Update all 3 booking forms (Student, Faculty, Others)
- [ ] Add accordion UI for each lab's person responsible
- [ ] Update all 3 booking APIs to store multiple responsible persons
- [ ] Update email notifications to include each lab's responsible person

### Phase 3D: Approval Timeline UI
- [ ] Create timeline component
- [ ] Add to booking details pages
- [ ] Show individual lab approval status
- [ ] Display overall booking status logic

### Phase 4: Multi-Lab Approval Workflow
- [ ] Update lab staff approval to mark individual labs
- [ ] HOD approval only when ALL labs approved
- [ ] Rejection of one lab = rejection of entire booking

---

## Files Modified So Far

### Student Booking
- ✅ `/app/student/dashboard/book-lab/page.tsx` - Multi-lab UI
- ✅ `/app/api/student/common-free-slots/route.ts` - Find common slots
- ✅ `/app/api/student/booking-requests/route.ts` - Handle multi-lab

### Faculty Booking  
- ✅ `/app/faculty/dashboard/book-labs/page.tsx` - Multi-lab UI
- ✅ `/app/api/faculty/common-free-slots/route.ts` - Find common slots
- ✅ `/app/api/faculty/booking-requests/route.ts` - Handle multi-lab

### Others/TnP Booking
- ❌ `/app/others/dashboard/book-labs/page.tsx` - Needs update
- ❌ `/app/api/others/common-free-slots/route.ts` - Needs creation
- ❌ `/app/api/others/booking-requests/route.ts` - Needs update

---

## Next Immediate Steps

1. **Complete Others/TnP multi-lab** (30 min)
   - Copy multi-lab UI from student/faculty forms
   - Create common-free-slots API
   - Update booking API

2. **Change to continuous time blocks** (2 hours) ⚠️ **HIGH PRIORITY**
   - Rewrite slot detection algorithm
   - Find gaps between bookings
   - Merge adjacent free times
   - Update all 3 common-free-slots APIs

3. **Implement unique person per lab** (3 hours) ⚠️ **HIGH PRIORITY**
   - Create database table
   - Update all 3 forms with accordion UI
   - Update all 3 APIs to handle array of responsible persons
   - Update validation logic

4. **Create approval timeline** (2 hours)
   - Build reusable component
   - Add to booking details pages
   - Style with icons and colors

**Total Estimated Time**: ~8 hours

---

## Testing Checklist (Updated)

### Multi-Lab Booking
- [ ] Select 3 labs → See "3 labs selected"
- [ ] Common slots show CONTINUOUS blocks (not hourly)
- [ ] Each lab has its own person responsible field
- [ ] All emails must end with @lnmiit.ac.in
- [ ] Booking creates entries for each lab
- [ ] Approval timeline shows each lab's status

### Single Lab Booking (Regression)
- [ ] Still works as before
- [ ] Shows booked slots timeline
- [ ] One person responsible field

---

**Status**: Phase 3A mostly complete, Phase 3B and 3C critical for launch

**Last Updated**: November 15, 2025
