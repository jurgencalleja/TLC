/**
 * Push Gate
 *
 * Wires the static gate engine + LLM reviewer into the pre-push flow.
 * Runs static first (fast feedback), then LLM if static passes.
 * Falls back to static-only on LLM timeout.
 *
 * @module code-gate/push-gate
 */

/** Default LLM review timeout in ms */
const DEFAULT_LLM_TIMEOUT = 60000;

/**
 * Create a push gate instance.
 *
 * @param {Object} [options]
 * @param {number} [options.llmTimeout] - LLM review timeout in ms
 * @returns {{ options: Object }}
 */
function createPushGate(options = {}) {
  return {
    options: {
      llmTimeout: options.llmTimeout || DEFAULT_LLM_TIMEOUT,
    },
  };
}

/**
 * Run the full push gate: static analysis then LLM review.
 *
 * @param {Object} params
 * @param {Function} params.staticGate - Static gate runner (returns gate result)
 * @param {Function} params.llmReview - LLM reviewer (returns review result)
 * @param {Array} params.files - Changed files
 * @param {boolean} [params.override] - Team lead override (TLC_GATE_OVERRIDE)
 * @returns {Promise<Object>} Combined gate result
 */
async function runPushGate(params) {
  const { staticGate, llmReview, files, override = false } = params;

  // Phase 1: Static gate (fast)
  const staticResult = await staticGate(files);

  // Team lead override
  if (!staticResult.passed && override) {
    return {
      passed: true,
      overridden: true,
      staticResult,
      llmResult: null,
      findings: staticResult.findings,
      summary: staticResult.summary,
    };
  }

  // Static failure blocks immediately — no LLM call
  if (!staticResult.passed) {
    return {
      passed: false,
      overridden: false,
      llmSkipped: true,
      staticResult,
      llmResult: null,
      findings: staticResult.findings,
      summary: staticResult.summary,
    };
  }

  // Phase 2: LLM review (only if static passes)
  let llmResult = null;
  let llmSkipped = false;

  try {
    llmResult = await llmReview(files);
  } catch {
    // LLM timeout or error — fall back to static-only
    llmSkipped = true;
  }

  // Merge results
  const merged = mergeResults(staticResult, llmResult);

  return {
    passed: merged.passed,
    overridden: false,
    llmSkipped,
    staticResult,
    llmResult,
    findings: merged.findings,
    summary: merged.summary,
  };
}

/**
 * Merge static gate result with LLM review result.
 * Tags each finding with its source for traceability.
 *
 * @param {Object} staticResult - Static gate result
 * @param {Object|null} llmResult - LLM review result (null if skipped)
 * @returns {{ passed: boolean, findings: Array, summary: Object }}
 */
function mergeResults(staticResult, llmResult) {
  const staticFindings = (staticResult.findings || []).map(f => ({
    ...f,
    source: 'static',
  }));

  const llmFindings = llmResult
    ? (llmResult.findings || []).map(f => ({ ...f, source: 'llm' }))
    : [];

  const allFindings = [...staticFindings, ...llmFindings];

  const summary = {
    total: allFindings.length,
    block: allFindings.filter(f => f.severity === 'block').length,
    warn: allFindings.filter(f => f.severity === 'warn').length,
    info: allFindings.filter(f => f.severity === 'info').length,
  };

  return {
    passed: summary.block === 0,
    findings: allFindings,
    summary,
  };
}

module.exports = {
  runPushGate,
  mergeResults,
  createPushGate,
};
