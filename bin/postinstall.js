#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get source and destination directories
const srcDir = path.join(__dirname, '..', '.claude', 'commands', 'tlc');
const destDir = path.join(os.homedir(), '.claude', 'commands', 'tlc');

// Create destination directory if it doesn't exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy all .md files from source to destination
function copyCommands() {
  try {
    // Ensure destination exists
    ensureDir(destDir);

    // Check if source exists
    if (!fs.existsSync(srcDir)) {
      // Silent exit if source doesn't exist (might be dev install)
      return;
    }

    // Get all .md files
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));

    let copied = 0;
    for (const file of files) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);

      // Copy file (overwrite if exists)
      fs.copyFileSync(src, dest);
      copied++;
    }

    if (copied > 0) {
      console.log(`\x1b[32m✓\x1b[0m TLC: Installed ${copied} commands to ~/.claude/commands/tlc/`);
    }
  } catch (err) {
    // Silent fail - don't break npm install
    if (process.env.DEBUG) {
      console.error('TLC postinstall error:', err.message);
    }
  }
}

copyCommands();
