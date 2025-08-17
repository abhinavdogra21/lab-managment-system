# LNMIIT Lab Management System

A role-based lab management platform for LNMIIT (Next.js App Router + TypeScript). This repo ships with a functional UI, working API stubs, and a mock authentication flow so you can demo every route and navigation. A Postgres schema and seeds are included; you can wire the real DB when ready.

## Tech stack
- Next.js 15 (App Router) + React 19 + TypeScript
- UI: Tailwind CSS, Radix UI
- DB (optional): PostgreSQL (schema in `scripts/`)

## Roles
- Admin, HOD, Faculty, Lab Staff, Student, T&P

## Test users (password for all: `admin123`)
- Admin: `admin@lnmiit.ac.in`
- HOD: `hod.cse@lnmiit.ac.in`, `hod.ece@lnmiit.ac.in`
- Faculty: `faculty1@lnmiit.ac.in`, `faculty2@lnmiit.ac.in`
- Lab Staff: `labstaff1@lnmiit.ac.in`, `labstaff2@lnmiit.ac.in`
- Students: `21ucs001@lnmiit.ac.in`, `21uec001@lnmiit.ac.in`
- T&P: `tnp@lnmiit.ac.in`

## Quick start (demo mode)
This mode uses a cookie-based mock session. All pages and sidebar routes work; APIs return stub data if DB isn’t configured.

```bash
pnpm install
pnpm dev
```
Open http://localhost:3000 and log in with any test user. Use the role dropdown to match the email’s role.

## Production build
```bash
pnpm build
pnpm start
```

## Configure PostgreSQL (optional, for persistence)
1. Create a database and set env vars (copy `.env.example` to `.env.local`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lnmiit_lab_management
DB_USER=postgres
DB_PASSWORD=password
```
2. Run schema and seed (manually via your SQL client):
- `scripts/01-create-tables.sql`
- `scripts/02-seed-data.sql`

The API layer in `lib/database.ts` has safe fallbacks. When DB is reachable, queries are used; otherwise, mocked responses are returned so the app doesn’t break.

## App structure (important paths)
- `app/`
  - `page.tsx` (login screen)
  - `dashboard/` (role dashboards + placeholder pages for every sidebar link)
  - `api/` (auth, labs, bookings, inventory)
- `components/` (UI and dashboard modules)
- `lib/` (auth + DB helpers)
- `scripts/` (SQL schema and seed)

## Authentication (demo)
- Login posts to `/api/auth/login` with `{ email, password, userRole }`.
- On success: 
  - `localStorage.user` stores `{ id, email, name, role, department, studentId? }`.
  - An httpOnly cookie `auth-token` stores a JSON-encoded session. Server routes decode this cookie in `lib/auth.ts`.
- Logout posts to `/api/auth/logout` and clears the cookie and localStorage.

Note: In demo we don’t sign JWTs; the cookie stores a JSON-encoded payload. Replace with proper JWT when you connect the real backend.

## API endpoints (current)
All endpoints are under `app/api/` (Next.js Route Handlers). In demo mode, they either query Postgres or return safe fallbacks.

- Auth
  - POST `/api/auth/login` → body `{ email, password, userRole }` → returns `{ user }` and sets cookie
  - POST `/api/auth/logout` → clears cookie

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
- Currently simulates report generation; integrate with `lib/report-generator.ts` and a server route to produce PDF/Excel.

## Security and next steps
- Replace demo cookie with signed JWT (httpOnly + secure).
- Add 2FA for Admin/HOD.
- Enforce RBAC deeper at API level using `withAuth` helpers.
- Connect to Postgres for persistence and remove fallbacks.
- Implement emails for bookings/approvals/reminders.
- Add cron for student cleanup and report archiving.

## Troubleshooting
- Port in use: stop other Next servers or change port (`pnpm dev -- -p 3001`).
- Postgres SSL: set `ssl=false` in dev; use SSL in prod.
- Type errors: ensure `next-env.d.ts` exists (it is included).

## Scripts
- SQL: `scripts/01-create-tables.sql`, `scripts/02-seed-data.sql`

---
Maintained for demo reliability: all buttons and routes are wired; server routes won’t crash without DB. Integrate the real DB when ready and remove fallbacks.
