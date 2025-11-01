# Lab Management System

A comprehensive web-based laboratory management system built with Next.js 15, TypeScript, and MySQL. This system facilitates lab booking, equipment management, user administration, and real-time analytics for educational institutions.

## Features

### 🔐 Authentication & Authorization
- Role-based access control (Admin, HOD, Faculty, Lab Staff, TNP, Student)
- Secure login/logout system
- Password reset functionality
- JWT-based session management

### 📅 Lab Booking System
- Real-time lab availability checking
- Multi-stage approval workflow (Faculty → Lab Staff → HOD)
- Business hours validation (8 AM - 8 PM)
- Booking history and status tracking
- Daily schedule view for administrators

### 👥 User Management
- User registration and profile management
- Department-wise user organization
- Bulk user operations
- Activity logging and audit trails

### 🔧 Equipment & Inventory Management
- Equipment catalog with specifications
- Issue/return tracking
- Maintenance scheduling
- Stock level monitoring

### 📊 Analytics & Reporting
- Real-time dashboard with key metrics
- Usage statistics and trends
- Custom report generation
- Export functionality (Excel, PDF)

### 🎯 Additional Features
- Event management and announcements
- Attendance tracking
- Timetable integration
- Email notifications
- Mobile-responsive design

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Backend:** Next.js API Routes, Node.js
- **Database:** MySQL 8.0+
- **Styling:** Tailwind CSS, shadcn/ui components
- **Authentication:** Custom JWT implementation
- **Email:** Nodemailer with SMTP
- **Charts:** Recharts
- **Forms:** React Hook Form with Zod validation
- **Date Handling:** date-fns

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **pnpm** (v8.0.0 or higher) - `npm install -g pnpm`
- **MySQL** (v8.0.0 or higher)
- **Git**

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system
```

### 2. Database Setup (Automatic - Recommended)

Run the interactive setup wizard:

```bash
./scripts/setup-database.sh
```

This will:
- ✅ Prompt for your MySQL credentials
- ✅ Let you choose a custom database name
- ✅ Create the database with the exact same structure (35 tables)
- ✅ Generate `.env.local` configuration file

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Start Development Server

```bash
pnpm run dev
```

Visit **http://localhost:3000** and login with:
- **Email:** admin@lnmiit.ac.in
- **Password:** admin123

---

### Alternative: Manual Database Setup

If you prefer manual setup or need more control:

1. **Create Database:**
```sql
CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Import Database Structure:**
```bash
mysql -u root -p lnmiit_lab_management < scripts/database-schema.sql
```

3. **Create `.env.local`:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lnmiit_lab_management

APP_URL=http://localhost:3000
USE_DB_AUTH=true
NEXT_PUBLIC_MULTI_STAFF_UI=false
NEXT_PUBLIC_FORGOT_REQUIRE_TYPE=true

TESTING_MODE=true
ADMIN_EMAIL=your.email@gmail.com
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### 4. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lnmiit_lab_management

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Lab Management System"

# Admin Configuration
ADMIN_EMAIL=admin@lnmiit.ac.in
ADMIN_PASSWORD=admin123
```

### 5. Start the Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`

### 6. Initial Login

**Default Admin Credentials:**
- Email: `admin@lnmiit.ac.in`
- Password: `admin123`

⚠️ **Important:** Change the default admin password immediately after first login.

## Database Schema Overview

### Core Tables

- **users** - User accounts and profiles
- **departments** - Academic departments
- **labs** - Laboratory information
- **equipment** - Equipment catalog
- **booking_requests** - Lab booking requests with approval workflow
- **timetable_entries** - Regular class schedules
- **events** - Event and announcement management
- **logs** - System activity logging

### Key Relationships

- Users belong to departments
- Labs are managed by departments
- Bookings require multi-stage approvals
- Equipment is assigned to specific labs
- All major actions are logged for audit trails

## Project Structure

