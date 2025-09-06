# Quick Setup Guide

This guide will help you set up the Lab Management System on your local machine in under 5 minutes.

## Prerequisites

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0.0 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download here](https://git-scm.com/downloads)

## Quick Setup (Automated)

### 1. Clone and Navigate

```bash
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system
```

### 2. Run Automated Setup

```bash
# Make the setup script executable
chmod +x scripts/setup-db.sh

# Run the automated setup
./scripts/setup-db.sh
```

The script will:
- ✅ Check MySQL connection
- ✅ Create the database
- ✅ Set up all tables and indexes
- ✅ Insert seed data
- ✅ Create `.env.local` file
- ✅ Install dependencies

### 3. Start the Application

```bash
pnpm run dev
```

### 4. Access the Application

- **URL:** http://localhost:3000
- **Admin Email:** admin@lnmiit.ac.in
- **Admin Password:** admin123

## Manual Setup (Alternative)

If you prefer manual setup or the automated script doesn't work:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Database

```sql
CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Run SQL Scripts

```bash
mysql -u root -p lnmiit_lab_management < scripts/01-create-tables-mysql.sql
mysql -u root -p lnmiit_lab_management < scripts/02-add-indexes-mysql.sql
mysql -u root -p lnmiit_lab_management < scripts/02-seed-data.sql
mysql -u root -p lnmiit_lab_management < scripts/03-archival-tables-mysql.sql
```

### 4. Create Environment File

Create `.env.local` in the root directory:

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

# Admin Configuration
ADMIN_EMAIL=admin@lnmiit.ac.in
ADMIN_PASSWORD=admin123
```

### 5. Start Development Server

```bash
pnpm run dev
```

## Troubleshooting

### Common Issues

**1. MySQL Connection Error**
```bash
# Check if MySQL is running
sudo service mysql start

# Or on macOS
brew services start mysql
```

**2. Permission Denied on Script**
```bash
chmod +x scripts/setup-db.sh
```

**3. Port 3000 Already in Use**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill
```

**4. pnpm Command Not Found**
```bash
# Install pnpm globally
npm install -g pnpm
```

### Database Issues

**Reset Database (if needed):**
```sql
DROP DATABASE IF EXISTS lnmiit_lab_management;
CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then re-run the SQL scripts.

## Next Steps

After successful setup:

1. **Change Admin Password** - Login and change the default password
2. **Configure Email** - Update SMTP settings in `.env.local` for notifications
3. **Add Users** - Create departments and user accounts
4. **Set Up Labs** - Configure laboratories and equipment
5. **Create Timetables** - Add regular class schedules

## Features Overview

- 🔐 **User Management** - Role-based access control
- 📅 **Lab Booking** - Real-time booking with approval workflow
- 🏢 **Department Management** - Organize users by departments
- 📊 **Analytics Dashboard** - Usage statistics and reports
- 🔧 **Equipment Management** - Track lab equipment and inventory
- 📧 **Email Notifications** - Automated booking notifications

## Default User Roles

- **Admin** - Full system access
- **HOD** - Department management, final booking approval
- **Faculty** - Lab booking approval for students
- **Lab Staff** - Lab and equipment management
- **TNP** - Training and placement activities
- **Student** - Lab booking requests

## Support

For issues or questions:
- 📖 Read the full [README.md](README.md)
- 🐛 [Create an issue](https://github.com/abhinavdogra21/lab-managment-system/issues)
- 📧 Contact support

---

**Ready to manage your labs efficiently! 🚀**
