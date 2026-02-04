/**
 * Quality Evaluator Module
 *
 * Evaluate output against thresholds
 */

const {
  scoreCodeStyle,
  scoreCompleteness,
  scoreCorrectness,
  scoreDocumentation,
  calculateComposite,
} = require('./quality-gate-scorer.js');
const {
  createThresholds,
  getDimensionThreshold,
  checkThreshold,
} = require('./quality-thresholds.js');

/**
 * Improvement suggestions by dimension
 */
const IMPROVEMENT_SUGGESTIONS = {
  style: {
    priority: 3,
    tips: [
      'Use consistent indentation (2 or 4 spaces)',
      'Add line breaks between logical sections',
      'Follow naming conventions (camelCase for variables)',
      'Keep lines under 120 characters',
    ],
  },
  completeness: {
    priority: 2,
    tips: [
      'Implement all required features from the specification',
      'Add missing functions or methods',
      'Handle all edge cases mentioned in requirements',
    ],
  },
  correctness: {
    priority: 1,
    tips: [
      'Fix failing tests',
      'Add missing test assertions',
      'Handle error cases properly',
      'Verify return types match expectations',
    ],
  },
  coverage: {
    priority: 2,
    tips: [
      'Add tests for untested functions',
      'Test edge cases (null, empty, boundary values)',
      'Add integration tests',
    ],
  },
  documentation: {
    priority: 4,
    tips: [
      'Add JSDoc comments to all public functions',
      'Document parameters with @param tags',
      'Document return values with @returns tags',
      'Add type annotations where possible',
    ],
  },
};

/**
 * Create an evaluator instance
 * @param {Object} options - Evaluator options
 * @returns {Object} Evaluator instance
 */
function createEvaluator(options = {}) {
  return {
    options: {
      scorer: options.scorer,
      thresholds: options.thresholds || createThresholds(),
      ...options,
    },
  };
}

/**
 * Evaluate code quality
 * @param {string} code - Code to evaluate
 * @param {Object} options - Evaluation options
 * @returns {Promise<Object>} Evaluation result
 */
async function evaluate(code, options = {}) {
  const {
    scorer = {},
    thresholds = createThresholds(),
    skip = [],
    requirements = [],
    tests = '',
    testResults = null,
  } = options;

  const scores = {};
  const skipped = [];

  // Score each dimension unless skipped
  if (!skip.includes('style')) {
    scores.style = scorer.scoreCodeStyle
      ? await scorer.scoreCodeStyle(code)
      : await scoreCodeStyle(code);
  } else {
    skipped.push('style');
  }

  if (!skip.includes('completeness')) {
    scores.completeness = scorer.scoreCompleteness
      ? await scorer.scoreCompleteness(code, requirements)
      : await scoreCompleteness(code, requirements);
  } else {
    skipped.push('completeness');
  }

  if (!skip.includes('correctness') && testResults) {
    scores.correctness = scorer.scoreCorrectness
      ? await scorer.scoreCorrectness(testResults)
      : await scoreCorrectness(testResults);
  } else if (!skip.includes('correctness') && scorer.scoreCorrectness) {
    scores.correctness = await scorer.scoreCorrectness({ passed: 1, total: 1 });
  } else if (skip.includes('correctness')) {
    skipped.push('correctness');
  }

  if (!skip.includes('documentation')) {
    scores.documentation = scorer.scoreDocumentation
      ? await scorer.scoreDocumentation(code)
      : await scoreDocumentation(code);
  } else {
    skipped.push('documentation');
  }

  // Calculate composite
  const composite = calculateComposite(scores);
  scores.composite = composite;

  // Check thresholds
  const thresholdResult = checkThreshold(thresholds, scores);

  return {
    pass: thresholdResult.pass,
    scores,
    composite,
    failed: thresholdResult.failed,
    thresholdResult,
    skipped: skipped.length > 0 ? skipped : undefined,
  };
}

/**
 * Get list of failing dimensions
 * @param {Object} scores - Dimension scores
 * @param {Object} thresholds - Thresholds config
 * @param {Object} options - Options
 * @returns {Array} Failing dimensions
 */
function getFailingDimensions(scores, thresholds, options = {}) {
  const failing = [];

  for (const [dim, score] of Object.entries(scores)) {
    if (dim === 'composite') continue;

    const threshold = getDimensionThreshold(thresholds, dim);
    if (score < threshold) {
      if (options.margins) {
        failing.push({
          dimension: dim,
          score,
          threshold,
          margin: score - threshold,
        });
      } else {
        failing.push(dim);
      }
    }
  }

  return failing;
}

/**
 * Get improvement suggestions for failing dimensions
 * @param {Array} failingDimensions - List of failing dimensions
 * @param {Object} options - Options
 * @returns {Array} Suggestions
 */