```
lab-managment-system/
├── app/                          # Next.js 15 app directory
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin-specific endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── bookings/            # Booking management
│   │   ├── users/               # User management
│   │   └── ...
│   ├── dashboard/               # Dashboard pages
│   │   ├── analytics/           # Analytics dashboard
│   │   ├── bookings/            # Booking management
│   │   ├── labs/                # Lab management
│   │   └── ...
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Reusable React components
│   ├── auth/                    # Authentication components
│   ├── dashboard/               # Dashboard-specific components
│   ├── ui/                      # shadcn/ui components
│   └── ...
├── lib/                         # Utility libraries
│   ├── auth.ts                  # Authentication utilities
│   ├── database.ts              # Database connection
│   ├── email.ts                 # Email utilities
│   └── utils.ts                 # General utilities
├── hooks/                       # Custom React hooks
├── scripts/                     # Database and setup scripts
├── public/                      # Static assets
└── styles/                      # Global styles
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/[id]` - Update booking
- `DELETE /api/bookings/[id]` - Cancel booking

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/labs` - Lab management
- `GET /api/admin/daily-schedule` - Daily lab schedule

## Configuration Options

### Database Configuration

The application supports various MySQL configurations. Update the database settings in `.env.local`:

```env
# For custom MySQL setup
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=lnmiit_lab_management

# For connection pooling (optional)
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

### Email Configuration

Configure email settings for notifications:

```env
# Gmail SMTP (recommended for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password

# Custom SMTP server
SMTP_HOST=mail.yourserver.com
SMTP_PORT=587
SMTP_USER=your_email@yourserver.com
SMTP_PASSWORD=your_password
```

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Comment complex business logic

### Database Queries
- Use parameterized queries to prevent SQL injection
- Implement proper error handling
- Use transactions for multi-table operations
- Index frequently queried columns

### Security Best Practices
- Validate all user inputs
- Use JWT tokens with appropriate expiration
- Implement rate limiting for API endpoints
- Sanitize user data before database operations
- Use HTTPS in production

## Deployment

### Production Build

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start
```

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DB_HOST=your_production_db_host
JWT_SECRET=your_production_jwt_secret
```

### Database Migration

For production deployment, run migrations:

```bash
# Run production setup
mysql -u your_user -p your_production_db < scripts/01-create-tables-mysql.sql
mysql -u your_user -p your_production_db < scripts/02-add-indexes-mysql.sql
mysql -u your_user -p your_production_db < scripts/02-seed-data.sql
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `.env.local`
   - Ensure database exists

2. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill
   ```

3. **Build Errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   pnpm run build
   ```

4. **Module Resolution Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### Performance Optimization

1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Use connection pooling
   - Implement query caching

2. **Frontend Optimization**
   - Use Next.js Image component for images
   - Implement proper loading states
   - Use React.memo for expensive components

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Email: support@yourdomain.com
- Documentation: [Project Wiki](https://github.com/abhinavdogra21/lab-managment-system/wiki)

## Changelog

### Version 1.0.0
- Initial release with core functionality
- User authentication and authorization
- Lab booking system with approval workflow
- Admin dashboard and analytics
- Equipment management
- Email notifications

---

**Built with ❤️ for educational institutions**
- **Styling**: Tailwind CSS + Radix UI components
- **Database**: MySQL with fallbacks for demo mode
- **Authentication**: Cookie-based sessions with role-based access control (RBAC)

### 📁 Directory Structure & Where to Find What

```
app/                                 # Next.js App Router - Main application
├── page.tsx                        # 🚪 Login page (entry point)
├── api/                            # 🔌 API endpoints organized by role
│   ├── auth/                       # 🔐 Authentication (login/logout/password reset)
│   ├── admin/                      # 👑 Admin-only APIs (users, departments, labs, reports)
│   ├── student/                    # 🎓 Student-specific APIs (bookings, requests)
│   ├── faculty/                    # 👨‍🏫 Faculty APIs (bookings, approvals)
│   └── {role}/                     # 🎭 Other role-specific endpoints
├── admin/dashboard/                # 👑 Admin dashboard pages
│   ├── components/                 # 🧩 Admin-specific components
│   │   └── admin-dashboard.tsx     # Admin main dashboard UI
│   ├── reports/                    # 📊 Reports section
│   │   ├── page.tsx               # Reports main page
│   │   └── components/            # Report-specific components
│   │       └── report-generator.tsx # Comprehensive report generation UI
│   ├── department-and-lab-management/ # 🏢 Dept/lab management
│   └── users/                      # 👥 User management pages
└── {role}/dashboard/               # 🎭 Role-specific dashboard pages
    └── layout.tsx                  # Uses shared dashboard layout

