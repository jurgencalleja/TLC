/**
 * Cost Optimizer Module
 *
 * Recommend cheaper alternatives and optimization strategies
 */

const { getPricing } = require('./model-pricing.js');

// Model quality ratings (0-100)
const MODEL_QUALITY = {
  'claude-3-opus': 95,
  'claude-opus-4-5-20251101': 98,
  'claude-3-sonnet': 85,
  'claude-3.5-sonnet': 90,
  'claude-3-haiku': 70,
  'gpt-4': 90,
  'gpt-4-turbo': 88,
  'gpt-4o': 85,
  'gpt-3.5-turbo': 65,
  'o1': 92,
  'o3': 94,
  'deepseek-r1': 80,
  'deepseek-chat': 72,
  'deepseek-coder': 75,
  'gemini-2.0-flash': 75,
  'gemini-1.5-pro': 85,
  'gemini-1.5-flash': 70,
};

// Model cost ratings (0-100, higher = cheaper)
const MODEL_COST_SCORE = {
  'claude-3-opus': 20,
  'claude-opus-4-5-20251101': 20,
  'claude-3-sonnet': 60,
  'claude-3.5-sonnet': 60,
  'claude-3-haiku': 95,
  'gpt-4': 15,
  'gpt-4-turbo': 40,
  'gpt-4o': 55,
  'gpt-3.5-turbo': 90,
  'o1': 30,
  'o3': 30,
  'deepseek-r1': 85,
  'deepseek-chat': 95,
  'deepseek-coder': 95,
  'gemini-2.0-flash': 100,
  'gemini-1.5-pro': 75,
  'gemini-1.5-flash': 95,
};

// Task type to minimum quality mapping
const TASK_QUALITY_REQUIREMENTS = {
  'simple-chat': 60,
  'code-review': 80,
  'code-gen': 85,
  'refactor': 85,
  'complex-reasoning': 90,
};

// Model alternatives by provider
const MODEL_ALTERNATIVES = {
  'claude-3-opus': ['claude-3.5-sonnet', 'claude-3-sonnet', 'claude-3-haiku'],
  'claude-opus-4-5-20251101': ['claude-3.5-sonnet', 'claude-3-sonnet', 'claude-3-haiku'],
  'claude-3-sonnet': ['claude-3-haiku'],
  'claude-3.5-sonnet': ['claude-3-sonnet', 'claude-3-haiku'],
  'claude-3-haiku': [],
  'gpt-4': ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
  'gpt-4-turbo': ['gpt-4o', 'gpt-3.5-turbo'],
  'gpt-4o': ['gpt-3.5-turbo'],
  'gpt-3.5-turbo': [],
};

/**
 * Create an optimizer instance
 * @returns {Object} Optimizer instance
 */
function createOptimizer() {
  return {
    preferences: {
      qualityWeight: 0.5,
      costWeight: 0.5,
      preferredProviders: [],
      minQuality: 0,
    },
    choiceHistory: [],
    getLearnedPreferences() {
      return { ...this.preferences };
    },
  };
}

/**
 * Analyze usage patterns
 * @param {Object} optimizer - Optimizer instance
 * @param {Array} usage - Usage records
 * @returns {Object} Analysis results
 */
function analyzeUsage(optimizer, usage) {
  if (!usage || usage.length === 0) {
    return {
      expensiveOperations: [],
      modelBreakdown: {},
      totalCost: 0,
    };
  }

  // Sort by cost descending to find expensive operations
  const expensiveOperations = [...usage]
    .sort((a, b) => b.cost - a.cost);

  // Group by model
  const modelBreakdown = {};
  for (const record of usage) {
    modelBreakdown[record.model] = (modelBreakdown[record.model] || 0) + record.cost;
  }

  const totalCost = usage.reduce((sum, r) => sum + r.cost, 0);

  return {
    expensiveOperations,
    modelBreakdown,
    totalCost,
  };
}

/**
 * Suggest a cheaper model alternative
 * @param {Object} optimizer - Optimizer instance
 * @param {Object} options - Options
 * @param {string} options.currentModel - Current model
 * @param {string} options.taskType - Type of task
 * @returns {Object|null} Suggestion or null
 */
