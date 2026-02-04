/**
 * Quality Gate Scorer Module
 *
 * Score output quality on multiple dimensions for quality gate evaluation
 */

/**
 * Default weights for composite score calculation
 */
const DEFAULT_WEIGHTS = {
  style: 0.15,
  completeness: 0.25,
  coverage: 0.20,
  correctness: 0.30,
  documentation: 0.10,
};

/**
 * Create a quality scorer instance
 * @param {Object} options - Scorer options
 * @returns {Object} Scorer instance
 */
function createQualityScorer(options = {}) {
  return {
    options: {
      linter: options.linter || 'eslint',
      weights: options.weights || DEFAULT_WEIGHTS,
      ...options,
    },
  };
}

/**
 * Score code style (formatting, linting)
 * @param {string} code - Code to score
 * @param {Object} options - Scoring options
 * @returns {Promise<number|Object>} Score 0-100 or result with breakdown
 */
async function scoreCodeStyle(code, options = {}) {
  let score = 100;
  const breakdown = {};

  // Check for consistent indentation
  const lines = code.split('\n');
  const indentSizes = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => l.match(/^(\s*)/)?.[1].length || 0);

  if (indentSizes.length > 1) {
    const diffs = [];
    for (let i = 1; i < indentSizes.length; i++) {
      const diff = indentSizes[i] - indentSizes[i - 1];
      if (diff !== 0) diffs.push(Math.abs(diff));
    }
    const uniqueDiffs = [...new Set(diffs.filter((d) => d > 0))];
    if (uniqueDiffs.length > 1) {
      score -= 10;
      breakdown.indentation = 'inconsistent';
    } else {
      breakdown.indentation = 'consistent';
    }
  }

  // Check for line length
  const longLines = lines.filter((l) => l.length > 120).length;
  if (longLines > 0) {
    score -= Math.min(longLines * 2, 10);
    breakdown.lineLength = `${longLines} long lines`;
  }

  // Check for semicolons consistency
  const withSemi = lines.filter((l) => l.trim().endsWith(';')).length;
  const withoutSemi = lines.filter(
    (l) => l.trim().length > 0 && !l.trim().endsWith(';') && !l.trim().endsWith('{') && !l.trim().endsWith('}')
  ).length;
  if (withSemi > 0 && withoutSemi > 0) {
    score -= 5;
    breakdown.semicolons = 'inconsistent';
  }

  // Check for var usage (prefer const/let)
  if (/\bvar\b/.test(code)) {
    score -= 15;
    breakdown.varUsage = 'uses var instead of const/let';
  }

  // Check for single-line compact code (no whitespace around operators)
  const compactPatterns = code.match(/\w[=+\-*/<>]+\w/g) || [];
  if (compactPatterns.length > 2) {
    score -= 10;
    breakdown.compactCode = 'missing whitespace around operators';
  }

  // Check for line breaks (single line code is bad style)
  if (lines.length === 1 && code.length > 30) {
    score -= 15;
    breakdown.lineBreaks = 'code should have line breaks';
  }

  // Check for missing spaces after keywords/semicolons
  if (/\{[^\s\n}]/.test(code) || /;[^\s\n}]/.test(code)) {
    score -= 10;
    breakdown.spacing = 'missing whitespace after braces/semicolons';
  }

  score = Math.max(0, Math.min(100, score));

  if (options.breakdown) {
    return { score, breakdown };
  }
  return score;
}

/**
 * Score code completeness against requirements
 * @param {string} code - Code to score
 * @param {string[]} requirements - Required features
 * @param {Object} options - Scoring options
 * @returns {Promise<number|Object>} Score 0-100 or result with details
 */
async function scoreCompleteness(code, requirements, options = {}) {
  if (!requirements || requirements.length === 0) {
    return options.details ? { score: 100, met: [], missing: [] } : 100;
  }

  const codeLower = code.toLowerCase();
  const met = [];
  const missing = [];

  for (const req of requirements) {
    const reqLower = req.toLowerCase();
    // Check if requirement is mentioned/implemented
    // Use keywords of length 2+ to catch 'add', etc.
    const keywords = reqLower.split(/\s+/).filter((w) => w.length >= 2);

    // Filter out common stop words
    const stopWords = ['a', 'an', 'the', 'to', 'is', 'in', 'on', 'of', 'function', 'method', 'class', 'that', 'which'];
    const significantKeywords = keywords.filter((w) => !stopWords.includes(w));

    // Must match the significant keywords (not just function/method)
    const matches = significantKeywords.filter((kw) => codeLower.includes(kw));

    // Require ALL significant keywords to match (stricter)
    if (significantKeywords.length === 0 || matches.length === significantKeywords.length) {
      met.push(req);
    } else {
      missing.push(req);
    }
  }

  const score = Math.round((met.length / requirements.length) * 100);

  if (options.details) {
    return { score, met, missing };
  }
  return score;
}

/**
 * Score test coverage
 * @param {string} code - Source code
 * @param {string} tests - Test code
 * @param {Object} options - Scoring options
 * @returns {Promise<number|Object>} Score 0-100 or result with coverage report
 */