components/                          # 🧩 Shared UI components
├── ui/                             # 🎨 Design system (buttons, cards, forms, etc.)
├── dashboard/                      # 📊 Shared dashboard components
│   ├── dashboard-layout.tsx        # Main layout wrapper (header + sidebar + content)
│   ├── dashboard-header.tsx        # Common header (user avatar, logout)
│   └── dashboard-sidebar.tsx       # Role-based navigation sidebar
└── auth/                           # 🔐 Authentication UI components

lib/                                # 🔧 Utility libraries & helpers
├── auth.ts                         # 🔐 Authentication & session management
├── database.ts                     # 🗄️ Database operations with fallbacks
├── utils.ts                        # 🛠️ General utilities
└── report-generator.ts             # 📊 Report generation backend logic

scripts/                            # ⚙️ Database setup & management
├── 01-create-tables-mysql.sql      # 🏗️ Database schema
├── 02-seed-data.sql               # 🌱 Sample data
└── db-setup.js                    # 🚀 Automated database setup
```

### 🔍 How to Find Specific Features

| **What you're looking for** | **Where to find it** |
|------------------------------|----------------------|
| 🚪 **Login/Authentication** | `app/page.tsx`, `app/api/auth/`, `components/auth/` |
| 👑 **Admin Dashboard** | `app/admin/dashboard/components/admin-dashboard.tsx` |
| 📊 **Reports & Analytics** | `app/admin/dashboard/reports/components/report-generator.tsx` |
| 🏢 **Department/Lab Management** | `app/admin/dashboard/department-and-lab-management/page.tsx` |
| 👥 **User Management** | `app/admin/dashboard/users/`, `app/api/admin/users/` |
| 🎭 **Role-specific Pages** | `app/{role}/dashboard/` (e.g., `app/faculty/dashboard/`) |
| 🔌 **API Endpoints** | `app/api/{role}/` (e.g., `app/api/admin/`, `app/api/student/`) |
| 🎨 **UI Components** | `components/ui/` (buttons, forms, etc.) |
| 📊 **Dashboard Layout** | `components/dashboard/dashboard-layout.tsx` |
| 🗄️ **Database Operations** | `lib/database.ts` |
| ⚙️ **Database Setup** | `scripts/` directory |

### 🎯 Component Organization Strategy

1. **Shared Components** (`components/`) - Used across multiple roles
2. **Role-Specific Components** (`app/{role}/`) - Used by specific roles only  
3. **Feature-Specific Components** - Nested under their feature pages
4. **UI Components** (`components/ui/`) - Reusable design system components

This organization ensures:
- ✅ Clear ownership and maintainability
- ✅ No duplication of role-specific logic
- ✅ Easy to find and modify components
- ✅ Follows Next.js App Router best practices

## Project status (Sep 5, 2025)
- Done
  - All dashboard routes and buttons are wired to pages (no 404s).
  - Demo auth with cookie-based session; role awareness in UI.
  - Hydration issues fixed (deterministic SSR + html suppressHydrationWarning).
  - Asset paths corrected (login logo).
  - Digest email endpoint with secret header protection for schedulers.
  - Database helpers implemented with safe fallbacks to keep UI working without DB.
  - Forgot Password prompts for user type; students can auto-create account.
- Pending
  - Connect to a real database and remove fallbacks.
  - Strong password hashing (bcrypt/argon2) instead of demo scrypt.
    - Reset page branded with LNMIIT logo; login shows a success banner after reset.
    - Labs & Departments admin: create and cascade delete (lab/department) with UI and API.
    - Users admin: view by role (Students/Lab Staff), filter by department, sort, search, add user (student/lab staff), delete one, purge all students.
  - Student data lifecycle: auto-delete inactive/old students every 6 months.
    - MySQL integration: idempotent setup runner, archival tables, purge endpoints.


## Tech stack
- Next.js 15 (App Router) + React 19 + TypeScript
- UI: Tailwind CSS, Radix UI
- DB: MySQL (schema in `scripts/`)

## What changed recently (RBAC + structure)
- Centralized role-based middleware protects both pages and APIs.
- Admin API namespace added under `/api/admin/*`.
- Admin page “Organization” moved to `app/admin/dashboard/department-and-lab-management/` (old route archived).
- Department HOD model clarified: department keeps a canonical HOD email; the assigned HOD is a faculty user in that department.
- Hard-delete flow fixed to clear dependent `password_resets` and archive data safely before deletion.

### New directory locations
- Admin Department & Lab Management page
  - New canonical: `app/admin/dashboard/department-and-lab-management/page.tsx`
  - Archived old: `app/_archive/2025-09-05-v1/dashboard/organization/page.tsx`
  - Compatibility rewrite (now removed): `/admin/dashboard/organization` → `/admin/dashboard/department-and-lab-management`
- Admin API namespace (canonical handlers)
  - `app/api/admin/departments/route.ts`
  - `app/api/admin/departments/[id]/hod/route.ts` → PATCH assign HOD by id
  - `app/api/admin/labs/route.ts`
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/[id]/route.ts`
  - `app/api/admin/users/[id]/hard-delete/route.ts`
  - `app/api/admin/users/bulk/route.ts`

### Centralized RBAC middleware
- Pages segments: `/admin`, `/faculty`, `/lab-staff`, `/student`, `/tnp`, `/non-teaching`.
- API segments (canonical): `/api/admin`, `/api/student`, `/api/faculty`, `/api/hod`, `/api/lab-staff`, `/api/non-teaching`.
- Cookie `auth-token` is JSON-encoded; middleware decodes and authorizes.

### Data model notes
- HOD is a department designation: `departments.hod_id` (faculty user) and `departments.hod_email` (departmental address).
- Users keep their personal emails; do not overwrite with department HOD email.

## Migration guide (from earlier structure)

If you pulled a commit before Sep 5, 2025, here’s how to adapt.

1) Update client calls to admin namespace
- Replace client fetches (legacy top-level endpoints have been removed):
  - `/api/departments` → `/api/admin/departments`
  - `/api/labs` → `/api/admin/labs`
  - `/api/users` → `/api/admin/users`
  - `/api/users/bulk` → `/api/admin/users/bulk`
  - Hard delete: `/api/users/:id/hard-delete` → `/api/admin/users/:id/hard-delete`
  - Purge endpoints are under `/api/admin/*`.

2) Route location changes
- Use `/admin/dashboard/department-and-lab-management` instead of `/dashboard/organization`.
- Old page is archived under `app/_archive/2025-09-05-v1/...` for reference.

3) HOD assignment semantics
- Assign a faculty from the department as HOD; don’t require a separate `hod` role.
- Departmental HOD email lives in the department row and is displayed alongside the assigned faculty.

4) Hard delete behavior
- The hard-delete API deletes `password_resets` first to satisfy foreign keys, archives related records, then deletes the user.

5) SQL migrations
- A new script `scripts/04-add-non-teaching-role.sql` extends the `users.role` enum with `non_teaching`.
- Run it manually if your DB was initialized before this change.

## Earlier restore points (for reference)
- Pre-RBAC refactor UI snapshot: `app/_archive/2025-09-05-v1/dashboard/organization/page.tsx`.
- Original route structure is preserved in archive for easy rollback/testing.

## Admin API quick map (current canonical)
- Departments: `GET|POST|PUT|PATCH|DELETE /api/admin/departments`
- Labs: `GET|POST|PUT|PATCH|DELETE /api/admin/labs`
- Users: `GET|POST /api/admin/users`; `GET|PATCH|DELETE /api/admin/users/:id`
- User bulk import: `POST /api/admin/users/bulk`
- Hard delete: `DELETE /api/admin/users/:id/hard-delete`
## Roles
- Admin, HOD, Faculty, Lab Staff, Student, T&P

## Test users (password for all: `admin123`)
- Admin: `admin@lnmiit.ac.in`
- HOD: `hod.cse@lnmiit.ac.in`, `hod.ece@lnmiit.ac.in`
- Faculty: `faculty1@lnmiit.ac.in`, `faculty2@lnmiit.ac.in`
## Quick start
Mode 1: Demo (no DB auth)
- Uses a cookie-based mock session. All pages and sidebar routes work; APIs return stub data if DB isn’t configured.
Mode 2: DB-auth (MySQL)
- Set `USE_DB_AUTH=true` in `.env.local` and run `pnpm db:setup` once.

```bash
pnpm install
```
Open http://localhost:3000 and log in with any test user. Use the role dropdown to match the email’s role.

## Production build
```bash
pnpm build
```

## Configure MySQL (persistence)
1. Create a database and set env vars (copy `.env.example` to `.env.local`)
```env
DB_PORT=3306
DB_NAME=lnmiit_lab_management
DB_USER=root
DB_PASSWORD=password
USE_DB_AUTH=true
APP_URL=http://localhost:3000
```
2. Apply schema and optional seed:
- Automated: `pnpm db:setup`
- Manual: run `scripts/01-create-tables-mysql.sql` and optionally `scripts/02-seed-data.sql`.

The API layer in `lib/database.ts` uses MySQL (`mysql2/promise`). When DB is reachable, queries are used; otherwise, mocked responses are returned so the app doesn’t break in demo mode.

Recommended: MySQL (required by LNMIIT server; supported by `lib/database.ts`).

    - POST `/api/admin/purge-students` (admin) → archives and deletes all student users and related records.
- What you can share safely:
  - Share host, port, database, username, and a temporary password via a secret channel (not in git). For local dev, `.env.local`; for deployment, platform secrets.
  - Optionally provide a connection URL: `mysql://USER:PASSWORD@HOST:PORT/DBNAME`.
- What we’ll do after creds:
  - Set env in `.env.local` and verify migrations (or run SQL scripts in `scripts/`).
  - Flip endpoints to hard-fail on DB errors (remove fallbacks) once stable.
  - Add indexes/constraints if needed based on real data and load.
Which should you share now?
- If proceeding with MySQL (recommended): provide the MySQL connection details as listed above.
- If you want MongoDB Atlas instead: share `MONGODB_URI` (SRV string), and confirm preference so we add the adapter. Expect 1–2 passes to migrate queries and test.

Security note: never commit secrets. Use `.env.local` locally and deployment platform secret managers in prod. Rotate any secrets shared during dev after integration.

## App structure (important paths)
- `app/` - Next.js 15 App Router structure
  - `page.tsx` - Login screen
  - `api/` - API routes organized by role namespace
    - `auth/` - Authentication endpoints
    - `admin/` - Admin-only endpoints (departments, labs, users, reports)
    - `student/`, `faculty/`, `hod/`, `lab-staff/`, `tnp/` - Role-specific endpoints
  - `admin/dashboard/` - Admin dashboard pages
    - `components/` - Admin-specific components
    - `reports/components/` - Report generation components
    - `department-and-lab-management/` - Dept/lab management page
  - `faculty/dashboard/`, `student/dashboard/`, etc. - Role-specific dashboard pages
- `components/` - Shared UI components
  - `ui/` - Radix UI-based design system components
  - `dashboard/` - Shared dashboard layout components
  - `auth/` - Authentication UI components
- `lib/` - Utility libraries
  - `auth.ts` - Authentication helpers
  - `database.ts` - Database operations with fallbacks
  - `utils.ts` - General utilities
- `scripts/` - Database setup and management
  - SQL schema files for MySQL
  - Seed data and migration scripts

## Authentication
- Login posts to `/api/auth/login` with `{ email, password, userRole }`.
- On success: 
  - `localStorage.user` stores `{ id, email, name, role, department, studentId? }`.
  - An httpOnly cookie `auth-token` stores a JSON-encoded session. Server routes decode this cookie in `lib/auth.ts`.
- Logout posts to `/api/auth/logout` and clears the cookie and localStorage.

Auth modes:
- Demo: in-memory users.
- DB-auth: MySQL users with `password_hash` (scrypt `salt:hash` on reset; seeded users use legacy SHA-256).
Note: In demo we don’t sign JWTs; the cookie stores a JSON-encoded payload. Replace with proper JWT when you connect the real backend.

## API endpoints (current)
All endpoints are under `app/api/` (Next.js Route Handlers). In demo mode, they either query MySQL or return safe fallbacks.

- Auth
  - POST `/api/auth/login` → body `{ email, password, userRole }` → returns `{ user }` and sets cookie
  - POST `/api/auth/logout` → clears cookie
  - POST `/api/auth/forgot-password` → body `{ email, role }`
    - Students: if no record exists, auto-create a student user and issue token.
    - Non-students: requires existing user; otherwise 404.
    - If SMTP is configured, sends email; otherwise logs reset URL on server.
  - POST `/api/auth/reset-password` → body `{ token, password }` → validates token and updates password.
  - Notes: role mismatch between selected and stored role is rejected; prefer bcrypt/argon2 in production.

- Labs (admin)
  - GET `/api/admin/labs` → all labs
  - GET `/api/admin/labs?department=ID` → labs by department
  - POST `/api/admin/labs` (admin) → body `{ name, code, departmentId, staffId?, capacity?, location? }`

- Bookings
  - GET `/api/admin/bookings` (admin) → optional `?status=pending|approved|rejected&labId=ID`
  - GET `/api/student/bookings` (student) → own bookings
  - GET `/api/faculty/bookings` (faculty) → own bookings; POST to create
  - GET `/api/hod/bookings` (hod) → department/bookings scope


- Admin utilities
  - POST `/api/admin/send-digest` → body `{ recipients: string[], subject?: string, html?: string }`
    - Secure with header `x-cron-secret: <CRON_SECRET>`; set `CRON_SECRET` in env. Intended for scheduled digest emails.

- Admin/User management
  - GET `/api/admin/users?role=lab_staff|faculty|hod|student|tnp|admin` → list users (admin only)
  - POST `/api/admin/users` → create user (admin only). Body: `{ email, role, name, department?, phone?, studentId?, employeeId?, passwordHash? }`
  - DELETE `/api/admin/users/:id` → soft-delete user (admin only)
  - GET `/api/admin/users/:id` → user history: `{ bookings, logs }` (admin only)

## Database helpers (lib/database.ts)
- Users: `createUser`, `getUserByEmail`, `getUserById`
- Labs: `getAllLabs`, `getLabsByDepartment`, `createLab`
- Bookings: `getAllBookings`, `getBookingsByUser`, `createBooking`, `checkBookingConflicts`
- Inventory: `getInventoryByLab`, `updateInventoryQuantity`
- Logs: `createLog`
- Reports: `getBookingReport`

All methods catch errors and return sensible fallbacks so the UI continues to work if the DB isn’t ready.

## Dashboards and routes
The sidebar buttons are backed by real pages, so navigation always works:
- `/dashboard` (role-specific dashboards)
- `/dashboard/book-labs`, `/dashboard/requests`, `/dashboard/bookings`, `/dashboard/history`
- `/dashboard/approve`, `/dashboard/approvals` (faculty/hod flows)
- `/dashboard/inventory`, `/dashboard/issue-return`, `/dashboard/attendance` (lab staff flows)
- `/dashboard/labs`, `/dashboard/users`, `/dashboard/settings`, `/dashboard/analytics`
- `/dashboard/events`, `/dashboard/reports`

### Component Architecture (Organized by Usage)

**Shared Layout Components** (used across all roles):
- `components/dashboard/dashboard-layout.tsx` - Main dashboard wrapper with header and sidebar
- `components/dashboard/dashboard-header.tsx` - Common header with user avatar and logout
- `components/dashboard/dashboard-sidebar.tsx` - Role-based navigation sidebar

**Role-Specific Components** (moved to respective app directories):
- `app/admin/dashboard/components/admin-dashboard.tsx` - Admin dashboard UI with system stats
- `app/admin/dashboard/reports/components/report-generator.tsx` - Report generation interface (admin only)

**UI Components** (reusable across the application):
- `components/ui/` - Radix UI-based components (buttons, cards, forms, etc.)
- `components/auth/` - Authentication-related components

**Component Organization Principles**:
- **Shared components** remain in `components/` for cross-role usage
- **Role-specific components** moved to their respective `app/{role}/` directories  
- **Feature-specific components** nested under their feature pages (e.g., reports under reports page)
- This eliminates duplication and ensures clear ownership and maintainability

### API namespaces by role
- Admin: `/api/admin/*` (departments, labs, users, bookings, analytics, reports, stats, logs, utilities)
- Student: `/api/student/*` (bookings: own)
- Faculty: `/api/faculty/*` (bookings: own)
- HOD: `/api/hod/*` (bookings overview by department)
- Lab Staff: `/api/lab-staff/*` (namespace ready; add endpoints as needed)
- Non-Teaching: `/api/non-teaching/*` (namespace ready; add endpoints as needed)

## Reporting
- **Admin Reports UI**: `app/admin/dashboard/reports/components/report-generator.tsx` - Comprehensive report generation with:
  - Role-based report types and filters
  - Date range selection with presets
  - Multiple export formats (PDF, Excel)
  - Real-time data preview
- **Export Implementation**:
  - Excel (XLSX) via `xlsx` with headers, column widths, and data rows
  - PDF via `jspdf` + `jspdf-autotable` with table layout and pagination
- **Backend Integration**: 
  - `POST /api/admin/reports` returns data rows for supported report types
  - Uses `dbOperations.getSystemLogs` with cookie-based authentication
  - Supports security_audit, activity_summary, system_overview report types

## Security and next steps
- Replace demo cookie with signed JWT (httpOnly + secure).
- Add 2FA for Admin/HOD.
- Enforce RBAC deeper at API level using `withAuth` helpers.
- Connect to MySQL for persistence and remove fallbacks.
- Implement emails for bookings/approvals/reminders.
- Add cron for student cleanup and report archiving.

## Email setup (password reset + digests)
Email sending is optional. If not configured, the app logs and skips sending.

1. Copy `.env.example` to `.env.local` and set:
```
APP_URL=http://localhost:3000
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM="LNMIIT Labs <no-reply@lnmiit.ac.in>"
CRON_SECRET=choose-a-strong-secret
```
2. Install deps (already included): `nodemailer`.
3. Forgot password flow:
  - Page `/forgot-password` posts to `/api/auth/forgot-password`.
  - User gets an email with link `/reset-password/:token`.
  - Page `/reset-password/[token]` posts to `/api/auth/reset-password`.
4. Scheduled digests:
Mailtrap example (.env.local)
```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=1cc2fb91c2b16e
SMTP_PASS=1bcba266d5ee05
SMTP_FROM="LNMIIT Labs <no-reply@lnmiit.ac.in>"
```
  - Call `/api/admin/send-digest` with header `x-cron-secret: $CRON_SECRET` from your scheduler (e.g., Vercel Cron).
  - Body `{ recipients: ["admin@lnmiit.ac.in"], subject: "Daily Digest", html: "<p>...</p>" }`.

## Troubleshooting
- Port in use: stop other Next servers or change port (`pnpm dev -- -p 3001`).
- MySQL SSL: configure according to your hosting; set client certs in the MySQL server or proxy if required.
- Type errors: ensure `next-env.d.ts` exists (it is included).

## Scripts
- DB setup: `pnpm db:setup`
- Inspect a user (local): `node scripts/inspect-user.js <email>`
- SQL files:
  - `scripts/01-create-tables-mysql.sql`
  - `scripts/02-add-indexes-mysql.sql`
  - `scripts/03-archival-tables-mysql.sql`
  - `scripts/02-seed-data.sql`

---
Maintained for demo reliability: all buttons and routes are wired; server routes won’t crash without DB. Integrate the real DB when ready and remove fallbacks.
