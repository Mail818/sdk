#!/usr/bin/env node

/**
 * Local development server for testing Mail818 SDK
 * This serves the SDK files and test page with proper headers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const HOST = 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.map': 'application/json'
};

// Create server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to test.html
  if (pathname === '/') {
    pathname = '/test.html';
  }

  // Build the absolute file path
  const filePath = path.join(__dirname, pathname);

  // Get file extension
  const ext = path.parse(pathname).ext;

  // Read file from file system
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('404 Not Found');
      console.log(`  → 404 Not Found: ${filePath}`);
    } else {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Set content type
      res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');

      // Add referer header for testing
      if (pathname.includes('collect.js')) {
        console.log(`  → Serving collect.js with referer: http://${HOST}:${PORT}/`);
      }

      // Send file
      res.statusCode = 200;
      res.end(data);
      console.log(`  → 200 OK: ${filePath}`);
    }
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('\n🚀 Mail818 SDK Test Server');
  console.log('==========================');
  console.log(`Server running at: http://${HOST}:${PORT}/`);
  console.log(`Test page at: http://${HOST}:${PORT}/test.html`);
  console.log('\nSDK Development Environment Ready!');
  console.log('Open http://localhost:8080/test.html in your browser');
  console.log('\nPress Ctrl+C to stop the server\n');
});