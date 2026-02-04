/**
 * Cost Projections Module
 *
 * Estimate costs before execution
 */

const { getPricing, estimateCost: baseCostEstimate } = require('./model-pricing.js');

// Token estimation patterns by task type
const TASK_PATTERNS = {
  'code-generation': {
    simple: { outputTokens: 500 },
    medium: { outputTokens: 1500 },
    complex: { outputTokens: 4000 },
  },
  'code-review': {
    simple: { outputTokens: 200 },
    medium: { outputTokens: 500 },
    complex: { outputTokens: 1200 },
  },
  'simple-chat': {
    simple: { outputTokens: 100 },
    medium: { outputTokens: 300 },
    complex: { outputTokens: 600 },
  },
  'refactor': {
    simple: { outputTokens: 800 },
    medium: { outputTokens: 2000 },
    complex: { outputTokens: 5000 },
  },
};

// Accuracy tracking
const accuracyHistory = [];

/**
 * Estimate input tokens from prompt
 * @param {string} prompt - Input prompt
 * @returns {number} Estimated token count
 */
function estimateInputTokens(prompt) {
  if (!prompt || prompt.length === 0) {
    return 0;
  }

  // Rough estimation: ~4 characters per token for English
  // Code tends to be more token-dense
  const hasCode = /```|function|class|const|let|var|import|export/.test(prompt);
  const charsPerToken = hasCode ? 3.5 : 4;

  return Math.ceil(prompt.length / charsPerToken);
}

/**
 * Estimate output tokens by task type
 * @param {Object} options - Estimation options
 * @param {string} options.taskType - Type of task
 * @param {string} [options.complexity='medium'] - Task complexity
 * @returns {number} Estimated output tokens
 */
function estimateOutputTokens(options) {
  const { taskType, complexity = 'medium' } = options;

  const pattern = TASK_PATTERNS[taskType];
  if (!pattern) {
    return TASK_PATTERNS['simple-chat'][complexity]?.outputTokens || 300;
  }

  return pattern[complexity]?.outputTokens || pattern.medium.outputTokens;
}

/**
 * Project cost for a task
 * @param {Object} options - Projection options
 * @param {string} options.prompt - Input prompt
 * @param {string} options.model - Model name
 * @param {string} [options.taskType='code-generation'] - Task type
 * @param {string} [options.complexity='medium'] - Task complexity
 * @returns {Object} Cost projection
 */
function projectCost(options) {
  const { prompt, model, taskType = 'code-generation', complexity = 'medium' } = options;

  const inputTokens = estimateInputTokens(prompt);
  const outputTokens = estimateOutputTokens({ taskType, complexity });

  const pricing = getPricing(model);
  let estimatedCost;

  if (pricing) {
    estimatedCost = (inputTokens / 1000) * pricing.inputPer1kTokens +
                    (outputTokens / 1000) * pricing.outputPer1kTokens;
  } else {
    estimatedCost = baseCostEstimate({ model, inputTokens, outputTokens });
  }

  return {
    model,
    inputTokens,
    outputTokens,
    estimatedCost,
    taskType,
    complexity,
  };
}

/**
 * Compare costs across models
 * @param {Object} options - Comparison options
 * @param {string} options.prompt - Input prompt
 * @param {string} options.taskType - Task type
 * @param {string[]} options.models - Models to compare
 * @returns {Array} Sorted comparison results
 */
function compareModels(options) {
  const { prompt, taskType, models } = options;

  const projections = models.map(model =>
    projectCost({ prompt, model, taskType })
  );

  // Sort by estimated cost (ascending)
  projections.sort((a, b) => a.estimatedCost - b.estimatedCost);

  return projections;
}

/**
 * Find cheapest model for a task
 * @param {Object} options - Options
 * @param {string} options.prompt - Input prompt
 * @param {string} options.taskType - Task type
 * @param {string[]} options.models - Models to compare
 * @returns {Object} Cheapest model projection
 */
function cheapestModel(options) {
  const comparison = compareModels(options);
  return comparison[0];
}

/**
 * Track estimation accuracy
 * @param {Object} options - Tracking options
 * @param {number} options.estimatedCost - What we estimated
 * @param {number} options.actualCost - What it actually cost
 * @param {string} options.model - Model used
 * @param {string} options.taskType - Task type
 * @returns {Object} Accuracy record
 */
function trackAccuracy(options) {
  const { estimatedCost, actualCost, model, taskType } = options;

  const error = actualCost - estimatedCost;
  const percentageError = estimatedCost > 0 ? (error / estimatedCost) * 100 : 0;

  const record = {
    estimatedCost,
    actualCost,
    error,
    percentageError,
    underEstimate: actualCost > estimatedCost,
    overEstimate: actualCost < estimatedCost,
    model,
    taskType,
    timestamp: new Date().toISOString(),
  };

  accuracyHistory.push(record);

  return record;
}

/**
 * Get accuracy history with metrics
 * @param {Object} [options] - Filter options
 * @param {string} [options.model] - Filter by model
 * @param {string} [options.taskType] - Filter by task type
 * @returns {Object} Accuracy metrics
 */
function getAccuracyHistory(options = {}) {
  const { model, taskType } = options;

  let filtered = accuracyHistory;

  if (model) {
    filtered = filtered.filter(r => r.model === model);
  }

  if (taskType) {
    filtered = filtered.filter(r => r.taskType === taskType);
  }

  if (filtered.length === 0) {
    return {
      sampleCount: 0,
      averageError: 0,
      averagePercentageError: 0,
    };
  }

  const totalError = filtered.reduce((sum, r) => sum + Math.abs(r.percentageError), 0);

  return {
    sampleCount: filtered.length,
    averageError: totalError / filtered.length,
    averagePercentageError: totalError / filtered.length,
    records: filtered,
  };
}

/**
 * Adjust estimates based on historical accuracy
 * @param {Object} options - Options
 * @param {string} options.model - Model
 * @param {string} options.taskType - Task type
 * @returns {Object} Adjustment suggestion
 */
function adjustEstimates(options) {
  const { model, taskType } = options;

  const history = getAccuracyHistory({ model, taskType });

  if (history.sampleCount < 3) {
    return { multiplier: 1.0, reason: 'Insufficient data' };
  }

  const underEstimates = history.records.filter(r => r.underEstimate).length;
  const ratio = underEstimates / history.sampleCount;

  // If we consistently underestimate, increase multiplier
  if (ratio > 0.6) {
    const avgUnderBy = history.records
      .filter(r => r.underEstimate)
      .reduce((sum, r) => sum + r.percentageError, 0) / underEstimates;

    return {
      multiplier: 1 + (avgUnderBy / 100),
      reason: `Historically underestimating by ~${avgUnderBy.toFixed(1)}%`,
    };
  }

  // If we consistently overestimate, decrease multiplier
  if (ratio < 0.4) {
    const overEstimates = history.records.filter(r => r.overEstimate);
    const avgOverBy = overEstimates.reduce((sum, r) => sum + Math.abs(r.percentageError), 0) / overEstimates.length;

    return {
      multiplier: 1 - (avgOverBy / 100),
      reason: `Historically overestimating by ~${avgOverBy.toFixed(1)}%`,
    };
  }

  return { multiplier: 1.0, reason: 'Estimates are accurate' };
}

/**
 * Project cost for multi-model operation
 * @param {Object} options - Options
 * @param {string} options.prompt - Input prompt
 * @param {string} options.taskType - Task type
 * @param {string[]} options.models - Models that will be used
 * @returns {Object} Combined projection
 */
function projectMultiModel(options) {
  const { prompt, taskType, models } = options;

  const breakdown = {};
  let totalEstimatedCost = 0;

  for (const model of models) {
    const projection = projectCost({ prompt, model, taskType });
    breakdown[model] = projection;
    totalEstimatedCost += projection.estimatedCost;
  }

  return {
    totalEstimatedCost,
    breakdown,
    modelCount: models.length,
  };
}

/**
 * Reset accuracy history (for testing)
 */
function resetAccuracyHistory() {
  accuracyHistory.length = 0;
}

module.exports = {
  estimateInputTokens,
  estimateOutputTokens,
  projectCost,
  compareModels,
  cheapestModel,
  trackAccuracy,
  getAccuracyHistory,
  adjustEstimates,
  projectMultiModel,
  resetAccuracyHistory,
  TASK_PATTERNS,
};
