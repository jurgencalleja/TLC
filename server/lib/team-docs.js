/**
 * Team Documentation Module
 * Generates role-specific guides and team workflow documentation
 */

/**
 * Team roles
 */
const ROLES = {
  ENGINEER: 'engineer',
  PO: 'po',
  QA: 'qa',
  LEAD: 'lead',
};

/**
 * TLC commands by role
 */
const COMMANDS_BY_ROLE = {
  [ROLES.ENGINEER]: [
    { cmd: '/tlc:progress', desc: 'Check current project status and your tasks' },
    { cmd: '/tlc:claim', desc: 'Claim a task to work on' },
    { cmd: '/tlc:release', desc: 'Release a task if blocked' },
    { cmd: '/tlc:build', desc: 'Build a phase (test-first)' },
    { cmd: '/tlc:status', desc: 'Check test status' },
    { cmd: '/tlc:autofix', desc: 'Auto-fix failing tests' },
    { cmd: '/tlc:who', desc: 'See who is working on what' },
  ],
  [ROLES.PO]: [
    { cmd: '/tlc:progress', desc: 'Check overall project progress' },
    { cmd: '/tlc:new-project', desc: 'Start a new project' },
    { cmd: '/tlc:plan', desc: 'Plan a phase with requirements' },
    { cmd: '/tlc:verify', desc: 'Verify completed features' },
    { cmd: '/tlc:issue', desc: 'Import requirements from issue tracker' },
    { cmd: '/tlc:docs', desc: 'View API documentation' },
  ],
  [ROLES.QA]: [
    { cmd: '/tlc:progress', desc: 'Check what is ready for testing' },
    { cmd: '/tlc:verify', desc: 'Run acceptance tests' },
    { cmd: '/tlc:bug', desc: 'Report bugs found during testing' },
    { cmd: '/tlc:status', desc: 'Check test coverage' },
    { cmd: '/tlc:coverage', desc: 'View coverage gaps' },
    { cmd: '/tlc:edge-cases', desc: 'Generate edge case tests' },
  ],
  [ROLES.LEAD]: [
    { cmd: '/tlc:progress', desc: 'Monitor team progress' },
    { cmd: '/tlc:who', desc: 'See team workload' },
    { cmd: '/tlc:plan', desc: 'Plan and prioritize phases' },
    { cmd: '/tlc:ci', desc: 'Configure CI/CD pipelines' },
    { cmd: '/tlc:merge', desc: 'Merge with regression tests' },
    { cmd: '/tlc:quality', desc: 'Check test quality scores' },
  ],
};

/**
 * Role descriptions
 */
const ROLE_DESCRIPTIONS = {
  [ROLES.ENGINEER]: {
    title: 'Engineer',
    summary: 'Write tests first, then implement code to make them pass.',
    responsibilities: [
      'Claim tasks before starting work',
      'Write failing tests before implementation',
      'Implement code to make tests pass',
      'Commit after each passing test',
      'Release tasks if blocked',
    ],
    workflow: [
      '1. Run `/tlc:progress` to see available tasks',
      '2. Run `/tlc:claim <task>` to claim a task',
      '3. Run `/tlc:build <phase>` to write tests and implement',
      '4. Commit your changes with descriptive messages',
      '5. Run `/tlc:release` if you get blocked',
    ],
  },
  [ROLES.PO]: {
    title: 'Product Owner',
    summary: 'Define requirements and verify delivered features.',
    responsibilities: [
      'Create project roadmap and phases',
      'Define acceptance criteria for features',
      'Import requirements from issue trackers',
      'Verify completed features work as expected',
      'Prioritize backlog based on business value',
    ],
    workflow: [
      '1. Run `/tlc:new-project` to initialize project',
      '2. Define phases in ROADMAP.md',
      '3. Run `/tlc:plan` to break phases into tasks',
      '4. Run `/tlc:issue import` to import from issue tracker',
      '5. Run `/tlc:verify` to accept completed work',
    ],
  },
  [ROLES.QA]: {
    title: 'QA Engineer',
    summary: 'Verify features and report bugs.',
    responsibilities: [
      'Test completed features against acceptance criteria',
      'Report bugs with clear reproduction steps',
      'Verify bug fixes',
      'Identify edge cases and gaps',
      'Maintain test quality standards',
    ],
    workflow: [
      '1. Run `/tlc:progress` to see what is ready for testing',
      '2. Test features in the dashboard preview',
      '3. Run `/tlc:bug` to report any issues found',
      '4. Run `/tlc:verify` to mark features as accepted',
      '5. Run `/tlc:edge-cases` to identify missing tests',
    ],
  },
  [ROLES.LEAD]: {
    title: 'Tech Lead',
    summary: 'Coordinate team and maintain code quality.',
    responsibilities: [
      'Monitor team progress and blockers',
      'Review and approve architectural decisions',
      'Configure CI/CD pipelines',
      'Ensure test quality standards',
      'Handle merge conflicts and regressions',
    ],
    workflow: [
      '1. Run `/tlc:who` to check team status',
      '2. Run `/tlc:quality` to monitor test quality',
      '3. Run `/tlc:ci` to configure CI pipelines',
      '4. Run `/tlc:merge` with regression tests',
      '5. Address blockers raised by team members',
    ],
  },
};

