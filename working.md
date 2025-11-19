# Project Working & Request Flow (Detailed)

## 1. User Authentication & Role
- User logs in via `/api/auth/login` (email/password)
- Role is determined (admin, hod, faculty, lab-staff, lab-coordinator, student, others)
- Dashboard and permissions are role-based

---

## 2. Booking a Lab (Step-by-Step)
1. User (student/faculty/others) submits booking request via dashboard
2. Can select one or more labs (multi-lab booking supported)
3. Each lab's staff must approve (multi-lab: all must approve)
4. HOD/Coordinator gives final approval
5. User receives confirmation email
6. 2-hour reminder sent to responsible persons and lab staff
7. All actions are logged in activity logs

---

## 3. Requesting Equipment (Step-by-Step)
1. User requests equipment via dashboard
2. Lab staff reviews, approves, issues
3. User returns equipment or requests extension
4. Reminders sent for due/overdue returns
5. All actions are logged

---

## 4. Profile & Settings
- Users can update name, salutation, password
- Admin can manage all users and labs
- All changes are logged and trigger notification emails

---

## 5. Example Request/Response Flows

### Booking Request (Student)
- **POST** `/api/student/booking-requests`
- **Body:** `{ lab_id(s), date, start_time, end_time, purpose }`
- **Response:** `{ success: true, bookingId: 123 }`

### Approval (Lab Staff)
- **POST** `/api/lab-staff/requests/[id]/action`
- **Body:** `{ action: 'approve' | 'reject', remarks }`
- **Response:** `{ success: true }`

### Reminder Cron
- **GET** `/api/cron/booking-reminders`
- **Effect:** Sends reminders for bookings starting in 2 hours

---

## 6. Logging & Notifications
- All actions are logged for audit
- TESTING_MODE redirects all emails to admin in dev
- Reminders and notifications are sent via cron endpoints

---

## 7. References
- See `README.md` and `design.md` for more details
- See `scripts/data-base-schema.sql` for DB schema
