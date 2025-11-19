# System Architecture & Design (Detailed)

## 1. Overview
The LNMIIT Lab Management System is a comprehensive full-stack web application designed to manage laboratory bookings, equipment inventory, user roles, and multi-step approval workflows. Built with **Next.js 15 (App Router)**, **MySQL**, and a modular, role-based architecture, it supports seven distinct user roles with tailored dashboards and permissions.

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 15 with App Router
- **UI Library:** React 18+ with TypeScript
- **Styling:** Tailwind CSS
- **Components:** Shadcn UI components (Dialog, Badge, Button, Card, etc.)
- **Icons:** Lucide React

### Backend
- **API:** Next.js API Routes (serverless functions)
- **Database:** MySQL 8.0+ with connection pooling
- **Authentication:** Session-based with JWT tokens
- **Email:** Nodemailer (Gmail SMTP)
- **Cron Jobs:** Vercel Cron or external schedulers

### Development Tools
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Environment:** Node.js 18+
- **Testing Mode:** Safe email testing via TESTING_MODE env variable

---

## 3. User Roles & Permissions

### 3.1 Admin
- **Full system control**
- Manage all users, labs, departments, and equipment
- View all activity logs and system statistics
- Assign roles and permissions
- Override any approval workflow

### 3.2 HOD (Head of Department)
- **Department-level authority**
- Final approval for lab bookings in their department
- View department-wide reports and statistics
- Manage department settings and policies
- Can be replaced by Lab Coordinator based on department settings

### 3.3 Lab Coordinator
- **Department-level approval authority** (if designated)
- Alternative to HOD for final approvals
- Configured per department via `highest_approval_authority` field
- Same permissions as HOD when active

### 3.4 Faculty
- **Academic staff privileges**
- Submit lab booking requests for self or students
- Approve student booking requests (as faculty supervisor)
- Request equipment for research/teaching
- View lab schedules and availability

### 3.5 Lab Staff
- **Lab-specific management**
- Approve/reject lab booking requests for assigned labs
- Issue and track equipment
- Manage lab inventory and maintenance
- Only **head lab staff** (assigned via `labs.staff_id`) can approve bookings

### 3.6 Student
- **Basic user privileges**
- Submit lab booking requests (requires faculty supervisor)
- Request equipment (requires faculty approval)
- View own booking history and timeline
- Receive notifications for approvals/rejections

### 3.7 Others (Training & Placement, etc.)
- **Simplified workflow**
- Book labs directly without faculty approval
- Workflow: Submit → Lab Staff → HOD/Coordinator
- Suitable for institutional events and T&P activities

---

## 4. Database Architecture

### 4.1 Core Tables

#### users
- Stores all user accounts with role, department, salutation
- Password hashing with salt (SHA-256)
- Supports multiple departments for cross-department users

#### labs
- Lab details: name, code, capacity, department
- `staff_id` links to head lab staff (only they can approve)
- Equipment inventory managed per lab

#### departments
- Department hierarchy and settings
- `highest_approval_authority`: 'hod' or 'lab_coordinator'
- `hod_id` and `lab_coordinator_id` for final approvers

#### booking_requests
- Central table for all lab bookings
- Fields: `request_type` ('lab_booking'), `status`, approval timestamps
- `is_multi_lab`: boolean for multi-lab bookings
- `lab_ids`: JSON array of selected labs (for multi-lab)
- `reminder_sent`: tracks 2-hour reminder status
- `faculty_supervisor_id`: required for student bookings

#### multi_lab_approvals
- Per-lab approval tracking for multi-lab bookings
- Each lab requires separate approval from its head lab staff
- Tracks `lab_staff_approved_by`, `hod_approved_by` per lab
- Status: 'pending', 'approved', 'rejected'

#### multi_lab_responsible_persons
- Stores responsible person for each lab in a multi-lab booking
- Used for reminders and accountability
- `unique_booking_lab` constraint prevents duplicates

#### component_requests
- Equipment request workflow
- Similar approval chain: Faculty → Lab Staff → HOD
- Tracks issue/return dates and deadlines
- `extension_status` for deadline extensions

#### component_loans
- Active equipment loans
- `due_date`, `returned_at`, `extension_requested_due_date`
- Links to responsible persons and approvers

