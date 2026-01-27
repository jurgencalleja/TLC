#!/usr/bin/env node

/**
 * TLC CLI - Simple entry point
 *
 * Usage:
 *   tlc           - Install TLC slash commands to Claude Code
 *   tlc init      - Add Docker dev launcher (tlc-start.bat) to project
 */

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    require('./init.js');
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`
  TLC - Test Led Coding

  Usage:
    tlc              Install TLC slash commands to Claude Code
    tlc init         Add Docker launcher to your project

  Options:
    --global, -g     Install commands globally (~/.claude/commands)
    --local, -l      Install commands locally (./.claude/commands)

  After 'tlc init':
    Double-click tlc-start.bat to launch Docker dev environment:
    - Dashboard:  http://localhost:3147
    - App:        http://localhost:5000
    - DB Admin:   http://localhost:8080
    - Database:   localhost:5433

  Requires: Docker Desktop (https://docker.com/products/docker-desktop)
`);
    break;
  default:
    // No subcommand = run install.js (the original behavior)
    require('./install.js');
}
