# LNMIIT Lab Management System

A role-based lab management platform for LNMIIT (Next.js App Router + TypeScript). This repo ships with a functional UI, working API stubs, and a mock authentication flow so you can demo every route and navigation. A MySQL schema and seeds are included; wire the DB when ready.

## Project status (Sep 1, 2025)
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
- `app/`
  - `page.tsx` (login screen)
  - `dashboard/` (role dashboards + placeholder pages for every sidebar link)
  - `api/` (auth, labs, bookings, inventory)
- `components/` (UI and dashboard modules)
- `lib/` (auth + DB helpers)
- `scripts/` (SQL schema and seed)

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

- Labs
  - GET `/api/labs` → all labs
  - GET `/api/labs?department=ID` → labs by department
  - POST `/api/labs` (admin|hod) → body `{ name, code, departmentId, staffId?, capacity?, location? }`

- Bookings
  - GET `/api/bookings` →
    - Admin/HOD: all (optional `?status=pending|approved|rejected&labId=ID`)
    - Faculty/T&P/Student: own bookings
  - POST `/api/bookings` (faculty|tnp|admin) → body `{ labId, bookingDate, startTime, endTime, purpose, expectedStudents?, equipmentNeeded? }`
    - Checks conflicts via `dbOperations.checkBookingConflicts`

- Inventory (stub)
  - GET `/api/inventory` → `{ items: [] }`
  - POST `/api/inventory` → `{ success: true }`

- Admin/Cron
  - POST `/api/admin/send-digest` → body `{ recipients: string[], subject?: string, html?: string }`
    - Secure with header `x-cron-secret: <CRON_SECRET>`; set `CRON_SECRET` in env. Intended for scheduled digest emails.

- Admin/User management
  - GET `/api/users?role=lab_staff|faculty|hod|student|tnp|admin` → list users (admin only)
  - POST `/api/users` → create user (admin only). Body: `{ email, role, name, department?, phone?, studentId?, employeeId?, passwordHash? }`
  - DELETE `/api/users/:id` → soft-delete user (admin only)
  - GET `/api/users/:id` → user history: `{ bookings, logs }` (admin only)

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

## Reporting
- UI in `components/reports/report-generator.tsx` supports date range, filters, and export type selection.
- Real exports:
  - Excel (XLSX) via `xlsx` with headers, column widths, and data rows.
  - PDF via `jspdf` + `jspdf-autotable` with table layout and pagination.
- Server route: `POST /api/reports` returns data rows for supported report types (security_audit, activity_summary, system_overview), using `dbOperations.getSystemLogs` and cookie auth.
- Layout adjusted to avoid horizontal overflow in admin Reports.

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