#### system_logs
- Comprehensive activity logging
- Tracks all approvals, rejections, modifications
- IP address, user agent, timestamps
- Searchable and filterable

---

## 5. Booking Approval Workflow

### 5.1 Student Booking Flow
```
1. Student submits request (must select faculty supervisor)
   └─> Status: 'pending_faculty'

2. Faculty supervisor reviews and approves/rejects
   └─> If approved: Status: 'pending_lab_staff'
   └─> If rejected: Status: 'rejected', END

3. Head Lab Staff of selected lab(s) approves/rejects
   └─> For multi-lab: ALL labs must approve
   └─> If all approved: Status: 'pending_hod'
   └─> If any rejected: Status: 'rejected', END

4. HOD/Lab Coordinator (based on department setting) gives final approval
   └─> If approved: Status: 'approved', END
   └─> If rejected: Status: 'rejected', END

5. 2-hour reminder sent to:
   - Head lab staff of booked lab(s)
   - Responsible persons for each lab
```

### 5.2 Faculty Booking Flow
```
1. Faculty submits request (self-booking)
   └─> Status: 'pending_lab_staff' (skips faculty approval)

2. Head Lab Staff approves/rejects
   └─> If approved: Status: 'pending_hod'
   └─> If rejected: Status: 'rejected', END

3. HOD/Lab Coordinator gives final approval
   └─> If approved: Status: 'approved', END
   └─> If rejected: Status: 'rejected', END
```

### 5.3 Others (T&P) Booking Flow
```
1. User submits request
   └─> Status: 'pending_lab_staff'

2. Head Lab Staff approves/rejects
   └─> If approved: Status: 'pending_hod'
   └─> If rejected: Status: 'rejected', END

3. HOD/Lab Coordinator gives final approval
   └─> If approved: Status: 'approved', END
   └─> If rejected: Status: 'rejected', END
```

### 5.4 Multi-Lab Booking Special Rules
- User can select multiple labs in one request
- Each lab creates entry in `multi_lab_approvals` table
- **ALL labs must approve** before moving to HOD
- Each lab's head lab staff sees only their lab's approval
- Responsible person must be specified for each lab
- HOD sees aggregated view of all lab approvals
- If ANY lab rejects, entire booking is rejected

---

## 6. Component Request Workflow

### 6.1 Student Component Request
```
1. Student submits equipment request
   └─> Status: 'pending_faculty'

2. Faculty (mentor) approves/rejects
   └─> If approved: Status: 'pending_lab_staff'
   └─> If rejected: Status: 'rejected', END

3. Lab Staff reviews and approves/rejects
   └─> If approved: Status: 'pending_hod'
   └─> If rejected: Status: 'rejected', END

4. HOD gives final approval
   └─> If approved: Status: 'approved'
   └─> Lab staff can now issue equipment

5. Lab Staff issues equipment
   └─> Status: 'issued', creates component_loan record
   └─> Sets due_date, tracks quantity

6. Student requests return OR requests extension
   └─> Return: Status: 'return_requested'
   └─> Extension: Sets extension_status: 'pending'

7. Lab Staff approves return/extension
   └─> Return approved: Status: 'returned', restores inventory
   └─> Extension approved: Updates due_date
```

### 6.2 Faculty Component Request
```
1. Faculty submits request
   └─> Status: 'pending_lab_staff' (skips faculty approval)

2-6. Same as student workflow from step 3 onwards
```

---

## 7. Email Notification System

### 7.1 Email Templates (`lib/notifications.ts`)
All emails use professionally formatted HTML templates with:
- LNMIIT branding and colors
- Responsive design
- Salutation support (Prof., Dr., Mr., Mrs.)
- Role-specific dashboard links
- Action buttons for quick access

### 7.2 Email Types

#### Booking Related
- `labBookingCreated`: Sent to approvers when request submitted
- `labBookingApproved`: Sent to requester on approval
- `labBookingRejected`: Sent to requester on rejection
- `labBookingReminder`: 2-hour reminder before booking start

