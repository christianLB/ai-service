#!/bin/bash
# Build script to work around the '2' argument issue

echo "Building backend..."
/home/k2600x/dev/ai-service/node_modules/.bin/tsc

if [ $? -eq 0 ]; then
    echo "Backend build successful!"
else
    echo "Backend build failed!"
    exit 1
fi