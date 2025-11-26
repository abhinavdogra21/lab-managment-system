# LNMIIT Lab Management System

A comprehensive platform for managing laboratory bookings, equipment, users, and workflows at The LNM Institute of Information Technology.

---

## 📁 Detailed Project Structure

```
lab-managment-system/
├── 📂 app/                           # Next.js 15 app directory (App Router)
│   ├── 📂 api/                       # Backend API routes (Next.js API handlers)
│   │   ├── 📂 admin/                 # Admin-specific endpoints
│   │   │   ├── users/route.ts        # GET/POST: List/Create users
│   │   │   ├── labs/route.ts         # GET/POST: List/Create labs
│   │   │   ├── departments/route.ts  # GET/POST: Departments CRUD
│   │   │   ├── bookings/route.ts     # GET: All bookings (admin view)
│   │   │   └── send-digest/route.ts  # POST: Send daily digest email
│   │   ├── 📂 auth/                  # Authentication endpoints
│   │   │   ├── login/route.ts        # POST: User login (session creation)
│   │   │   ├── logout/route.ts       # POST: User logout (session destroy)
│   │   │   ├── forgot/route.ts       # POST: Request password reset
│   │   │   └── reset-password/route.ts # POST: Reset password with token
│   │   ├── 📂 faculty/               # Faculty-specific endpoints
│   │   │   ├── booking-requests/route.ts      # POST: Create lab booking
│   │   │   ├── bookings/route.ts              # GET: Faculty's bookings
│   │   │   ├── component-requests/route.ts    # POST: Create component request
│   │   │   ├── requests/[id]/action/route.ts  # POST: Approve/Reject student request
│   │   │   └── activity-logs/route.ts         # GET: Faculty activity logs
│   │   ├── 📂 hod/                   # HOD-specific endpoints
│   │   │   ├── bookings/route.ts     # GET: Department bookings
│   │   │   ├── requests/[id]/action/route.ts  # POST: Final approval/rejection
│   │   │   └── dashboard/stats/route.ts       # GET: HOD dashboard stats
│   │   ├── 📂 lab-coordinator/       # Lab Coordinator endpoints
│   │   │   ├── requests/[id]/action/route.ts  # POST: Final approval/rejection
│   │   │   └── dashboard/stats/route.ts       # GET: Coordinator stats
│   │   ├── 📂 lab-staff/             # Lab Staff endpoints
│   │   │   ├── bookings/route.ts              # GET: Lab-specific bookings
│   │   │   ├── requests/[id]/action/route.ts  # POST: Approve/Reject booking
│   │   │   ├── component-requests/route.ts    # GET: All component requests
│   │   │   ├── component-requests/[id]/action/route.ts  # POST: Approve/Reject component
│   │   │   ├── component-requests/[id]/issue/route.ts   # POST: Issue equipment
│   │   │   ├── component-loans/route.ts       # GET: All active loans
│   │   │   ├── component-loans/[id]/action/route.ts     # POST: Return/Extend/Approve
│   │   │   └── components/route.ts            # GET/POST: List/Add components
│   │   ├── 📂 student/               # Student-specific endpoints
│   │   │   ├── booking-requests/route.ts      # POST: Create lab booking
│   │   │   ├── bookings/route.ts              # GET: Student's bookings
│   │   │   ├── component-requests/route.ts    # POST: Request equipment
│   │   │   ├── component-loans/route.ts       # GET: Student's active loans
│   │   │   └── activity-logs/route.ts         # GET: Student activity logs
│   │   ├── 📂 others/                # Other users (T&P, etc.) endpoints
│   │   │   ├── booking-requests/route.ts      # POST: Create lab booking
│   │   │   └── bookings/route.ts              # GET: Others' bookings
│   │   ├── 📂 user/                  # User profile endpoints
│   │   │   ├── update-profile/route.ts        # POST: Update name, salutation
│   │   │   └── change-password/route.ts       # POST: Change password
│   │   ├── 📂 labs/                  # Public lab endpoints
│   │   │   ├── route.ts              # GET: List all labs
│   │   │   └── [id]/booked-slots/route.ts     # GET: Lab booked slots
│   │   ├── 📂 cron/                  # Automated cron job endpoints
│   │   │   ├── booking-reminders/route.ts     # GET: Send 2-hour booking reminders
│   │   │   └── loan-reminders/route.ts        # GET: Send equipment due reminders
│   │   └── 📂 debug/                 # Development/debugging endpoints
│   │       └── check-password/route.ts        # POST: Debug password hashing
│   ├── 📂 admin/                     # Admin dashboard pages
│   │   ├── layout.tsx                # Admin layout wrapper
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Admin dashboard home
│   │       └── 📂 users/
│   │           ├── page.tsx          # User management page
│   │           └── [id]/page.tsx     # Edit user page
│   ├── 📂 faculty/                   # Faculty dashboard pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Faculty dashboard home
│   │       ├── bookings/page.tsx     # Faculty bookings view
│   │       └── requests/page.tsx     # Student requests for approval
│   ├── 📂 hod/                       # HOD dashboard pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # HOD dashboard home
│   │       ├── requests/page.tsx     # Final approval requests
│   │       └── bookings/page.tsx     # Department bookings
│   ├── 📂 lab-coordinator/           # Lab Coordinator pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Coordinator dashboard
│   │       └── requests/page.tsx     # Final approval requests
│   ├── 📂 lab-staff/                 # Lab Staff dashboard pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Lab staff dashboard
│   │       ├── bookings/page.tsx     # Lab bookings approval
│   │       ├── components/page.tsx   # Component inventory
│   │       └── loans/page.tsx        # Equipment loans management
│   ├── 📂 student/                   # Student dashboard pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Student dashboard
│   │       ├── book-lab/page.tsx     # Lab booking form
│   │       ├── bookings/page.tsx     # Student's bookings
│   │       ├── request-equipment/page.tsx  # Component request form
│   │       └── loans/page.tsx        # Active equipment loans
│   ├── 📂 others/                    # Others (T&P) dashboard pages
│   │   └── 📂 dashboard/
│   │       ├── page.tsx              # Others dashboard
│   │       └── bookings/page.tsx     # Others' bookings
│   ├── 📂 dashboard/                 # Generic dashboard (redirects to role)
│   │   └── page.tsx                  # Auto-redirect based on user role
│   ├── 📂 forgot-password/           # Password recovery pages
│   │   └── page.tsx                  # Forgot password form
│   ├── 📂 reset-password/            # Password reset pages
│   │   └── 📂 [token]/
│   │       └── page.tsx              # Reset password with token
│   ├── layout.tsx                    # Root layout (global)
│   ├── page.tsx                      # Landing page / login redirect
│   └── globals.css                   # Global CSS (Tailwind directives)
│
├── 📂 components/                    # Reusable React components
│   ├── 📂 auth/
│   │   └── login-form.tsx            # Login form component
│   ├── 📂 dashboard/
│   │   ├── dashboard-header.tsx      # Dashboard top bar
│   │   ├── dashboard-layout.tsx      # Dashboard layout wrapper
│   │   └── dashboard-sidebar.tsx     # Sidebar navigation
│   ├── 📂 reports/                   # Report generation components
│   │   ├── booking-reports.tsx       # Booking reports UI
│   │   └── equipment-reports.tsx     # Equipment reports UI
│   ├── 📂 ui/                        # Shadcn UI components
│   │   ├── button.tsx                # Button component
│   │   ├── card.tsx                  # Card component
│   │   ├── dialog.tsx                # Dialog/Modal component
│   │   ├── input.tsx                 # Input component
│   │   ├── select.tsx                # Select dropdown
│   │   ├── table.tsx                 # Table component
│   │   ├── toast.tsx                 # Toast notification
│   │   └── ...                       # More UI primitives
│   └── theme-provider.tsx            # Dark/Light theme provider
│
├── 📂 hooks/                         # Custom React hooks
│   ├── use-mobile.ts                 # Mobile detection hook
│   └── use-toast.ts                  # Toast notification hook
│
├── 📂 lib/                           # Server-side utility libraries
│   ├── database.ts                   # MySQL connection pool & query helpers
│   ├── auth.ts                       # Session management, password hashing (SHA-256)
│   ├── notifications.ts              # Email template functions (17+ templates)
│   ├── mailer.ts                     # Nodemailer SMTP configuration
│   ├── email.ts                      # Email sending wrapper (TESTING_MODE support)
│   ├── activity-logger.ts            # Activity logging to system_logs table
│   ├── report-generator.ts           # PDF/Excel report generation (jsPDF, xlsx)
│   ├── roles.ts                      # Role-based access control helpers
│   └── utils.ts                      # General utility functions (date formatting, etc.)
│
├── 📂 public/                        # Static assets (images, icons)
│   └── logo.png                      # LNMIIT logo (example)
│
├── 📂 scripts/                       # Database scripts
│   ├── database-schema.sql           # Complete database schema (10 tables)
│   ├── 06-create-activity-logs.sql   # Activity logs table creation
│   ├── 07-create-reminder-tables.sql # Reminder history tables
│   ├── 08-add-lab-coordinator.sql    # Lab coordinator role setup
│   ├── migrate-approved-bookings.sql # Data migration script
│   ├── migrate-issued-components.sql # Component migration script
│   └── README.md                     # Scripts documentation
│
├── 📂 styles/                        # Global styles
│   └── globals.css                   # Tailwind CSS + custom styles
│
├── 📄 .env.local                     # Environment variables (DO NOT COMMIT)
├── 📄 components.json                # Shadcn UI configuration
├── 📄 middleware.ts                  # Next.js middleware (auth protection)
├── 📄 next.config.mjs                # Next.js configuration
├── 📄 package.json                   # Project dependencies and scripts
├── 📄 pnpm-lock.yaml                 # Lockfile for pnpm
├── 📄 postcss.config.mjs             # PostCSS configuration (Tailwind)
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 README.md                      # Project documentation (this file)
├── 📄 SETUP.md                       # Complete setup guide
├── 📄 design.md                      # Architecture & design documentation
└── 📄 working.md                     # Detailed workflow documentation
```

