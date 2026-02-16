#!/usr/bin/env pwsh
# Local test script for GH OSS Helper
# This script runs tests that can be executed locally without OSS credentials

# Try to enable UTF-8 support for modern terminals
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    # For Windows, try to set console to UTF-8 code page
    if ($IsWindows -or $env:OS -match "Windows") {
        chcp 65001 | Out-Null
    }
} catch {
    # Silently continue if encoding setup fails
    Write-Verbose "UTF-8 encoding setup failed: $_" -Verbose:$false
}

$ErrorActionPreference = "Stop"

# Detect if terminal supports Unicode (Windows Terminal, VS Code, etc.)
$supportsUnicode = $env:WT_SESSION -or $env:TERM_PROGRAM -eq "vscode" -or $PSVersionTable.PSVersion.Major -ge 7

# Helper functions for colored output
function Write-Info {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "ℹ️" } else { "[i]" }
    Write-Host "$icon  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "✅" } else { "[OK]" }
    Write-Host "$icon $Message" -ForegroundColor Green
}

function Write-WarnMessage {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "⚠️" } else { "[!]" }
    Write-Host "$icon  $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "❌" } else { "[X]" }
    Write-Host "$icon $Message" -ForegroundColor Red
}

# Function to run unit tests
function Test-Unit {
    Write-Info "Running unit tests..."
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Unit tests failed"
        exit 1
    }
    Write-Success "Unit tests completed"
}

# Function to test build
function Test-Build {
    Write-Info "Testing build process..."
    .\build.ps1
    Write-Success "Build test completed"
}

# Function to test TypeScript compilation
function Test-TypeScript {
    Write-Info "Testing TypeScript compilation..."
    npm run check
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "TypeScript check failed"
        exit 1
    }
    Write-Success "TypeScript check passed"
}

# Function to test linting
function Test-Linting {
    Write-Info "Running ESLint..."
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Linting failed"
        exit 1
    }
    Write-Success "Linting passed"
}

# Function to test coverage
function Test-Coverage {
    Write-Info "Running tests with coverage..."
    npm run test:coverage

    if (Test-Path "coverage") {
        Write-Success "Coverage report generated in coverage/ directory"

        $coverageFile = "coverage\index.html"
        if (Test-Path $coverageFile) {
            Write-Info "Opening coverage report in browser..."
            Start-Process $coverageFile
        }
    } else {
        Write-WarnMessage "Coverage directory not found"
    }
}

# Main test function
function Invoke-AllTests {
    Write-Host ""
    $title = if ($supportsUnicode) { "🧪 Running local development tests for GH OSS Helper" } else { "Running local development tests for GH OSS Helper" }
    Write-Info $title
    Write-Host "================================================="
    Write-Host ""

    # Check if we're in the right directory
    if (-not (Test-Path "package.json") -or -not (Test-Path "action.yml")) {
        Write-ErrorMessage "Please run this script from the root of the gh-oss-helper repository!"
        exit 1
    }

    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install
    } else {
        # Check if package-lock.json is in sync with package.json
        Write-Info "Checking if dependencies are up to date..."
        try {
            $null = npm ci --dry-run 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-WarnMessage "Lock file is out of sync with package.json"
                Write-Info "Updating dependencies..."
                npm install
            }
        } catch {
            Write-Info "Updating dependencies..."
            npm install
        }
    }

    # Run TypeScript check
    Test-TypeScript
    Write-Host ""

    # Run linting
    Test-Linting
    Write-Host ""

    # Run unit tests
    Test-Unit
    Write-Host ""

    # Test build
    Test-Build
    Write-Host ""

    $successMsg = if ($supportsUnicode) { "🎉 All local development tests completed!" } else { "All local development tests completed!" }
    Write-Success $successMsg
    Write-Host ""

    $summaryLabel = if ($supportsUnicode) { "📋 Summary:" } else { "Summary:" }
    Write-Info $summaryLabel
    $check = if ($supportsUnicode) { "✅" } else { "[OK]" }
    Write-Host "$check TypeScript compilation check"
    Write-Host "$check ESLint code quality check"
    Write-Host "$check Unit tests with mocked dependencies"
    Write-Host "$check Build process verification"
    Write-Host ""

    $nextLabel = if ($supportsUnicode) { "🚀 Next steps:" } else { "Next steps:" }
    Write-Info $nextLabel
    Write-Host "1. Push to GitHub to run CI/CD workflows with full integration tests"
    Write-Host "2. Use GitHub Actions secrets to test with real OSS credentials"
    Write-Host "3. Run '.\prepare-release.ps1' when ready to create a release"
    Write-Host ""
}

# Show help message
function Show-Help {
    Write-Host "Usage: .\test-local.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  all        Run all local tests (default)"
    Write-Host "  unit       Run unit tests only"
    Write-Host "  build      Test build process only"
    Write-Host "  ts         Run TypeScript check only"
    Write-Host "  lint       Run linting only"
    Write-Host "  coverage   Run tests with coverage report"
    Write-Host "  help       Show this help message"
    Write-Host ""
    Write-Host "Note: OSS upload testing requires real credentials and"
    Write-Host "should be done via GitHub Actions workflows."
    Write-Host ""
}

# Parse command line arguments
$command = if ($args.Count -gt 0) { $args[0] } else { "all" }

switch ($command.ToLower()) {
    "unit" {
        Test-Unit
    }
    "build" {
        Test-Build
    }
    { $_ -in "typescript", "ts" } {
        Test-TypeScript
    }
    "lint" {
        Test-Linting
    }
    "coverage" {
        Test-Coverage
    }
    { $_ -in "all", "" } {
        Invoke-AllTests
    }
    { $_ -in "help", "-h", "--help" } {
        Show-Help
    }
    default {
        Write-ErrorMessage "Unknown command: $command"
        Write-Host "Run '.\test-local.ps1 help' for usage information"
        exit 1
    }
}
