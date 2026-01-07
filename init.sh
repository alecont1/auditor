#!/bin/bash

# AuditEng Development Environment Setup Script
# This script sets up and runs the development environment for AuditEng

set -e

echo "=========================================="
echo "  AuditEng Development Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
echo ""
print_status "Checking prerequisites..."

# Check for Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check for Bun
if command_exists bun; then
    BUN_VERSION=$(bun -v)
    print_success "Bun found: $BUN_VERSION"
else
    print_warning "Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    if command_exists bun; then
        print_success "Bun installed successfully"
    else
        print_error "Failed to install Bun. Please install manually: https://bun.sh"
        exit 1
    fi
fi

# Check for pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm -v)
    print_success "pnpm found: $PNPM_VERSION"
else
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    if command_exists pnpm; then
        print_success "pnpm installed successfully"
    else
        print_error "Failed to install pnpm. Please install manually: npm install -g pnpm"
        exit 1
    fi
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install dependencies
echo ""
print_status "Installing dependencies..."
pnpm install
print_success "Dependencies installed"

# Setup environment files if they don't exist
echo ""
print_status "Setting up environment files..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example - please update with your actual values"
    else
        cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/auditeng?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secret (generate a secure random string for production)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Anthropic API (for Claude AI)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"

# Cloudflare R2
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="auditeng-pdfs"
R2_PUBLIC_URL="https://your-bucket.r2.cloudflarestorage.com"

# Application URLs
API_URL="http://localhost:3001"
WEB_URL="http://localhost:3000"
EOF
        print_warning "Created .env with placeholder values - please update with your actual values"
    fi
else
    print_success ".env file already exists"
fi

# Setup database
echo ""
print_status "Setting up database..."

# Check if PostgreSQL is running (basic check)
if command_exists psql; then
    print_success "PostgreSQL client found"
else
    print_warning "PostgreSQL client not found. Make sure PostgreSQL is running."
fi

# Generate Prisma client and run migrations
if [ -d "apps/api/prisma" ]; then
    cd apps/api
    print_status "Generating Prisma client..."
    pnpm exec prisma generate 2>/dev/null || print_warning "Prisma generate failed - database might not be configured yet"

    print_status "Running database migrations..."
    pnpm exec prisma migrate dev 2>/dev/null || print_warning "Migrations failed - database might not be accessible yet"
    cd ../..
else
    print_warning "Prisma directory not found yet. Skipping database setup."
fi

# Print summary
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}Environment is ready!${NC}"
echo ""
echo "To start development servers:"
echo -e "  ${BLUE}pnpm dev${NC}        - Run both API (3001) and Web (3000)"
echo -e "  ${BLUE}pnpm dev:api${NC}    - Run API server only (port 3001)"
echo -e "  ${BLUE}pnpm dev:web${NC}    - Run Web server only (port 3000)"
echo ""
echo "Database commands:"
echo -e "  ${BLUE}pnpm db:generate${NC} - Generate Prisma Client"
echo -e "  ${BLUE}pnpm db:migrate${NC}  - Run database migrations"
echo -e "  ${BLUE}pnpm db:studio${NC}   - Open Prisma Studio"
echo ""
echo "Access the application:"
echo -e "  Web App:    ${BLUE}http://localhost:3000${NC}"
echo -e "  API:        ${BLUE}http://localhost:3001${NC}"
echo ""
echo "Before starting, ensure you have:"
echo "  1. Updated .env with your actual API keys"
echo "  2. PostgreSQL running with the configured database"
echo "  3. Redis running (optional, for caching)"
echo ""
echo "=========================================="