### 🎯 Key Functionality Locations

| **Functionality** | **Location** | **Description** |
|-------------------|--------------|-----------------|
| **Database Connection** | `lib/database.ts` | MySQL connection pool, query execution |
| **User Authentication** | `lib/auth.ts` | Session management, SHA-256 password hashing |
| **Email Templates** | `lib/notifications.ts` | 17+ email notification templates |
| **Email Sending** | `lib/email.ts`, `lib/mailer.ts` | Nodemailer SMTP, TESTING_MODE support |
| **Activity Logging** | `lib/activity-logger.ts` | Log all user actions to `system_logs` |
| **Report Generation** | `lib/report-generator.ts` | PDF/Excel exports (jsPDF, xlsx) |
| **Role Permissions** | `lib/roles.ts` | Role-based access control helpers |
| **Booking Workflow** | `app/api/student/booking-requests/route.ts` → `app/api/faculty/requests/[id]/action/route.ts` → `app/api/lab-staff/requests/[id]/action/route.ts` → `app/api/hod/requests/[id]/action/route.ts` | Multi-step approval workflow |
| **Component Request** | `app/api/student/component-requests/route.ts` → `app/api/faculty/requests/[id]/action/route.ts` → `app/api/lab-staff/component-requests/[id]/action/route.ts` → `app/api/hod/requests/[id]/action/route.ts` → `app/api/lab-staff/component-requests/[id]/issue/route.ts` | Equipment request & issuance |
| **Automated Reminders** | `app/api/cron/booking-reminders/route.ts`, `app/api/cron/loan-reminders/route.ts` | Cron jobs for email reminders |
| **Login UI** | `components/auth/login-form.tsx` | Login form component |
| **Dashboard Layouts** | `components/dashboard/dashboard-layout.tsx` | Reusable dashboard wrapper |
| **Database Schema** | `scripts/database-schema.sql` | Complete MySQL schema (10 tables) |

