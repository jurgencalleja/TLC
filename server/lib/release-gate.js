/**
 * Release Gate Engine - Configurable quality gates that must pass before
 * a tag can be promoted. Gates run in sequence; any failure blocks promotion.
 *
 * @module release-gate
 */

/**
 * @typedef {Object} GateResult
 * @property {string} gate - Name of the gate
 * @property {'pass'|'fail'|'pending'|'skipped'} status - Gate outcome
 * @property {number} duration - Execution time in milliseconds
 * @property {Object} details - Gate-specific detail object
 * @property {Function} [approve] - Only on qa-approval gates with pending status
 * @property {Function} [reject] - Only on qa-approval gates with pending status
 */

/**
 * @typedef {Object} GateRunResult
 * @property {boolean} passed - True only if every gate passed
 * @property {GateResult[]} results - Ordered array of individual gate results
 */

/**
 * Built-in gate: tests.
 * Delegates to the provided checker function, which should return
 * { passed: boolean, total: number, failed: number }.
 *
 * @param {Object} tag - Parsed tag info from parseTag()
 * @param {Object} config - Release config from loadReleaseConfig()
 * @param {Function} checker - Injected test-runner function
 * @returns {Promise<GateResult>}
 */
async function runTestsGate(tag, config, checker) {
  const start = Date.now();
  const result = await checker(tag, config);
  const duration = Date.now() - start;

  return {
    gate: 'tests',
    status: result.passed ? 'pass' : 'fail',
    duration,
    details: {
      total: result.total,
      failed: result.failed,
    },
  };
}

/**
 * Built-in gate: security.
 * Delegates to the provided checker function, which should return
 * { passed: boolean, secrets: Array }.
 *
 * @param {Object} tag - Parsed tag info
 * @param {Object} config - Release config
 * @param {Function} checker - Injected security-scan function
 * @returns {Promise<GateResult>}
 */
async function runSecurityGate(tag, config, checker) {
  const start = Date.now();
  const result = await checker(tag, config);
  const duration = Date.now() - start;

  return {
    gate: 'security',
    status: result.passed ? 'pass' : 'fail',
    duration,
    details: {
      secrets: result.secrets,
    },
  };
}

/**
 * Built-in gate: coverage.
 * Delegates to the provided checker function, which should return
 * { passed: boolean, percentage: number }.
 * Includes the configured threshold in the details on failure.
 *
 * @param {Object} tag - Parsed tag info
 * @param {Object} config - Release config
 * @param {Function} checker - Injected coverage-check function
 * @returns {Promise<GateResult>}
 */
async function runCoverageGate(tag, config, checker) {
  const start = Date.now();
  const result = await checker(tag, config);
  const duration = Date.now() - start;

  // Look up threshold from config for the tag's tier
  const tier = tag.tier;
  const threshold =
    config.tiers && config.tiers[tier] && config.tiers[tier].coverageThreshold != null
      ? config.tiers[tier].coverageThreshold
      : 80;

  return {
    gate: 'coverage',
    status: result.passed ? 'pass' : 'fail',
    duration,
    details: {
      percentage: result.percentage,
      threshold,
    },
  };
}

/**
 * Built-in gate: qa-approval.
 * Returns a pending result with approve() and reject() methods.
 * Calling approve() transitions status to 'pass'.
 * Calling reject(reason) transitions status to 'fail' with a reason in details.
 *
 * @param {Object} _tag - Parsed tag info (unused)
 * @param {Object} _config - Release config (unused)
 * @returns {Promise<GateResult>}
 */
async function runQaApprovalGate(_tag, _config) {
  const start = Date.now();
  const duration = Date.now() - start;

  const gateResult = {
    gate: 'qa-approval',
    status: 'pending',
    duration,
    details: {},
  };

  gateResult.approve = () => {
    gateResult.status = 'pass';
  };

  gateResult.reject = (reason) => {
    gateResult.status = 'fail';
    gateResult.details.reason = reason;
  };

  return gateResult;
}

