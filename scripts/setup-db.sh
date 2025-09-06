#!/bin/bash

# Lab Management System - Database Setup Script
# This script automatically sets up the MySQL database for the lab management system

set -e  # Exit on any error

echo "🚀 Lab Management System - Database Setup"
echo "=========================================="

# Default values
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_NAME="lnmiit_lab_management"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if MySQL is running
check_mysql() {
    print_status "Checking MySQL connection..."
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client not found. Please install MySQL."
        exit 1
    fi
    
    if ! mysqladmin ping -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p --silent 2>/dev/null; then
        print_error "Cannot connect to MySQL server. Please check your MySQL installation and credentials."
        exit 1
    fi
    
    print_status "MySQL connection successful!"
}

# Function to get MySQL password
get_mysql_password() {
    echo
    read -s -p "Enter MySQL root password: " DB_PASSWORD
    echo
    
    # Test the password
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &>/dev/null; then
        print_error "Invalid MySQL password. Please try again."
        exit 1
    fi
}

# Function to create database
create_database() {
    print_status "Creating database '$DB_NAME'..."
    
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        CREATE DATABASE IF NOT EXISTS $DB_NAME 
        CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci;
    " 2>/dev/null
    
    print_status "Database '$DB_NAME' created successfully!"
}

# Function to run SQL scripts
run_sql_script() {
    local script_file=$1
    local description=$2
    
    if [ ! -f "$script_file" ]; then
        print_warning "Script file '$script_file' not found. Skipping $description."
        return
    fi
    
    print_status "Running $description..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$script_file"
    print_status "$description completed!"
}

# Function to create .env.local file
create_env_file() {
    print_status "Creating .env.local file..."
    
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    cat > .env.local << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email Configuration (Optional - for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_app_password
# FROM_EMAIL=noreply@yourdomain.com
# FROM_NAME="Lab Management System"

# Admin Configuration
ADMIN_EMAIL=admin@lnmiit.ac.in
ADMIN_PASSWORD=admin123
EOF
    
    print_status ".env.local file created successfully!"
    print_warning "Please update email configuration in .env.local if you want to enable email notifications."
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        print_error "Neither pnpm nor npm found. Please install Node.js and npm/pnpm."
        exit 1
    fi
    
    print_status "Dependencies installed successfully!"
}

# Main setup function
main() {
    echo
    print_status "Starting Lab Management System setup..."
    echo
    
    # Check prerequisites
    check_mysql
    
    # Get MySQL password
    get_mysql_password
    
    # Create database
    create_database
    
    # Run SQL scripts in order
    run_sql_script "scripts/01-create-tables-mysql.sql" "table creation"
    run_sql_script "scripts/02-add-indexes-mysql.sql" "index creation"
    run_sql_script "scripts/02-seed-data.sql" "seed data insertion"
    run_sql_script "scripts/03-archival-tables-mysql.sql" "archival table creation"
    
    # Create environment file
    create_env_file
    
    # Install dependencies
    install_dependencies
    
    echo
    echo "✅ Setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "1. Start the development server: pnpm run dev"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Login with admin credentials:"
    echo "   Email: admin@lnmiit.ac.in"
    echo "   Password: admin123"
    echo
    print_warning "Don't forget to change the default admin password after first login!"
    echo
}

# Help function
show_help() {
    echo "Lab Management System - Database Setup Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -u, --user     MySQL username (default: root)"
    echo "  -H, --host     MySQL host (default: localhost)"
    echo "  -P, --port     MySQL port (default: 3306)"
    echo "  -d, --database Database name (default: lnmiit_lab_management)"
    echo
    echo "Examples:"
    echo "  $0                                    # Use default settings"
    echo "  $0 -u myuser -H 192.168.1.100       # Custom user and host"
    echo "  $0 -d my_lab_db                     # Custom database name"
    echo
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -H|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -P|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main setup
main
