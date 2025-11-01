#!/bin/bash

# Lab Management System - Database Setup Script
# This script sets up the exact database structure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║    Lab Management System - Database Setup Wizard          ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}This will set up your database with the exact same structure.${NC}"
echo -e "${CYAN}Press Enter to use default values shown in [brackets].${NC}"
echo ""

# Get MySQL credentials
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}MySQL Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}MySQL Host [localhost]:${NC}"
read -r input_host
DB_HOST="${input_host:-localhost}"

echo -e "${CYAN}MySQL Port [3306]:${NC}"
read -r input_port
DB_PORT="${input_port:-3306}"

echo -e "${CYAN}MySQL User [root]:${NC}"
read -r input_user
DB_USER="${input_user:-root}"

echo -e "${CYAN}MySQL Password:${NC}"
read -s DB_PASSWORD
echo ""

echo -e "${CYAN}Database Name [lnmiit_lab_management]:${NC}"
read -r input_dbname
DB_NAME="${input_dbname:-lnmiit_lab_management}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Configuration Summary${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Host:     ${DB_HOST}:${DB_PORT}"
echo -e "  User:     ${DB_USER}"
echo -e "  Database: ${DB_NAME}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Proceed with setup? (y/n) [y]:${NC}"
read -r confirm
confirm="${confirm:-y}"

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}✗ Setup cancelled${NC}"
    exit 1
fi

echo ""

# Test MySQL connection
echo -e "${BLUE}[1/4] Testing MySQL connection...${NC}"
if mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MySQL connection successful${NC}"
else
    echo -e "${RED}✗ Failed to connect to MySQL${NC}"
    echo -e "${YELLOW}Please check your credentials and try again${NC}"
    exit 1
fi

# Create database
echo -e "${BLUE}[2/4] Creating database '${DB_NAME}'...${NC}"
mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
fi

# Import schema
echo -e "${BLUE}[3/4] Importing database structure (35 tables)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < "${SCRIPT_DIR}/database-schema.sql" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database structure imported successfully${NC}"
else
    echo -e "${RED}✗ Failed to import database structure${NC}"
    exit 1
fi

# Create .env.local file
echo -e "${BLUE}[4/4] Creating .env.local configuration file...${NC}"
ENV_FILE="$(dirname "${SCRIPT_DIR}")/.env.local"

cat > "${ENV_FILE}" << EOF
# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Application URL
APP_URL=http://localhost:3000
USE_DB_AUTH=true

# Feature Flags
NEXT_PUBLIC_MULTI_STAFF_UI=false
NEXT_PUBLIC_FORGOT_REQUIRE_TYPE=true

# Email Configuration (Update these for email notifications)
TESTING_MODE=true
ADMIN_EMAIL=admin@example.com
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here
EOF

echo -e "${GREEN}✓ Created .env.local file${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Database Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Database '${DB_NAME}' is ready with 35 tables.${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Install dependencies: ${CYAN}pnpm install${NC}"
echo -e "  2. Update email settings in ${CYAN}.env.local${NC} (if needed)"
echo -e "  3. Start the application: ${CYAN}pnpm run dev${NC}"
echo -e "  4. Visit: ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Default Admin Login:${NC}"
echo -e "  Email:    ${CYAN}admin@lnmiit.ac.in${NC}"
echo -e "  Password: ${CYAN}admin123${NC}"
echo ""
echo -e "${GREEN}🎉 Happy lab management!${NC}"
echo ""