#### Component Related
- `componentRequestCreated`: Sent to approvers
- `componentRequestApproved`: Sent to requester
- `componentRequestForwarded`: Sent when forwarded to next approver
- `componentRequestApprovedForLabStaff`: Sent when ready to issue
- `componentsIssued`: Sent when equipment is handed over
- `returnRequested`: Sent when student requests return
- `returnApproved`: Sent when return is approved
- `extensionRequested`: Sent when deadline extension requested
- `extensionApproved`: Sent when extension approved
- `extensionRejected`: Sent when extension rejected

#### User Related
- `passwordResetSuccess`: Sent after password change
- Profile update confirmations

### 7.3 TESTING_MODE
- Environment variable: `TESTING_MODE=true`
- Redirects ALL emails to `ADMIN_EMAIL`
- Adds test banner to email content
- Shows original recipients in email header
- Safe for development and testing

---

## 8. Automated Reminders (Cron Jobs)

### 8.1 Booking Reminders (`/api/cron/booking-reminders`)
**Purpose:** Send 2-hour advance notice for approved lab bookings

**Trigger:** Every hour (recommended)

**Process:**
1. Query: Find bookings starting between NOW and NOW+2hrs
2. Filter: `status='approved'`, `reminder_sent=0`, `request_type='lab_booking'`
3. Parse: Handle single-lab and multi-lab bookings
4. Fetch: Get head lab staff for each lab via `labs.staff_id`
5. Fetch: Get responsible persons from `multi_lab_responsible_persons`
6. Send: Email to each responsible person and head lab staff
7. Update: Mark `reminder_sent=1`

**Email Recipients:**
- Head lab staff of booked lab(s) - from `labs.staff_id`
- Responsible person(s) - from `multi_lab_responsible_persons.email`
- NOT sent for regular scheduled classes (only `lab_booking` requests)

**Email Content:**
- Booking details (date, time, purpose, requester)
- Lab name(s)
- List of responsible persons
- Quick action links

### 8.2 Component Loan Reminders (`/api/cron/loan-reminders`)
**Purpose:** Send due/overdue reminders for equipment returns

**Trigger:** Daily at specific time

**Process:**
1. Query: Find loans with `due_date` within next 24hrs or overdue
2. Filter: `status='issued'`
3. Send: Email to borrower and lab staff
4. Escalate: Send urgent notice if overdue

---

## 9. Activity Logging

### 9.1 Logged Actions
All sensitive operations are logged in `system_logs` table:
- All booking approvals/rejections (at each stage)
- Component request approvals/rejections
- Equipment issue/return
- User profile changes
- Admin actions (user creation, lab assignments)
- Failed login attempts (security)

### 9.2 Log Structure
```typescript
{
  user_id: number,
  action: string, // e.g., 'approved_by_hod', 'issued_components'
  entity_type: string, // 'booking_request', 'component_request'
  entity_id: number,
  details: JSON, // Complete snapshot of the entity
  ip_address: string,
  user_agent: string,
  created_at: timestamp
}
```

### 9.3 Viewing Logs
- **Admin Dashboard:** View all logs, filter by user/action/date
- **HOD Dashboard:** View logs for department bookings
- **Faculty Dashboard:** View logs for supervised students
- **API:** `/api/hod/labs/booking-logs`, `/api/hod/labs/component-logs`

---

## 10. Code Organization

### 10.1 Directory Structure
```
app/
├── api/                         # Backend API routes
│   ├── admin/                  # Admin-only endpoints
│   ├── hod/                    # HOD-specific endpoints
│   ├── faculty/                # Faculty endpoints
│   ├── lab-staff/              # Lab staff endpoints
│   ├── lab-coordinator/        # Lab coordinator endpoints
│   ├── student/                # Student endpoints
│   ├── others/                 # Others (T&P) endpoints
│   ├── user/                   # User profile endpoints
│   ├── auth/                   # Authentication endpoints
│   └── cron/                   # Automated job endpoints
├── admin/dashboard/            # Admin UI pages
├── hod/dashboard/              # HOD UI pages
├── faculty/dashboard/          # Faculty UI pages
├── lab-staff/dashboard/        # Lab staff UI pages
├── lab-coordinator/dashboard/  # Lab coordinator UI pages
├── student/dashboard/          # Student UI pages
├── others/dashboard/           # Others UI pages
└── dashboard/                  # Common dashboard components

lib/
├── database.ts                 # MySQL connection singleton
├── auth.ts                     # Authentication logic
├── roles.ts                    # Role checking utilities
├── notifications.ts            # Email templates and sending
├── activity-logger.ts          # Activity logging functions
└── utils.ts                    # Common utilities

components/
├── ui/                         # Shadcn UI components
├── dashboard/                  # Shared dashboard components
│   ├── dashboard-header.tsx
│   ├── dashboard-sidebar.tsx
│   └── dashboard-layout.tsx
└── auth/                       # Auth-related components
```

