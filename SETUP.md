# Setup Guide - LNMIIT Lab Management System

This guide will help you set up the LNMIIT Lab Management System on your local machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **pnpm** (Package manager) - Install with: `npm install -g pnpm`
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download](https://git-scm.com/downloads)

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

This will install all required packages including:
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- MySQL2
- Nodemailer
- And other dependencies

---

## Step 3: Database Setup

### 3.1 Create MySQL Database

Login to MySQL:

```bash
mysql -u root -p
```

Create the database:

```sql
CREATE DATABASE lnmiit_lab_management;
USE lnmiit_lab_management;
```

### 3.2 Import Database Schema

Exit MySQL shell (type `exit`) and run:

```bash
mysql -u root -p lnmiit_lab_management < scripts/database-schema.sql
```

**Or** if you're still in MySQL shell:

```sql
USE lnmiit_lab_management;
SOURCE /path/to/your/project/scripts/database-schema.sql;
```

This will create all necessary tables:
- `users`
- `departments`
- `labs`
- `booking_requests`
- `multi_lab_approvals`
- `multi_lab_responsible_persons`
- `component_requests`
- `component_loans`
- `components`
- `system_logs`

### 3.3 Create Default Admin User

Login to MySQL again:

```bash
mysql -u root -p lnmiit_lab_management
```

Insert the admin user:

```sql
INSERT INTO users 
(email, password_hash, name, role, department, is_active, created_at, updated_at)
VALUES
('admin@lnmiit.ac.in', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Admin', 'admin', 'IT', 1, NOW(), NOW());
```

**Admin Credentials:**
- **Email:** `admin@lnmiit.ac.in`
- **Password:** `123`

> ⚠️ **Important:** Change this password immediately after first login in production!

Exit MySQL:

```sql
exit;
```

---

## Step 4: Environment Configuration

### 4.1 Create Environment File

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Or create it manually:

```bash
touch .env.local
```

### 4.2 Configure Environment Variables

Open `.env.local` and add the following:

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

**Environment Variables Explained:**

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DB_HOST` | MySQL server hostname | `localhost` |
| `DB_PORT` | MySQL server port | `3306` |
| `DB_NAME` | Database name | `lnmiit_lab_management` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | Your MySQL password |
| `DB_SOCKET` | Unix socket path (optional, overrides host/port) | `/tmp/mysql.sock` |
| `APP_URL` | Application base URL for emails | `http://localhost:3000` |
| `USE_DB_AUTH` | Enable database authentication | `true` |
| `NEXT_PUBLIC_MULTI_STAFF_UI` | Enable multi-staff UI features | `false` |
| `NEXT_PUBLIC_FORGOT_REQUIRE_TYPE` | Require user type in forgot password | `true` |
| `TESTING_MODE` | Email testing mode (logs instead of sending) | `true` in dev, `false` in production |
| `ADMIN_EMAIL` | Admin email for notifications | Your admin email |
| `GMAIL_USER` | Gmail account for sending emails | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 chars) | Generated from Google Account |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS/SSL for SMTP | `false` for port 587 |
| `SMTP_USER` | SMTP username (usually same as Gmail) | Your Gmail address |
| `SMTP_PASS` | SMTP password (App Password) | Same as `GMAIL_APP_PASSWORD` |
| `SMTP_FROM` | Sender name and email for outgoing mails | `LNMIIT Lab Management <email>` |

### 4.3 Get Gmail App Password

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "LNMIIT Lab System" and click **Generate**
6. Copy the 16-character password (remove spaces)
7. Paste it in `GMAIL_APP_PASSWORD` in `.env.local`

---

## Step 5: Run the Application

### 5.1 Development Mode

```bash
pnpm dev
```

The application will start at: **http://localhost:3000**

### 5.2 Build for Production

```bash
pnpm build
pnpm start
```

---

## Step 6: First Login & Setup

### 6.1 Login as Admin

1. Open browser: `http://localhost:3000`
2. Click **Login**
3. Enter credentials:
   - Email: `admin@lnmiit.ac.in`
   - Password: `123`

### 6.2 Initial Configuration

After logging in as admin, set up:

1. **Create Departments**
   - Navigate to **Admin Dashboard** → **Manage Departments**
   - Add departments (e.g., CSE, ECE, ME, Civil, etc.)

2. **Create Labs**
   - Navigate to **Manage Labs**
   - Add labs with name, code, capacity
   - Assign labs to departments

3. **Create Users**
   - Navigate to **Manage Users**
   - Add HOD, Lab Coordinators, Faculty, Lab Staff, Students

4. **Assign Roles**
   - Assign HOD to each department
   - Assign Lab Coordinator (optional)
   - Assign Head Lab Staff to each lab

5. **Configure Approval Authority**
   - Go to **Manage Departments**
   - Set `highest_approval_authority` to either:
     - `hod` - HOD gives final approval
     - `lab_coordinator` - Lab Coordinator gives final approval

---

## Step 7: Verify Setup

### 7.1 Test Email System

In **TESTING_MODE=true**, all emails are logged to console and redirected to admin email.

1. Create a test booking request
2. Check terminal/console for email logs:
   ```
   📧 [TEST MODE] Email would be sent to: faculty@lnmiit.ac.in
   Subject: Lab Booking Request
   ```

