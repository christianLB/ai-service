#!/bin/bash

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Not in project root directory"
    exit 1
fi

echo "=== Checking TypeScript Build ==="
echo "Running backend TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ Backend TypeScript check passed"
else
    echo "❌ Backend TypeScript check failed"
    exit 1
fi

echo ""
echo "=== Checking Frontend Build ==="
cd frontend
echo "Running frontend TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ Frontend TypeScript check passed"
else
    echo "❌ Frontend TypeScript check failed"
    exit 1
fi

echo ""
echo "✅ All checks passed!"