### 10.2 Key Files

#### `lib/database.ts`
- MySQL connection pool singleton
- Query wrapper with error handling
- Transaction support

#### `lib/auth.ts`
- Session verification
- Role-based access control
- Token generation/validation

#### `lib/roles.ts`
- `hasRole(user, roles)`: Check if user has required role
- `requireRole(user, roles)`: Throw error if unauthorized
- Role hierarchy definitions

#### `lib/notifications.ts`
- `sendEmail(options)`: Send email via Nodemailer
- `emailTemplates`: All email templates with salutation support
- TESTING_MODE support for safe development

#### `lib/activity-logger.ts`
- `logBookingActivity()`: Log booking-related actions
- `logComponentActivity()`: Log component-related actions
- `getUserInfoForLogging()`: Fetch user details for logs

---

## 11. Security Features

### 11.1 Authentication
- Session-based authentication with secure tokens
- Password hashing with salt (SHA-256)
- Session expiration and renewal
- CSRF protection via Next.js

### 11.2 Authorization
- Role-based access control on all routes
- API routes check user role before processing
- Frontend routes protected with middleware
- Database queries filtered by user permissions

### 11.3 Data Protection
- SQL injection prevention via parameterized queries
- XSS protection via React's built-in escaping
- TESTING_MODE prevents accidental production emails
- Activity logs for audit trail

### 11.4 Input Validation
- TypeScript type checking
- Frontend form validation
- Backend request validation
- Sanitization of user inputs

---

## 12. Scalability & Extensibility

### 12.1 Adding New Roles
1. Add role to `users.role` ENUM in database
2. Create dashboard directory: `app/[new-role]/dashboard/`
3. Create API directory: `app/api/[new-role]/`
4. Update `lib/roles.ts` with role permissions
5. Add email templates in `lib/notifications.ts`

### 12.2 Adding New Approval Steps
1. Add status to `booking_requests.status` ENUM
2. Add approval timestamp/approver fields
3. Update approval API routes to handle new step
4. Add timeline step in frontend display
5. Create email template for new step

### 12.3 Adding New Features
- Follow existing patterns in `/api/[role]/` structure
- Use activity logger for sensitive operations
- Add email notifications for user-facing actions
- Update dashboard UI in corresponding role directory
- Add database migrations if schema changes needed

---

## 13. Performance Optimization

### 13.1 Database
- Indexed columns: `user_id`, `lab_id`, `status`, `booking_date`
- Connection pooling via singleton pattern
- Query optimization with proper JOINs
- Avoid N+1 queries with batch loading

### 13.2 Frontend
- Next.js App Router for code splitting
- Server components where possible
- Client components only for interactivity
- Lazy loading for dashboards

### 13.3 Caching
- Static generation for public pages
- ISR (Incremental Static Regeneration) for dashboards
- API route caching for frequently accessed data

---

## 14. Deployment

### 14.1 Environment Variables
```bash
DATABASE_HOST=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
GMAIL_USER=
GMAIL_APP_PASSWORD=
ADMIN_EMAIL=
TESTING_MODE=false
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

### 14.2 Production Checklist
- [ ] Set `TESTING_MODE=false`
- [ ] Configure production database
- [ ] Set strong `CRON_SECRET`
- [ ] Configure email credentials
- [ ] Set correct `NEXT_PUBLIC_APP_URL`
- [ ] Enable SSL/TLS
- [ ] Set up Vercel Cron jobs
- [ ] Test all approval workflows
- [ ] Verify email delivery
- [ ] Check activity logging

---

## 15. Further Reading
- See `README.md` for setup instructions and API documentation
- See `working.md` for detailed workflow examples
- See `scripts/data-base-schema.sql` for complete database schema
- See code comments for implementation details
