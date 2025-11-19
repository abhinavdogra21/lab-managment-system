# LNMIIT Lab Management System

A comprehensive platform for managing laboratory bookings, equipment, users, and workflows at The LNM Institute of Information Technology.

---

## 📁 Project Structure Overview

```
lab-managment-system/
├── app/                  # Next.js app directory (routes, pages, layouts)
│   ├── api/              # All backend API endpoints (RESTful, role-based)
│   ├── admin/            # Admin dashboard UI
│   ├── faculty/          # Faculty dashboard UI
│   ├── hod/              # HOD dashboard UI
│   ├── lab-coordinator/  # Lab Coordinator dashboard UI
│   ├── lab-staff/        # Lab Staff dashboard UI
│   ├── others/           # Other users dashboard UI
│   ├── student/          # Student dashboard UI
│   ├── layout.tsx        # Root layout
│   └── ...               # Other pages/components
├── components/           # Shared React components (UI, dashboard, reports)
├── hooks/                # Custom React hooks
├── lib/                  # Server-side utilities (db, auth, email, notifications)
├── public/               # Static assets (images, logos)
├── scripts/              # Database schema and migration scripts
├── styles/               # Global CSS and Tailwind config
├── .env.local            # Environment variables (local/dev)
├── package.json          # Project dependencies and scripts
└── README.md             # Project documentation (this file)
```

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

## 🗂️ Where is the Code?

- **UI Pages:** All user-facing pages are in `app/[role]/dashboard/` (e.g., `app/admin/dashboard/`, `app/student/dashboard/`).
- **API Logic:** All backend logic is in `app/api/` (organized by role and feature).
- **Shared Components:** Reusable UI in `components/` (e.g., `components/ui/`, `components/dashboard/`).
- **Database/Email/Utils:** All server-side helpers in `lib/` (e.g., `lib/database.ts`, `lib/notifications.ts`).
- **Custom Hooks:** React hooks in `hooks/`.
- **Database Schema:** Main schema in `scripts/data-base-schema.sql`.
- **Global Styles:** Tailwind and custom CSS in `styles/globals.css`.

---

## 🛠️ Setup & Development

1. **Install dependencies:**
   ```bash
   pnpm install
   # or npm install
   ```
2. **Configure environment:**
   - Copy `.env.local.example` to `.env.local` and fill in DB, email, and other secrets.
3. **Run development server:**
   ```bash
   pnpm dev
   # or npm run dev
   ```
4. **Build for production:**
   ```bash
   pnpm build && pnpm start
   ```

---

## 🔒 Security & Testing
- All sensitive routes require authentication and role checks.
- In `TESTING_MODE`, all emails go to `ADMIN_EMAIL` (see `.env.local`).
- Use Vercel Cron or external cron to trigger `/api/cron/booking-reminders` and `/api/cron/loan-reminders`.

---

## 📖 Further Reading
- See `MULTI_LAB_BOOKING_IMPLEMENTATION.md` and `MULTI_LAB_INTEGRATION_TODO.md` for advanced features and design notes.
- Database schema: `scripts/data-base-schema.sql`
- For troubleshooting, see `SETUP.md` (if present).

---

**Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)**