/**
 * Common pitfalls by role
 */
const PITFALLS = {
  [ROLES.ENGINEER]: [
    {
      mistake: 'Writing implementation before tests',
      solution: 'Always run `/tlc:build` which enforces test-first workflow',
    },
    {
      mistake: 'Forgetting to claim tasks',
      solution: 'Use `/tlc:claim` before starting to avoid duplicate work',
    },
    {
      mistake: 'Large commits with multiple features',
      solution: 'Commit after each passing test for atomic changes',
    },
    {
      mistake: 'Not pulling before claiming',
      solution: 'Run `git pull` before `/tlc:claim` to get latest state',
    },
  ],
  [ROLES.PO]: [
    {
      mistake: 'Vague acceptance criteria',
      solution: 'Use checkbox format: "- [ ] User can log in with email"',
    },
    {
      mistake: 'Skipping verification step',
      solution: 'Always run `/tlc:verify` to formally accept features',
    },
    {
      mistake: 'Changing requirements mid-phase',
      solution: 'Complete current phase, then plan changes in next phase',
    },
  ],
  [ROLES.QA]: [
    {
      mistake: 'Testing before feature is marked complete',
      solution: 'Check `/tlc:progress` - only test "Ready for QA" items',
    },
    {
      mistake: 'Vague bug reports',
      solution: 'Use `/tlc:bug` template with reproduction steps',
    },
    {
      mistake: 'Not retesting after fixes',
      solution: 'Always verify fixes before closing bugs',
    },
  ],
  [ROLES.LEAD]: [
    {
      mistake: 'Merging without regression tests',
      solution: 'Use `/tlc:merge` which runs full test suite',
    },
    {
      mistake: 'Ignoring test quality metrics',
      solution: 'Monitor `/tlc:quality` scores and address gaps',
    },
    {
      mistake: 'Not addressing team blockers quickly',
      solution: 'Check `/tlc:who` daily for blocked tasks',
    },
  ],
};

/**
 * Generate role-specific guide
 * @param {string} role - Role identifier
 * @returns {string} Markdown guide
 */
