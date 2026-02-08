/**
 * Unified Review Service
 *
 * One service: router → executor → prompt → parse → findings.
 * Replaces the disconnected pieces with a single coherent flow.
 *
 * @module llm/review-service
 */

const path = require('path');

/** Docs-only extensions that skip LLM review */
const DOCS_EXTENSIONS = ['.md', '.txt', '.rst', '.adoc'];

/** Severity mapping from LLM levels to gate levels */
const SEVERITY_MAP = {
  critical: 'block',
  high: 'block',
  medium: 'warn',
  low: 'info',
  block: 'block',
  warn: 'warn',
  info: 'info',
};

/**
 * Check if review should be skipped (docs-only)
 * @param {string[]} files - Changed file paths
 * @returns {boolean}
 */
function shouldSkip(files) {
  if (!files || files.length === 0) return false;
  return files.every(f => {
    const ext = path.extname(f).toLowerCase();
    return DOCS_EXTENSIONS.includes(ext);
  });
}

/**
 * Build review prompt
 * @param {string} diff - Git diff
 * @param {string} standards - Coding standards content
 * @returns {string}
 */
function buildPrompt(diff, standards) {
  let prompt = 'You are a strict code reviewer. Review this diff';
  if (standards) {
    prompt += ' against these coding standards:\n\n' + standards + '\n\n';
  }
  prompt += '\n\nDiff:\n```\n' + diff + '\n```\n\n';
  prompt += 'Respond with JSON: {"findings": [{"severity": "critical|high|medium|low", "file": "path", "line": 0, "rule": "name", "message": "desc", "fix": "how"}], "summary": "text"}\n';
  prompt += 'Respond ONLY with JSON.';
  return prompt;
}

/**
 * Parse LLM response to structured findings
 * @param {string} response - Raw LLM response
 * @returns {Object} { findings, summary }
 */
function parseResponse(response) {
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : response.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const findings = (parsed.findings || []).map(f => ({
      ...f,
      severity: SEVERITY_MAP[f.severity] || 'warn',
    }));
    return { findings, summary: parsed.summary || '' };
  } catch {
    return { findings: [], summary: response.substring(0, 200) };
  }
}

/**
 * Deduplicate findings by file+line+rule, merge flaggedBy
 * @param {Array} findings - All findings
 * @returns {Array} Deduplicated
 */
function deduplicateFindings(findings) {
  const PRIORITY = { block: 3, warn: 2, info: 1 };
  const map = new Map();

  for (const finding of findings) {
    const key = finding.file + ':' + finding.line + ':' + finding.rule;
    if (map.has(key)) {
      const existing = map.get(key);
      for (const m of (finding.flaggedBy || [])) {
        if (!existing.flaggedBy.includes(m)) existing.flaggedBy.push(m);
      }
      if ((PRIORITY[finding.severity] || 0) > (PRIORITY[existing.severity] || 0)) {
        existing.severity = finding.severity;
        existing.message = finding.message;
      }
    } else {
      map.set(key, { ...finding, flaggedBy: finding.flaggedBy || [] });
    }
  }

  return Array.from(map.values());
}

/**
 * Create the unified review service
 * @param {Object} options - Service options
 * @param {Object} options.registry - Provider registry
 * @param {Object} options.executor - Provider executor
 * @param {boolean} options.multiModel - Enable multi-model mode
 * @param {number} options.timeout - Review timeout
 * @param {string} options.standards - Coding standards text
 * @returns {Object} Service with review method
 */
function createReviewService(options = {}) {
  const { registry, executor, multiModel = false, timeout, standards = '' } = options;

  return {
    /**
     * Review a diff
     * @param {string} diff - Git diff content
     * @param {Object} reviewOptions - Per-review options
     * @returns {Promise<Object>} { findings, summary, provider, latency }
     */
    async review(diff, reviewOptions = {}) {
      // Skip docs-only
      if (shouldSkip(reviewOptions.files)) {
        return { findings: [], summary: 'Skipped (docs-only)', skipped: true };
      }

      // No registry or executor — return empty
      if (!registry || !executor) {
        return { findings: [], summary: 'No providers configured' };
      }

      const prompt = buildPrompt(diff, standards);
      const providers = registry.getByCapability('review');

      if (providers.length === 0) {
        return { findings: [], summary: 'No review providers available — static-only fallback' };
      }

      // Multi-model: fan out to all providers
      if (multiModel && providers.length > 1) {
        return await reviewMultiModel(prompt, providers, executor, timeout);
      }

      // Single-model: try providers in order until one works
      return await reviewSingleModel(prompt, providers, executor, timeout);
    },
  };
}

/**
 * Single-model review: try providers in priority order
 */
async function reviewSingleModel(prompt, providers, executor, timeout) {
  const sorted = [...providers].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  for (const provider of sorted) {
    try {
      const result = await executor.execute(prompt, { ...provider, timeout });
      const parsed = parseResponse(result.response);
      return {
        findings: parsed.findings,
        summary: parsed.summary,
        provider: provider.name,
        latency: result.latency,
      };
    } catch {
      // Try next provider
      continue;
    }
  }

  // All failed
  return { findings: [], summary: 'All providers failed — static-only fallback' };
}

/**
 * Multi-model review: fan out to all, aggregate
 */
async function reviewMultiModel(prompt, providers, executor, timeout) {
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const result = await executor.execute(prompt, { ...provider, timeout });
      const parsed = parseResponse(result.response);
      return {
        model: provider.name,
        findings: parsed.findings.map(f => ({ ...f, flaggedBy: [provider.name] })),
        summary: parsed.summary,
        latency: result.latency,
      };
    })
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (successful.length === 0) {
    return { findings: [], summary: 'All providers failed — static-only fallback' };
  }

  // Aggregate findings
  const allFindings = successful.flatMap(r => r.findings);
  const deduped = deduplicateFindings(allFindings);

  // Merge summaries
  const summaryParts = successful.map(r => '[' + r.model + ']: ' + r.summary);

  return {
    findings: deduped,
    summary: summaryParts.join('\n'),
    providers: successful.map(r => r.model),
    latency: Math.max(...successful.map(r => r.latency)),
  };
}

module.exports = {
  createReviewService,
};