function suggestImprovements(failingDimensions, options = {}) {
  if (!failingDimensions || failingDimensions.length === 0) {
    return [];
  }

  const suggestions = [];

  for (const dim of failingDimensions) {
    const dimName = typeof dim === 'object' ? dim.dimension : dim;
    const info = IMPROVEMENT_SUGGESTIONS[dimName];

    if (info) {
      const suggestion = {
        dimension: dimName,
        priority: info.priority,
        tip: info.tips[0],
      };

      if (options.examples) {
        suggestion.example = getExampleForDimension(dimName);
      }

      suggestions.push(suggestion);
    }
  }

  // Sort by priority (lower = higher priority)
  suggestions.sort((a, b) => a.priority - b.priority);

  return suggestions;
}

/**
 * Get example code for a dimension
 */
function getExampleForDimension(dimension) {
  const examples = {
    documentation: `/**
 * Adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum
 */
function add(a, b) {
  return a + b;
}`,
    style: `// Good style example
function calculateTotal(items) {
  let total = 0;

  for (const item of items) {
    total += item.price;
  }

  return total;
}`,
  };

  return examples[dimension] || null;
}

/**
 * Calculate confidence level based on score margins
 * @param {Object} scores - Dimension scores
 * @param {Object} thresholds - Thresholds config
 * @returns {number} Confidence 0-1
 */
function calculateConfidence(scores, thresholds) {
  let minMargin = Infinity;
  let anyBelow = false;

  for (const [dim, score] of Object.entries(scores)) {
    if (dim === 'composite') continue;

    const threshold = getDimensionThreshold(thresholds, dim);
    const margin = score - threshold;

    if (margin < 0) {
      anyBelow = true;
    }

    minMargin = Math.min(minMargin, margin);
  }

  if (anyBelow) {
    return 0;
  }

  // Calculate confidence based on minimum margin
  // Margin 0-5 = low confidence (0-0.4)
  // Margin 5-15 = medium confidence (0.4-0.7)
  // Margin 15+ = high confidence (0.7-1.0)
  let confidence;
  if (minMargin <= 5) {
    confidence = minMargin * 0.08; // 0 to 0.4
  } else if (minMargin <= 15) {
    confidence = 0.4 + (minMargin - 5) * 0.03; // 0.4 to 0.7
  } else {
    confidence = Math.min(1, 0.7 + (minMargin - 15) * 0.02); // 0.7 to 1.0
  }
  return Math.round(confidence * 100) / 100;
}

/**
 * Evaluate with context metadata
 * @param {string} code - Code to evaluate
 * @param {Object} context - Context metadata
 * @param {Object} options - Evaluation options
 * @returns {Promise<Object>} Evaluation result with context
 */
async function evaluateWithContext(code, context, options = {}) {
  const { operation, model } = context;

  // Adjust thresholds for operation if specified
  let thresholds = options.thresholds || createThresholds();
  if (operation && thresholds.operations?.[operation]) {
    const opConfig = thresholds.operations[operation];
    if (typeof opConfig === 'number') {
      thresholds = { ...thresholds, default: opConfig };
    }
  }

  const result = await evaluate(code, { ...options, thresholds });

  return {
    ...result,
    context: {
      operation,
      model,
      ...context,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Skip a dimension in evaluation (helper)
 */
function skipDimension(dimensions, dimension) {
  if (!dimensions.includes(dimension)) {
    return [...dimensions, dimension];
  }
  return dimensions;
}

/**
 * Aggregate results from multiple files
 * @param {Array} results - Individual file results
 * @returns {Object} Aggregated result
 */
function aggregateResults(results) {
  if (!results || results.length === 0) {
    return { pass: true, scores: {}, composite: 0 };
  }

  const allScores = {};
  const failingFiles = [];
  let compositeSum = 0;
  let compositeCount = 0;

  for (const result of results) {
    if (!result.pass) {
      failingFiles.push(result.file);
    }

    if (result.composite !== undefined) {
      compositeSum += result.composite;
      compositeCount++;
    }

    for (const [dim, score] of Object.entries(result.scores || {})) {
      if (dim === 'composite') continue;
      if (!allScores[dim]) {
        allScores[dim] = [];
      }
      allScores[dim].push(score);
    }
  }

  // Calculate averages
  const avgScores = {};
  for (const [dim, scores] of Object.entries(allScores)) {
    avgScores[dim] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  return {
    pass: failingFiles.length === 0,
    scores: avgScores,
    composite: compositeCount > 0 ? Math.round(compositeSum / compositeCount) : 0,
    failingFiles: failingFiles.length > 0 ? failingFiles : undefined,
    fileCount: results.length,
  };
}

module.exports = {
  createEvaluator,
  evaluate,
  getFailingDimensions,
  suggestImprovements,
  calculateConfidence,
  evaluateWithContext,
  skipDimension,
  aggregateResults,
  IMPROVEMENT_SUGGESTIONS,
};