---

## 🚦 Complete API Reference

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | User login with email & password | ❌ |
| `POST` | `/api/auth/logout` | User logout (destroy session) | ✅ |
| `POST` | `/api/auth/forgot` | Request password reset email | ❌ |
| `POST` | `/api/auth/reset-password` | Reset password with token | ❌ |

### User Profile Endpoints
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/api/user/update-profile` | Update name, salutation, etc. | All |
| `POST` | `/api/user/change-password` | Change user password | All |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all users (filter by role/dept) |
| `POST` | `/api/admin/users` | Create new user |
| `PUT` | `/api/admin/users/[id]` | Update user details |
| `DELETE` | `/api/admin/users/[id]` | Delete user |
| `GET` | `/api/admin/labs` | List all labs |
| `POST` | `/api/admin/labs` | Create new lab |
| `PUT` | `/api/admin/labs/[id]` | Update lab details |
| `DELETE` | `/api/admin/labs/[id]` | Delete lab |
| `GET` | `/api/admin/departments` | List all departments |
| `POST` | `/api/admin/departments` | Create new department |
| `PUT` | `/api/admin/departments/[id]` | Update department |
| `GET` | `/api/admin/bookings` | All bookings (all users) |
| `POST` | `/api/admin/send-digest` | Send daily digest email |

### Student Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/student/booking-requests` | Create lab booking request |
| `GET` | `/api/student/bookings` | Get student's booking history |
| `POST` | `/api/student/component-requests` | Request equipment/component |
| `GET` | `/api/student/component-requests` | Get student's component requests |
| `GET` | `/api/student/component-loans` | Get student's active loans |
| `GET` | `/api/student/activity-logs` | Get student's activity logs |

### Faculty Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/faculty/booking-requests` | Create lab booking (faculty) |
| `GET` | `/api/faculty/bookings` | Get faculty's bookings |
| `POST` | `/api/faculty/component-requests` | Request equipment (faculty) |
| `GET` | `/api/faculty/requests` | Get student requests for approval |
| `POST` | `/api/faculty/requests/[id]/action` | Approve/Reject student request |
| `GET` | `/api/faculty/activity-logs` | Get faculty activity logs |