function suggestCheaperModel(optimizer, options) {
  const { currentModel, taskType } = options;

  const minQuality = TASK_QUALITY_REQUIREMENTS[taskType] || 60;
  const alternatives = MODEL_ALTERNATIVES[currentModel] || [];

  const currentPricing = getPricing(currentModel);
  const currentQuality = MODEL_QUALITY[currentModel] || 50;

  // Find cheapest alternative that meets quality requirements
  let bestAlternative = null;
  let bestSavings = 0;

  for (const alt of alternatives) {
    const altQuality = MODEL_QUALITY[alt] || 50;
    if (altQuality < minQuality) continue;

    const altPricing = getPricing(alt);
    if (!altPricing || !currentPricing) continue;

    // Estimate savings based on average token usage
    const avgTokens = 1000;
    const currentCost = (avgTokens / 1000) * currentPricing.inputPer1kTokens +
                        (avgTokens / 1000) * currentPricing.outputPer1kTokens;
    const altCost = (avgTokens / 1000) * altPricing.inputPer1kTokens +
                    (avgTokens / 1000) * altPricing.outputPer1kTokens;

    const savings = currentCost - altCost;

    if (savings > bestSavings) {
      bestSavings = savings;
      bestAlternative = alt;
    }
  }

  if (!bestAlternative || bestSavings <= 0) {
    return null;
  }

  return {
    alternativeModel: bestAlternative,
    estimatedSavings: bestSavings,
    qualityDelta: (MODEL_QUALITY[bestAlternative] || 50) - currentQuality,
  };
}

/**
 * Suggest batching for similar operations
 * @param {Object} optimizer - Optimizer instance
 * @param {Array} usage - Usage records
 * @returns {Object} Batching suggestion
 */
