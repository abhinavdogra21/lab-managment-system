# 🚀 Quick Start Guide

Get the Lab Management System running in 3 simple steps!

## Prerequisites
- MySQL 8.0+ installed and running
- Node.js 18+ installed
- Git installed

## Setup Steps

### 1. Clone & Navigate
```bash
git clone https://github.com/abhinavdogra21/lab-managment-system.git
cd lab-managment-system
```

### 2. Setup Database
```bash
./scripts/setup-database.sh
```
Enter your MySQL credentials when prompted. The script will create the exact database structure with 35 tables.

### 3. Install & Run
```bash
pnpm install
pnpm run dev
```

### 4. Access Application
Open **http://localhost:3000**

**Login with:**
- Email: `admin@lnmiit.ac.in`
- Password: `admin123`

---

## What Gets Created?

✅ Database: `lnmiit_lab_management` (or your custom name)  
✅ 35 Tables: Users, Labs, Bookings, Components, Timetables, etc.  
✅ Configuration: `.env.local` file with your settings

## Files You'll Have

```
lab-managment-system/
├── .env.local          # Your database credentials
├── scripts/
│   ├── setup-database.sh       # Setup wizard (USE THIS)
│   └── database-schema.sql     # Database structure
└── ... (rest of the project)
```

## Need More Help?

- 📖 **Detailed Setup:** See [SETUP.md](SETUP.md)
- 🛠️ **Troubleshooting:** See [SETUP.md - Troubleshooting](SETUP.md#troubleshooting)
- 📁 **Database Scripts:** See [scripts/README.md](scripts/README.md)
- 📋 **Full Documentation:** See [README.md](README.md)

## Common Issues

**Can't run the script?**
```bash
chmod +x scripts/setup-database.sh
```

**MySQL not found?**
- Make sure MySQL is installed
- Check if MySQL server is running: `mysql.server start` (Mac) or `sudo systemctl start mysql` (Linux)

**Port 3000 already in use?**
```bash
lsof -ti:3000 | xargs kill -9
```

---

**That's it! You're ready to manage labs! 🎉**
