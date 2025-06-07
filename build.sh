#!/bin/bash
# Build script for GH OSS Helper
# This script builds the action and prepares it for GitHub Actions usage

set -e

echo "🔧 Building GH OSS Helper..."
echo "============================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "action.yml" ]; then
    echo "❌ Error: Not in the action root directory"
    echo "Please run this script from the root of the action repository"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run TypeScript check
echo "🔍 Running TypeScript compilation check..."
npm run check

# Build the action
echo "🔨 Building action..."
npm run build

# Verify build output
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "📊 Build Statistics:"
echo "   Size: $(du -sh dist/ | cut -f1)"
echo "   Files: $(find dist/ -type f | wc -l) files"
echo ""
echo "📋 Built Files:"
ls -la dist/

echo ""
echo "🎯 Action is ready for use!"
echo ""
echo "Usage examples:"
echo "1. Test locally with your workflows"
echo "2. Commit and push to trigger auto-build"
echo ""
echo "📚 Documentation: README.md"