async function scoreTestCoverage(code, tests, options = {}) {
  if (!tests || tests.trim().length === 0) {
    return options.report ? { score: 0, coverage: { functions: 0, statements: 0 } } : 0;
  }

  // Extract function names from code
  const funcRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*:\s*(?:async\s*)?\(/g;
  const functions = [];
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (name && !['if', 'for', 'while', 'switch'].includes(name)) {
      functions.push(name);
    }
  }

  if (functions.length === 0) {
    return options.report ? { score: 100, coverage: { functions: 100, statements: 100 } } : 100;
  }

  // Check which functions are tested
  const testsLower = tests.toLowerCase();
  const testedFunctions = functions.filter((fn) => testsLower.includes(fn.toLowerCase()));
  const coverage = Math.round((testedFunctions.length / functions.length) * 100);

  if (options.report) {
    return {
      score: coverage,
      coverage: {
        functions: coverage,
        statements: coverage,
        tested: testedFunctions,
        untested: functions.filter((fn) => !testedFunctions.includes(fn)),
      },
    };
  }
  return coverage;
}

/**
 * Score correctness based on test results
 * @param {Object} testResults - Test execution results
 * @param {Object} options - Scoring options
 * @returns {Promise<number|Object>} Score 0-100 or result with details
 */
async function scoreCorrectness(testResults, options = {}) {
  const { passed = 0, failed = 0, total = 0, failures = [] } = testResults;

  if (total === 0) {
    return options.details ? { score: 0, failures: [] } : 0;
  }

  const score = Math.round((passed / total) * 100);

  if (options.details) {
    return { score, passed, failed, total, failures };
  }
  return score;
}

/**
 * Score documentation quality
 * @param {string} code - Code to score
 * @param {Object} options - Scoring options
 * @returns {Promise<number|Object>} Score 0-100 or result with breakdown
 */
async function scoreDocumentation(code, options = {}) {
  let score = 0;
  const breakdown = {};

  // Check for JSDoc comments
  const jsdocComments = code.match(/\/\*\*[\s\S]*?\*\//g) || [];
  const jsdocCount = jsdocComments.length;
  const funcCount = (code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || []).length;

  if (funcCount > 0) {
    const jsdocCoverage = Math.min(jsdocCount / funcCount, 1);
    score += jsdocCoverage * 40;
    breakdown.jsdoc = Math.round(jsdocCoverage * 100);
  } else {
    score += 40;
    breakdown.jsdoc = 100;
  }

  // Check for type annotations (TypeScript or JSDoc style)
  const hasTypeScript = /:\s*(string|number|boolean|object|any|\w+\[\]|Promise<|Record<|Map<)/i.test(code);
  const hasJsDocTypes = /\{(string|number|boolean|object|any|\w+\[\]|Promise<|Record<|Map<|@type)/i.test(code);
  if (hasTypeScript || hasJsDocTypes) {
    score += 20;
    breakdown.types = 'present';
  } else {
    breakdown.types = 'absent';
  }

  // Check for @param, @returns tags (worth more)
  const hasParams = /@param\s/.test(code);
  const hasReturns = /@returns?\s/.test(code);
  if (hasParams) {
    score += 20;
    breakdown.params = 'documented';
  }
  if (hasReturns) {
    score += 10;
    breakdown.returns = 'documented';
  }

  score = Math.min(100, Math.round(score));

  if (options.breakdown) {
    return { score, breakdown };
  }
  return score;
}

/**
 * Calculate composite score from dimension scores
 * @param {Object} scores - Individual dimension scores
 * @param {Object} weights - Custom weights (optional)
 * @param {Object} options - Calculation options
 * @returns {number|Object} Composite score or result with contributions
 */
function calculateComposite(scores, weights = null, options = {}) {
  const w = weights || DEFAULT_WEIGHTS;
  const contributions = {};
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [dim, weight] of Object.entries(w)) {
    if (scores[dim] !== undefined) {
      const contribution = scores[dim] * weight;
      contributions[dim] = contribution;
      weightedSum += contribution;
      totalWeight += weight;
    }
  }

  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  if (options.breakdown) {
    return { composite, contributions, weights: w };
  }
  return composite;
}

/**
 * Parse requirements from a prompt
 * @param {string} prompt - User prompt
 * @returns {string[]} Extracted requirements
 */
function parseRequirements(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    return [];
  }

  const requirements = [];

  // Extract numbered list items
  const numbered = prompt.match(/^\d+\.\s*(.+)$/gm);
  if (numbered) {
    for (const item of numbered) {
      const text = item.replace(/^\d+\.\s*/, '').trim();
      if (text) requirements.push(text);
    }
  }

  // Extract bullet list items
  const bullets = prompt.match(/^[-*]\s*(.+)$/gm);
  if (bullets) {
    for (const item of bullets) {
      const text = item.replace(/^[-*]\s*/, '').trim();
      if (text) requirements.push(text);
    }
  }

  // If no list found, extract key phrases
  if (requirements.length === 0) {
    // Look for action phrases
    const actions = prompt.match(/(create|build|add|implement|write|make)\s+[^.,]+/gi);
    if (actions) {
      for (const action of actions) {
        requirements.push(action.trim());
      }
    }

    // Look for "with X, Y, and Z" patterns
    const withPattern = prompt.match(/with\s+([^.]+)/i);
    if (withPattern) {
      const items = withPattern[1].split(/,\s*and\s*|,\s*|\s+and\s+/);
      for (const item of items) {
        const trimmed = item.trim();
        if (trimmed.length > 2) {
          requirements.push(trimmed);
        }
      }
    }
  }

  // Deduplicate
  const unique = [...new Set(requirements.map((r) => r.toLowerCase()))];
  return unique.map((r) => requirements.find((orig) => orig.toLowerCase() === r));
}

module.exports = {
  createQualityScorer,
  scoreCodeStyle,
  scoreCompleteness,
  scoreTestCoverage,
  scoreCorrectness,
  scoreDocumentation,
  calculateComposite,
  parseRequirements,
  DEFAULT_WEIGHTS,
};
