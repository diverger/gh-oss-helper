#!/bin/bash
# Build script for GH OSS Helper
# This script builds the action and prepares it for GitHub Actions usage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔧 Building GH OSS Helper..."
echo "============================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "action.yml" ]; then
    print_error "Not in the action root directory"
    echo "Please run this script from the root of the action repository"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
else
    # Quick check: compare package.json and package-lock.json modification times
    print_info "Checking if dependencies are up to date..."
    if [ "package.json" -nt "package-lock.json" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
        print_warning "Package files appear out of sync"
        print_info "Updating dependencies..."
        npm install
    else
        print_success "Dependencies are up to date"
    fi
fi

# Run TypeScript check
print_info "Running TypeScript compilation check..."
if npm run check; then
    print_success "TypeScript compilation check passed"
else
    print_error "TypeScript compilation check failed"
    exit 1
fi

# Build the action
print_info "Building action..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Verify build output
if [ ! -f "dist/index.js" ]; then
    print_error "Build failed: dist/index.js not found"
    exit 1
fi

print_success "Build successful!"
echo ""
print_info "📊 Build Statistics:"
echo "   Size: $(du -sh dist/ | cut -f1)"
echo "   Files: $(find dist/ -type f | wc -l) files"
echo ""
print_info "📋 Built Files:"
ls -la dist/

echo ""
print_success "🎯 Action is ready for use!"
echo ""
print_info "Usage examples:"
echo "1. Test locally with your workflows"
echo "2. Commit and push to trigger auto-build"
echo ""
print_info "📚 Documentation: README.md"
