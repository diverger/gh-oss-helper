#!/usr/bin/env pwsh
# Build script for GH OSS Helper
# This script builds the action and prepares it for GitHub Actions usage

$ErrorActionPreference = "Stop"

# Helper functions for colored output
function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Host "Building GH OSS Helper..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "action.yml")) {
    Print-Error "Not in the action root directory"
    Write-Host "Please run this script from the root of the action repository"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Print-Info "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Print-Error "Failed to install dependencies"
        exit 1
    }
} else {
    # Check if dependencies are up to date
    Print-Info "Checking if dependencies are up to date..."
    $packageJson = Get-Item "package.json"
    $packageLock = Get-Item "package-lock.json" -ErrorAction SilentlyContinue
    $nodeModulesLock = Get-Item "node_modules/.package-lock.json" -ErrorAction SilentlyContinue

    $needsUpdate = $false
    if ($packageLock -and $packageJson.LastWriteTime -gt $packageLock.LastWriteTime) {
        $needsUpdate = $true
    } elseif ($nodeModulesLock -and $packageJson.LastWriteTime -gt $nodeModulesLock.LastWriteTime) {
        $needsUpdate = $true
    }

    if ($needsUpdate) {
        Print-Warning "Package files appear out of sync"
        Print-Info "Updating dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Print-Error "Failed to update dependencies"
            exit 1
        }
    } else {
        Print-Success "Dependencies are up to date"
    }
}

# Run TypeScript check
Print-Info "Running TypeScript compilation check..."
npm run check
if ($LASTEXITCODE -ne 0) {
    Print-Error "TypeScript compilation check failed"
    exit 1
}
Print-Success "TypeScript compilation check passed"

# Build the action
Print-Info "Building action..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Print-Error "Build failed"
    exit 1
}
Print-Success "Build completed successfully"

# Verify build output
if (-not (Test-Path "dist/index.mjs")) {
    Print-Error "Build failed: dist/index.mjs not found"
    exit 1
}

Print-Success "Build successful!"
Write-Host ""

# Build statistics
Print-Info "Build Statistics:"
$distSize = (Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum).Sum
$distSizeMB = [math]::Round($distSize / 1MB, 2)
$fileCount = (Get-ChildItem -Path dist -Recurse -File | Measure-Object).Count
Write-Host "   Size: $distSizeMB MB"
Write-Host "   Files: $fileCount files"
Write-Host ""

Print-Info "Built Files:"
Get-ChildItem -Path dist | Format-Table Mode, LastWriteTime, Length, Name -AutoSize

Write-Host ""
Print-Success "Action is ready for use!"
Write-Host ""
Print-Info "Usage examples:"
Write-Host "1. Test locally with your workflows"
Write-Host "2. Commit and push to trigger auto-build"
Write-Host ""
Print-Info "Documentation: README.md"
