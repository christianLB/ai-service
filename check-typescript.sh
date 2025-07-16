#!/bin/bash

echo "Checking TypeScript compilation..."

# Remove test file if it exists
rm -f frontend/src/test-compilation.tsx

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run TypeScript compiler
echo "Running TypeScript compiler..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    exit 0
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi