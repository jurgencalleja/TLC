/**
 * Team Docs Command Module
 * Handles /tlc:team-docs command for generating team documentation
 */

const fs = require('fs');
const path = require('path');
const {
  ROLES,
  generateRoleGuide,
  generateTeamWorkflow,
  generateOnboardingGuide,
  generateAllDocs,
  createTeamDocsGenerator,
} = require('./team-docs.js');

/**
 * Parse team docs command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseTeamDocsArgs(args = '') {
  const options = {
    action: 'all', // all, role, workflow, onboarding
    role: null,
    output: null,
    projectName: null,
    teamSize: null,
    format: 'markdown',
    dryRun: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === 'all' || part === 'workflow' || part === 'onboarding') {
      options.action = part;
    } else if (part === 'role' && parts[i + 1]) {
      options.action = 'role';
      options.role = parts[++i].toLowerCase();
    } else if (part === '--output' && parts[i + 1]) {
      options.output = parts[++i];
    } else if (part === '--project' && parts[i + 1]) {
      options.projectName = parts[++i];
    } else if (part === '--team-size' && parts[i + 1]) {
      options.teamSize = parseInt(parts[++i], 10);
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (Object.values(ROLES).includes(part.toLowerCase())) {
      options.action = 'role';
      options.role = part.toLowerCase();
    }
  }

  return options;
}

/**
 * Load project config for documentation
 * @param {string} projectDir - Project directory
 * @returns {Object} Project config
 */
function loadProjectConfig(projectDir) {
  const config = {
    projectName: 'Project',
    teamSize: 3,
  };

  // Try package.json
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        config.projectName = pkg.name;
      }
    }
  } catch {
    // Ignore
  }

  // Try PROJECT.md
  try {
    const projectPath = path.join(projectDir, 'PROJECT.md');
    if (fs.existsSync(projectPath)) {
      const content = fs.readFileSync(projectPath, 'utf-8');
      const nameMatch = /^#\s+(.+)$/m.exec(content);
      if (nameMatch) {
        config.projectName = nameMatch[1].trim();
      }
    }
  } catch {
    // Ignore
  }

  // Try .tlc.json
  try {
    const tlcPath = path.join(projectDir, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      const tlc = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
      if (tlc.projectName) {
        config.projectName = tlc.projectName;
      }
      if (tlc.teamSize) {
        config.teamSize = tlc.teamSize;
      }
    }
  } catch {
    // Ignore
  }

  return config;
}

/**
 * Ensure docs directory exists
 * @param {string} projectDir - Project directory
 * @returns {string} Docs directory path
 */
function ensureDocsDir(projectDir) {
  const docsDir = path.join(projectDir, 'docs', 'team');
  fs.mkdirSync(docsDir, { recursive: true });
  return docsDir;
}

/**
 * Write documentation file
 * @param {string} filePath - File path
 * @param {string} content - File content
 */
function writeDocFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Generate and write all documentation
 * @param {string} projectDir - Project directory
 * @param {Object} options - Generation options
 * @returns {Object} Generated files info
 */
function writeAllDocs(projectDir, options = {}) {
  const docsDir = ensureDocsDir(projectDir);
  const docs = generateAllDocs(options);
  const files = [];

  // Write team workflow
  const workflowPath = path.join(docsDir, 'TEAM-WORKFLOW.md');
  writeDocFile(workflowPath, docs.teamWorkflow);
  files.push({ name: 'TEAM-WORKFLOW.md', path: workflowPath });

  // Write onboarding guide
  const onboardingPath = path.join(docsDir, 'ONBOARDING.md');
  writeDocFile(onboardingPath, docs.onboarding);
  files.push({ name: 'ONBOARDING.md', path: onboardingPath });

  // Write role guides
  const roleGuides = [
    { name: 'ENGINEER-GUIDE.md', content: docs.engineerGuide },
    { name: 'PO-GUIDE.md', content: docs.poGuide },
    { name: 'QA-GUIDE.md', content: docs.qaGuide },
    { name: 'LEAD-GUIDE.md', content: docs.leadGuide },
  ];

  for (const guide of roleGuides) {
    const guidePath = path.join(docsDir, guide.name);
    writeDocFile(guidePath, guide.content);
    files.push({ name: guide.name, path: guidePath });
  }

  return { docsDir, files };
}

