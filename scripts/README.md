# Database Setup Scripts

This directory contains scripts to set up the Lab Management System database.

## 🎯 Quick Start

**Just run this one command:**

```bash
./scripts/setup-database.sh
```

This will create the complete database with all 35 tables.

## 📁 Files Explained

### Main Setup Script

- **`setup-database.sh`** - **USE THIS!** Interactive setup wizard
  - Prompts for MySQL credentials
  - Creates database with custom name
  - Imports complete database structure
  - Generates `.env.local` configuration file

### Database Schema

- **`database-schema.sql`** - Complete database structure (35 tables)
  - Auto-generated from production database
  - Contains table definitions only (no data)
  - This is what gets imported during setup

### Legacy Scripts (Reference Only)

These files are kept for reference but **NOT needed** for setup:

- `setup-db.sh` - Old setup script (use `setup-database.sh` instead)
- `verify-setup.sh` - Database verification script
- `01-create-tables-mysql.sql` - Individual table creation (legacy)
- `02-add-indexes-mysql.sql` - Index definitions (legacy)
- `02-seed-data.sql` - Initial seed data (legacy)
- `03-archival-tables-mysql.sql` - Archive tables (legacy)
- Other `.sql` files - Maintenance/migration scripts

## 🗃️ Database Structure

The setup creates **35 tables**:

### Core Tables
- `users` - All system users
- `departments` - Academic departments
- `labs` - Laboratory information
- `components` - Lab equipment/components

### Booking & Requests
- `lab_bookings` - Lab booking requests
- `booking_requests` - Detailed booking info
- `component_requests` - Equipment borrow requests
- `component_loans` - Active component loans

### Scheduling
- `timetable_entries` - Regular class schedules
- `timetable_templates` - Schedule templates
- `timetable_exceptions` - Schedule overrides
- `lab_timetables` - Lab-specific schedules

### Tracking
- `attendance` - Lab attendance records
- `marks` - Student marks/grades
- `notifications` - System notifications
- `system_logs` - Activity logs
- `approval_timeline` - Approval workflow tracking

### Archival (for historical data)
- `archived_users`
- `archived_lab_bookings`
- `archived_attendance`
- `archived_marks`
- `archived_item_issues`
- `archived_system_logs`

### Supporting Tables
- `lab_staff_assignments` - Staff-lab assignments
- `inventory` - Equipment inventory
- `item_issues` - Equipment issue tracking
- `password_resets` - Password reset tokens
- `year_config` - Academic year configuration
- And more...

## 🔧 Manual Database Import

If you prefer to import manually:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE lnmiit_lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p lnmiit_lab_management < scripts/database-schema.sql
```

## 🔄 Updating the Schema

If you make changes to the database structure:

```bash
# Export the updated schema
mysqldump -u root -p --no-data --skip-comments lnmiit_lab_management > scripts/database-schema.sql
```

This ensures everyone gets the same database structure when they clone the repo.

## 📋 Default Credentials

After setup, use these credentials to login:

- **Email:** admin@lnmiit.ac.in
- **Password:** admin123

**⚠️ Change the password immediately after first login!**

## 🆘 Troubleshooting

### "Permission denied" error
```bash
chmod +x scripts/setup-database.sh
```

### "MySQL command not found"
- Install MySQL: https://dev.mysql.com/downloads/mysql/
- Make sure MySQL is in your PATH

### "Access denied" error
- Check your MySQL username and password
- Make sure MySQL server is running

### Database already exists
The script will use the existing database. To start fresh:
```sql
DROP DATABASE lnmiit_lab_management;
```
Then run the setup script again.

## 📞 Need Help?

Check the main [SETUP.md](../SETUP.md) for detailed setup instructions.
