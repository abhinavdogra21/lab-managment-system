#!/bin/bash

# Lab Management System - Setup Verification Script
# This script verifies that the system is set up correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_nodejs() {
    print_header "Checking Node.js"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js version is compatible (>= 18.0.0)"
        else
            print_error "Node.js version is too old. Please upgrade to v18.0.0 or higher"
        fi
    else
        print_error "Node.js not found. Please install Node.js"
    fi
}

check_package_manager() {
    print_header "Checking Package Manager"
    
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm found: v$PNPM_VERSION"
    elif command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_warning "npm found: v$NPM_VERSION (pnpm recommended)"
    else
        print_error "No package manager found. Please install npm or pnpm"
    fi
}

check_mysql() {
    print_header "Checking MySQL"
    
    if command -v mysql &> /dev/null; then
        MYSQL_VERSION=$(mysql --version | awk '{print $3}' | sed 's/,//')
        print_success "MySQL client found: $MYSQL_VERSION"
        
        # Try to connect to MySQL
        if [ -f .env.local ]; then
            DB_PASSWORD=$(grep "DB_PASSWORD=" .env.local | cut -d'=' -f2)
            DB_USER=$(grep "DB_USER=" .env.local | cut -d'=' -f2)
            DB_HOST=$(grep "DB_HOST=" .env.local | cut -d'=' -f2)
            DB_NAME=$(grep "DB_NAME=" .env.local | cut -d'=' -f2)
            
            if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" &>/dev/null; then
                print_success "Database connection successful"
                
                # Check if tables exist
                TABLE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" | wc -l)
                if [ "$TABLE_COUNT" -gt 5 ]; then
                    print_success "Database tables found ($((TABLE_COUNT-1)) tables)"
                else
                    print_warning "Database tables might be missing. Run setup script."
                fi
            else
                print_error "Cannot connect to database. Check credentials in .env.local"
            fi
        else
            print_warning ".env.local file not found. Run setup script first."
        fi
    else
        print_error "MySQL client not found. Please install MySQL"
    fi
}

check_env_file() {
    print_header "Checking Environment Configuration"
    
    if [ -f .env.local ]; then
        print_success ".env.local file found"
        
        # Check required variables
        required_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "JWT_SECRET")
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env.local; then
                print_success "$var is configured"
            else
                print_error "$var is missing from .env.local"
            fi
        done
    else
        print_error ".env.local file not found. Run setup script first."
    fi
}

check_dependencies() {
    print_header "Checking Node.js Dependencies"
    
    if [ -f package.json ]; then
        print_success "package.json found"
        
        if [ -d node_modules ]; then
            print_success "node_modules directory exists"
            
            # Check for key dependencies
            key_deps=("next" "react" "mysql2" "@radix-ui/react-dialog")
            
            for dep in "${key_deps[@]}"; do
                if [ -d "node_modules/$dep" ]; then
                    print_success "$dep is installed"
                else
                    print_warning "$dep might not be installed"
                fi
            done
        else
            print_error "node_modules not found. Run 'pnpm install'"
        fi
    else
        print_error "package.json not found. Are you in the right directory?"
    fi
}

check_build() {
    print_header "Checking Build Configuration"
    
    if [ -f next.config.mjs ]; then
        print_success "Next.js configuration found"
    else
        print_warning "next.config.mjs not found"
    fi
    
    if [ -f tsconfig.json ]; then
        print_success "TypeScript configuration found"
    else
        print_warning "tsconfig.json not found"
    fi
    
    if [ -f tailwind.config.ts ]; then
        print_success "Tailwind CSS configuration found"
    else
        print_warning "tailwind.config.ts not found"
    fi
}

main() {
    echo -e "${BLUE}"
    echo "🔍 Lab Management System - Setup Verification"
    echo "============================================="
    echo -e "${NC}"
    
    check_nodejs
    echo
    check_package_manager
    echo
    check_mysql
    echo
    check_env_file
    echo
    check_dependencies
    echo
    check_build
    echo
    
    print_header "Verification Complete"
    echo
    echo "If all checks passed, you can start the development server with:"
    echo -e "${GREEN}pnpm run dev${NC}"
    echo
    echo "If there are issues, run the setup script:"
    echo -e "${YELLOW}./scripts/setup-db.sh${NC}"
    echo
}

main
