# Multi-Lab Booking Manual Test Guide

## Prerequisites
✅ Dev server running on http://localhost:3000
✅ Database: lnmiit_lab_management
✅ TESTING_MODE in .env.local (set to true/false as needed)

---

## Test Scenario: 3-Lab Booking (CP1, CP2, CP3)

### Available Test Data:
- **Labs**: Computer Lab1 (CP1), Computer Lab2 (CP2), Computer Lab 3 (CP3)
- **Student**: 23ucs507@lnmiit.ac.in (ABHINAV DOGRA)
- **Lab Staff**: 
  - CP1: shivam@lnmiit.ac.in (Shivam Maheshwari)
  - CP2: shivangi@lnmiit.ac.in (Shivangi Singh)
  - CP3: laxman@lnmiit.ac.in (Laxman Singh)
- **HOD**: hodcse@lnmiit.ac.in (RAJBIR KAUR)

---

## 🧪 Test Steps

### Step 1: Create Multi-Lab Booking (as Student)

1. **Login**: http://localhost:3000
   - Email: `23ucs507@lnmiit.ac.in`
   - Password: (your test password)

2. **Navigate**: Student Dashboard → Book Lab

3. **Fill Form**:
   - ✅ Check "Book Multiple Labs"
   - Select labs: CP1, CP2, CP3
   - Date: Tomorrow
   - Time: 14:00 to 16:00
   - Purpose: "Multi-lab booking test"
   
4. **Responsible Persons** (should show 3 forms, one per lab):
   ```
   CP1:
   - Name: Test Person 1
   - Email: test1@example.com
   
   CP2:
   - Name: Test Person 2
   - Email: test2@example.com
   
   CP3:
   - Name: Test Person 3
   - Email: test3@example.com
   ```

5. **Submit** → Note the Request ID

**Expected Result:**
- ✅ Success message
- ✅ Status: "Pending Lab Staff Approval"
- ✅ Database: 3 rows in `multi_lab_approvals` (all status='pending')
- ✅ Database: 3 rows in `multi_lab_responsible_persons`

**Verify in Database:**
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT id, status, is_multi_lab, lab_ids 
FROM booking_requests 
ORDER BY id DESC LIMIT 1;
"

# Check multi-lab approvals
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT booking_request_id, lab_id, status 
FROM multi_lab_approvals 
WHERE booking_request_id = (SELECT MAX(id) FROM booking_requests);
"
```

---

### Step 2: Lab Staff Approval - CP1 (First Lab)

1. **Logout** from student account

2. **Login**: http://localhost:3000
   - Email: `shivam@lnmiit.ac.in`
   - Password: (lab staff password)

3. **Navigate**: Lab Staff Dashboard → Requests

4. **Find** the multi-lab booking request

5. **Approve** with remarks: "CP1 approved - Test"

**Expected Result:**
- ✅ Success message
- ✅ Status: Still "Pending Lab Staff Approval" (waiting for CP2, CP3)
- ✅ Email to student: "Lab Computer Lab1 approved. Waiting for 2 more lab(s)."
- ✅ NO email to HOD yet

**Verify:**
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT lab_id, status, lab_staff_approved_by, lab_staff_approved_at 
FROM multi_lab_approvals 
WHERE booking_request_id = [YOUR_BOOKING_ID];
"
```
Should show: CP1 = 'approved_by_lab_staff', CP2 = 'pending', CP3 = 'pending'

---

### Step 3: Lab Staff Approval - CP2 (Second Lab)

1. **Logout** from CP1 lab staff

2. **Login**: `shivangi@lnmiit.ac.in`

3. **Navigate**: Lab Staff Dashboard → Requests

4. **Approve** with remarks: "CP2 approved - Test"

**Expected Result:**
- ✅ Status: Still "Pending Lab Staff Approval" (waiting for CP3)
- ✅ Email to student: "Lab Computer Lab2 approved. Waiting for 1 more lab(s)."
- ✅ Still NO email to HOD

**Verify:**
Database should show: CP1 = 'approved_by_lab_staff', CP2 = 'approved_by_lab_staff', CP3 = 'pending'

---