/**
 * Format documentation summary
 * @param {Object} result - Generation result
 * @returns {string} Summary markdown
 */
function formatDocsSummary(result) {
  const lines = [];

  lines.push('# Team Documentation Generated');
  lines.push('');
  lines.push(`**Location:** ${result.docsDir}`);
  lines.push('');
  lines.push('## Generated Files');
  lines.push('');

  for (const file of result.files) {
    lines.push(`- [${file.name}](${file.path})`);
  }

  lines.push('');
  lines.push('## Quick Links');
  lines.push('');
  lines.push('| Document | Audience |');
  lines.push('|----------|----------|');
  lines.push('| TEAM-WORKFLOW.md | All team members |');
  lines.push('| ONBOARDING.md | New team members |');
  lines.push('| ENGINEER-GUIDE.md | Engineers |');
  lines.push('| PO-GUIDE.md | Product Owners |');
  lines.push('| QA-GUIDE.md | QA Engineers |');
  lines.push('| LEAD-GUIDE.md | Tech Leads |');

  return lines.join('\n');
}

/**
 * Execute team docs command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Object} Command result
 */
async function executeTeamDocsCommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;
  const options = parseTeamDocsArgs(args);

  try {
    // Load project config
    const projectConfig = loadProjectConfig(projectDir);

    // Merge with command options
    const genOptions = {
      projectName: options.projectName || projectConfig.projectName,
      teamSize: options.teamSize || projectConfig.teamSize,
    };

    const result = {
      success: true,
      action: options.action,
    };

    switch (options.action) {
      case 'all': {
        if (options.dryRun) {
          const docs = generateAllDocs(genOptions);
          result.preview = {
            teamWorkflow: docs.teamWorkflow.slice(0, 500) + '\n...',
            files: [
              'TEAM-WORKFLOW.md',
              'ONBOARDING.md',
              'ENGINEER-GUIDE.md',
              'PO-GUIDE.md',
              'QA-GUIDE.md',
              'LEAD-GUIDE.md',
            ],
          };
          result.output = `Would generate 6 documentation files in docs/team/`;
        } else {
          const writeResult = writeAllDocs(projectDir, genOptions);
          result.docsDir = writeResult.docsDir;
          result.files = writeResult.files;
          result.output = formatDocsSummary(writeResult);
        }
        break;
      }

      case 'role': {
        if (!options.role || !Object.values(ROLES).includes(options.role)) {
          return {
            success: false,
            error: `Invalid role. Valid roles: ${Object.values(ROLES).join(', ')}`,
          };
        }

        const guide = generateRoleGuide(options.role);
        result.content = guide;

        if (options.output && !options.dryRun) {
          writeDocFile(options.output, guide);
          result.outputPath = options.output;
        }

        result.output = guide;
        break;
      }

      case 'workflow': {
        const workflow = generateTeamWorkflow(genOptions);
        result.content = workflow;

        if (options.output && !options.dryRun) {
          writeDocFile(options.output, workflow);
          result.outputPath = options.output;
        }

        result.output = workflow;
        break;
      }

      case 'onboarding': {
        const onboarding = generateOnboardingGuide(genOptions);
        result.content = onboarding;

        if (options.output && !options.dryRun) {
          writeDocFile(options.output, onboarding);
          result.outputPath = options.output;
        }

        result.output = onboarding;
        break;
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${options.action}`,
        };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create team docs command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createTeamDocsCommand(options = {}) {
  return {
    execute: (args, ctx) => executeTeamDocsCommand(args, { ...options, ...ctx }),
    parseArgs: parseTeamDocsArgs,
    loadProjectConfig,
    writeAllDocs,
    formatDocsSummary,
    ROLES,
  };
}

module.exports = {
  parseTeamDocsArgs,
  loadProjectConfig,
  ensureDocsDir,
  writeDocFile,
  writeAllDocs,
  formatDocsSummary,
  executeTeamDocsCommand,
  createTeamDocsCommand,
};
