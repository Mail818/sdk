# Local SDK Testing Guide

This guide explains how to test the Mail818 SDK locally during development.

## Quick Start

### 1. Start the API Server (in a separate terminal)
```bash
cd ../api
yarn dev
```

The API will run at `http://localhost:8787`

### 2. Build and Serve the SDK
```bash
# In the SDK directory
yarn build          # Build the SDK
yarn serve          # Start local test server

# Or combined:
yarn dev:full       # Build and serve
```

The test server will run at `http://localhost:8080`

### 3. Open Test Page
Open your browser to: http://localhost:8080/test.html

## What the Test Page Does

The test page (`test.html`) includes:
- **Live console output** - Shows all console logs on the page
- **SDK status display** - Shows loading/ready/error states
- **Event monitoring** - Captures Mail818 events
- **Test form** - A form that should be enhanced by the SDK
- **Debug controls** - Buttons to check SDK status and reload
- **Dynamic Source Testing** - Input field to test different source ULIDs:
  - Enter any 26-character ULID to test the SDK with different sources
  - Click "Update Source & Reload SDK" to reload with new ULID
  - Click "Generate Test ULID" to create a valid test ULID
  - Your chosen ULID is saved in localStorage for persistence

## Local Development Features

The SDK automatically detects local development and:
- Uses `http://localhost:8787` for API calls instead of `https://api.mail818.com`
- Loads SDK files from local `/dist/` directory instead of CDN
- Shows detailed console logging

## Debugging Tips

### Check Browser Console
Open DevTools (F12) and check:
1. Network tab - Are files loading correctly?
2. Console tab - Any JavaScript errors?
3. Application tab - Check local storage/cookies

### Common Issues

**CORS Errors:**
- Make sure the API is running locally (`yarn dev` in api directory)
- The API should be on port 8787

**404 Errors:**
- Make sure you've built the SDK first (`yarn build`)
- Check that files exist in `dist/` directory

**Configuration Errors:**
- Check that your organization key (`01K50DMCRR9R1RDKWA4RMSPT4D`) exists in the database
- Verify there's at least one active source configured

### Test Different Scenarios

1. **Test form submission:**
   - Fill out the test form
   - Submit and check console for events

2. **Test error handling:**
   - Stop the API server and reload
   - Check error messages

3. **Test SDK loading:**
   - Clear browser cache
   - Reload and watch loading sequence

## Development Workflow

For active development:

```bash
# Terminal 1: Run API
cd ../api
yarn dev

# Terminal 2: Watch and rebuild SDK
cd ../sdk
yarn dev  # This watches for changes

# Terminal 3: Serve test page
cd ../sdk
yarn serve
```

Now you can:
1. Make changes to SDK code
2. SDK rebuilds automatically (terminal 2)
3. Refresh browser to test changes
4. Check console output on test page

## Files Involved

- `test.html` - Test page with debug UI
- `serve-local.cjs` - Local HTTP server (CommonJS)
- `src/loader.js` - SDK loader (detects local dev)
- `dist/cdn/collect.js` - Built loader script
- `dist/mail818.min.js` - Main SDK bundle
- `dist/sdk.css` - SDK styles