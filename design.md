# System Architecture & Design (Detailed)

## 1. Overview
The LNMIIT Lab Management System is a full-stack web application for managing laboratory bookings, equipment, users, and workflows. It is built with Next.js (App Router), MySQL, and a modular, role-based architecture.

---

## 2. High-Level Architecture
- **Frontend & Backend:** Unified Next.js app (React for UI, API routes for backend)
- **Database:** MySQL (see `scripts/data-base-schema.sql`)
- **Authentication:** Session-based, role-aware (admin, hod, faculty, lab-staff, lab-coordinator, student, others)
- **Email:** Nodemailer (Gmail/SMTP), with TESTING_MODE for safe development
- **Cron Jobs:** Vercel Cron or external triggers for reminders

---

## 3. Major Modules & Their Code Locations

### a. User Management
- **Purpose:** CRUD for users, roles, salutation, department
- **UI:** `app/admin/dashboard/users/`, `app/[role]/dashboard/settings/`
- **API:** `app/api/admin/users/`, `app/api/user/update-profile`, `app/api/user/change-password`

### b. Lab Management
- **Purpose:** CRUD for labs, staff assignment, inventory
- **UI:** `app/admin/dashboard/labs/`, `app/[role]/dashboard/labs/`
- **API:** `app/api/admin/labs/`, `app/api/lab-staff/labs/`, `app/api/hod/labs/`

### c. Booking System
- **Purpose:** Multi-role booking, approval workflow, multi-lab support
- **UI:** `app/[role]/dashboard/bookings/`, `app/[role]/dashboard/requests/`
- **API:** `app/api/[role]/booking-requests`, `app/api/[role]/bookings`, `app/api/lab-staff/requests/[id]/action`, `app/api/hod/requests/[id]/action`

### d. Component Requests & Loans
- **Purpose:** Equipment requests, issue/return, overdue reminders
- **UI:** `app/[role]/dashboard/my-component-requests/`, `app/lab-staff/dashboard/component-requests/`, `app/lab-staff/dashboard/component-loans/`
- **API:** `app/api/student/component-requests`, `app/api/lab-staff/component-requests/[id]/action`, `app/api/lab-staff/component-requests/[id]/issue`, `app/api/lab-staff/component-loans/[id]/action`

### e. Reminders & Cron
- **Purpose:** Automated reminders for bookings and equipment
- **API:** `app/api/cron/booking-reminders/`, `app/api/cron/loan-reminders/`
- **Trigger:** Vercel Cron or external cron hitting these endpoints

### f. Dashboards
- **Purpose:** Role-based dashboards for all user types
- **UI:** `app/[role]/dashboard/`

---

## 4. Key Flows (with Details)

### 4.1 Lab Booking (Student/Faculty/Others)
1. User submits booking request (can select multiple labs)
2. Each lab's staff must approve/reject
3. If all approve, HOD/Coordinator gives final approval
4. Confirmation email sent
5. 2-hour reminder sent to responsible persons and lab staff
6. All actions logged in activity logs

### 4.2 Component Request
1. User requests equipment
2. Lab staff reviews, approves, issues
3. User returns equipment or requests extension
4. Reminders for due/overdue returns
5. All actions logged

### 4.3 User Profile & Settings
- Users can update name, salutation, password
- Admin can manage all users
- All changes are logged and trigger notification emails

---

## 5. Security & Extensibility
- All API routes require authentication and role checks
- TESTING_MODE ensures no real emails sent in dev
- Activity logs for sensitive actions
- Add new roles by extending `lib/roles.ts` and dashboard routes
- Add new approval steps by updating workflow in API endpoints
- Add new reminders by creating new cron API routes

---

## 6. Database Schema
- See `scripts/data-base-schema.sql` for all tables, relationships, and fields
- Key tables: `users`, `labs`, `booking_requests`, `multi_lab_approvals`, `multi_lab_responsible_persons`, `component_requests`, `component_loans`, `notifications`, `system_logs`

---

## 7. Email & Notification System
- All emails use templates in `lib/notifications.ts`
- TESTING_MODE redirects all emails to `ADMIN_EMAIL`
- Reminders and notifications are sent via cron endpoints

---

## 8. Cron & Automation
- `/api/cron/booking-reminders`: Sends 2-hour reminders for bookings
- `/api/cron/loan-reminders`: Sends due/overdue reminders for equipment
- Use Vercel Cron or external scheduler

---

## 9. Further Reading
- See `README.md` for API and code structure
- See `scripts/data-base-schema.sql` for DB schema