### Step 4: Lab Staff Approval - CP3 (Third/Last Lab)

1. **Logout** from CP2 lab staff

2. **Login**: `laxman@lnmiit.ac.in`

3. **Navigate**: Lab Staff Dashboard → Requests

4. **Approve** with remarks: "CP3 approved - Test"

**Expected Result:**
- ✅ Status: NOW changes to "Pending HOD Approval" 🎉
- ✅ Email to student: "All labs approved! Your request is now pending HoD approval."
- ✅ Email to HOD: New multi-lab request ready (shows all 3 labs)

**Verify:**
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT status FROM booking_requests WHERE id = [YOUR_BOOKING_ID];
"
# Should show: pending_hod

mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT lab_id, status FROM multi_lab_approvals WHERE booking_request_id = [YOUR_BOOKING_ID];
"
# All should show: approved_by_lab_staff
```

---

### Step 5: HOD Final Approval

1. **Logout** from lab staff

2. **Login**: `hodcse@lnmiit.ac.in`

3. **Navigate**: HOD Dashboard → Requests

4. **Find** the multi-lab booking (should show all 3 labs)

5. **Approve** with remarks: "All labs verified - Final approval"

**Expected Result:**
- ✅ Status: "Approved" 🎉🎉🎉
- ✅ Email to student: "Booking approved for Multiple Labs (Computer Lab1, Computer Lab2, Computer Lab 3)"
- ✅ Email to Test Person 1: "You are responsible for Computer Lab1" (detailed instructions)
- ✅ Email to Test Person 2: "You are responsible for Computer Lab2" (detailed instructions)
- ✅ Email to Test Person 3: "You are responsible for Computer Lab 3" (detailed instructions)

**If TESTING_MODE=true:**
- ✅ Console logs: "[TESTING_MODE] Would send email to: test1@example.com"
- ✅ Console logs: "[TESTING_MODE] Would send email to: test2@example.com"
- ✅ Console logs: "[TESTING_MODE] Would send email to: test3@example.com"

**Verify Final State:**
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT 
  br.id,
  br.status,
  br.lab_staff_approved_at,
  br.hod_approved_at,
  br.hod_approved_by
FROM booking_requests br
WHERE br.id = [YOUR_BOOKING_ID];
"

mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT 
  mla.lab_id,
  l.name as lab_name,
  mla.status,
  mla.lab_staff_approved_by,
  mla.hod_approved_by,
  rp.name as responsible_person,
  rp.email as responsible_email
FROM multi_lab_approvals mla
JOIN labs l ON mla.lab_id = l.id
LEFT JOIN multi_lab_responsible_persons rp 
  ON rp.booking_request_id = mla.booking_request_id 
  AND rp.lab_id = mla.lab_id
WHERE mla.booking_request_id = [YOUR_BOOKING_ID];
"
```

**All should show:**
- booking_requests.status = 'approved'
- multi_lab_approvals.status = 'approved' (all 3 rows)
- hod_approved_by populated (all 3 rows)
- responsible persons properly stored

---

## 🧪 Test Scenario 2: Rejection by Lab Staff

### Quick Test:
1. Create another multi-lab booking (same as above)
2. CP1 lab staff **REJECTS** with reason: "Lab maintenance scheduled"

**Expected Result:**
- ✅ Entire booking immediately rejected
- ✅ ALL multi_lab_approvals rows → status='rejected'
- ✅ Email to student: Rejection notice showing all labs

**Verify:**
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT status FROM booking_requests WHERE id = [NEW_BOOKING_ID];
# Should show: rejected

