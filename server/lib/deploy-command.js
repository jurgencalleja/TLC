/**
 * Deploy Command Module
 * Handles /tlc:deploy command for VPS deployment management
 */

const path = require('path');
const fs = require('fs');
const {
  createBranchDeployer,
  DEPLOYMENT_STATUS,
  sanitizeBranchName,
  generateSubdomain,
} = require('./branch-deployer.js');
const { createSlackNotifier, loadSlackConfig } = require('./slack-notifier.js');

/**
 * Parse deploy command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseDeployArgs(args = '') {
  const options = {
    action: 'status', // status, start, stop, logs, list, setup
    branch: null,
    project: null,
    force: false,
    tail: 100,
    follow: false,
    port: null,
    domain: null,
    envFile: null,
    dryRun: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (['status', 'start', 'stop', 'logs', 'list', 'setup', 'config'].includes(part)) {
      options.action = part;
    } else if (part === '--branch' && parts[i + 1]) {
      options.branch = parts[++i];
    } else if (part === '--project' && parts[i + 1]) {
      options.project = parts[++i];
    } else if (part === '--force' || part === '-f') {
      options.force = true;
    } else if (part === '--tail' && parts[i + 1]) {
      options.tail = parseInt(parts[++i], 10);
    } else if (part === '--follow' || part === '-F') {
      options.follow = true;
    } else if (part === '--port' && parts[i + 1]) {
      options.port = parseInt(parts[++i], 10);
    } else if (part === '--domain' && parts[i + 1]) {
      options.domain = parts[++i];
    } else if (part === '--env-file' && parts[i + 1]) {
      options.envFile = parts[++i];
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (!options.branch && !part.startsWith('-')) {
      // First positional arg after action is branch
      options.branch = part;
    }
  }

  return options;
}

/**
 * Load deploy configuration
 * @param {string} projectDir - Project directory
 * @returns {Object} Deploy config
 */
function loadDeployConfig(projectDir) {
  const config = {
    project: 'project',
    domain: null,
    port: 10000,
    workDir: '/var/tlc/deployments',
    slack: null,
  };

  // Try package.json for project name
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        config.project = pkg.name;
      }
    }
  } catch {
    // Ignore
  }

  // Try .tlc.json for deploy config
  try {
    const tlcPath = path.join(projectDir, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      const tlc = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));

      if (tlc.projectName) {
        config.project = tlc.projectName;
      }

      if (tlc.deploy) {
        Object.assign(config, tlc.deploy);
      }

      if (tlc.slack) {
        config.slack = loadSlackConfig(tlc);
      }
    }
  } catch {
    // Ignore
  }

  return config;
}

/**
 * Load environment variables from file
 * @param {string} filePath - Env file path
 * @returns {Object} Environment variables
 */
function loadEnvFile(filePath) {
  const env = {};

  try {
    if (!fs.existsSync(filePath)) {
      return env;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    }
  } catch {
    // Ignore
  }

  return env;
}

/**
 * Get current git branch
 * @param {string} projectDir - Project directory
 * @returns {string|null} Branch name
 */