### Lab Staff Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab-staff/bookings` | Get lab-specific bookings |
| `POST` | `/api/lab-staff/requests/[id]/action` | Approve/Reject booking request |
| `GET` | `/api/lab-staff/component-requests` | All component requests for lab |
| `POST` | `/api/lab-staff/component-requests/[id]/action` | Approve/Reject component request |
| `POST` | `/api/lab-staff/component-requests/[id]/issue` | Issue equipment to student |
| `GET` | `/api/lab-staff/component-loans` | All active equipment loans |
| `POST` | `/api/lab-staff/component-loans/[id]/action` | Return/Extend/Approve extension |
| `GET` | `/api/lab-staff/components` | List lab components/inventory |
| `POST` | `/api/lab-staff/components` | Add new component to inventory |

### HOD Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hod/bookings` | Department bookings (HOD view) |
| `GET` | `/api/hod/requests` | Final approval pending requests |
| `POST` | `/api/hod/requests/[id]/action` | Final approve/reject (booking) |
| `POST` | `/api/hod/component-requests/[id]/action` | Final approve/reject (component) |
| `GET` | `/api/hod/dashboard/stats` | HOD dashboard statistics |

### Lab Coordinator Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab-coordinator/requests` | Final approval requests |
| `POST` | `/api/lab-coordinator/requests/[id]/action` | Final approve/reject |
| `GET` | `/api/lab-coordinator/dashboard/stats` | Coordinator stats |

### Others (T&P) Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/others/booking-requests` | Create lab booking (T&P) |
| `GET` | `/api/others/bookings` | Get T&P bookings |

### Public/Shared Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/labs` | List all labs (public) |
| `GET` | `/api/labs/[id]/booked-slots` | Get booked time slots for lab |

### Cron Job Endpoints (Internal)
| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| `GET` | `/api/cron/booking-reminders` | Send 2-hour booking reminders | Hourly |
| `GET` | `/api/cron/loan-reminders` | Send equipment due/overdue reminders | Daily 9 AM |

### Debug Endpoints (Development Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/debug/check-password` | Debug password hashing |

---

## 📊 Workflow Documentation

### Lab Booking Workflow (Student)

```
1. Student submits booking request
   ↓ Email to faculty guide
2. Faculty approves/rejects
   ↓ Email to lab staff (if approved)
3. Lab Staff approves/rejects
   ↓ Email to HOD/Lab Coordinator (if approved)
4. HOD/Lab Coordinator gives final approval
   ↓ Email to student (final decision)
5. Student uses lab at scheduled time
   ↓ 2 hours before: Reminder email sent
```

**API Flow:**
```
POST /api/student/booking-requests
  → POST /api/faculty/requests/[id]/action (approve)
    → POST /api/lab-staff/requests/[id]/action (approve)
      → POST /api/hod/requests/[id]/action (approve)
        → GET /api/cron/booking-reminders (automated)
```

**Files Involved:**
- `app/api/student/booking-requests/route.ts` - Create booking
- `app/api/faculty/requests/[id]/action/route.ts` - Faculty approval
- `app/api/lab-staff/requests/[id]/action/route.ts` - Lab staff approval
- `app/api/hod/requests/[id]/action/route.ts` - Final approval
- `lib/notifications.ts` - Email templates
- `lib/activity-logger.ts` - Log all actions

### Component Request Workflow (Student)

```
1. Student submits component request
   ↓ Email to faculty guide
2. Faculty approves/rejects
   ↓ Email to lab staff (if approved)
3. Lab Staff recommends approve/reject
   ↓ Email to HOD (if recommended)
4. HOD gives final approval
   ↓ Email to lab staff (if approved)
5. Lab Staff issues equipment
   ↓ Email to student (issued confirmation)
6. Student uses equipment
   ↓ Daily reminders if overdue
7. Student requests return
   ↓ Email to lab staff
8. Lab Staff marks as returned
   ↓ Email to student (return confirmed)
```

**API Flow:**
```
POST /api/student/component-requests
  → POST /api/faculty/requests/[id]/action (approve)
    → POST /api/lab-staff/component-requests/[id]/action (recommend)
      → POST /api/hod/component-requests/[id]/action (approve)
        → POST /api/lab-staff/component-requests/[id]/issue (issue)
          → POST /api/lab-staff/component-loans/[id]/action (return)
            → GET /api/cron/loan-reminders (automated)
```

**Files Involved:**
- `app/api/student/component-requests/route.ts` - Create request
- `app/api/faculty/requests/[id]/action/route.ts` - Faculty approval
- `app/api/lab-staff/component-requests/[id]/action/route.ts` - Lab staff recommend
- `app/api/hod/component-requests/[id]/action/route.ts` - HOD final approval
- `app/api/lab-staff/component-requests/[id]/issue/route.ts` - Issue equipment
- `app/api/lab-staff/component-loans/[id]/action/route.ts` - Return/extend

### Multi-Lab Booking (Faculty/Student)

When booking multiple labs simultaneously:

