#!/usr/bin/env pwsh
# Release Management Script for GH OSS Helper
# This script helps manage release notes to prevent them from growing too long

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

# Function to archive current release notes
function Archive-ReleaseNotes {
    param([string]$Version)

    Write-Info "Archiving release notes for version $Version..."

    # Check if RELEASE_NOTES.md exists
    if (-not (Test-Path "RELEASE_NOTES.md")) {
        Write-ErrorMessage "RELEASE_NOTES.md not found!"
        exit 1
    }

    # Create backup
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item "RELEASE_NOTES.md" "RELEASE_NOTES_backup_$timestamp.md"
    Write-Success "Created backup of current release notes"

    # Extract current release notes (everything before the second release header)
    $lines = Get-Content "RELEASE_NOTES.md"
    $releaseCount = 0
    $currentReleaseLines = @()

    foreach ($line in $lines) {
        if ($line -match "^## .*GH OSS Helper Release") {
            $releaseCount++
            if ($releaseCount -gt 1) {
                break
            }
        }
        $currentReleaseLines += $line
    }

    # Append to archive (prepend to keep newest first)
    if (Test-Path "RELEASE_NOTES_ARCHIVE.md") {
        # Get the header from archive
        $archiveLines = Get-Content "RELEASE_NOTES_ARCHIVE.md"
        $newArchive = $archiveLines[0..2]
        $newArchive += ""
        $newArchive += "---"
        $newArchive += ""

        # Add current release (skip the main header)
        $newArchive += $currentReleaseLines[2..($currentReleaseLines.Length - 1)]
        $newArchive += ""

        # Add rest of archive (skip header)
        $newArchive += $archiveLines[4..($archiveLines.Length - 1)]

        $newArchive | Set-Content "RELEASE_NOTES_ARCHIVE.md" -Encoding UTF8
    } else {
        # Create new archive file
        $newArchive = @(
            "# Release Notes Archive"
            ""
            "This file contains archived release notes for older versions of GH OSS Helper."
            ""
            "---"
            ""
        )
        $newArchive += $currentReleaseLines[2..($currentReleaseLines.Length - 1)]
        $newArchive | Set-Content "RELEASE_NOTES_ARCHIVE.md" -Encoding UTF8
    }

    Write-Success "Archived release notes for $Version"
}

# Function to prepare new release notes
function Prepare-NewRelease {
    param([string]$NewVersion)

    Write-Info "Preparing release notes for version $NewVersion..."

    # Copy template to RELEASE_NOTES.md
    if (Test-Path "RELEASE_NOTES_TEMPLATE.md") {
        $content = Get-Content "RELEASE_NOTES_TEMPLATE.md" -Raw

        # Replace version placeholders (strip 'v' prefix to avoid double 'v')
        $versionNumber = $NewVersion -replace '^v', ''
        $content = $content -replace '\[VERSION\]', "v$versionNumber"

        # Find and replace previous version placeholder
        try {
            $tags = git tag --sort=-version:refname 2>$null
            $previousVersion = $tags | Where-Object { $_ -ne $NewVersion } | Select-Object -First 1
            if ($previousVersion) {
                $content = $content -replace '\[PREVIOUS\]', $previousVersion
                Write-Info "Set previous version to: $previousVersion"
            } else {
                Write-WarnMessage "No previous version found, keeping [PREVIOUS] placeholder"
            }
        } catch {
            Write-WarnMessage "Could not retrieve git tags, keeping [PREVIOUS] placeholder"
        }

        $content | Set-Content "RELEASE_NOTES.md" -Encoding UTF8 -NoNewline

        Write-Success "Created new release notes template for $NewVersion"
        Write-Info "Please edit RELEASE_NOTES.md to add your release information"
    } else {
        Write-ErrorMessage "RELEASE_NOTES_TEMPLATE.md not found!"
        exit 1
    }
}

# Function to update package.json version
function Update-PackageVersion {
    param([string]$NewVersion)

    Write-Info "Updating package.json version to $NewVersion..."

    if (Test-Path "package.json") {
        # Remove 'v' prefix if present
        $versionNumber = $NewVersion -replace '^v', ''

        # Read package.json
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

        # Update version
        $packageJson.version = $versionNumber

        # Write back to file with proper formatting
        $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json" -Encoding UTF8

        Write-Success "Updated package.json version to $versionNumber"
    } else {
        Write-ErrorMessage "package.json not found!"
        exit 1
    }
}

# Main function
function Main {
    Write-Host ""
    Write-Info "GH OSS Helper Release Management"
    Write-Host "=================================="
    Write-Host ""

    # Check if we're in the right directory
    if (-not (Test-Path "action.yml") -or -not (Test-Path "package.json")) {
        Write-ErrorMessage "This script must be run from the root of the gh-oss-helper repository!"
        exit 1
    }

    # Get current version from package.json
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $currentVersion = $packageJson.version
    Write-Info "Current version: v$currentVersion"

    # Ask for new version
    Write-Host ""
    $newVersion = Read-Host "Enter new version (e.g., 1.2.0)"

    # Add 'v' prefix if not present
    if (-not $newVersion.StartsWith("v")) {
        $newVersion = "v$newVersion"
    }

    Write-Info "New version will be: $newVersion"
    Write-Host ""

    # Confirm
    $confirm = Read-Host "Continue with release preparation? (y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-WarnMessage "Release preparation cancelled"
        exit 0
    }

    Write-Host ""

    # Archive current release notes
    Archive-ReleaseNotes "v$currentVersion"

    # Update package.json
    Update-PackageVersion $newVersion

    # Prepare new release notes
    Prepare-NewRelease $newVersion

    Write-Host ""
    Write-Success "Release preparation complete!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "1. Edit RELEASE_NOTES.md with your release information"
    Write-Host "2. Build the project: npm run build"
    Write-Host "3. Commit changes: git add . && git commit -m 'Prepare release $newVersion'"
    Write-Host "4. Create and push tag: git tag $newVersion && git push origin $newVersion"
    Write-Host "5. Create GitHub release using the content from RELEASE_NOTES.md"
    Write-Host ""
}

# Run main function
Main
