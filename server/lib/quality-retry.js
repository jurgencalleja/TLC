/**
 * Quality Retry Module
 *
 * Auto-retry logic with better models on quality failure
 */

/**
 * Create a retry manager
 * @param {Object} options - Manager options
 * @returns {Object} Retry manager
 */
function createRetryManager(options = {}) {
  const budgetLimit = options.budgetLimit ?? Infinity;
  return {
    options: {
      maxRetries: options.maxRetries ?? 3,
      budgetLimit,
      ...options,
    },
    history: [],
    totalCost: 0,
    budgetLimit,
    costPerAttempt: {},
    modelPerAttempt: {},
  };
}

/**
 * Determine if retry should be attempted
 * @param {Object} evaluation - Evaluation result
 * @param {Object} options - Retry options
 * @param {Object} resultOptions - Result options
 * @returns {boolean|Object} Whether to retry
 */
function shouldRetry(evaluation, options = {}, resultOptions = {}) {
  const {
    maxRetries = 3,
    currentRetry = 0,
    budgetLimit = Infinity,
    spentBudget = 0,
    retryOnDimensions = null,
  } = options;

  // Don't retry if passed
  if (evaluation.pass) {
    if (resultOptions.reason) {
      return { retry: false, reason: 'evaluation passed' };
    }
    return false;
  }

  // Check max retries
  if (currentRetry >= maxRetries) {
    if (resultOptions.reason) {
      return { retry: false, reason: 'max retries reached' };
    }
    return false;
  }

  // Check budget
  if (spentBudget >= budgetLimit) {
    if (resultOptions.reason) {
      return { retry: false, reason: 'budget exceeded' };
    }
    return false;
  }

  // Check specific dimension filtering
  if (retryOnDimensions && evaluation.failed) {
    const shouldRetryDimension = evaluation.failed.some((d) =>
      retryOnDimensions.includes(d)
    );
    if (!shouldRetryDimension) {
      if (resultOptions.reason) {
        return { retry: false, reason: 'no matching dimensions to retry' };
      }
      return false;
    }
  }

  if (resultOptions.reason) {
    return { retry: true, reason: 'quality failure' };
  }
  return true;
}

/**
 * Select a better model for retry
 * @param {string} currentModel - Current model
 * @param {string[]} models - Available models (ordered by quality)
 * @param {Object} options - Selection options
 * @returns {string|null|Object} Better model or null
 */
function selectBetterModel(currentModel, models, options = {}) {
  const {
    remainingBudget = Infinity,
    costs = {},
    requiredCapability = null,
    capabilities = {},
    details = false,
  } = options;

  const currentIndex = models.indexOf(currentModel);

  // Find next better model
  for (let i = currentIndex + 1; i < models.length; i++) {
    const candidate = models[i];

    // Check budget
    const cost = costs[candidate] || 0;
    if (cost > remainingBudget) {
      continue;
    }

    // Check capabilities
    if (requiredCapability && capabilities[candidate]) {
      if (!capabilities[candidate].includes(requiredCapability)) {
        continue;
      }
    }

    if (details) {
      return {
        model: candidate,
        tier: i,
        cost: costs[candidate],
      };
    }
    return candidate;
  }

  if (details) {
    return { model: null, tier: null, reason: 'no better model available' };
  }
  return null;
}

/**
 * Build retry prompt with failure context
 * @param {string} originalPrompt - Original prompt
 * @param {Object} context - Failure context
 * @returns {string} Enhanced retry prompt
 */
function buildRetryPrompt(originalPrompt, context) {
  const { failedDimensions = [], failures = {}, suggestions = [] } = context;

  let prompt = originalPrompt;

  if (failedDimensions.length > 0) {
    prompt += '\n\n---\nPrevious attempt failed quality checks. Please improve the following:';

    for (const dim of failedDimensions) {
      const failure = failures[dim];
      if (failure) {
        prompt += `\n- ${dim}: score ${failure.score}/${failure.threshold}`;
        if (failure.reason) {
          prompt += ` (${failure.reason})`;
        }
      } else {
        prompt += `\n- ${dim}`;
      }
    }
  }

  if (suggestions.length > 0) {
    prompt += '\n\nSuggestions to fix:';
    for (const suggestion of suggestions) {
      prompt += `\n- ${suggestion}`;
    }
  }

  return prompt;
}

/**
 * Track cost of a retry attempt
 * @param {Object} manager - Retry manager
 * @param {number} cost - Cost of attempt
 * @param {Object} options - Tracking options
 */
function trackRetryCost(manager, cost, options = {}) {
  const { attempt, model } = options;

  manager.totalCost = (manager.totalCost || 0) + cost;

  if (attempt !== undefined) {
    if (!manager.costPerAttempt) {
      manager.costPerAttempt = {};
    }
    manager.costPerAttempt[attempt] = cost;
  }

  if (model && attempt !== undefined) {
    if (!manager.modelPerAttempt) {
      manager.modelPerAttempt = {};
    }
    manager.modelPerAttempt[attempt] = model;
  }
}

/**
 * Get retry history
 * @param {Object} manager - Retry manager
 * @param {Object} options - History options
 * @returns {Array|Object} History records
 */
function getRetryHistory(manager, options = {}) {
  const { escalationPath = false, improvements = false } = options;

  const history = manager.history || [];

  if (!escalationPath && !improvements) {
    return history;
  }

  const result = {
    attempts: history,
  };

  if (escalationPath) {
    result.escalationPath = history.map((h) => h.model).filter(Boolean);
  }

  if (improvements) {
    result.improvements = {};
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].composite || 0;
      const curr = history[i].composite || 0;
      result.improvements[i] = curr - prev;
    }
  }

  return result;
}

/**
 * Execute retry loop with feedback
 * @param {string} prompt - Original prompt
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Final result
 */
async function retryWithFeedback(prompt, options = {}) {
  const {
    execute,
    evaluate,
    maxRetries = 3,
    models = ['basic', 'advanced', 'premium'],
    initialModel = 'basic',
    budgetLimit = Infinity,
  } = options;

  const history = [];
  let currentModel = initialModel;
  let currentPrompt = prompt;
  let totalCost = 0;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    // Execute with current model and prompt
    const output = await execute(currentPrompt, currentModel);

    // Evaluate the output
    const evaluation = await evaluate(output);

    // Record in history
    history.push({
      attempt,
      model: currentModel,
      ...evaluation,
    });

    // Check if passed
    if (evaluation.pass) {
      return {
        pass: true,
        output,
        ...evaluation,
        history,
        attempts: attempt,
      };
    }

    // Check if should retry
    if (attempt >= maxRetries) {
      break;
    }

    // Try to escalate model
    const betterModel = selectBetterModel(currentModel, models, {
      remainingBudget: budgetLimit - totalCost,
    });

    if (betterModel) {
      currentModel = betterModel;
    }

    // Build retry prompt with feedback
    currentPrompt = buildRetryPrompt(prompt, {
      failedDimensions: evaluation.failed || [],
    });
  }

  // Return final result (failed)
  const lastEval = history[history.length - 1];
  return {
    pass: false,
    ...lastEval,
    history,
    attempts: attempt,
  };
}

module.exports = {
  createRetryManager,
  shouldRetry,
  selectBetterModel,
  buildRetryPrompt,
  trackRetryCost,
  getRetryHistory,
  retryWithFeedback,
};