```
1. Submit multi-lab booking request (lab_ids: [1,2,3])
   ↓ Email to faculty (if student) / directly to lab staff (if faculty)
2. Faculty approves/rejects (if student request)
   ↓ Creates approval records in multi_lab_approvals table
3. Lab Staff of EACH lab approves/rejects individually
   ↓ Each approval recorded separately
4. ALL labs must approve for final approval by HOD
   ↓ If ANY lab rejects → entire request rejected
5. HOD/Lab Coordinator gives final approval (if all labs approved)
   ↓ Final decision email sent
```

**Database Tables:**
- `booking_requests` - Main booking record
- `multi_lab_approvals` - Per-lab approval status
- `multi_lab_responsible_persons` - Per-lab staff assignments

---

## 🔒 Security & Testing

### Authentication & Authorization
- **Session-based authentication** using Next.js API routes
- **SHA-256 password hashing** (see `lib/auth.ts`)
- **Role-based access control** enforced in middleware and API routes
- **Protected routes** via `middleware.ts`

### Testing Mode
In `.env.local`, set `TESTING_MODE=true`:
- All emails redirected to `ADMIN_EMAIL`
- Email content logged to console
- Prevents accidental emails during development

**Production:** Set `TESTING_MODE=false`

### Automated Reminders
- **Booking Reminders:** Hourly cron (`/api/cron/booking-reminders`)
  - Sends email 2 hours before booking start time
- **Loan Reminders:** Daily at 9 AM (`/api/cron/loan-reminders`)
  - Sends "due today" and "overdue" equipment reminders

**Vercel Deployment:** Configure in `vercel.json`

---

## 🚦 API Design & Routing

### 1. **API Directory Structure**
- All API endpoints are under `app/api/`.
- Each role (admin, faculty, hod, lab-staff, lab-coordinator, student, others) has its own subfolder for endpoints.
- RESTful conventions: `GET`, `POST`, `PUT`, `DELETE` as appropriate.

### 2. **Key API Endpoints**

#### **User & Auth**
- `POST /api/user/update-profile` — Update user name, salutation, etc.
- `POST /api/user/change-password` — Change user password
- `POST /api/auth/login` — User login
- `POST /api/auth/logout` — User logout
- `POST /api/auth/forgot` — Request password reset
- `POST /api/auth/reset-password` — Reset password

#### **Admin**
- `GET /api/admin/users` — List all users (filter by role/department)
- `POST /api/admin/users` — Create new user
- `GET /api/admin/labs` — List all labs
- `POST /api/admin/labs` — Create new lab
- `GET /api/admin/bookings` — All bookings
- `POST /api/admin/send-digest` — Send digest email (cron)

#### **Lab Booking (All Roles)**
- `POST /api/student/booking-requests` — Student creates booking
- `POST /api/faculty/booking-requests` — Faculty creates booking
- `POST /api/others/booking-requests` — Others create booking
- `GET /api/student/bookings` — Student's bookings
- `GET /api/faculty/bookings` — Faculty's bookings
- `GET /api/hod/bookings` — HOD's department bookings
- `GET /api/lab-staff/bookings` — Lab staff bookings

#### **Approval Workflow**
- `POST /api/lab-staff/requests/[id]/action` — Lab staff approve/reject
- `POST /api/hod/requests/[id]/action` — HOD approve/reject
- `POST /api/lab-coordinator/requests/[id]/action` — Lab coordinator approve/reject

#### **Component Requests & Loans**
- `POST /api/student/component-requests` — Request equipment
- `POST /api/lab-staff/component-requests/[id]/action` — Lab staff approve/reject
- `POST /api/lab-staff/component-requests/[id]/issue` — Issue equipment
- `POST /api/lab-staff/component-loans/[id]/action` — Return/extend/approve

#### **Reminders & Cron**
- `GET /api/cron/booking-reminders` — Sends 2-hour reminders for bookings
- `GET /api/cron/loan-reminders` — Sends due/overdue reminders for equipment

---

## 🗄️ Database Schema Reference

### Core Tables (10 Total)

