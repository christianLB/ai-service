#!/bin/bash

# Build script with version info
BUILD_TIME=$(date -Iseconds)
BUILD_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
NODE_ENV=${NODE_ENV:-production}

echo "Building frontend..."
echo "  Time: $BUILD_TIME"
echo "  Version: $BUILD_VERSION"
echo "  Environment: $NODE_ENV"

# Build with environment variables
VITE_BUILD_TIME="$BUILD_TIME" \
VITE_BUILD_VERSION="$BUILD_VERSION" \
NODE_ENV="$NODE_ENV" \
npx vite build

echo "✅ Build complete!"