### 7.2 Test Approval Workflow

**Student Lab Booking:**
1. Login as Student
2. Navigate to **Book Lab**
3. Fill form and submit
4. Login as Faculty → Approve
5. Login as Lab Staff → Approve
6. Login as HOD → Final Approve
7. Check email notifications

**Component Request:**
1. Login as Student
2. Navigate to **Request Equipment**
3. Submit request
4. Login as Faculty → Approve
5. Login as Lab Staff → Recommend
6. Login as HOD → Approve
7. Login as Lab Staff → Issue Equipment

---

## Step 8: Enable Automated Reminders (Optional)

### 8.1 Local Development (Manual Trigger)

Visit these URLs to manually trigger cron jobs:

- **Booking Reminders:** `http://localhost:3000/api/cron/booking-reminders`
- **Equipment Reminders:** `http://localhost:3000/api/cron/loan-reminders`

### 8.2 Production (Vercel Cron)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/loan-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## Step 9: Production Deployment

### 9.1 Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Set environment variables in Vercel Dashboard:
   - Go to **Project Settings** → **Environment Variables**
   - Add all variables from `.env.local`
   - **Important:** Set `TESTING_MODE=false` in production

### 9.2 Configure Production Database

**Option 1: Use hosted MySQL (Recommended)**
- [PlanetScale](https://planetscale.com/)
- [Railway](https://railway.app/)
- [AWS RDS](https://aws.amazon.com/rds/)

**Option 2: Self-hosted MySQL**
- Update `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` in Vercel env vars

### 9.3 Security Checklist

Before going live:

- [ ] Change admin password from `123` to a strong password
- [ ] Set `TESTING_MODE=false`
- [ ] Use production SMTP credentials
- [ ] Enable HTTPS/SSL
- [ ] Set strong `SESSION_SECRET`
- [ ] Enable database backups
- [ ] Configure firewall rules
- [ ] Review all user permissions

---

## Troubleshooting

### Issue: Database Connection Error

**Error:** `ER_ACCESS_DENIED_ERROR`

**Solution:**
1. Verify MySQL credentials in `.env.local`
2. Check MySQL is running: `sudo systemctl status mysql` (Linux) or `brew services list` (macOS)
3. Test connection: `mysql -u root -p`

---

### Issue: Email Not Sending

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solution:**
1. Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD`
2. Ensure 2-Step Verification is enabled in Google Account
3. Generate new App Password if expired
4. Check `TESTING_MODE=true` logs emails to console instead of sending

---

### Issue: Port 3000 Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

---

### Issue: Database Tables Not Created

**Error:** `Table 'users' doesn't exist`

**Solution:**
1. Re-import schema:
   ```bash
   mysql -u root -p lnmiit_lab_management < scripts/database-schema.sql
   ```
2. Verify tables exist:
   ```sql
   USE lnmiit_lab_management;
   SHOW TABLES;
   ```

---

### Issue: Dependencies Installation Fails

**Error:** `ENOENT: no such file or directory`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Default User Credentials (After Setup)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@lnmiit.ac.in | `123` | Full system access |

> ⚠️ **Security Warning:** Change all default passwords immediately!

---

## Project Structure

```
lab-managment-system/
├── app/
│   ├── api/              # API routes for all roles
│   ├── admin/            # Admin dashboard
│   ├── hod/              # HOD dashboard
│   ├── faculty/          # Faculty dashboard
│   ├── lab-staff/        # Lab Staff dashboard
│   ├── student/          # Student dashboard
│   └── others/           # Others (T&P) dashboard
├── components/           # Reusable UI components
├── lib/
│   ├── database.ts       # MySQL connection pool
│   ├── auth.ts           # Authentication logic
│   ├── notifications.ts  # Email templates
│   └── activity-logger.ts # Activity logging
├── scripts/
│   └── database-schema.sql # Database schema
├── .env.local            # Environment variables (create this)
└── package.json          # Project dependencies
```

---

## Useful Commands

```bash
# Development
pnpm dev                  # Start dev server
pnpm build                # Build for production
pnpm start                # Start production server
pnpm lint                 # Lint code

# Database
mysql -u root -p          # Login to MySQL
pnpm db:migrate           # Run migrations (if available)

# Git
git status                # Check changes
git add .                 # Stage all changes
git commit -m "message"   # Commit changes
git push                  # Push to remote
```

---

## Support & Documentation

- **README:** [README.md](README.md)
- **Design Document:** [design.md](design.md)
- **Working Guide:** [working.md](working.md)
- **GitHub Repository:** [abhinavdogra21/lab-managment-system](https://github.com/abhinavdogra21/lab-managment-system)

---

## Next Steps

1. ✅ Complete database setup
2. ✅ Configure environment variables
3. ✅ Login as admin
4. ✅ Create departments and labs
5. ✅ Add users (HOD, Faculty, Lab Staff, Students)
6. ✅ Test booking workflow
7. ✅ Test component request workflow
8. ✅ Verify email notifications
9. ✅ Deploy to production (optional)

---

## License

This project is developed for LNMIIT Lab Management.

---

**Questions?** Check the troubleshooting section or contact the development team.

**Happy Lab Managing! 🎓🔬**
