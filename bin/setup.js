#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const setupScript = path.join(__dirname, '..', 'server', 'setup.sh');

// Check if running on Windows without WSL
if (process.platform === 'win32') {
  console.log('\n[TLC] Windows detected');
  console.log('[TLC] Please install Docker Desktop from: https://www.docker.com/products/docker-desktop');
  console.log('[TLC] After installation, TLC will automatically use Docker for databases.\n');
  process.exit(0);
}

// Check if setup script exists
if (!fs.existsSync(setupScript)) {
  console.error('[TLC] Setup script not found:', setupScript);
  process.exit(1);
}

console.log('\n[TLC] Running TLC server setup...');
console.log('[TLC] This will install Docker and other requirements.');
console.log('[TLC] You may be prompted for your sudo password.\n');

// Run the setup script with sudo
const child = spawn('sudo', ['bash', setupScript], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n[TLC] Setup completed successfully!');
    console.log('[TLC] Please log out and log back in for Docker permissions to take effect.');
    console.log('[TLC] Then run: tlc-server\n');
  } else {
    console.error('\n[TLC] Setup failed with code:', code);
  }
  process.exit(code || 0);
});
