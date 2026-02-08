/**
 * Multi-Model Reviewer
 *
 * Sends code reviews to 2+ LLM models and aggregates findings.
 * Different models catch different bugs — consensus scoring
 * highlights issues multiple models agree on.
 *
 * @module code-gate/multi-model-reviewer
 */

/** Severity priority for conflict resolution (higher wins) */
const SEVERITY_PRIORITY = { block: 3, warn: 2, info: 1 };

/**
 * Send diff to multiple models in parallel
 * @param {string} diff - Git diff content
 * @param {string[]} models - List of model names
 * @param {Object} options - Options
 * @param {Function} options.reviewFn - Function(diff, model) => { findings, summary }
 * @param {number} options.timeout - Per-model timeout in ms
 * @returns {Promise<Array>} Results from successful models
 */
async function sendToModels(diff, models, options = {}) {
  const { reviewFn, timeout } = options;
  const results = [];

  const promises = models.map(async (model) => {
    try {
      let reviewPromise = reviewFn(diff, model);

      // Apply per-model timeout if specified
      if (timeout) {
        reviewPromise = Promise.race([
          reviewPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout for ${model}`)), timeout)
          ),
        ]);
      }

      const result = await reviewPromise;
      return { model, ...result };
    } catch {
      return null; // Model failed, will be filtered out
    }
  });

  const settled = await Promise.all(promises);
  for (const result of settled) {
    if (result) results.push(result);
  }

  return results;
}

/**
 * Aggregate and deduplicate findings from multiple models
 * @param {Array} modelResults - Results from sendToModels
 * @returns {Object} Aggregated result with deduplicated findings
 */
function aggregateFindings(modelResults) {
  // Collect all findings with model attribution
  const allFindings = [];

  for (const result of modelResults) {
    for (const finding of (result.findings || [])) {
      allFindings.push({
        ...finding,
        flaggedBy: [result.model],
      });
    }
  }

  // Deduplicate
  const deduped = deduplicateFindings(allFindings);

  return {
    findings: deduped,
    modelCount: modelResults.length,
  };
}

/**
 * Deduplicate findings by file+line+rule, merging flaggedBy lists
 * @param {Array} findings - All findings with flaggedBy
 * @returns {Array} Deduplicated findings
 */
function deduplicateFindings(findings) {
  const map = new Map();

  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}:${finding.rule}`;

    if (map.has(key)) {
      const existing = map.get(key);
      // Merge flaggedBy
      for (const model of finding.flaggedBy) {
        if (!existing.flaggedBy.includes(model)) {
          existing.flaggedBy.push(model);
        }
      }
      // Higher severity wins
      const existingPriority = SEVERITY_PRIORITY[existing.severity] || 0;
      const newPriority = SEVERITY_PRIORITY[finding.severity] || 0;
      if (newPriority > existingPriority) {
        existing.severity = finding.severity;
        existing.message = finding.message;
      }
    } else {
      map.set(key, { ...finding });
    }
  }

  return Array.from(map.values());
}

/**
 * Calculate consensus percentage for a finding
 * @param {Object} finding - Finding with flaggedBy array
 * @param {number} totalModels - Total models queried
 * @returns {number} Consensus percentage (0-100)
 */
function calculateConsensus(finding, totalModels) {
  if (totalModels === 0) return 0;
  return (finding.flaggedBy.length / totalModels) * 100;
}

/**
 * Merge summaries from all model results
 * @param {Array} modelResults - Results with model and summary fields
 * @returns {string} Merged summary
 */
function mergeSummaries(modelResults) {
  return modelResults
    .filter(r => r.summary)
    .map(r => `[${r.model}]: ${r.summary}`)
    .join('\n');
}

/**
 * Create a multi-model reviewer instance
 * @param {Object} options - Configuration
 * @param {string[]} options.models - Model names to use
 * @param {Function} options.reviewFn - Review function
 * @param {number} options.timeout - Per-model timeout
 * @returns {Object} Reviewer instance
 */
function createMultiModelReviewer(options = {}) {
  const { models = [], reviewFn, timeout } = options;

  return {
    models,
    review: async (diff) => {
      const results = await sendToModels(diff, models, { reviewFn, timeout });
      if (results.length === 0) {
        return { findings: [], summary: 'All models failed — static-only fallback', modelCount: 0 };
      }
      const aggregated = aggregateFindings(results);
      const summary = mergeSummaries(results);
      return { ...aggregated, summary };
    },
  };
}

module.exports = {
  createMultiModelReviewer,
  sendToModels,
  aggregateFindings,
  deduplicateFindings,
  calculateConsensus,
  mergeSummaries,
};
