/**
 * Models Command
 * List and configure available models
 */

/**
 * List models with optional filtering
 * @param {Array} models - All models
 * @param {object} options - Filter options
 * @returns {Array} Filtered models
 */
function listModels(models, options = {}) {
  let result = [...models];

  if (options.provider) {
    result = result.filter(m => m.provider === options.provider);
  }

  if (options.available !== undefined) {
    result = result.filter(m => m.available === options.available);
  }

  return result;
}

/**
 * Test model connectivity
 * @param {object} model - Model to test
 * @param {Function} pingFn - Function to ping model
 * @returns {Promise<object>} Test result
 */
async function testConnectivity(model, pingFn) {
  const start = Date.now();

  try {
    const response = await pingFn(model);
    const latency = Date.now() - start;

    return {
      success: true,
      model: model.id,
      latency,
      response,
    };
  } catch (error) {
    return {
      success: false,
      model: model.id,
      error: error.message,
      latency: Date.now() - start,
    };
  }
}

/**
 * Format models as table
 * @param {Array} models - Models to format
 * @returns {string} Formatted table
 */
function formatModels(models) {
  if (!models || models.length === 0) {
    return 'No models available';
  }

  const lines = [
    'Available Models',
    '='.repeat(70),
    '',
    'ID                   Provider   Local  Health    Available',
    '-'.repeat(70),
  ];

  for (const model of models) {
    const local = model.local ? 'yes' : 'no';
    const health = model.health || 'unknown';
    const available = model.available ? '✓' : '✗';

    lines.push(
      `${(model.id || '').padEnd(20)} ${(model.provider || '').padEnd(10)} ${local.padEnd(6)} ${health.padEnd(9)} ${available}`
    );
  }

  return lines.join('\n');
}

/**
 * Format model pricing
 * @param {Array} models - Models with pricing
 * @returns {string} Formatted pricing
 */
function formatPricing(models) {
  if (!models || models.length === 0) {
    return 'No pricing data available';
  }

  const lines = [
    'Model Pricing (per 1K tokens)',
    '='.repeat(50),
    '',
    'Model                Input    Output',
    '-'.repeat(50),
  ];

  for (const model of models) {
    if (model.pricing) {
      lines.push(
        `${(model.id || '').padEnd(20)} $${model.pricing.input.toFixed(4)}  $${model.pricing.output.toFixed(4)}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Format model capabilities
 * @param {Array} models - Models with capabilities
 * @returns {string} Formatted capabilities
 */
function formatCapabilities(models) {
  if (!models || models.length === 0) {
    return 'No capability data available';
  }

  const lines = [
    'Model Capabilities',
    '='.repeat(60),
    '',
  ];

  for (const model of models) {
    if (model.capabilities && model.capabilities.length > 0) {
      lines.push(`${model.id}:`);
      lines.push(`  ${model.capabilities.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Detect local CLI availability
 * @param {string} cli - CLI name
 * @param {Function} checkFn - Function to check availability
 * @returns {Promise<object>} Detection result
 */
async function detectLocalCLI(cli, checkFn) {
  try {
    const result = await checkFn(cli);
    if (result === false) {
      return { available: false, cli };
    }
    return {
      available: true,
      cli,
      version: typeof result === 'string' ? result : undefined,
    };
  } catch {
    return { available: false, cli };
  }
}

/**
 * Execute models command
 * @param {object} context - Execution context
 * @returns {Promise<object>} Command result
 */
async function execute(context) {
  const { models, command, modelId, options = {}, testFn } = context;

  // Handle sub-commands
  if (command === 'test' && modelId) {
    const model = models.find(m => m.id === modelId);
    if (!model) {
      return {
        success: false,
        error: `Model not found: ${modelId}`,
      };
    }

    const result = await testConnectivity(model, testFn || (async () => ({ ok: true })));
    return {
      success: result.success,
      output: result.success
        ? `Model ${modelId} OK (${result.latency}ms)`
        : `Model ${modelId} failed: ${result.error}`,
      ...result,
    };
  }

  if (command === 'pricing') {
    return {
      success: true,
      output: formatPricing(models),
    };
  }

  if (command === 'capabilities') {
    return {
      success: true,
      output: formatCapabilities(models),
    };
  }

  // Default: list models
  const filtered = listModels(models, options);
  return {
    success: true,
    models: filtered,
    output: formatModels(filtered),
  };
}

module.exports = {
  execute,
  listModels,
  testConnectivity,
  formatModels,
  formatPricing,
  formatCapabilities,
  detectLocalCLI,
};