#### 1. `users`
User accounts for all roles (admin, hod, faculty, lab-staff, lab-coordinator, student, others)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | User ID |
| `email` | VARCHAR(255) UNIQUE | User email (login) |
| `password_hash` | VARCHAR(255) | SHA-256 hashed password |
| `name` | VARCHAR(255) | Full name |
| `salutation` | VARCHAR(10) | Mr./Mrs./Ms./Dr./Prof. |
| `role` | ENUM | admin/hod/faculty/lab-staff/lab-coordinator/student/others |
| `department` | VARCHAR(100) | Department name |
| `is_active` | BOOLEAN | Account active status |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 2. `departments`
Academic departments with approval configuration

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Department ID |
| `name` | VARCHAR(255) UNIQUE | Department name |
| `highest_approval_authority` | ENUM | hod/lab_coordinator |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 3. `labs`
Laboratory/room information

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Lab ID |
| `name` | VARCHAR(255) | Lab name |
| `code` | VARCHAR(50) UNIQUE | Lab code (e.g., CSE-101) |
| `department` | VARCHAR(100) | Department name |
| `capacity` | INT | Max capacity |
| `head_lab_staff_id` | INT (FK → users) | Head lab staff user ID |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 4. `booking_requests`
Lab booking requests (single or multi-lab)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Booking ID |
| `user_id` | INT (FK → users) | Requester user ID |
| `lab_ids` | JSON | Array of lab IDs (e.g., [1,2,3]) |
| `booking_date` | DATE | Booking date |
| `start_time` | TIME | Start time |
| `end_time` | TIME | End time |
| `purpose` | TEXT | Purpose/reason for booking |
| `status` | ENUM | pending/faculty_approved/lab_staff_approved/approved/rejected/cancelled |
| `faculty_id` | INT (FK → users) | Faculty approver (for students) |
| `faculty_status` | ENUM | pending/approved/rejected |
| `lab_staff_status` | ENUM | pending/approved/rejected (for single lab) |
| `final_approver_id` | INT (FK → users) | HOD/Lab Coordinator who gave final approval |
| `rejection_reason` | TEXT | Reason if rejected |
| `created_at` | TIMESTAMP | Request creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 5. `multi_lab_approvals`
Per-lab approval tracking for multi-lab bookings

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Approval record ID |
| `booking_id` | INT (FK → booking_requests) | Booking request ID |
| `lab_id` | INT (FK → labs) | Lab ID |
| `status` | ENUM | pending/approved/rejected |
| `approver_id` | INT (FK → users) | Lab staff who approved/rejected |
| `rejection_reason` | TEXT | Reason if rejected |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 6. `multi_lab_responsible_persons`
Assigned lab staff for each lab in multi-lab booking

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Assignment ID |
| `booking_id` | INT (FK → booking_requests) | Booking request ID |
| `lab_id` | INT (FK → labs) | Lab ID |
| `lab_staff_id` | INT (FK → users) | Assigned lab staff ID |
| `created_at` | TIMESTAMP | Assignment time |

#### 7. `component_requests`
Equipment/component request workflow

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Request ID |
| `user_id` | INT (FK → users) | Requester user ID |
| `component_name` | VARCHAR(255) | Component name |
| `quantity` | INT | Requested quantity |
| `purpose` | TEXT | Purpose/reason |
| `status` | ENUM | pending/faculty_approved/lab_staff_recommended/approved/rejected/issued/returned |
| `faculty_id` | INT (FK → users) | Faculty approver |
| `faculty_status` | ENUM | pending/approved/rejected |
| `lab_staff_id` | INT (FK → users) | Lab staff recommender |
| `lab_staff_status` | ENUM | pending/approved/rejected |
| `hod_id` | INT (FK → users) | HOD final approver |
| `hod_status` | ENUM | pending/approved/rejected |
| `rejection_reason` | TEXT | Reason if rejected |
| `created_at` | TIMESTAMP | Request creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 8. `component_loans`
Active equipment loans and return tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Loan ID |
| `component_request_id` | INT (FK → component_requests) | Original request ID |
| `user_id` | INT (FK → users) | Borrower user ID |
| `component_name` | VARCHAR(255) | Component name |
| `quantity` | INT | Issued quantity |
| `issued_date` | DATE | Issue date |
| `due_date` | DATE | Expected return date |
| `return_date` | DATE | Actual return date (NULL if active) |
| `status` | ENUM | issued/return_requested/returned/extension_requested/extension_approved |
| `issued_by` | INT (FK → users) | Lab staff who issued |
| `returned_to` | INT (FK → users) | Lab staff who received return |
| `created_at` | TIMESTAMP | Loan creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 9. `components`
Component/equipment inventory

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Component ID |
| `name` | VARCHAR(255) | Component name |
| `total_quantity` | INT | Total available quantity |
| `available_quantity` | INT | Currently available quantity |
| `lab_id` | INT (FK → labs) | Lab where stored |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 10. `system_logs`
Activity audit trail for all user actions

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Log ID |
| `user_id` | INT (FK → users) | User who performed action |
| `action` | VARCHAR(100) | Action type (e.g., CREATE_BOOKING) |
| `entity_type` | VARCHAR(50) | Entity affected (booking/component/user) |
| `entity_id` | INT | ID of affected entity |
| `details` | JSON | Additional details (old/new values) |
| `ip_address` | VARCHAR(45) | User IP address |
| `user_agent` | TEXT | Browser user agent |
| `created_at` | TIMESTAMP | Action timestamp |

### Database Tables Summary

**Total Tables in Database:** 41

**Core Tables (10):**
1. `users` - User accounts for all roles
2. `departments` - Academic departments
3. `labs` - Laboratory information
4. `booking_requests` - Lab booking requests
5. `multi_lab_approvals` - Multi-lab approval tracking
6. `multi_lab_responsible_persons` - Lab staff assignments
7. `component_requests` - Equipment requests
8. `component_loans` - Active equipment loans
9. `components` - Equipment inventory
10. `system_logs` - System-wide activity audit trail

