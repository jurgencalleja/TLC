/**
 * CI Command Module
 * Handles /tlc:ci command for GitHub Actions workflow generation
 */

const fs = require('fs');
const path = require('path');
const {
  detectPackageManager,
  generateTestWorkflow,
  generatePRWorkflow,
  serializeWorkflow,
  createGitHubActionsGenerator,
} = require('./github-actions.js');

/**
 * Detect project files for package manager detection
 * @param {string} projectDir - Project directory
 * @returns {Object} Files present
 */
function detectProjectFiles(projectDir) {
  const files = {};
  const checkFiles = [
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
    'package.json',
    'requirements.txt',
    'pyproject.toml',
    'go.mod',
  ];

  for (const file of checkFiles) {
    const filePath = path.join(projectDir, file);
    try {
      files[file] = fs.existsSync(filePath);
    } catch {
      files[file] = false;
    }
  }

  return files;
}

/**
 * Check if .github/workflows directory exists
 * @param {string} projectDir - Project directory
 * @returns {boolean} Directory exists
 */
function workflowsDirExists(projectDir) {
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  try {
    return fs.existsSync(workflowsDir);
  } catch {
    return false;
  }
}

/**
 * Ensure .github/workflows directory exists
 * @param {string} projectDir - Project directory
 */
function ensureWorkflowsDir(projectDir) {
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });
}

/**
 * List existing workflow files
 * @param {string} projectDir - Project directory
 * @returns {Array} Workflow files
 */
function listWorkflowFiles(projectDir) {
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  try {
    if (!fs.existsSync(workflowsDir)) {
      return [];
    }
    return fs.readdirSync(workflowsDir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    return [];
  }
}

/**
 * Write workflow file
 * @param {string} projectDir - Project directory
 * @param {string} filename - Workflow filename
 * @param {string} content - YAML content
 * @returns {string} Full path
 */
function writeWorkflowFile(projectDir, filename, content) {
  ensureWorkflowsDir(projectDir);
  const filePath = path.join(projectDir, '.github', 'workflows', filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Parse CI command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseCIArgs(args = '') {
  const options = {
    type: 'test', // test, pr, both
    coverage: true,
    lint: true,
    coverageThreshold: null,
    nodeVersions: ['20'],
    branches: ['main', 'master'],
    output: null,
    dryRun: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--pr') {
      options.type = 'pr';
    } else if (part === '--test') {
      options.type = 'test';
    } else if (part === '--both') {
      options.type = 'both';
    } else if (part === '--no-coverage') {
      options.coverage = false;
    } else if (part === '--no-lint') {
      options.lint = false;
    } else if (part === '--threshold' && parts[i + 1]) {
      options.coverageThreshold = parseInt(parts[++i], 10);
    } else if (part === '--node' && parts[i + 1]) {
      options.nodeVersions = parts[++i].split(',');
    } else if (part === '--branches' && parts[i + 1]) {
      options.branches = parts[++i].split(',');
    } else if (part === '--output' && parts[i + 1]) {
      options.output = parts[++i];
    } else if (part === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

/**
 * Generate workflow based on options
 * @param {Object} options - Generation options
 * @param {string} packageManager - Detected package manager
 * @returns {Object} Generated workflows
 */
function generateWorkflows(options, packageManager) {
  const workflows = {};

  const baseOptions = {
    packageManager,
    nodeVersions: options.nodeVersions,
    branches: options.branches,
    withCoverage: options.coverage,
    withLint: options.lint,
    coverageThreshold: options.coverageThreshold,
  };

  if (options.type === 'test' || options.type === 'both') {
    workflows.test = {
      filename: 'test.yml',
      workflow: generateTestWorkflow(baseOptions),
    };
  }

  if (options.type === 'pr' || options.type === 'both') {
    workflows.pr = {
      filename: 'pr.yml',
      workflow: generatePRWorkflow({
        ...baseOptions,
        reportToComment: true,
      }),
    };
  }

  return workflows;
}

/**
 * Format workflow summary
 * @param {Object} workflows - Generated workflows
 * @param {string} packageManager - Package manager
 * @param {Object} options - Generation options
 * @returns {string} Summary text
 */
function formatSummary(workflows, packageManager, options) {
  const lines = [];

  lines.push('# GitHub Actions CI Configuration');
  lines.push('');
  lines.push(`**Package Manager:** ${packageManager}`);
  lines.push(`**Coverage:** ${options.coverage ? 'Enabled' : 'Disabled'}`);
  lines.push(`**Lint:** ${options.lint ? 'Enabled' : 'Disabled'}`);

  if (options.coverageThreshold) {
    lines.push(`**Coverage Threshold:** ${options.coverageThreshold}%`);
  }

  lines.push('');
  lines.push('## Generated Workflows');
  lines.push('');

  for (const [key, { filename, workflow }] of Object.entries(workflows)) {
    lines.push(`### ${filename}`);
    lines.push('');
    lines.push(`- **Name:** ${workflow.name}`);
    lines.push(`- **Triggers:** ${Object.keys(workflow.on).join(', ')}`);

    if (workflow.jobs.test?.strategy?.matrix?.['node-version']) {
      lines.push(`- **Node Versions:** ${workflow.jobs.test.strategy.matrix['node-version'].join(', ')}`);
    }

    const steps = workflow.jobs.test?.steps || [];
    lines.push(`- **Steps:** ${steps.length}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Execute CI command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Object} Command result
 */
async function executeCICommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;

  try {
    // Parse arguments
    const options = parseCIArgs(args);

    // Detect package manager
    const files = detectProjectFiles(projectDir);
    const packageManager = detectPackageManager(files);

    // Generate workflows
    const workflows = generateWorkflows(options, packageManager);

    if (Object.keys(workflows).length === 0) {
      return {
        success: false,
        error: 'No workflow type specified. Use --test, --pr, or --both',
      };
    }

    // Generate YAML
    const results = {};
    for (const [key, { filename, workflow }] of Object.entries(workflows)) {
      results[key] = {
        filename,
        yaml: serializeWorkflow(workflow),
        workflow,
      };
    }

    // Dry run - just return preview
    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        packageManager,
        workflows: results,
        summary: formatSummary(workflows, packageManager, options),
      };
    }

    // Write files
    const written = [];
    for (const [key, { filename, yaml }] of Object.entries(results)) {
      const filePath = writeWorkflowFile(projectDir, filename, yaml);
      written.push(filePath);
    }

    return {
      success: true,
      packageManager,
      workflows: results,
      written,
      summary: formatSummary(workflows, packageManager, options),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get existing CI configuration
 * @param {string} projectDir - Project directory
 * @returns {Object} Existing configuration
 */
function getExistingCI(projectDir) {
  const workflowFiles = listWorkflowFiles(projectDir);

  return {
    hasWorkflows: workflowFiles.length > 0,
    files: workflowFiles,
    workflowsDir: workflowsDirExists(projectDir),
  };
}

/**
 * Create CI command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createCICommand(options = {}) {
  return {
    execute: (args, context) => executeCICommand(args, { ...options, ...context }),
    parseArgs: parseCIArgs,
    detectProjectFiles,
    detectPackageManager,
    generateWorkflows,
    getExistingCI,
    listWorkflowFiles,
  };
}

module.exports = {
  detectProjectFiles,
  workflowsDirExists,
  ensureWorkflowsDir,
  listWorkflowFiles,
  writeWorkflowFile,
  parseCIArgs,
  generateWorkflows,
  formatSummary,
  executeCICommand,
  getExistingCI,
  createCICommand,
};
