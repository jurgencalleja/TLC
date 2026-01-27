#!/usr/bin/env node

/**
 * TLC CLI - Simple entry point
 *
 * Usage:
 *   tlc           - Install TLC commands (interactive)
 *   tlc init      - Add dev server launcher to project
 *   tlc server    - Start dev server
 *   tlc setup     - Setup server requirements (Linux/macOS)
 */

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    require('./init.js');
    break;
  case 'server':
    require('./server.js');
    break;
  case 'setup':
    require('./setup.js');
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`
  TLC - Test Led Coding

  Usage:
    tlc              Install TLC commands to Claude Code
    tlc init         Add dev server launcher (tlc-start.bat) to project
    tlc server       Start the TLC dev server
    tlc setup        Setup server requirements (Linux/macOS)

  Options:
    --global, -g     Install commands globally
    --local, -l      Install commands locally

  Examples:
    tlc --global     Install commands for all projects
    tlc init         Add Docker launcher to current project
`);
    break;
  default:
    // No subcommand = run install.js (the original behavior)
    require('./install.js');
}
