/**
 * Tool Rules Generator
 * Generates AI tool-specific configuration files for TLC workflow
 */

const SUPPORTED_TOOLS = {
  AGENTS_MD: 'agents-md',
  CURSOR: 'cursor',
  ANTIGRAVITY: 'antigravity',
  WINDSURF: 'windsurf',
  COPILOT: 'copilot',
  CONTINUE: 'continue',
  CODY: 'cody',
  AMAZON_Q: 'amazon-q',
  AIDER: 'aider',
};

const TOOL_FILE_PATHS = {
  [SUPPORTED_TOOLS.AGENTS_MD]: 'AGENTS.md',
  [SUPPORTED_TOOLS.CURSOR]: '.cursor/rules/tlc.mdc',
  [SUPPORTED_TOOLS.ANTIGRAVITY]: '.antigravity/rules.md',
  [SUPPORTED_TOOLS.WINDSURF]: '.windsurfrules',
  [SUPPORTED_TOOLS.COPILOT]: '.github/copilot-instructions.md',
  [SUPPORTED_TOOLS.CONTINUE]: '.continue/rules/tlc.md',
  [SUPPORTED_TOOLS.CODY]: '.cody/instructions.md',
  [SUPPORTED_TOOLS.AMAZON_Q]: '.amazonq/rules/tlc.md',
  [SUPPORTED_TOOLS.AIDER]: '.aider.conf.yml',
};

/**
 * Core TLC rules that apply to all tools
 */
function getTLCCoreRules(options = {}) {
  const { projectName = 'Project', testFramework = 'vitest' } = options;

  return {
    projectName,
    testFramework,
    principles: [
      'Tests define behavior. Code makes tests pass.',
      'Write tests BEFORE implementation (Red → Green → Refactor).',
      'Never skip tests. Never mock what you should test.',
      'Each task should be small, testable, and independent.',
      'Do NOT add Co-Authored-By lines to commits. The user is the author.',
    ],
    workflow: [
      'Check progress: Read .planning/ROADMAP.md for current phase',
      'Check tasks: Read .planning/phases/{N}-PLAN.md for available work',
      'Claim task: Update [ ] to [>@user] before starting',
      'Write tests: Create failing tests that define expected behavior',
      'Implement: Write minimum code to make tests pass',
      'Verify: Run tests, ensure all pass',
      'Complete: Update [>@user] to [x@user], commit',
    ],
    artifacts: {
      roadmap: '.planning/ROADMAP.md',
      plans: '.planning/phases/{N}-PLAN.md',
      tests: '.planning/phases/{N}-TESTS.md',
      bugs: '.planning/BUGS.md',
      config: '.tlc.json',
    },
    taskMarkers: {
      available: '[ ]',
      inProgress: '[>@{user}]',
      completed: '[x@{user}]',
    },
    testFirst: {
      red: 'Write failing tests that specify behavior',
      green: 'Write minimum code to pass tests',
      refactor: 'Clean up while keeping tests green',
    },
  };
}

/**
 * Generate AGENTS.md (universal standard)
 * Backed by Google, OpenAI, Sourcegraph, Cursor
 */
