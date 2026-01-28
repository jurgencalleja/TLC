#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Run the server from the parent directory
const serverPath = path.join(__dirname, '..', 'server', 'index.js');

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
