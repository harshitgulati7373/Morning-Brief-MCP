#!/usr/bin/env node

// Robust MCP Server Startup Script
const path = require('path');
const fs = require('fs');

// Change to the correct directory
const serverDir = __dirname;
process.chdir(serverDir);

// Ensure all required directories exist
const requiredDirs = ['logs', 'data', 'config'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(serverDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Set environment for MCP mode (suppress console output)
process.env.MCP_MODE = 'true';

// Suppress npm notices and other console noise
process.env.NPM_CONFIG_FUND = 'false';
process.env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';

// Start the server
require('./dist/index.js');