function generateAgentsMd(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# AGENTS.md - TLC Project Instructions');
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(`This project (${rules.projectName}) uses **TLC (Test-Led Coding)** for development.`);
  lines.push('');
  lines.push('## Core Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  for (let i = 0; i < rules.workflow.length; i++) {
    lines.push(`${i + 1}. ${rules.workflow[i]}`);
  }
  lines.push('');
  lines.push('## Test-First Development');
  lines.push('');
  lines.push('All implementation follows **Red → Green → Refactor**:');
  lines.push('');
  lines.push(`1. **Red**: ${rules.testFirst.red}`);
  lines.push(`2. **Green**: ${rules.testFirst.green}`);
  lines.push(`3. **Refactor**: ${rules.testFirst.refactor}`);
  lines.push('');
  lines.push('## Task Status Markers');
  lines.push('');
  lines.push('| Marker | Meaning |');
  lines.push('|--------|---------|');
  lines.push(`| \`${rules.taskMarkers.available}\` | Available |`);
  lines.push(`| \`${rules.taskMarkers.inProgress}\` | In progress |`);
  lines.push(`| \`${rules.taskMarkers.completed}\` | Completed |`);
  lines.push('');
  lines.push('## Project Artifacts');
  lines.push('');
  lines.push('| Purpose | Location |');
  lines.push('|---------|----------|');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`| ${purpose} | \`${location}\` |`);
  }
  lines.push('');
  lines.push('## Important');
  lines.push('');
  lines.push('- Always read the current phase plan before starting work');
  lines.push('- Claim tasks before working to avoid conflicts');
  lines.push('- Run tests after every change');
  lines.push(`- Test framework: ${rules.testFramework}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Cursor rules (.cursor/rules/tlc.mdc)
 */
function generateCursorRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  // Cursor uses MDC format with frontmatter
  lines.push('---');
  lines.push('description: TLC (Test-Led Coding) workflow rules');
  lines.push('globs:');
  lines.push('  - "**/*.ts"');
  lines.push('  - "**/*.js"');
  lines.push('  - "**/*.tsx"');
  lines.push('  - "**/*.jsx"');
  lines.push('alwaysApply: true');
  lines.push('---');
  lines.push('');
  lines.push('# TLC Rules for Cursor');
  lines.push('');
  lines.push(`Project: ${rules.projectName}`);
  lines.push('');
  lines.push('## Test-First Development');
  lines.push('');
  lines.push('When implementing features:');
  lines.push('');
  lines.push('1. **Read the plan first**: Check `.planning/phases/{N}-PLAN.md`');
  lines.push('2. **Write tests before code**: Tests define expected behavior');
  lines.push('3. **Run tests frequently**: Verify each change');
  lines.push('');
  lines.push('## Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## Task Claiming');
  lines.push('');
  lines.push('Before starting work:');
  lines.push('1. Find available task: `[ ]` marker in PLAN.md');
  lines.push('2. Change to: `[>@yourname]`');
  lines.push('3. Commit the claim');
  lines.push('4. After completion: `[x@yourname]`');
  lines.push('');
  lines.push('## File Locations');
  lines.push('');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`- **${purpose}**: \`${location}\``);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Antigravity rules (.antigravity/rules.md)
 */
function generateAntigravityRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# TLC Rules for Antigravity');
  lines.push('');
  lines.push('## Project: ' + rules.projectName);
  lines.push('');
  lines.push('This project uses TLC (Test-Led Coding). Follow these rules:');
  lines.push('');
  lines.push('### Core Workflow');
  lines.push('');
  for (const step of rules.workflow) {
    lines.push(`- ${step}`);
  }
  lines.push('');
  lines.push('### Test-First (Red → Green → Refactor)');
  lines.push('');
  lines.push(`- **Red**: ${rules.testFirst.red}`);
  lines.push(`- **Green**: ${rules.testFirst.green}`);
  lines.push(`- **Refactor**: ${rules.testFirst.refactor}`);
  lines.push('');
  lines.push('### Task Markers');
  lines.push('');
  lines.push(`- Available: \`${rules.taskMarkers.available}\``);
  lines.push(`- In progress: \`${rules.taskMarkers.inProgress}\``);
  lines.push(`- Completed: \`${rules.taskMarkers.completed}\``);
  lines.push('');
  lines.push('### Key Files');
  lines.push('');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`- ${purpose}: \`${location}\``);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Windsurf rules (.windsurfrules)
 */
function generateWindsurfRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# TLC (Test-Led Coding) Rules');
  lines.push('');
  lines.push('## Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(principle);
  }
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('1. Read `.planning/ROADMAP.md` for current phase');
  lines.push('2. Read `.planning/phases/{N}-PLAN.md` for tasks');
  lines.push('3. Claim task: change `[ ]` to `[>@name]`');
  lines.push('4. Write failing tests first');
  lines.push('5. Implement to make tests pass');
  lines.push('6. Mark complete: `[x@name]`');
  lines.push('');
  lines.push('## Test-First');
  lines.push('');
  lines.push('Red: Write failing tests');
  lines.push('Green: Minimum code to pass');
  lines.push('Refactor: Clean up, tests stay green');
  lines.push('');
  lines.push(`Test framework: ${rules.testFramework}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Copilot instructions (.github/copilot-instructions.md)
 */
function generateCopilotRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# GitHub Copilot Instructions - TLC Project');
  lines.push('');
  lines.push('## About This Project');
  lines.push('');
  lines.push(`${rules.projectName} uses TLC (Test-Led Coding) methodology.`);
  lines.push('');
  lines.push('## Key Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## When Generating Code');
  lines.push('');
  lines.push('1. **Check for existing tests** - Code may already be specified by tests');
  lines.push('2. **Write tests first** - If implementing new features, write tests before code');
  lines.push('3. **Follow existing patterns** - Match the project\'s coding style');
  lines.push(`4. **Use ${rules.testFramework}** - This is the project's test framework`);
  lines.push('');
  lines.push('## Project Structure');
  lines.push('');
  lines.push('| Purpose | Location |');
  lines.push('|---------|----------|');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`| ${purpose} | \`${location}\` |`);
  }
  lines.push('');
  lines.push('## Task Management');
  lines.push('');
  lines.push('Tasks are tracked in PLAN.md files with markers:');
  lines.push(`- \`${rules.taskMarkers.available}\` - Available to work on`);
  lines.push(`- \`${rules.taskMarkers.inProgress}\` - Someone is working on it`);
  lines.push(`- \`${rules.taskMarkers.completed}\` - Done`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Continue rules (.continue/rules/tlc.md)
 */
function generateContinueRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# TLC Rules for Continue');
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('This project uses Test-Led Coding (TLC). Tests are written before implementation.');
  lines.push('');
  lines.push('## Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## Development Workflow');
  lines.push('');
  for (let i = 0; i < rules.workflow.length; i++) {
    lines.push(`${i + 1}. ${rules.workflow[i]}`);
  }
  lines.push('');
  lines.push('## Red → Green → Refactor');
  lines.push('');
  lines.push(`1. **Red**: ${rules.testFirst.red}`);
  lines.push(`2. **Green**: ${rules.testFirst.green}`);
  lines.push(`3. **Refactor**: ${rules.testFirst.refactor}`);
  lines.push('');
  lines.push('## Important Files');
  lines.push('');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`- **${purpose}**: \`${location}\``);
  }
  lines.push('');
  lines.push('## Task Claiming');
  lines.push('');
  lines.push('Use markers in PLAN.md to track work:');
  lines.push(`- Available: \`${rules.taskMarkers.available}\``);
  lines.push(`- In progress: \`${rules.taskMarkers.inProgress}\``);
  lines.push(`- Completed: \`${rules.taskMarkers.completed}\``);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Cody instructions (.cody/instructions.md)
 */
function generateCodyRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# Cody Instructions - TLC Project');
  lines.push('');
  lines.push('## Project Context');
  lines.push('');
  lines.push(`This is ${rules.projectName}, using TLC (Test-Led Coding) methodology.`);
  lines.push('');
  lines.push('## Core Rules');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## When Answering Questions');
  lines.push('');
  lines.push('- Reference `.planning/ROADMAP.md` for project status');
  lines.push('- Check `.planning/phases/*.md` for implementation details');
  lines.push('- Suggest test-first approach for new features');
  lines.push(`- Use ${rules.testFramework} for test examples`);
  lines.push('');
  lines.push('## When Generating Code');
  lines.push('');
  lines.push('1. Check if tests exist for the feature');
  lines.push('2. If no tests, write tests first');
  lines.push('3. Implement minimum code to pass tests');
  lines.push('4. Follow project patterns and style');
  lines.push('');
  lines.push('## Key Locations');
  lines.push('');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`- ${purpose}: \`${location}\``);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Amazon Q rules (.amazonq/rules/tlc.md)
 */
function generateAmazonQRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  lines.push('# Amazon Q Developer Rules - TLC Project');
  lines.push('');
  lines.push('## Project: ' + rules.projectName);
  lines.push('');
  lines.push('This project follows TLC (Test-Led Coding) methodology.');
  lines.push('');
  lines.push('## Development Principles');
  lines.push('');
  for (const principle of rules.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  for (const step of rules.workflow) {
    lines.push(`- ${step}`);
  }
  lines.push('');
  lines.push('## Test-First Pattern');
  lines.push('');
  lines.push('```');
  lines.push('Red:      Write failing tests that define behavior');
  lines.push('Green:    Write minimum code to make tests pass');
  lines.push('Refactor: Clean up while keeping tests green');
  lines.push('```');
  lines.push('');
  lines.push('## Project Files');
  lines.push('');
  for (const [purpose, location] of Object.entries(rules.artifacts)) {
    lines.push(`- ${purpose}: ${location}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Aider config (.aider.conf.yml)
 */
function generateAiderRules(options = {}) {
  const rules = getTLCCoreRules(options);
  const lines = [];

  // Aider uses YAML format
  lines.push('# Aider Configuration - TLC Project');
  lines.push('');
  lines.push('# Project context');
  lines.push(`project_name: "${rules.projectName}"`);
  lines.push(`test_framework: "${rules.testFramework}"`);
  lines.push('');
  lines.push('# Read these files for context');
  lines.push('read:');
  lines.push('  - .planning/ROADMAP.md');
  lines.push('  - .planning/phases/*-PLAN.md');
  lines.push('  - .tlc.json');
  lines.push('');
  lines.push('# Auto-commit settings');
  lines.push('auto_commits: true');
  lines.push('dirty_commits: false');
  lines.push('');
  lines.push('# Test command');
  lines.push('test_cmd: npm test');
  lines.push('');
  lines.push('# System prompt additions');
  lines.push('extra_system_prompt: |');
  lines.push('  This project uses TLC (Test-Led Coding).');
  lines.push('  ');
  lines.push('  PRINCIPLES:');
  for (const principle of rules.principles) {
    lines.push(`  - ${principle}`);
  }
  lines.push('  ');
  lines.push('  WORKFLOW:');
  lines.push('  1. Read .planning/ROADMAP.md for current phase');
  lines.push('  2. Read .planning/phases/{N}-PLAN.md for tasks');
  lines.push('  3. Write tests BEFORE implementation');
  lines.push('  4. Run tests after every change');
  lines.push('  ');
  lines.push('  TASK MARKERS:');
  lines.push('  - [ ] = Available');
  lines.push('  - [>@name] = In progress');
  lines.push('  - [x@name] = Complete');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate rules for a specific tool
 */
function generateToolRules(tool, options = {}) {
  switch (tool) {
    case SUPPORTED_TOOLS.AGENTS_MD:
      return generateAgentsMd(options);
    case SUPPORTED_TOOLS.CURSOR:
      return generateCursorRules(options);
    case SUPPORTED_TOOLS.ANTIGRAVITY:
      return generateAntigravityRules(options);
    case SUPPORTED_TOOLS.WINDSURF:
      return generateWindsurfRules(options);
    case SUPPORTED_TOOLS.COPILOT:
      return generateCopilotRules(options);
    case SUPPORTED_TOOLS.CONTINUE:
      return generateContinueRules(options);
    case SUPPORTED_TOOLS.CODY:
      return generateCodyRules(options);
    case SUPPORTED_TOOLS.AMAZON_Q:
      return generateAmazonQRules(options);
    case SUPPORTED_TOOLS.AIDER:
      return generateAiderRules(options);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

/**
 * Generate rules for all supported tools
 */
function generateAllToolRules(options = {}) {
  const results = {};

  for (const tool of Object.values(SUPPORTED_TOOLS)) {
    results[tool] = {
      content: generateToolRules(tool, options),
      path: TOOL_FILE_PATHS[tool],
    };
  }

  return results;
}

/**
 * Get list of supported tools
 */
function getSupportedTools() {
  return Object.values(SUPPORTED_TOOLS);
}

/**
 * Get file path for a tool
 */
function getToolFilePath(tool) {
  return TOOL_FILE_PATHS[tool] || null;
}

/**
 * Create tool rules generator with default options
 */
function createToolRulesGenerator(defaultOptions = {}) {
  return {
    generateToolRules: (tool, options) =>
      generateToolRules(tool, { ...defaultOptions, ...options }),
    generateAllToolRules: (options) =>
      generateAllToolRules({ ...defaultOptions, ...options }),
    getSupportedTools,
    getToolFilePath,
    getTLCCoreRules: (options) =>
      getTLCCoreRules({ ...defaultOptions, ...options }),
    SUPPORTED_TOOLS,
    TOOL_FILE_PATHS,
  };
}

module.exports = {
  SUPPORTED_TOOLS,
  TOOL_FILE_PATHS,
  getTLCCoreRules,
  generateAgentsMd,
  generateCursorRules,
  generateAntigravityRules,
  generateWindsurfRules,
  generateCopilotRules,
  generateContinueRules,
  generateCodyRules,
  generateAmazonQRules,
  generateAiderRules,
  generateToolRules,
  generateAllToolRules,
  getSupportedTools,
  getToolFilePath,
  createToolRulesGenerator,
};
