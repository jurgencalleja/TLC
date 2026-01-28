#!/usr/bin/env node

/**
 * TLC Rebuild - Trigger full Docker rebuild
 * Usage: tlc rebuild
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find TLC installation directory
function findTlcDir() {
  const isWSL = process.platform === 'linux' && fs.existsSync('/mnt/c');

  // Check common locations (adjust for WSL)
  const locations = [
    path.join(__dirname, '..'),  // Where this script lives (most reliable)
  ];

  if (isWSL) {
    locations.push('/mnt/c/Code/TLC');
    locations.push(path.join(require('os').homedir(), 'Code', 'TLC'));
  } else {
    locations.push('C:\\Code\\TLC');
    locations.push(path.join(require('os').homedir(), 'Code', 'TLC'));
  }

  // Check npm global
  try {
    const { execSync } = require('child_process');
    const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    locations.push(path.join(globalRoot, 'tlc-claude-code'));
  } catch (e) {
    // Ignore
  }

  for (const loc of locations) {
    if (fs.existsSync(path.join(loc, 'docker-compose.dev.yml'))) {
      return loc;
    }
  }

  return null;
}

// Get project name from current directory
function getProjectName() {
  const projectDir = process.cwd();
  return path.basename(projectDir).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('');
  console.log('  TLC Rebuild');
  console.log('  ===========');
  console.log('');

  const tlcDir = findTlcDir();
  if (!tlcDir) {
    console.error('  [ERROR] Could not find TLC installation');
    console.error('  Make sure docker-compose.dev.yml exists');
    process.exit(1);
  }

  const projectName = getProjectName();
  const composePath = path.join(tlcDir, 'docker-compose.dev.yml');

  console.log(`  TLC Dir: ${tlcDir}`);
  console.log(`  Project: ${projectName}`);
  console.log('');

  // Set environment variables
  process.env.PROJECT_DIR = process.cwd();
  process.env.COMPOSE_PROJECT_NAME = projectName;

  console.log('  [1/2] Stopping containers...');

  // Run docker-compose down
  const down = spawn('docker-compose', ['-f', composePath, 'down'], {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  down.on('close', (code) => {
    if (code !== 0) {
      console.error('  [ERROR] Failed to stop containers');
      process.exit(1);
    }

    console.log('');
    console.log('  [2/2] Rebuilding and starting...');
    console.log('');

    // Run docker-compose up --build
    const up = spawn('docker-compose', ['-f', composePath, 'up', '--build'], {
      stdio: 'inherit',
      shell: true,
      env: process.env
    });

    up.on('close', (upCode) => {
      process.exit(upCode || 0);
    });
  });
}

main();
