#!/usr/bin/env pwsh
# Build script for GH OSS Helper
# This script builds the action and prepares it for GitHub Actions usage

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

function Write-Warning {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "⚠️" } else { "[!]" }
    Write-Host "$icon  $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    $icon = if ($supportsUnicode) { "❌" } else { "[X]" }
    Write-Host "$icon $Message" -ForegroundColor Red
}

$title = if ($supportsUnicode) { "🔧 Building GH OSS Helper..." } else { "Building GH OSS Helper..." }
Write-Host $title -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "action.yml")) {
    Write-ErrorMessage "Not in the action root directory"
    Write-Host "Please run this script from the root of the action repository"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install
} else {
    # Check if dependencies are up to date
    Write-Info "Checking if dependencies are up to date..."
    $packageJson = Get-Item "package.json"
    $packageLock = Get-Item "package-lock.json" -ErrorAction SilentlyContinue
    $nodeModulesLock = Get-Item "node_modules/.package-lock.json" -ErrorAction SilentlyContinue

    $needsUpdate = $false
    if ($packageLock -and $packageJson.LastWriteTime -gt $packageLock.LastWriteTime) {
        $needsUpdate = $true
    }
    if ($nodeModulesLock -and $packageJson.LastWriteTime -gt $nodeModulesLock.LastWriteTime) {
        $needsUpdate = $true
    }

    if ($needsUpdate) {
        Write-Warning "Package files appear out of sync"
        Write-Info "Updating dependencies..."
        npm install
    } else {
        Write-Success "Dependencies are up to date"
    }
}

# Run TypeScript check
Write-Info "Running TypeScript compilation check..."
try {
    npx tsc --noEmit
    Write-Success "TypeScript compilation check passed"
} catch {
    Write-ErrorMessage "TypeScript compilation check failed"
    exit 1
}

# Build the action
Write-Info "Building action..."
try {
    npm run build
    Write-Success "Build completed successfully"
} catch {
    Write-ErrorMessage "Build failed"
    exit 1
}

# Verify build output
if (-not (Test-Path "dist/index.mjs")) {
    Write-ErrorMessage "Build failed: dist/index.mjs not found"
    exit 1
}

Write-Success "Build successful!"
Write-Host ""

# Build Statistics
$statsLabel = if ($supportsUnicode) { "📊 Build Statistics:" } else { "Build Statistics:" }
Write-Info $statsLabel
$distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
$distSizeFormatted = if ($distSize -lt 1MB) {
    "{0:N2} KB" -f ($distSize / 1KB)
} elseif ($distSize -lt 1GB) {
    "{0:N2} MB" -f ($distSize / 1MB)
} else {
    "{0:N2} GB" -f ($distSize / 1GB)
}
$fileCount = (Get-ChildItem -Path "dist" -File -Recurse).Count
Write-Host "   Size: $distSizeFormatted"
Write-Host "   Files: $fileCount files"
Write-Host ""

# List built files
$filesLabel = if ($supportsUnicode) { "📋 Built Files:" } else { "Built Files:" }
Write-Info $filesLabel
Get-ChildItem -Path "dist" | Format-Table -Property Mode, LastWriteTime, Length, Name -AutoSize

Write-Host ""
$readyMsg = if ($supportsUnicode) { "🎯 Action is ready for use!" } else { "Action is ready for use!" }
Write-Success $readyMsg
Write-Host ""
Write-Info "Usage examples:"
Write-Host "1. Test locally with your workflows"
Write-Host "2. Commit and push to trigger auto-build"
Write-Host ""
$docsLabel = if ($supportsUnicode) { "📚 Documentation: README.md" } else { "Documentation: README.md" }
Write-Info $docsLabel
