/**
 * Deploy Branch Command
 *
 * CLI command for deploying branches with security gates and approval workflows.
 */

/**
 * Parse deployment arguments from CLI args
 * @param {string[]} args - Command line arguments
 * @param {object} options - Additional options
 * @returns {object} Parsed arguments
 */
export function parseDeployArgs(args, options = {}) {
  const result = {
    branch: null,
    force: false,
    dryRun: false,
    skipGates: false,
    strategy: null,
    approver: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help') {
      result.help = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--skip-gates') {
      result.skipGates = true;
    } else if (arg === '--strategy' && i + 1 < args.length) {
      result.strategy = args[++i];
    } else if (arg === '--approver' && i + 1 < args.length) {
      result.approver = args[++i];
    } else if (!arg.startsWith('--') && !result.branch) {
      result.branch = arg;
    }
  }

  // Use current branch if not specified
  if (!result.branch && options.currentBranch) {
    result.branch = options.currentBranch;
  }

  return result;
}

/**
 * Validate deployment can proceed
 * @param {object} options - Validation options
 * @returns {Promise<object>} Validation result
 */
export async function validateDeployment(options) {
  const { branch, checkFn } = options;

  const checkResult = await checkFn(branch);

  if (checkResult.hasUncommittedChanges) {
    return {
      valid: false,
      error: 'Cannot deploy with uncommitted changes',
    };
  }

  if (!checkResult.branchExists) {
    return {
      valid: false,
      error: `Branch '${branch}' not found`,
    };
  }

  return {
    valid: true,
    requiresApproval: checkResult.isProtected === true,
  };
}

/**
 * Format duration in human readable form
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

/**
 * Format deployment status for display
 * @param {object} deployment - Deployment status object
 * @returns {string} Formatted status
 */
export function formatDeploymentStatus(deployment) {
  const lines = [];

  lines.push(`Deployment: ${deployment.id}`);
  lines.push(`Branch: ${deployment.branch}`);
  lines.push(`State: ${deployment.state}`);

  if (deployment.duration) {
    lines.push(`Duration: ${formatDuration(deployment.duration)}`);
  }

  if (deployment.error) {
    lines.push(`Error: ${deployment.error}`);
  }

  if (deployment.url) {
    lines.push(`URL: ${deployment.url}`);
  }

  return lines.join('\n');
}

/**
 * Format security gate results for display
 * @param {object} results - Security gate results
 * @returns {string} Formatted results
 */
export function formatSecurityGateResults(results) {
  const lines = [];
  const gates = Object.entries(results.gates);
  const passedCount = gates.filter(([, gate]) => gate.status === 'passed').length;

  lines.push(`Security Gates: ${passedCount}/${gates.length} passed`);
  lines.push('');

  for (const [name, gate] of gates) {
    const icon = gate.status === 'passed' ? '✓' : '✗';
    lines.push(`${icon} ${name}: ${gate.status}`);

    if (gate.findings && gate.findings.length > 0) {
      for (const finding of gate.findings) {
        if (finding.message) {
          lines.push(`    - [${finding.severity || 'info'}] ${finding.message}`);
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Create the deploy branch command
 * @param {object} deps - Dependencies for the command
 * @returns {object} Command object
 */
export function createDeployBranchCommand(deps = {}) {
  const {
    classifier = { classify: () => 'feature' },
    securityGates = { runAll: async () => ({ passed: true, gates: {} }) },
    executor = { execute: async () => ({ state: 'completed' }) },
    approval = { createRequest: async () => ({ status: 'pending', id: 'req-000' }) },
    audit = { log: () => {} },
  } = deps;

  return {
    name: 'deploy',
    description: 'Deploy a branch to the target environment',

    /**
     * Execute the deploy command
     * @param {string[]} args - Command arguments
     * @param {object} context - Execution context
     * @returns {Promise<object>} Deployment result
     */
    async execute(args, context = {}) {
      const parsedArgs = parseDeployArgs(args, context);

      if (parsedArgs.help) {
        return {
          help: true,
          usage: 'deploy <branch> [--force] [--dry-run] [--skip-gates] [--strategy <name>] [--approver <name>]',
        };
      }

      const branch = parsedArgs.branch;
      const branchType = classifier.classify(branch);

      // Log audit event for deployment start
      if (audit.log) {
        audit.log({
          event: 'deployment_started',
          branch,
          branchType,
          user: context.user,
          timestamp: new Date().toISOString(),
        });
      }

      // For stable branches (like main), require approval
      if (branchType === 'stable') {
        const approvalRequest = await approval.createRequest({
          branch,
          user: context.user,
          approver: parsedArgs.approver,
        });

        return {
          requiresApproval: true,
          approvalRequest,
          branch,
          branchType,
        };
      }

      // Run security gates unless skipped
      let gatesResult = { passed: true, gates: {} };
      let warning = null;

      if (parsedArgs.skipGates) {
        warning = 'Security gates skipped - deploy at your own risk';
      } else {
        gatesResult = await securityGates.runAll(branch);

        // Block if security gates fail
        if (!gatesResult.passed) {
          return {
            blocked: true,
            reason: 'Deployment blocked due to security gate failures',
            gatesResult,
            branch,
            branchType,
          };
        }
      }

      // Dry run - don't actually deploy
      if (parsedArgs.dryRun) {
        return {
          dryRun: true,
          branch,
          branchType,
          gatesResult,
          message: 'Dry run complete - no deployment executed',
        };
      }

      // Execute the deployment
      const deploymentResult = await executor.execute({
        branch,
        branchType,
        strategy: parsedArgs.strategy,
        force: parsedArgs.force,
      });

      // Log audit event for deployment completion
      if (audit.log) {
        audit.log({
          event: 'deployment_completed',
          branch,
          branchType,
          user: context.user,
          state: deploymentResult.state,
          timestamp: new Date().toISOString(),
        });
      }

      const result = {
        ...deploymentResult,
        branch,
        branchType,
        gatesResult,
      };

      if (warning) {
        result.warning = warning;
      }

      return result;
    },
  };
}
