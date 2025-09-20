#!/bin/bash

# Deploy SDK files to CDN (Cloudflare R2)
# This script uploads the built SDK files to R2 bucket for CDN distribution

set -e

echo "🚀 Deploying Mail818 SDK to CDN..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Build the SDK and loader
echo "📦 Building SDK and loader..."
yarn build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ dist directory not found. Please run 'yarn build' first."
    exit 1
fi

# Check if collect.js was built
if [ ! -f "dist/cdn/collect.js" ]; then
    echo "❌ collect.js not found. Build may have failed."
    exit 1
fi

# Deploy to R2 bucket
# Note: You'll need to create an R2 bucket named 'mail818-cdn' first
echo "📤 Uploading to R2..."

# Upload versioned files
VERSION=$(node -p "require('./package.json').version")
echo "Version: $VERSION"

# Create version directory structure
mkdir -p dist/upload/$VERSION
mkdir -p dist/upload/latest

# Copy files to version directory
cp dist/mail818.min.js dist/upload/$VERSION/
cp dist/mail818.min.css dist/upload/$VERSION/
cp dist/cdn/collect.js dist/upload/

# Copy files to latest directory
cp dist/mail818.min.js dist/upload/latest/
cp dist/mail818.min.css dist/upload/latest/
cp dist/cdn/collect.js dist/upload/latest/

# Upload to R2 using wrangler
# The bucket should be configured with public access
wrangler r2 object put mail818-cdn/$VERSION/mail818.min.js --file dist/mail818.min.js --content-type application/javascript
wrangler r2 object put mail818-cdn/$VERSION/mail818.min.css --file dist/mail818.min.css --content-type text/css
wrangler r2 object put mail818-cdn/collect.js --file dist/cdn/collect.js --content-type application/javascript

# Upload latest versions
wrangler r2 object put mail818-cdn/latest/mail818.min.js --file dist/mail818.min.js --content-type application/javascript
wrangler r2 object put mail818-cdn/latest/mail818.min.css --file dist/mail818.min.css --content-type text/css

echo "✅ SDK deployed to CDN successfully!"
echo ""
echo "📋 CDN URLs:"
echo "  Loader: https://cdn.mail818.com/collect.js"
echo "  SDK JS: https://cdn.mail818.com/latest/mail818.min.js"
echo "  SDK CSS: https://cdn.mail818.com/latest/mail818.min.css"
echo ""
echo "  Versioned:"
echo "  SDK JS: https://cdn.mail818.com/$VERSION/mail818.min.js"
echo "  SDK CSS: https://cdn.mail818.com/$VERSION/mail818.min.css"