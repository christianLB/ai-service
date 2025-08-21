#!/bin/bash
# Auto-run before marking any task complete
# This hook ensures code quality standards are met

set -e  # Exit on any error

echo "🔍 Running MANDATORY quality checks..."
echo "================================================"

# Backend checks
echo "📦 Backend TypeScript check..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Backend TypeScript check FAILED - FIX IMMEDIATELY"
    exit 1
fi

echo "🔍 Backend ESLint check..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Backend ESLint FAILED - FIX IMMEDIATELY"
    exit 1
fi

# Frontend checks
echo "📦 Frontend TypeScript check..."
cd frontend && npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Frontend TypeScript check FAILED - FIX IMMEDIATELY"
    exit 1
fi

echo "🔍 Frontend ESLint check..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Frontend ESLint FAILED - FIX IMMEDIATELY"
    exit 1
fi

cd ..

# Build check
echo "🏗️  Running build verification..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build FAILED - FIX IMMEDIATELY"
    exit 1
fi

echo "================================================"
echo "✅ ALL quality checks PASSED - Safe to mark complete"
echo "================================================"