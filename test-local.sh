#!/bin/bash
# Local test script for GH OSS Helper
# This script runs tests that can be executed locally without OSS credentials

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

# Function to run unit tests
run_unit_tests() {
    print_info "Running unit tests..."
    npm test
    print_success "Unit tests completed"
}

# Function to test build
test_build() {
    print_info "Testing build process..."
    ./build.sh
    print_success "Build test completed"
}

# Function to test TypeScript compilation
test_typescript() {
    print_info "Testing TypeScript compilation..."
    npm run check
    print_success "TypeScript check passed"
}

# Function to test linting
test_linting() {
    print_info "Running ESLint..."
    npm run lint
    print_success "Linting passed"
}

# Function to test coverage
test_coverage() {
    print_info "Running tests with coverage..."
    npm run test:coverage

    if [ -d "coverage" ]; then
        print_success "Coverage report generated in coverage/ directory"
        if command -v open >/dev/null 2>&1; then
            print_info "Opening coverage report in browser..."
            open coverage/index.html
        elif command -v xdg-open >/dev/null 2>&1; then
            print_info "Opening coverage report in browser..."
            xdg-open coverage/index.html
        else
            print_info "Coverage report available at: coverage/index.html"
        fi
    else
        print_warning "Coverage directory not found"
    fi
}

# Main test function
run_all_tests() {
    echo ""
    print_info "🧪 Running local development tests for GH OSS Helper"
    echo "================================================="
    echo ""

    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "action.yml" ]; then
        print_error "Please run this script from the root of the gh-oss-helper repository!"
        exit 1
    fi

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi

    # Run TypeScript check
    test_typescript
    echo ""

    # Run linting
    test_linting
    echo ""

    # Run unit tests
    run_unit_tests
    echo ""

    # Test build
    test_build
    echo ""

    print_success "🎉 All local development tests completed!"
    echo ""
    print_info "📋 Summary:"
    echo "✅ TypeScript compilation check"
    echo "✅ ESLint code quality check"
    echo "✅ Unit tests with mocked dependencies"
    echo "✅ Build process verification"
    echo ""
    print_info "🚀 Next steps:"
    echo "1. Push to GitHub to run CI/CD workflows with full integration tests"
    echo "2. Use GitHub Actions secrets to test with real OSS credentials"
    echo "3. Run './prepare-release.sh' when ready to create a release"
    echo ""
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        run_unit_tests
        ;;
    "build")
        test_build
        ;;
    "typescript"|"ts")
        test_typescript
        ;;
    "lint")
        test_linting
        ;;
    "coverage")
        test_coverage
        ;;
    "all"|"")
        run_all_tests
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  all        Run all local tests (default)"
        echo "  unit       Run unit tests only"
        echo "  build      Test build process only"
        echo "  ts         Run TypeScript check only"
        echo "  lint       Run linting only"
        echo "  coverage   Run tests with coverage report"
        echo "  help       Show this help message"
        echo ""
        echo "Note: OSS upload testing requires real credentials and"
        echo "should be done via GitHub Actions workflows."
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