**Activity Logging Tables (3 - Actively Used):**
- `lab_booking_activity_logs` - Detailed booking approval/rejection logs
- `component_activity_logs` - Equipment request/issue/return logs
- `booking_request_status_history` - Status change history

**Extended Feature Tables (28):**
- **Timetable Management:** `lab_timetables`, `timetable_entries`, `timetable_templates`, `timetable_template_entries`, `timetable_exceptions`, `timetable_uploads`
- **Notifications & Reminders:** `notifications`, `booking_reminders`, `password_resets`
- **Inventory Management:** `inventory`, `lab_items`, `item_issues`, `lab_staff_assignments`
- **Attendance & Marks:** `attendance`, `marks`
- **Component Details:** `component_request_items`, `component_loan_items`
- **Configuration:** `approval_timeline`, `year_config`
- **Archives:** `archived_users`, `archived_attendance`, `archived_item_issues`, `archived_lab_bookings`, `archived_marks`, `archived_system_logs`
- **Backups:** `users_password_backup`
- **Views:** `v_multi_lab_bookings` (virtual table for multi-lab bookings)

### Database Relationships

```
users (1) ──────────────── (*) booking_requests (user_id, faculty_id, final_approver_id)
users (1) ──────────────── (*) component_requests (user_id, faculty_id, lab_staff_id, hod_id)
users (1) ──────────────── (*) component_loans (user_id, issued_by, returned_to)
users (1) ──────────────── (1) labs (head_lab_staff_id)
labs (1) ──────────────── (*) multi_lab_approvals (lab_id)
labs (1) ──────────────── (*) multi_lab_responsible_persons (lab_id)
labs (1) ──────────────── (*) components (lab_id)
booking_requests (1) ──── (*) multi_lab_approvals (booking_id)
booking_requests (1) ──── (*) multi_lab_responsible_persons (booking_id)
component_requests (1) ── (1) component_loans (component_request_id)
```

### Key Indexes
- `users.email` (UNIQUE)
- `labs.code` (UNIQUE)
- `booking_requests.user_id`, `booking_requests.booking_date`
- `component_requests.user_id`, `component_requests.status`
- `component_loans.user_id`, `component_loans.status`
- `system_logs.user_id`, `system_logs.created_at`
- `lab_booking_activity_logs.booking_id`, `lab_booking_activity_logs.created_at`
- `component_activity_logs.component_request_id`, `component_activity_logs.created_at`

---

## 🗂️ Where is the Code?

- **UI Pages:** All user-facing pages are in `app/[role]/dashboard/` (e.g., `app/admin/dashboard/`, `app/student/dashboard/`).
- **API Logic:** All backend logic is in `app/api/` (organized by role and feature).
- **Shared Components:** Reusable UI in `components/` (e.g., `components/ui/`, `components/dashboard/`).
- **Database/Email/Utils:** All server-side helpers in `lib/` (e.g., `lib/database.ts`, `lib/notifications.ts`).
- **Custom Hooks:** React hooks in `hooks/`.
- **Database Schema:** Main schema in `scripts/data-base-schema.sql`.
- **Global Styles:** Tailwind and custom CSS in `styles/globals.css`.

---

## 🛠️ Environment Configuration

Complete `.env.local` file structure:

```env
# Local development environment variables
# Fill in with your local MySQL credentials if different
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lnmiit_lab_management
DB_USER=root
DB_PASSWORD=your_mysql_password_here
# If your MySQL uses unix socket, set DB_SOCKET to its path (e.g., /tmp/mysql.sock) and it will be used instead of host/port
# DB_SOCKET=/tmp/mysql.sock

# App URL used in emails (dev server)
APP_URL=http://localhost:3000
USE_DB_AUTH=true

# Feature flags
NEXT_PUBLIC_MULTI_STAFF_UI=false
NEXT_PUBLIC_FORGOT_REQUIRE_TYPE=true

# Email Notifications
TESTING_MODE=true
ADMIN_EMAIL=your_email@gmail.com
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password_here

# SMTP Configuration for sendMail function
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_FROM=LNMIIT Lab Management <your_email@gmail.com>
```

