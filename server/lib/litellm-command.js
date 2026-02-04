/**
 * LiteLLM Command Module
 *
 * CLI commands for LiteLLM management
 */

const { setModelAlias, setFallbackChain, getBaseUrl, exportConfig } = require('./litellm-config.js');
const { healthCheck, getUsage, getModels, chat } = require('./litellm-client.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = input.split(/\s+/);
  const result = {
    command: parts[0] || 'status',
  };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--alias' && parts[i + 1]) {
      result.alias = parts[i + 1];
      i++;
    } else if (part === '--fallback' && parts[i + 1]) {
      result.fallback = parts[i + 1];
      i++;
    } else if (part === '--provider' && parts[i + 1]) {
      result.provider = parts[i + 1];
      i++;
    } else if (part === '--model' && parts[i + 1]) {
      result.model = parts[i + 1];
      i++;
    } else if (part === '--format' && parts[i + 1]) {
      result.format = parts[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Format status output
 * @param {Object} status - Status data
 * @returns {string} Formatted output
 */
function formatStatus(status) {
  const lines = [
    'LiteLLM Status',
    '═'.repeat(40),
    '',
    `Proxy: ${status.baseUrl}`,
    `Health: ${status.healthy ? 'Healthy' : 'Unhealthy'}`,
    '',
  ];

  if (status.totalSpend !== undefined) {
    lines.push(`Total Spend: $${status.totalSpend.toFixed(2)}`);
  }

  if (status.totalTokens !== undefined) {
    lines.push(`Total Tokens: ${status.totalTokens.toLocaleString()}`);
  }

  if (status.modelsAvailable !== undefined) {
    lines.push(`Models Available: ${status.modelsAvailable}`);
  }

  return lines.join('\n');
}

/**
 * Format models list
 * @param {Array} models - Models to format
 * @param {Object} [options] - Format options
 * @param {boolean} [options.groupByProvider] - Group by provider
 * @returns {string} Formatted output
 */
function formatModels(models, options = {}) {
  const { groupByProvider } = options;

  if (groupByProvider) {
    const grouped = {};
    for (const model of models) {
      const provider = model.provider || 'unknown';
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(model);
    }

    const lines = ['Available Models', '═'.repeat(40), ''];

    for (const [provider, providerModels] of Object.entries(grouped)) {
      lines.push(`${provider.charAt(0).toUpperCase() + provider.slice(1)}:`);
      for (const m of providerModels) {
        lines.push(`  - ${m.id}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  const lines = ['Available Models', '═'.repeat(40), ''];

  for (const model of models) {
    lines.push(`${model.id} (${model.provider || 'unknown'})`);
  }

  return lines.join('\n');
}

/**
 * LiteLLM Command class
 */
class LiteLLMCommand {
  /**
   * Create a LiteLLM command handler
   * @param {Object} options - Dependencies
   * @param {Object} options.client - LiteLLM client
   * @param {Object} options.config - LiteLLM config
   */
  constructor(options) {
    this.client = options.client;
    this.config = options.config;
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'config':
        return this.executeConfig(args);

      case 'status':
        return this.executeStatus();

      case 'models':
        return this.executeModels(args);

      case 'test':
        return this.executeTest(args);

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute config command
   * @param {Object} args - Parsed arguments
   * @returns {Object} Config result
   */
  async executeConfig(args) {
    if (args.alias) {
      // Parse alias format: name=provider/model
      const [alias, target] = args.alias.split('=');
      if (target) {
        const [provider, model] = target.split('/');
        setModelAlias(this.config, { alias, provider, model });
        return {
          success: true,
          output: `Set alias: ${alias} -> ${provider}/${model}`,
        };
      }
    }

    if (args.fallback) {
      // Parse fallback format: primary=fallback1,fallback2
      const [primary, fallbacksStr] = args.fallback.split('=');
      if (fallbacksStr) {
        const fallbacks = fallbacksStr.split(',');
        setFallbackChain(this.config, { primary, fallbacks });
        return {
          success: true,
          output: `Set fallback chain: ${primary} -> ${fallbacks.join(' -> ')}`,
        };
      }
    }

    // Show current config
    return {
      success: true,
      output: `LiteLLM Configuration\n${'═'.repeat(40)}\n\nBase URL: ${getBaseUrl(this.config)}\n\n${exportConfig(this.config, { format: 'yaml' })}`,
    };
  }

  /**
   * Execute status command
   * @returns {Promise<Object>} Status result
   */
  async executeStatus() {
    const health = await healthCheck(this.client);

    let usage = { total_spend: 0, total_tokens: 0 };
    try {
      usage = await getUsage(this.client);
    } catch {
      // Usage may not be available
    }

    let modelsCount = 0;
    try {
      const models = await getModels(this.client);
      modelsCount = models.length;
    } catch {
      // Models count may not be available
    }

    const status = {
      healthy: health.status === 'healthy',
      baseUrl: this.client.baseUrl,
      totalSpend: usage.total_spend || 0,
      totalTokens: usage.total_tokens || 0,
      modelsAvailable: modelsCount,
    };

    return {
      success: true,
      output: formatStatus(status),
      status,
    };
  }

  /**
   * Execute models command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Models result
   */
  async executeModels(args) {
    let models = await getModels(this.client);

    if (args.provider) {
      models = models.filter(m => m.provider === args.provider);
    }

    return {
      success: true,
      output: formatModels(models, { groupByProvider: !args.provider }),
      models,
    };
  }

  /**
   * Execute test command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Test result
   */
  async executeTest(args) {
    const model = args.model || 'claude-3-sonnet';

    try {
      const response = await chat(this.client, {
        model,
        messages: [{ role: 'user', content: 'Say "Hello from LiteLLM!" in exactly those words.' }],
        maxTokens: 50,
      });

      return {
        success: true,
        output: `Test successful!\nModel: ${model}\nResponse: ${response.choices?.[0]?.message?.content || 'OK'}`,
        response,
      };
    } catch (error) {
      return {
        success: false,
        output: `Test failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}

module.exports = {
  LiteLLMCommand,
  parseArgs,
  formatStatus,
  formatModels,
};
