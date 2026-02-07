/**
 * LLM Reviewer
 *
 * Mandatory LLM-powered code review before every push.
 * Collects diff, sends to LLM via model router, parses structured result.
 * Falls back to static-only review if no LLM is available.
 *
 * @module code-gate/llm-reviewer
 */

const path = require('path');
const fs = require('fs');

/** Default timeout for LLM review in milliseconds */
const DEFAULT_TIMEOUT = 60000;

/** File extensions that are docs-only (skip LLM review) */
const DOCS_EXTENSIONS = ['.md', '.txt', '.rst', '.adoc'];

/**
 * Severity mapping from LLM response levels to gate levels.
 * LLM may use critical/high/medium/low; we normalize to block/warn/info.
 */
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
 * Create a reviewer instance with configurable options.
 *
 * @param {Object} [options]
 * @param {number} [options.timeout] - LLM request timeout in ms
 * @returns {{ options: Object }}
 */
function createReviewer(options = {}) {
  return {
    options: {
      timeout: options.timeout || DEFAULT_TIMEOUT,
    },
  };
}

/**
 * Build the review prompt to send to the LLM.
 *
 * @param {string} diff - Git diff content
 * @param {string} standards - CODING-STANDARDS.md content
 * @returns {string} Complete review prompt
 */
function buildReviewPrompt(diff, standards) {
  return `You are a strict code reviewer. Review this diff against the project's coding standards.

${standards ? `## Coding Standards\n${standards}\n\n` : ''}## Diff to Review
\`\`\`
${diff}
\`\`\`

## Instructions
For each issue found, respond with a JSON object:
\`\`\`json
{
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "file": "affected file path",
      "line": 0,
      "rule": "which standard is violated",
      "message": "clear description",
      "fix": "how to fix it"
    }
  ],
  "summary": "brief overall assessment"
}
\`\`\`

Be STRICT. Block on: security issues, missing tests, hardcoded secrets, major anti-patterns.
If the code is clean, return an empty findings array.
Respond ONLY with the JSON object.`;
}

/**
 * Parse the LLM response into a structured review result.
 * Handles raw JSON, markdown-wrapped JSON, and unparseable responses.
 *
 * @param {string} response - Raw LLM response text
 * @returns {{ findings: Array, summary?: string }}
 */
function parseReviewResponse(response) {
  // Try to extract JSON from markdown code block
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : response.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const findings = (parsed.findings || []).map(f => ({
      ...f,
      severity: SEVERITY_MAP[f.severity] || 'warn',
    }));
    return { findings, summary: parsed.summary };
  } catch {
    return {
      findings: [{
        severity: 'warn',
        rule: 'llm-parse-error',
        file: 'unknown',
        message: 'Could not parse LLM review response',
        fix: 'Run review manually with /tlc:review',
      }],
      summary: 'Review response could not be parsed',
    };
  }
}

/**
 * Collect the git diff for review.
 *
 * @param {Object} [options]
 * @param {Function} [options.exec] - Command execution function
 * @returns {Promise<string>} Diff content
 */
async function collectDiff(options = {}) {
  const exec = options.exec;
  if (!exec) return '';
  return await exec('git diff origin/main..HEAD');
}

/**
 * Check if the review should be skipped (docs-only changes).
 *
 * @param {string[]} files - Changed file paths
 * @returns {boolean} True if all changes are docs-only
 */
function shouldSkipReview(files) {
  if (files.length === 0) return true;
  return files.every(f => {
    const ext = path.extname(f).toLowerCase();
    return DOCS_EXTENSIONS.includes(ext);
  });
}

/**
 * Store a review result to disk for audit trail.
 *
 * @param {string} commitHash - Commit hash as filename
 * @param {Object} result - Review result to store
 * @param {Object} [options]
 * @param {Object} [options.fs] - File system module
 * @param {string} [options.projectPath] - Project root
 */
function storeReviewResult(commitHash, result, options = {}) {
  const fsModule = options.fs || fs;
  const projectPath = options.projectPath || process.cwd();
  const reviewsDir = path.join(projectPath, '.tlc', 'reviews');

  if (!fsModule.existsSync(reviewsDir)) {
    fsModule.mkdirSync(reviewsDir, { recursive: true });
  }

  const filePath = path.join(reviewsDir, `${commitHash}.json`);
  fsModule.writeFileSync(filePath, JSON.stringify(result, null, 2));
}

module.exports = {
  createReviewer,
  buildReviewPrompt,
  parseReviewResponse,
  collectDiff,
  shouldSkipReview,
  storeReviewResult,
};
