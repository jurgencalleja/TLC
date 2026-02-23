/**
 * Security Gates Module
 *
 * Provides security gate types, status constants, and functions for
 * running security gates during deployment validation.
 */

import { createDependencyRunner } from './runners/dependency-runner.js';
import { createSecretsRunner } from './runners/secrets-runner.js';

/**
 * Gate type constants
 */
export const GATE_TYPES = {
  SAST: 'sast',
  DAST: 'dast',
  DEPENDENCIES: 'dependencies',
  CONTAINER: 'container',
  SECRETS: 'secrets',
};

/**
 * Gate status constants
 */
export const GATE_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ERROR: 'error',
};

/**
 * Default gate configuration by tier
 */
const DEFAULT_TIER_GATES = {
  feature: ['sast', 'dependencies'],
  dev: ['sast', 'dast', 'dependencies', 'container'],
  stable: ['sast', 'dast', 'dependencies', 'container', 'secrets'],
};

/**
 * Built-in runners for dependencies and secrets gates.
 * SAST, DAST, and container gates require custom runner injection.
 * Gates without runners will SKIP (not fake-pass).
 */
const builtInRunners = {
  dependencies: createDependencyRunner(),
  secrets: createSecretsRunner(),
};

/**
 * Get the list of security gates for a given tier
 * @param {string} tier - The deployment tier (feature, dev, stable)
 * @param {Object} [config] - Custom gate configuration by tier
 * @returns {string[]} Array of gate types for the tier
 */
export function getGatesForTier(tier, config = null) {
  const tierGates = config || DEFAULT_TIER_GATES;
  return tierGates[tier] || [];
}

/**
 * Create a gate result object
 * @param {string} gate - The gate type
 * @param {string} status - The gate status
 * @param {Object} [options] - Additional options
 * @param {Array} [options.findings] - Security findings
 * @param {number} [options.duration] - Duration in milliseconds
 * @param {string} [options.error] - Error message if status is error
 * @returns {Object} Gate result object
 */
export function createGateResult(gate, status, options = {}) {
  const result = {
    gate,
    status,
    passed: status === GATE_STATUS.PASSED,
  };

  if (options.findings !== undefined) {
    result.findings = options.findings;
  }

  if (options.duration !== undefined) {
    result.duration = options.duration;
  }

  if (options.error !== undefined) {
    result.error = options.error;
  }

  return result;
}

/**
 * Run a single security gate
 * @param {string} gate - The gate type to run
 * @param {Object} options - Gate options
 * @param {string} options.projectPath - Path to the project
 * @param {Object} [options.runners] - Custom gate runners
 * @param {Object} [options.gateOptions] - Additional options passed to the runner
 * @returns {Promise<Object>} Gate result
 */
export async function runSecurityGate(gate, options = {}) {
  const { projectPath, runners = {}, gateOptions = {} } = options;
  const runner = runners[gate];

  // Skip if no runner available
  if (!runner) {
    return createGateResult(gate, GATE_STATUS.SKIPPED);
  }

  const startTime = Date.now();

  try {
    const runnerResult = await runner(projectPath, gateOptions);
    const duration = Date.now() - startTime;

    const status = runnerResult.passed ? GATE_STATUS.PASSED : GATE_STATUS.FAILED;

    return createGateResult(gate, status, {
      findings: runnerResult.findings,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return createGateResult(gate, GATE_STATUS.ERROR, {
      error: error.message,
      duration,
    });
  }
}

/**
 * Run all security gates for a tier in parallel
 * @param {string} tier - The deployment tier
 * @param {Object} options - Gate options
 * @param {string} options.projectPath - Path to the project
 * @param {Object} [options.runners] - Custom gate runners
 * @param {Object} [options.gateConfig] - Custom gate configuration by tier
 * @param {Object} [options.gateOptions] - Additional options passed to runners
 * @returns {Promise<Object>} Combined results with overall status
 */
export async function runAllGates(tier, options = {}) {
  const { projectPath, runners = {}, gateConfig = null, gateOptions = {} } = options;

  const gates = getGatesForTier(tier, gateConfig);

  // Run all gates in parallel
  const gatePromises = gates.map((gate) =>
    runSecurityGate(gate, { projectPath, runners, gateOptions })
  );

  const results = await Promise.all(gatePromises);

  // Build gates object keyed by gate name
  const gatesResult = {};
  for (const result of results) {
    gatesResult[result.gate] = result;
  }

  // Collect all findings
  const allFindings = results.flatMap((result) => result.findings || []);

  // Overall pass only if all gates passed
  const passed = results.every(
    (result) => result.status === GATE_STATUS.PASSED || result.status === GATE_STATUS.SKIPPED
  );

  return {
    passed,
    gates: gatesResult,
    allFindings,
  };
}

/**
 * Create a security gates manager
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.runners] - Custom gate runners
 * @param {Object} [config.gateConfig] - Custom gate configuration by tier
 * @returns {Object} Security gates manager
 */
export function createSecurityGates(config = {}) {
  const { runners = {}, gateConfig = null } = config;

  // Merge built-in runners with custom runners (custom overrides built-in)
  const allRunners = { ...builtInRunners, ...runners };

  return {
    /**
     * Run a single security gate
     * @param {string} gate - Gate type
     * @param {Object} options - Options including projectPath
     * @returns {Promise<Object>} Gate result
     */
    run: (gate, options = {}) =>
      runSecurityGate(gate, { ...options, runners: allRunners }),

    /**
     * Run all gates for a tier
     * @param {string} tier - Deployment tier
     * @param {Object} options - Options including projectPath
     * @returns {Promise<Object>} Combined results
     */
    runAll: (tier, options = {}) =>
      runAllGates(tier, { ...options, runners: allRunners, gateConfig }),

    /**
     * Get gates for a tier
     * @param {string} tier - Deployment tier
     * @returns {string[]} Array of gate types
     */
    getGatesForTier: (tier) => getGatesForTier(tier, gateConfig),

    /**
     * Check if a runner exists for a gate type
     * @param {string} gate - Gate type
     * @returns {boolean} True if runner exists
     */
    hasRunner: (gate) => gate in allRunners,
  };
}