function suggestBatching(optimizer, usage) {
  if (!usage || usage.length < 3) {
    return { batchable: false };
  }

  // Group by operation
  const operationCounts = {};
  for (const record of usage) {
    operationCounts[record.operation] = (operationCounts[record.operation] || 0) + 1;
  }

  // Find operations that repeat at least 3 times
  const batchableOps = Object.entries(operationCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (batchableOps.length === 0) {
    return { batchable: false };
  }

  const [operation, count] = batchableOps[0];

  // Estimate savings from batching (roughly 20% reduction)
  const opRecords = usage.filter(r => r.operation === operation);
  const totalTokens = opRecords.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
  const estimatedSavings = totalTokens * 0.0001 * 0.2; // Rough estimate

  return {
    batchable: true,
    operation,
    count,
    estimatedSavings: Math.max(0.01, estimatedSavings),
  };
}

/**
 * Suggest caching for repeated prompts
 * @param {Object} optimizer - Optimizer instance
 * @param {Array} usage - Usage records with prompt hashes
 * @returns {Object} Caching suggestion
 */
function suggestCaching(optimizer, usage) {
  if (!usage || usage.length < 2) {
    return { cacheable: false, repeatedPrompts: 0 };
  }

  // Count prompt hash occurrences
  const hashCounts = {};
  for (const record of usage) {
    if (record.hash) {
      hashCounts[record.hash] = (hashCounts[record.hash] || 0) + 1;
    }
  }

  // Count prompts that appear more than once
  const repeatedPrompts = Object.values(hashCounts)
    .filter(count => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);

  if (repeatedPrompts === 0) {
    return { cacheable: false, repeatedPrompts: 0 };
  }

  return {
    cacheable: true,
    repeatedPrompts,
    uniqueHashes: Object.keys(hashCounts).length,
    potentialSavings: repeatedPrompts * 0.01, // Rough estimate
  };
}

/**
 * Get quality score for a model
 * @param {string} model - Model name
 * @returns {number} Quality score (0-100)
 */
function getQualityScore(model) {
  return MODEL_QUALITY[model] || 50;
}

/**
 * Get cost efficiency score for a model
 * @param {string} model - Model name
 * @returns {number} Cost score (0-100, higher = cheaper)
 */
function getCostScore(model) {
  return MODEL_COST_SCORE[model] || 50;
}

/**
 * Rank models by value (quality/cost ratio)
 * @param {Object} optimizer - Optimizer instance
 * @param {string[]} models - Models to rank
 * @returns {Array} Ranked models with scores
 */
function rankByValue(optimizer, models) {
  const { qualityWeight, costWeight } = optimizer.preferences;

  return models
    .map(model => {
      const qualityScore = getQualityScore(model);
      const costScore = getCostScore(model);
      const valueScore = (qualityScore * qualityWeight) + (costScore * costWeight);

      return {
        model,
        qualityScore,
        costScore,
        valueScore,
      };
    })
    .sort((a, b) => b.valueScore - a.valueScore);
}

/**
 * Filter suggestions based on user preferences
 * @param {Object} optimizer - Optimizer instance
 * @param {Array} suggestions - Suggestions to filter
 * @param {Object} preferences - User preferences
 * @returns {Array} Filtered suggestions
 */
function applyPreferences(optimizer, suggestions, preferences) {
  const { preferredProviders = [], minQuality = 0 } = preferences;

  return suggestions.filter(suggestion => {
    // Check provider preference
    if (preferredProviders.length > 0) {
      const isPreferredProvider = preferredProviders.some(provider => {
        if (provider === 'anthropic') return suggestion.model.includes('claude');
        if (provider === 'openai') return suggestion.model.includes('gpt') || suggestion.model.includes('o1') || suggestion.model.includes('o3');
        if (provider === 'deepseek') return suggestion.model.includes('deepseek');
        if (provider === 'google') return suggestion.model.includes('gemini');
        return false;
      });
      if (!isPreferredProvider) return false;
    }

    // Check minimum quality
    const quality = getQualityScore(suggestion.model);
    if (quality < minQuality) return false;

    return true;
  });
}

/**
 * Learn from user choices
 * @param {Object} optimizer - Optimizer instance
 * @param {Object} choice - User choice
 * @param {string} choice.chosen - Chosen model
 * @param {string[]} choice.alternatives - Alternative options
 */
function learnPreferences(optimizer, choice) {
  const { chosen, alternatives } = choice;

  optimizer.choiceHistory.push(choice);

  // If user consistently chooses higher quality models, increase quality weight
  const chosenQuality = getQualityScore(chosen);
  const altQualities = alternatives.map(getQualityScore);
  const avgAltQuality = altQualities.length > 0
    ? altQualities.reduce((a, b) => a + b, 0) / altQualities.length
    : 0;

  if (chosenQuality > avgAltQuality) {
    // User prefers quality
    optimizer.preferences.qualityWeight = Math.min(1, optimizer.preferences.qualityWeight + 0.1);
    optimizer.preferences.costWeight = Math.max(0, optimizer.preferences.costWeight - 0.1);
  } else if (chosenQuality < avgAltQuality) {
    // User prefers cost
    optimizer.preferences.costWeight = Math.min(1, optimizer.preferences.costWeight + 0.1);
    optimizer.preferences.qualityWeight = Math.max(0, optimizer.preferences.qualityWeight - 0.1);
  }
}

/**
 * Format suggestions for display
 * @param {Array} suggestions - Suggestions to format
 * @returns {string} Formatted output
 */
function formatSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    return 'No optimization suggestions available.';
  }

  const lines = ['Cost Optimization Suggestions:', ''];

  for (const suggestion of suggestions) {
    if (suggestion.type === 'model') {
      lines.push(`• Switch from ${suggestion.current} to ${suggestion.suggested}`);
      lines.push(`  Estimated savings: $${suggestion.savings.toFixed(2)}`);
    } else if (suggestion.type === 'caching') {
      lines.push(`• Enable response caching`);
      lines.push(`  Estimated savings: $${suggestion.savings.toFixed(2)}`);
    } else if (suggestion.type === 'batching') {
      lines.push(`• Batch similar operations`);
      lines.push(`  Estimated savings: $${suggestion.savings.toFixed(2)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  createOptimizer,
  analyzeUsage,
  suggestCheaperModel,
  suggestBatching,
  suggestCaching,
  getQualityScore,
  getCostScore,
  rankByValue,
  applyPreferences,
  learnPreferences,
  formatSuggestions,
  MODEL_QUALITY,
  MODEL_COST_SCORE,
};