function getCurrentBranch(projectDir) {
  try {
    const headPath = path.join(projectDir, '.git', 'HEAD');
    if (fs.existsSync(headPath)) {
      const content = fs.readFileSync(headPath, 'utf-8').trim();
      if (content.startsWith('ref: refs/heads/')) {
        return content.replace('ref: refs/heads/', '');
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Get git remote URL
 * @param {string} projectDir - Project directory
 * @returns {string|null} Remote URL
 */
function getGitRemoteUrl(projectDir) {
  try {
    const configPath = path.join(projectDir, '.git', 'config');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const match = /\[remote "origin"\][^[]*url\s*=\s*(.+)/m.exec(content);
      if (match) {
        return match[1].trim();
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Format deployment status for display
 * @param {Object} deployment - Deployment data
 * @returns {string} Formatted status
 */
function formatDeploymentStatus(deployment) {
  const lines = [];

  lines.push(`# Deployment: ${deployment.branch || 'unknown'}`);
  lines.push('');
  lines.push(`**Status:** ${deployment.status}`);

  if (deployment.subdomain) {
    lines.push(`**URL:** https://${deployment.subdomain}`);
  }

  if (deployment.port) {
    lines.push(`**Port:** ${deployment.port}`);
  }

  if (deployment.containerName) {
    lines.push(`**Container:** ${deployment.containerName}`);
  }

  if (deployment.startedAt) {
    lines.push(`**Started:** ${deployment.startedAt}`);
  }

  if (deployment.error) {
    lines.push('');
    lines.push(`**Error:** ${deployment.error}`);
  }

  return lines.join('\n');
}

/**
 * Format deployment list for display
 * @param {Array} deployments - List of deployments
 * @returns {string} Formatted list
 */
function formatDeploymentList(deployments) {
  if (!deployments || deployments.length === 0) {
    return 'No active deployments found.';
  }

  const lines = [];

  lines.push('# Active Deployments');
  lines.push('');
  lines.push('| Container | Status | Ports | Created |');
  lines.push('|-----------|--------|-------|---------|');

  for (const d of deployments) {
    lines.push(
      `| ${d.containerName} | ${d.status} | ${d.ports || 'N/A'} | ${d.created || 'N/A'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format setup instructions
 * @param {Object} config - Deploy config
 * @returns {string} Setup instructions
 */
function formatSetupInstructions(config) {
  const lines = [];

  lines.push('# TLC Deploy Setup');
  lines.push('');
  lines.push('## Prerequisites');
  lines.push('');
  lines.push('1. Docker installed on VPS');
  lines.push('2. Domain configured with wildcard DNS (*.app.example.com)');
  lines.push('3. Caddy or nginx for reverse proxy');
  lines.push('');
  lines.push('## Configuration');
  lines.push('');
  lines.push('Add to `.tlc.json`:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    deploy: {
      domain: 'app.example.com',
      port: 10000,
      workDir: '/var/tlc/deployments',
    },
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      channel: '#dev-notifications',
      events: ['bug', 'test-fail', 'deploy', 'claim'],
    },
  }, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## GitHub Webhook');
  lines.push('');
  lines.push('1. Go to repo Settings → Webhooks');
  lines.push('2. Add webhook:');
  lines.push(`   - URL: https://${config.domain || 'your-domain'}/api/webhook`);
  lines.push('   - Content type: application/json');
  lines.push('   - Secret: (generate one)');
  lines.push('   - Events: Push, Pull requests');
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  lines.push('```');
  lines.push('/tlc:deploy start --branch feature/auth   # Deploy branch');
  lines.push('/tlc:deploy stop --branch feature/auth    # Stop deployment');
  lines.push('/tlc:deploy logs --branch feature/auth    # View logs');
  lines.push('/tlc:deploy list                          # List deployments');
  lines.push('/tlc:deploy status                        # Current branch status');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Execute deploy command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Command result
 */
async function executeDeployCommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;
  const options = parseDeployArgs(args);
  const config = loadDeployConfig(projectDir);

  // Get branch from options or current branch
  const branch = options.branch || getCurrentBranch(projectDir);
  const project = options.project || config.project;

  try {
    const deployer = createBranchDeployer({
      workDir: config.workDir,
      baseDomain: options.domain || config.domain,
      basePort: options.port || config.port,
    });

    // Initialize Slack notifier if configured
    const slack = config.slack
      ? createSlackNotifier(config.slack)
      : null;

    switch (options.action) {
      case 'setup':
      case 'config': {
        return {
          success: true,
          output: formatSetupInstructions(config),
        };
      }

      case 'list': {
        const deployments = await deployer.list();
        return {
          success: true,
          deployments,
          output: formatDeploymentList(deployments),
        };
      }

      case 'status': {
        if (!branch) {
          return {
            success: false,
            error: 'No branch specified and not in a git repository',
          };
        }

        const status = await deployer.status(project, branch);
        const deployment = deployer.getDeployment(project, branch) || {
          branch,
          project,
          ...status,
        };

        return {
          success: true,
          deployment,
          output: formatDeploymentStatus(deployment),
        };
      }

      case 'start': {
        if (!branch) {
          return {
            success: false,
            error: 'Branch is required for deployment',
          };
        }

        const repoUrl = getGitRemoteUrl(projectDir);
        if (!repoUrl) {
          return {
            success: false,
            error: 'Could not detect git remote URL',
          };
        }

        // Load env vars if specified
        const envVars = options.envFile
          ? loadEnvFile(path.join(projectDir, options.envFile))
          : {};

        if (options.dryRun) {
          const subdomain = generateSubdomain(branch, config.domain || 'localhost');
          return {
            success: true,
            dryRun: true,
            output: `Would deploy branch '${branch}' to ${subdomain}`,
          };
        }

        const deployment = await deployer.deploy(repoUrl, branch, project, envVars);

        // Send Slack notification
        if (slack) {
          await slack.deploy({
            branch,
            subdomain: deployment.subdomain,
            status: deployment.status,
            error: deployment.error,
          });
        }

        return {
          success: deployment.status === DEPLOYMENT_STATUS.RUNNING,
          deployment,
          output: formatDeploymentStatus(deployment),
        };
      }

      case 'stop': {
        if (!branch) {
          return {
            success: false,
            error: 'Branch is required',
          };
        }

        if (options.dryRun) {
          return {
            success: true,
            dryRun: true,
            output: `Would stop deployment for branch '${branch}'`,
          };
        }

        const result = await deployer.stop(project, branch);

        return {
          success: result.success,
          output: result.success
            ? `Stopped deployment for ${branch}`
            : `Failed to stop deployment for ${branch}`,
        };
      }

      case 'logs': {
        if (!branch) {
          return {
            success: false,
            error: 'Branch is required',
          };
        }

        const logsResult = await deployer.logs(project, branch, {
          tail: options.tail,
        });

        return {
          success: logsResult.success,
          logs: logsResult.logs,
          output: logsResult.success
            ? logsResult.logs
            : `Error: ${logsResult.error}`,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${options.action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create deploy command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createDeployCommand(options = {}) {
  return {
    execute: (args, ctx) => executeDeployCommand(args, { ...options, ...ctx }),
    parseArgs: parseDeployArgs,
    loadDeployConfig,
    loadEnvFile,
    getCurrentBranch,
    getGitRemoteUrl,
    formatDeploymentStatus,
    formatDeploymentList,
    formatSetupInstructions,
    DEPLOYMENT_STATUS,
  };
}

module.exports = {
  parseDeployArgs,
  loadDeployConfig,
  loadEnvFile,
  getCurrentBranch,
  getGitRemoteUrl,
  formatDeploymentStatus,
  formatDeploymentList,
  formatSetupInstructions,
  executeDeployCommand,
  createDeployCommand,
};