SELECT lab_id, status FROM multi_lab_approvals WHERE booking_request_id = [NEW_BOOKING_ID];
# ALL should show: rejected
"
```

---

## 🧪 Test Scenario 3: Rejection by HOD

### Quick Test:
1. Create another multi-lab booking
2. All lab staff approve (CP1, CP2, CP3)
3. HOD **REJECTS** with reason: "Insufficient purpose description"

**Expected Result:**
- ✅ Booking rejected
- ✅ ALL multi_lab_approvals rows → status='rejected'
- ✅ hod_approved_by populated (even for rejection)
- ✅ Email to student: HOD rejection notice

---

## ✅ Success Criteria

Your multi-lab system is working correctly if:

1. ✅ Can create multi-lab booking with separate person per lab
2. ✅ Each lab staff sees only their lab requests
3. ✅ Status remains "pending_lab_staff" until ALL labs approved
4. ✅ Student receives progress emails after each lab approval
5. ✅ HOD receives notification only when all labs approved
6. ✅ HOD cannot approve until all labs approved by staff
7. ✅ Final approval sends emails to all responsible persons
8. ✅ Any rejection at any stage kills entire booking
9. ✅ Database properly tracks:
   - Individual lab approval status
   - Who approved and when
   - Separate responsible person per lab
10. ✅ TESTING_MODE properly prevents spam emails

---

## 📧 Email Checklist

### During Full Approval Flow:
- [ ] Student: "Booking request submitted"
- [ ] Lab Staff CP1: "New booking request"
- [ ] Lab Staff CP2: "New booking request"
- [ ] Lab Staff CP3: "New booking request"
- [ ] Student: "Lab CP1 approved. Waiting for 2 more lab(s)."
- [ ] Student: "Lab CP2 approved. Waiting for 1 more lab(s)."
- [ ] Student: "All labs approved! Now pending HoD approval."
- [ ] HOD: "New booking ready for approval (Multiple Labs)"
- [ ] Student: "Booking approved for Multiple Labs (CP1, CP2, CP3)"
- [ ] Test Person 1: "You are responsible for Computer Lab1"
- [ ] Test Person 2: "You are responsible for Computer Lab2"
- [ ] Test Person 3: "You are responsible for Computer Lab 3"

**Total: 12 emails** (13 if including initial lab staff notifications)

---

## 🐛 Common Issues to Check

1. **Can't select multiple labs?**
   - Check: "Book Multiple Labs" checkbox is visible and functional

2. **Responsible person forms not showing?**
   - Check: Forms should auto-populate when labs are selected
   - Should show one form per selected lab with lab name

3. **Lab staff can't approve?**
   - Check: Lab staff is assigned to that specific lab
   - Check: Request status is 'pending_lab_staff'

4. **Status not changing after all approvals?**
   - Check: ALL labs in multi_lab_approvals have status='approved_by_lab_staff'
   - Run: SELECT * FROM multi_lab_approvals WHERE booking_request_id = X;

5. **HOD can't approve?**
   - Check: Booking status is 'pending_hod'
   - Check: ALL multi_lab_approvals are 'approved_by_lab_staff'

6. **Emails not sending?**
   - Check: TESTING_MODE in .env.local
   - If true: Check console logs for "[TESTING_MODE]" messages
   - If false: Check GMAIL_USER and GMAIL_APP_PASSWORD configured

---

## 🎯 Quick Test Commands

### Check booking status:
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT id, status, is_multi_lab, 
       lab_staff_approved_at, hod_approved_at,
       (SELECT COUNT(*) FROM multi_lab_approvals WHERE booking_request_id = booking_requests.id) as total_labs,
       (SELECT COUNT(*) FROM multi_lab_approvals WHERE booking_request_id = booking_requests.id AND status='approved_by_lab_staff') as approved_labs
FROM booking_requests 
WHERE id = [YOUR_BOOKING_ID];
"
```

### Check detailed approval state:
```bash
mysql -u root -p'Abhin@v21dogr@' -e "
USE lnmiit_lab_management;
SELECT 
  l.code as lab,
  mla.status,
  IF(mla.lab_staff_approved_at IS NULL, 'NO', 'YES') as staff_approved,
  IF(mla.hod_approved_at IS NULL, 'NO', 'YES') as hod_approved,
  rp.name as responsible_person
FROM multi_lab_approvals mla
JOIN labs l ON mla.lab_id = l.id
LEFT JOIN multi_lab_responsible_persons rp ON rp.booking_request_id = mla.booking_request_id AND rp.lab_id = mla.lab_id
WHERE mla.booking_request_id = [YOUR_BOOKING_ID];
"
```

---

**Ready to test? Start with Step 1!** 🚀
