#!/bin/bash

# AI Service CLI Installation Script

set -e

echo "🚀 Installing AI Service CLI..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from cli/ directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the CLI
echo "🔨 Building CLI..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Check if globally installed
if command -v ai &> /dev/null; then
    echo "✅ CLI already globally available as 'ai'"
else
    echo "📋 To make CLI globally available, run:"
    echo "   npm link"
    echo ""
    echo "Or run directly with:"
    echo "   node dist/index.js --help"
fi

echo ""
echo "🎉 AI Service CLI installation complete!"
echo ""
echo "Quick start:"
echo "  ai --help                 # Show help"
echo "  ai auth login             # Authenticate"
echo "  ai db status              # Check database"
echo "  ai t unit                 # Run tests"
echo ""