function generateRoleGuide(role) {
  const roleInfo = ROLE_DESCRIPTIONS[role];
  const commands = COMMANDS_BY_ROLE[role] || [];
  const pitfalls = PITFALLS[role] || [];

  if (!roleInfo) {
    return `# Unknown Role: ${role}\n\nNo guide available for this role.`;
  }

  const lines = [];

  // Header
  lines.push(`# TLC Guide for ${roleInfo.title}s`);
  lines.push('');
  lines.push(`> ${roleInfo.summary}`);
  lines.push('');

  // Responsibilities
  lines.push('## Your Responsibilities');
  lines.push('');
  for (const resp of roleInfo.responsibilities) {
    lines.push(`- ${resp}`);
  }
  lines.push('');

  // Daily Workflow
  lines.push('## Daily Workflow');
  lines.push('');
  for (const step of roleInfo.workflow) {
    lines.push(step);
  }
  lines.push('');

  // Commands
  lines.push('## Key Commands');
  lines.push('');
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  for (const { cmd, desc } of commands) {
    lines.push(`| \`${cmd}\` | ${desc} |`);
  }
  lines.push('');

  // Pitfalls
  if (pitfalls.length > 0) {
    lines.push('## Common Pitfalls');
    lines.push('');
    for (const { mistake, solution } of pitfalls) {
      lines.push(`### ❌ ${mistake}`);
      lines.push('');
      lines.push(`✅ **Solution:** ${solution}`);
      lines.push('');
    }
  }

  // Quick Start
  lines.push('## Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push('# Check project status');
  lines.push('/tlc:progress');
  lines.push('');
  lines.push(`# Start your ${roleInfo.title.toLowerCase()} workflow`);
  lines.push(roleInfo.workflow[1]?.replace(/^\d+\.\s*Run\s*/, '') || '/tlc:progress');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate team workflow document
 * @param {Object} options - Document options
 * @returns {string} Markdown document
 */
function generateTeamWorkflow(options = {}) {
  const { teamSize = 3, projectName = 'Project' } = options;

  const lines = [];

  lines.push('# Team Workflow with TLC');
  lines.push('');
  lines.push(`This document describes how a team of ${teamSize}+ members collaborates using TLC.`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push('TLC (Test-Led Coding) enforces test-first development across your team:');
  lines.push('');
  lines.push('1. **Product Owner** defines requirements and acceptance criteria');
  lines.push('2. **Engineers** write failing tests, then implement to make them pass');
  lines.push('3. **QA** verifies features and reports bugs');
  lines.push('4. **Tech Lead** coordinates and maintains quality');
  lines.push('');

  // Workflow Diagram
  lines.push('## Workflow');
  lines.push('');
  lines.push('```');
  lines.push('┌─────────────┐     ┌─────────────┐     ┌─────────────┐');
  lines.push('│     PO      │────>│  Engineer   │────>│     QA      │');
  lines.push('│  (Plan)     │     │  (Build)    │     │  (Verify)   │');
  lines.push('└─────────────┘     └─────────────┘     └─────────────┘');
  lines.push('      │                   │                   │');
  lines.push('      │    ┌─────────────────────────────────┘');
  lines.push('      │    │');
  lines.push('      v    v');
  lines.push('┌─────────────┐');
  lines.push('│  Tech Lead  │');
  lines.push('│  (Merge)    │');
  lines.push('└─────────────┘');
  lines.push('```');
  lines.push('');

  // Phase Lifecycle
  lines.push('## Phase Lifecycle');
  lines.push('');
  lines.push('### 1. Planning (PO)');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:plan <phase>');
  lines.push('```');
  lines.push('');
  lines.push('- Define clear acceptance criteria');
  lines.push('- Break work into claimable tasks');
  lines.push('- Prioritize by business value');
  lines.push('');

  lines.push('### 2. Building (Engineers)');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:claim <task>');
  lines.push('/tlc:build <phase>');
  lines.push('```');
  lines.push('');
  lines.push('- Claim tasks before starting');
  lines.push('- Write tests first (Red)');
  lines.push('- Implement to pass (Green)');
  lines.push('- Commit after each test passes');
  lines.push('');

  lines.push('### 3. Verification (QA)');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:verify <phase>');
  lines.push('/tlc:bug "description"');
  lines.push('```');
  lines.push('');
  lines.push('- Test against acceptance criteria');
  lines.push('- Report bugs with reproduction steps');
  lines.push('- Verify bug fixes');
  lines.push('');

  lines.push('### 4. Integration (Tech Lead)');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:merge <branch>');
  lines.push('/tlc:quality');
  lines.push('```');
  lines.push('');
  lines.push('- Run regression tests before merge');
  lines.push('- Monitor test quality scores');
  lines.push('- Address blockers');
  lines.push('');

  // Communication
  lines.push('## Communication');
  lines.push('');
  lines.push('### Task Claiming');
  lines.push('');
  lines.push('```bash');
  lines.push('# Before starting work');
  lines.push('git pull');
  lines.push('/tlc:claim <task>');
  lines.push('git push');
  lines.push('');
  lines.push('# If blocked');
  lines.push('/tlc:release <task>');
  lines.push('git push');
  lines.push('```');
  lines.push('');

  lines.push('### Status Updates');
  lines.push('');
  lines.push('```bash');
  lines.push('# Check team status');
  lines.push('/tlc:who');
  lines.push('');
  lines.push('# Check project progress');
  lines.push('/tlc:progress');
  lines.push('```');
  lines.push('');

  // Best Practices
  lines.push('## Best Practices');
  lines.push('');
  lines.push('1. **Pull before claiming** - Always `git pull` before `/tlc:claim`');
  lines.push('2. **Small commits** - Commit after each passing test');
  lines.push('3. **Clear messages** - Use conventional commit format');
  lines.push('4. **Early release** - `/tlc:release` if blocked, don\'t hold tasks');
  lines.push('5. **Daily sync** - Check `/tlc:who` and `/tlc:progress` daily');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate onboarding guide
 * @param {Object} options - Guide options
 * @returns {string} Markdown guide
 */
function generateOnboardingGuide(options = {}) {
  const { role = 'engineer', projectName = 'Project' } = options;

  const lines = [];

  lines.push('# TLC Onboarding Guide');
  lines.push('');
  lines.push(`Welcome to ${projectName}! This guide will help you get started with TLC.`);
  lines.push('');

  // Prerequisites
  lines.push('## Prerequisites');
  lines.push('');
  lines.push('- [ ] Git installed and configured');
  lines.push('- [ ] Node.js 18+ installed');
  lines.push('- [ ] Claude Code CLI installed');
  lines.push('- [ ] Repository access');
  lines.push('');

  // Setup
  lines.push('## Setup (5 minutes)');
  lines.push('');
  lines.push('```bash');
  lines.push('# Clone the repository');
  lines.push(`git clone <repo-url>`);
  lines.push(`cd ${projectName.toLowerCase().replace(/\s+/g, '-')}`);
  lines.push('');
  lines.push('# Install dependencies');
  lines.push('npm install');
  lines.push('');
  lines.push('# Verify setup');
  lines.push('npm test');
  lines.push('```');
  lines.push('');

  // First Steps
  lines.push('## Your First Task (15 minutes)');
  lines.push('');
  lines.push('### 1. Check Project Status');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:progress');
  lines.push('```');
  lines.push('');
  lines.push('This shows you:');
  lines.push('- Current phase and progress');
  lines.push('- Available tasks');
  lines.push('- Who is working on what');
  lines.push('');

  lines.push('### 2. Claim a Task');
  lines.push('');
  lines.push('```bash');
  lines.push('# Pull latest changes');
  lines.push('git pull');
  lines.push('');
  lines.push('# Claim an available task');
  lines.push('/tlc:claim <task-number>');
  lines.push('');
  lines.push('# Push your claim');
  lines.push('git push');
  lines.push('```');
  lines.push('');

  lines.push('### 3. Build (Test-First)');
  lines.push('');
  lines.push('```bash');
  lines.push('/tlc:build <phase>');
  lines.push('```');
  lines.push('');
  lines.push('This will:');
  lines.push('1. Write failing tests for your task');
  lines.push('2. Help you implement code to pass tests');
  lines.push('3. Commit after each passing test');
  lines.push('');

  // Key Concepts
  lines.push('## Key Concepts');
  lines.push('');
  lines.push('### Test-First Development');
  lines.push('');
  lines.push('TLC enforces **Red → Green → Refactor**:');
  lines.push('');
  lines.push('1. **Red**: Write a failing test');
  lines.push('2. **Green**: Write minimum code to pass');
  lines.push('3. **Refactor**: Clean up while tests pass');
  lines.push('');

  lines.push('### Task Claiming');
  lines.push('');
  lines.push('- Claim tasks **before** starting work');
  lines.push('- Only claim what you can finish today');
  lines.push('- Release tasks if blocked');
  lines.push('');

  lines.push('### Atomic Commits');
  lines.push('');
  lines.push('- Commit after each passing test');
  lines.push('- Use descriptive commit messages');
  lines.push('- Push frequently to share progress');
  lines.push('');

  // Help
  lines.push('## Getting Help');
  lines.push('');
  lines.push('```bash');
  lines.push('# See all commands');
  lines.push('/tlc:help');
  lines.push('');
  lines.push('# Check who can help');
  lines.push('/tlc:who');
  lines.push('```');
  lines.push('');

  // Checklist
  lines.push('## Onboarding Checklist');
  lines.push('');
  lines.push('- [ ] Clone repository');
  lines.push('- [ ] Install dependencies');
  lines.push('- [ ] Run tests successfully');
  lines.push('- [ ] Run `/tlc:progress`');
  lines.push('- [ ] Claim your first task');
  lines.push('- [ ] Complete task with `/tlc:build`');
  lines.push('- [ ] Push your changes');
  lines.push('');
  lines.push('**Estimated time: 30 minutes**');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate all documentation
 * @param {Object} options - Generation options
 * @returns {Object} Generated documents
 */
function generateAllDocs(options = {}) {
  return {
    teamWorkflow: generateTeamWorkflow(options),
    onboarding: generateOnboardingGuide(options),
    engineerGuide: generateRoleGuide(ROLES.ENGINEER),
    poGuide: generateRoleGuide(ROLES.PO),
    qaGuide: generateRoleGuide(ROLES.QA),
    leadGuide: generateRoleGuide(ROLES.LEAD),
  };
}

/**
 * Create team docs generator
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createTeamDocsGenerator(options = {}) {
  return {
    generateRoleGuide: (role) => generateRoleGuide(role),
    generateTeamWorkflow: (opts) => generateTeamWorkflow({ ...options, ...opts }),
    generateOnboardingGuide: (opts) => generateOnboardingGuide({ ...options, ...opts }),
    generateAllDocs: (opts) => generateAllDocs({ ...options, ...opts }),
    ROLES,
    COMMANDS_BY_ROLE,
    ROLE_DESCRIPTIONS,
    PITFALLS,
  };
}

module.exports = {
  ROLES,
  COMMANDS_BY_ROLE,
  ROLE_DESCRIPTIONS,
  PITFALLS,
  generateRoleGuide,
  generateTeamWorkflow,
  generateOnboardingGuide,
  generateAllDocs,
  createTeamDocsGenerator,
};