/** Map of built-in gate names to their runner functions */
const BUILTIN_GATES = {
  tests: runTestsGate,
  security: runSecurityGate,
  coverage: runCoverageGate,
  'qa-approval': runQaApprovalGate,
};

/**
 * Run a sequence of quality gates for a given tag.
 * Gates execute in order. If any gate fails, subsequent gates are marked 'skipped'.
 * Custom gate checker functions can be injected via options.checkers.
 *
 * @param {Object} tag - Parsed tag info (from parseTag())
 * @param {string[]} gates - Ordered list of gate names to run
 * @param {Object} config - Release config (from loadReleaseConfig())
 * @param {Object} [options={}] - Options
 * @param {Object.<string, Function>} [options.checkers] - Map of gate name to checker function
 * @returns {Promise<GateRunResult>} Overall result with per-gate details
 */
export async function runGates(tag, gates, config, options = {}) {
  const checkers = (options && options.checkers) || {};
  const results = [];
  let blocked = false;

  for (const gateName of gates) {
    if (blocked) {
      results.push({
        gate: gateName,
        status: 'skipped',
        duration: 0,
        details: {},
      });
      continue;
    }

    // Determine how to run this gate
    const isBuiltin = gateName in BUILTIN_GATES;
    const hasChecker = gateName in checkers;

    if (gateName === 'qa-approval') {
      // qa-approval is always handled by the built-in runner
      const gateResult = await runQaApprovalGate(tag, config);
      results.push(gateResult);
      // pending counts as not-passed, blocks subsequent gates
      if (gateResult.status !== 'pass') {
        blocked = true;
      }
    } else if (hasChecker && isBuiltin) {
      // Built-in gate with injected checker
      const gateResult = await BUILTIN_GATES[gateName](tag, config, checkers[gateName]);
      results.push(gateResult);
      if (gateResult.status !== 'pass') {
        blocked = true;
      }
    } else if (hasChecker && !isBuiltin) {
      // Custom gate with injected checker - run it as a generic checker
      const start = Date.now();
      const checkerResult = await checkers[gateName](tag, config);
      const duration = Date.now() - start;
      const gateResult = {
        gate: gateName,
        status: checkerResult.passed ? 'pass' : 'fail',
        duration,
        details: { ...checkerResult },
      };
      // Remove 'passed' from details since it's represented by status
      delete gateResult.details.passed;
      results.push(gateResult);
      if (gateResult.status !== 'pass') {
        blocked = true;
      }
    } else if (isBuiltin && !hasChecker) {
      // Built-in gate without checker - this shouldn't happen for tests/security/coverage
      // but we handle it gracefully
      results.push({
        gate: gateName,
        status: 'fail',
        duration: 0,
        details: { error: `No checker provided for built-in gate: ${gateName}` },
      });
      blocked = true;
    } else {
      // Unknown gate type
      results.push({
        gate: gateName,
        status: 'fail',
        duration: 0,
        details: { error: `Unknown gate type: ${gateName}` },
      });
      blocked = true;
    }
  }

  const passed = results.length === 0 || results.every(r => r.status === 'pass');

  return { passed, results };
}

/**
 * Create a gate runner instance bound to a specific config.
 * The returned runner has a `run` method that uses the bound config.
 *
 * @param {Object} config - Release config (from loadReleaseConfig())
 * @returns {{ run: (tag: Object, gates: string[], options?: Object) => Promise<GateRunResult> }}
 */
export function createGateRunner(config) {
  return {
    /**
     * Run gates using the config bound at creation time.
     *
     * @param {Object} tag - Parsed tag info
     * @param {string[]} gates - Ordered list of gate names
     * @param {Object} [options={}] - Options (checkers, etc.)
     * @returns {Promise<GateRunResult>}
     */
    run(tag, gates, options = {}) {
      return runGates(tag, gates, config, options);
    },
  };
}

export default {
  createGateRunner,
  runGates,
};
