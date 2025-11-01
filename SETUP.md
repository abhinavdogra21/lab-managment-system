# Lab Management System - Complete Setup Guide

This guide will help you set up the Lab Management System on any machine in under 10 minutes.

## 📋 Prerequisites

Before you begin, ensure you have these installed:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0.0 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download here](https://git-scm.com/downloads)
- **pnpm** (Package Manager) - Install with: `npm install -g pnpm`

## 🚀 Quick Setup (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system
```

### Step 2: Run Database Setup

```bash
# Run the database setup script
./scripts/setup-database.sh
```

**For Windows Users:**
```bash
# Use Git Bash or WSL
bash scripts/setup-database.sh
```

The setup script will:
- ✅ Ask for your MySQL credentials
- ✅ Let you choose custom database name (default: `lnmiit_lab_management`)
- ✅ Create the database automatically
- ✅ Import the exact database structure (35 tables)
- ✅ Generate `.env.local` with your settings

### Step 2b: Install Dependencies

```bash
pnpm install
# or if you don't have pnpm
npm install -g pnpm
pnpm install
```

### Step 3: Start the Application

```bash
pnpm run dev
```

### Step 4: Access the Application

Open your browser and go to: **http://localhost:3000**

**Default Admin Credentials:**
- **Email:** admin@lnmiit.ac.in
- **Password:** admin123

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## 🔧 Manual Setup (Advanced Users)

If the automated script doesn't work or you prefer manual setup:

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Create MySQL Database

Login to MySQL:
```bash
mysql -u root -p
```

Create the database:
```sql
CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. Run SQL Scripts in Order

```bash
cd scripts

# Step 1: Create tables
mysql -u root -p lnmiit_lab_management < 01-create-tables-mysql.sql

# Step 2: Add indexes for performance
mysql -u root -p lnmiit_lab_management < 02-add-indexes-mysql.sql

# Step 3: Insert initial data (departments, admin user, etc.)
mysql -u root -p lnmiit_lab_management < 02-seed-data.sql

# Step 4: Create archival tables
mysql -u root -p lnmiit_lab_management < 03-archival-tables-mysql.sql
```

### 4. Create Environment Configuration

Create a file named `.env.local` in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=lnmiit_lab_management

# Application URL
APP_URL=http://localhost:3000
USE_DB_AUTH=true

# Feature Flags
NEXT_PUBLIC_MULTI_STAFF_UI=false
NEXT_PUBLIC_FORGOT_REQUIRE_TYPE=true

# Email Configuration (for notifications)
TESTING_MODE=true
ADMIN_EMAIL=your_email@gmail.com
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password_here
```

**Getting Gmail App Password:**
1. Go to Google Account Settings
2. Security → 2-Step Verification
3. App passwords → Generate new app password
4. Copy and paste into `GMAIL_APP_PASSWORD`

### 5. Start Development Server

```bash
pnpm run dev
```

---

## 🔄 Setting Up on a New Machine

When moving to a different laptop/computer:

### Quick Method (Recommended)
```bash
# Clone the repository
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system

# Run the database setup script
./scripts/setup-database.sh

# Install dependencies
pnpm install

# Start the app
pnpm run dev
```

That's it! The setup script will create the exact same database structure (35 tables) automatically.

### What You'll Need
- MySQL installed and running
- Your MySQL root password (or any MySQL user with CREATE DATABASE privileges)
- Node.js v18+ installed
- pnpm (will be installed if missing)

---

## 🛠️ Troubleshooting

### MySQL Connection Issues

**Problem:** Cannot connect to MySQL
```bash
# Check if MySQL is running (Mac)
brew services list

# Start MySQL (Mac)
brew services start mysql

# Check if MySQL is running (Linux)
sudo systemctl status mysql

# Start MySQL (Linux)
sudo systemctl start mysql

# Windows - Check Services app
# Search "Services" → Find "MySQL" → Start
```

**Problem:** Access denied for user 'root'
```bash
# Reset MySQL root password (if forgotten)
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

### Port Issues

**Problem:** Port 3000 already in use
```bash
# Find and kill process (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Issues

**Reset Database Completely:**
```sql
DROP DATABASE IF EXISTS lnmiit_lab_management;
CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then re-run all SQL scripts.

### Permission Issues

**Script not executable:**
```bash
chmod +x scripts/setup-db.sh
chmod +x scripts/verify-setup.sh
```

### Dependency Issues

**pnpm not found:**
```bash
npm install -g pnpm
```

**Node version too old:**
```bash
# Check version
node --version

# Update Node.js
# Download latest from https://nodejs.org/
```

---

## ✅ Verify Installation

Run the verification script:
```bash
chmod +x scripts/verify-setup.sh
./scripts/verify-setup.sh
```

This checks:
- ✅ Database connection
- ✅ All tables created
- ✅ Seed data inserted
- ✅ Environment variables set
- ✅ Dependencies installed

---

## 📚 Database Schema Overview

The system creates these main tables:
- **users** - All system users
- **departments** - Academic departments
- **labs** - Laboratory information
- **lab_bookings** - Booking requests and approvals
- **components** - Lab equipment/components
- **component_requests** - Component borrowing requests
- **timetable_entries** - Regular class schedules
- **audit_logs** - System activity tracking

---

## 🎯 Next Steps After Setup

1. **Login as Admin**
   - Email: admin@lnmiit.ac.in
   - Password: admin123

2. **Change Admin Password**
   - Go to Profile → Change Password

3. **Add Departments**
   - Admin Dashboard → Departments → Add Department

4. **Create Labs**
   - Admin Dashboard → Labs → Add Lab

5. **Add Users**
   - Admin Dashboard → Users → Add User
   - Import students via Excel (bulk upload)

6. **Set Up Timetable**
   - Admin Dashboard → Timetable → Add Entries

7. **Configure Email**
   - Update GMAIL_USER and GMAIL_APP_PASSWORD in `.env.local`
   - Set TESTING_MODE=false for production

---

## 🔐 Default User Roles

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **Admin** | Full System | User management, system configuration |
| **HOD** | Department | Final approval for bookings, reports |
| **Faculty** | Department | Approve student bookings, request components |
| **Lab Staff** | Labs | Manage bookings, equipment, approve requests |
| **TNP** | Limited | Book labs for placement activities |
| **Student** | Basic | Request lab bookings and components |

---

## 📧 Email Configuration

For email notifications to work:

1. **Gmail Setup (Recommended)**
   ```env
   GMAIL_USER=your.email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

2. **Testing Mode**
   - Keep `TESTING_MODE=true` during development
   - All emails go to `ADMIN_EMAIL`
   - Set to `false` for production

---

## 🌐 Production Deployment

When deploying to production:

1. **Update .env.local**
   ```env
   APP_URL=https://yourdomain.com
   TESTING_MODE=false
   ```

2. **Secure Database**
   - Change MySQL root password
   - Create dedicated database user
   - Use strong passwords

3. **Enable Email**
   - Configure real SMTP settings
   - Test email delivery

4. **Build for Production**
   ```bash
   pnpm run build
   pnpm start
   ```

---

## 📞 Support & Help

- 📖 Full Documentation: [README.md](README.md)
- 🐛 Report Issues: [GitHub Issues](https://github.com/abhinavdogra21/lab-managment-system/issues)
- 📧 Email Support: Check repository for contact

---

**🎉 You're all set! Happy lab management!**