### Environment Variables Reference

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DB_HOST` | MySQL server hostname | `localhost` | ✅ |
| `DB_PORT` | MySQL server port | `3306` | ✅ |
| `DB_NAME` | Database name | `lnmiit_lab_management` | ✅ |
| `DB_USER` | Database username | `root` | ✅ |
| `DB_PASSWORD` | Database password | Your MySQL password | ✅ |
| `DB_SOCKET` | Unix socket (overrides host/port) | `/tmp/mysql.sock` | ❌ |
| `APP_URL` | Base URL for email links | `http://localhost:3000` | ✅ |
| `USE_DB_AUTH` | Enable database authentication | `true` | ✅ |
| `NEXT_PUBLIC_MULTI_STAFF_UI` | Multi-staff UI toggle | `false` | ❌ |
| `NEXT_PUBLIC_FORGOT_REQUIRE_TYPE` | User type in password reset | `true` | ❌ |
| `TESTING_MODE` | Email testing mode | `true` (dev), `false` (prod) | ✅ |
| `ADMIN_EMAIL` | Admin email for system notifications | Your admin email | ✅ |
| `GMAIL_USER` | Gmail account for sending | Your Gmail address | ✅ |
| `GMAIL_APP_PASSWORD` | Gmail App Password | 16-char from Google | ✅ |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | ✅ |
| `SMTP_PORT` | SMTP server port | `587` | ✅ |
| `SMTP_SECURE` | TLS/SSL for SMTP | `false` for port 587 | ✅ |
| `SMTP_USER` | SMTP username | Your Gmail address | ✅ |
| `SMTP_PASS` | SMTP password | Same as App Password | ✅ |
| `SMTP_FROM` | Email sender name & address | `LNMIIT Lab <email>` | ✅ |

---

## 🛠️ Setup & Development

**Prerequisites:**
- Node.js v18+
- pnpm (or npm/yarn)
- MySQL 8.0+
- Git

**Quick Start:**

1. **Clone & Install:**
   ```bash
   git clone https://github.com/abhinavdogra21/lab-managment-system.git
   cd lab-managment-system
   pnpm install
   ```

2. **Database Setup:**
   ```bash
   mysql -u root -p
   CREATE DATABASE lnmiit_lab_management;
   exit;
   mysql -u root -p lnmiit_lab_management < scripts/database-schema.sql
   ```

3. **Create Admin User:**
   ```bash
   mysql -u root -p lnmiit_lab_management
   ```
   ```sql
   INSERT INTO users (email, password_hash, name, role, department, is_active, created_at, updated_at)
   VALUES ('admin@lnmiit.ac.in', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Admin', 'admin', 'IT', 1, NOW(), NOW());
   ```
   **Login:** `admin@lnmiit.ac.in` / Password: `123`

4. **Configure Environment:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in database credentials and Gmail App Password
   - See [Environment Configuration](#🛠️-environment-configuration) section above

5. **Run Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

6. **Build for Production:**
   ```bash
   pnpm build
   pnpm start
   ```

**Detailed Setup:** See [SETUP.md](SETUP.md) for complete installation guide.

---

## 💻 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Component Library:** Shadcn UI
- **Icons:** Lucide React
- **Forms:** React Hook Form (if applicable)
- **State Management:** React Context / useState

### Backend
- **Framework:** Next.js API Routes
- **Database:** MySQL 8.0+
- **ORM/Query:** mysql2 (raw SQL queries)
- **Authentication:** Session-based (custom implementation)
- **Password Hashing:** SHA-256 (crypto module)

### Email & Notifications
- **Email Service:** Nodemailer
- **SMTP Provider:** Gmail SMTP
- **Templates:** 17+ custom HTML email templates
- **Testing Mode:** Console logging & admin redirect

### DevOps & Deployment
- **Package Manager:** pnpm
- **Version Control:** Git + GitHub
- **Deployment:** Vercel (recommended)
- **Cron Jobs:** Vercel Cron (for reminders)
- **Environment:** .env.local for configuration

### Development Tools
- **Linting:** ESLint
- **Formatting:** Prettier (optional)
- **TypeScript:** Strict mode enabled
- **Hot Reload:** Next.js Fast Refresh

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `README.md` | This file - Complete project overview & API reference |
| `SETUP.md` | Detailed setup guide with step-by-step instructions |
| `design.md` | Architecture & design documentation |
| `working.md` | Detailed workflow documentation for all processes |

---

## 🔒 Security & Testing
- All sensitive routes require authentication and role checks.
- In `TESTING_MODE`, all emails go to `ADMIN_EMAIL` (see `.env.local`).
- Use Vercel Cron or external cron to trigger `/api/cron/booking-reminders` and `/api/cron/loan-reminders`.

---

## 👥 Credits

**Developed by:**
- **Abhinav Dogra** (23UCS507)
- **Abhinav Thulal** (23UCS508)

**Institution:** The LNM Institute of Information Technology (LNMIIT)

**Project Type:** Lab Management System

**Year:** 2024-2025

---

## 📄 License

This project is developed for LNMIIT internal use.

---

## 🤝 Contributing

This is an academic project. For questions or contributions:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or support:
- Check [SETUP.md](SETUP.md) for troubleshooting
- Review [design.md](design.md) for architecture details
- Check [working.md](working.md) for workflow documentation
- Create an issue on GitHub

---

**Happy Lab Managing! 🎓🔬**

