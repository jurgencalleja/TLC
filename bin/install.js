#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const LOGO = `
${c.cyan}  ████████╗██╗     ██████╗
  ╚══██╔══╝██║    ██╔════╝
     ██║   ██║    ██║
     ██║   ██║    ██║
     ██║   ███████╗╚██████╗
     ╚═╝   ╚══════╝ ╚═════╝${c.reset}
`;

const VERSION = require('../package.json').version;

const COMMANDS = [
  // Core workflow
  'tlc.md',
  'sync.md',
  'new-project.md',
  'init.md',
  'import-project.md',
  'discuss.md',
  'plan.md',
  'build.md',
  'verify.md',
  'progress.md',
  'checklist.md',
  'complete.md',
  'new-milestone.md',
  'quick.md',
  'next.md',
  // Quality & Testing
  'status.md',
  'coverage.md',
  'quality.md',
  'edge-cases.md',
  'autofix.md',
  'config.md',
  // Code Quality & Standards
  'audit.md',
  'cleanup.md',
  'refactor.md',
  // Security
  'security.md',
  'outdated.md',
  // Team Collaboration
  'claim.md',
  'release.md',
  'who.md',
  'bug.md',
  'server.md',
  'start.md',
  // CI/CD & Integration
  'ci.md',
  'issues.md',
  // Review
  'review.md',
  'review-pr.md',
  // Documentation
  'docs.md',
  // Multi-Tool & Deployment
  'export.md',
  'deploy.md',
  // Multi-Model
  'llm.md',
  // Help
  'help.md'
];

function getGlobalDir() {
  const claudeConfig = process.env.CLAUDE_CONFIG_DIR || path.join(require('os').homedir(), '.claude');
  return path.join(claudeConfig, 'commands');
}

function getLocalDir() {
  return path.join(process.cwd(), '.claude', 'commands');
}

function printBanner() {
  console.log(LOGO);
  console.log(`  ${c.bold}TLC${c.reset} ${c.dim}v${VERSION}${c.reset}`);
  console.log(`  ${c.white}Test Led Coding for Claude Code${c.reset}`);
  console.log(`  ${c.dim}Tests before code, automatically${c.reset}`);
  console.log('');
}

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

function info(msg) {
  console.log(`  ${c.cyan}→${c.reset} ${msg}`);
}

// Standalone - no external dependencies needed

function install(targetDir, installType) {
  const commandsDir = path.join(targetDir, 'tlc');

  // Create directory
  fs.mkdirSync(commandsDir, { recursive: true });

  // Copy command files with version injection
  const sourceDir = path.join(__dirname, '..');
  let installed = 0;
  for (const file of COMMANDS) {
    const src = path.join(sourceDir, file);
    const dest = path.join(commandsDir, file);
    if (fs.existsSync(src)) {
      // Read, replace {{VERSION}}, write
      let content = fs.readFileSync(src, 'utf8');
      content = content.replace(/\{\{VERSION\}\}/g, VERSION);
      fs.writeFileSync(dest, content);
      installed++;
    }
  }

  success(`Installed ${installed} commands to ${c.cyan}${commandsDir}${c.reset}`);
  log('');
  log(`${c.green}Done!${c.reset} Restart Claude Code to load commands.`);
  log('');
  log(`${c.bold}Quick Start:${c.reset}`);
  log(`  ${c.cyan}/tlc${c.reset}              Smart entry point - knows what to do next`);
  log('');
  log(`${c.dim}Or use specific commands:${c.reset}`);
  log(`  ${c.cyan}/tlc:new-project${c.reset}  Start new project`);
  log(`  ${c.cyan}/tlc:init${c.reset}         Add TLC to existing code`);
  log(`  ${c.cyan}/tlc:coverage${c.reset}     Find and fix test gaps`);
  log('');
  log(`Run ${c.cyan}/tlc:help${c.reset} for all commands.`);
  log('');
}

async function main() {
  const args = process.argv.slice(2);

  // Handle 'init' subcommand - delegate to init.js
  if (args[0] === 'init') {
    require('./init.js');
    return;
  }

  printBanner();

  if (args.includes('--global') || args.includes('-g')) {
    info(`Installing ${c.bold}globally${c.reset} to ~/.claude/commands/tlc`);
    log('');
    install(getGlobalDir(), 'global');
    return;
  }

  if (args.includes('--local') || args.includes('-l')) {
    info(`Installing ${c.bold}locally${c.reset} to ./.claude/commands/tlc`);
    log('');
    install(getLocalDir(), 'local');
    return;
  }

  // Check if non-interactive
  if (!process.stdin.isTTY) {
    log(`${c.yellow}Non-interactive terminal detected, defaulting to global install${c.reset}`);
    log('');
    install(getGlobalDir(), 'global');
    return;
  }

  // Interactive prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  log('Where would you like to install?');
  log(`  ${c.bold}1)${c.reset} Global ${c.dim}(~/.claude/commands/tlc)${c.reset} - available in all projects`);
  log(`  ${c.bold}2)${c.reset} Local ${c.dim}(./.claude/commands/tlc)${c.reset} - this project only`);
  log('');

  rl.question('  Choice [1/2]: ', (answer) => {
    rl.close();
    console.log('');
    if (answer === '2') {
      info(`Installing ${c.bold}locally${c.reset}`);
      log('');
      install(getLocalDir(), 'local');
    } else {
      info(`Installing ${c.bold}globally${c.reset}`);
      log('');
      install(getGlobalDir(), 'global');
    }
  });
}

main();
