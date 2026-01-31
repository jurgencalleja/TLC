/**
 * Review Command - /tlc:review implementation
 */

const fs = require('fs');
const path = require('path');
const { ReviewOrchestrator } = require('./review-orchestrator.js');
const { generateReport } = require('./review-reporter.js');
const { ClaudeAdapter } = require('./adapters/claude-adapter.js');
const { OpenAIAdapter } = require('./adapters/openai-adapter.js');
const { DeepSeekAdapter } = require('./adapters/deepseek-adapter.js');
const { BudgetTracker } = require('./budget-tracker.js');

/**
 * Parse command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  const options = {
    file: null,
    dir: null,
    format: 'md',
    output: null,
    models: ['claude', 'openai', 'deepseek'],
    extensions: [],
    consensusType: 'majority',
    verbose: false,
  };

  if (!args) return options;

  const parts = args.split(/\s+/);
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (part === '--file' || part === '-f') {
      options.file = parts[++i];
    } else if (part === '--dir' || part === '-d') {
      options.dir = parts[++i];
    } else if (part === '--format') {
      options.format = parts[++i];
    } else if (part === '--output' || part === '-o') {
      options.output = parts[++i];
    } else if (part === '--models' || part === '-m') {
      options.models = parts[++i].split(',').map(m => m.trim().toLowerCase());
    } else if (part === '--ext' || part === '--extensions') {
      options.extensions = parts[++i].split(',').map(e => e.trim());
    } else if (part === '--consensus') {
      options.consensusType = parts[++i];
    } else if (part === '--verbose' || part === '-v') {
      options.verbose = true;
    } else if (!part.startsWith('-') && !options.file && !options.dir) {
      // Positional argument - treat as file or dir
      if (fs.existsSync(part)) {
        const stat = fs.statSync(part);
        if (stat.isDirectory()) {
          options.dir = part;
        } else {
          options.file = part;
        }
      } else {
        options.file = part; // Let it fail later with proper error
      }
    }

    i++;
  }

  return options;
}

/**
 * Create adapters based on model selection
 * @param {string[]} models - Model names to use
 * @param {Object} config - Configuration (budgets, etc.)
 * @returns {Array} Adapter instances
 */
function createAdapters(models, config = {}) {
  const budgetTracker = config.budgetTracker || null;
  const adapters = [];

  for (const model of models) {
    switch (model.toLowerCase()) {
      case 'claude':
        adapters.push(new ClaudeAdapter({
          budgetTracker,
          budget: config.claudeBudget,
          trackCost: config.trackCost !== false,
        }));
        break;
      case 'openai':
        adapters.push(new OpenAIAdapter({
          budgetTracker,
          budget: config.openaiBudget,
        }));
        break;
      case 'deepseek':
        adapters.push(new DeepSeekAdapter({
          budgetTracker,
          budget: config.deepseekBudget,
        }));
        break;
      default:
        console.warn(`Unknown model: ${model}`);
    }
  }

  return adapters;
}

/**
 * Execute review command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Command result
 */
async function executeReview(args, context = {}) {
  const options = parseArgs(args);

  // Validate target
  if (!options.file && !options.dir) {
    return {
      success: false,
      error: 'No target specified. Use --file <path> or --dir <path>',
    };
  }

  // Create adapters
  const adapters = createAdapters(options.models, context);

  if (adapters.length === 0) {
    return {
      success: false,
      error: 'No valid models specified',
    };
  }

  // Create orchestrator
  const orchestrator = new ReviewOrchestrator(adapters, {
    consensusType: options.consensusType,
    requireMinimum: 1,
    budgetAware: true,
  });

  // Show available models
  const availableModels = orchestrator.getAvailableModels();
  if (options.verbose) {
    console.log(`Available models: ${availableModels.join(', ')}`);
  }

  // Run review
  let results;
  try {
    if (options.file) {
      results = await orchestrator.reviewFile(options.file);
      // Wrap single file result in summary format
      results = orchestrator.summarizeResults(
        [results],
        results.models || [],
        results.costs || { byModel: {}, total: 0 }
      );
    } else {
      results = await orchestrator.reviewDirectory(options.dir, {
        extensions: options.extensions,
      });
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }

  // Generate report
  const report = generateReport(results, options.format);

  // Write to file or return
  if (options.output) {
    try {
      fs.writeFileSync(options.output, report, 'utf-8');
      return {
        success: true,
        message: `Report saved to ${options.output}`,
        results,
        outputPath: options.output,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to write report: ${err.message}`,
      };
    }
  }

  return {
    success: true,
    report,
    results,
    summary: {
      files: results.files?.length || 0,
      issues: results.totalIssues || 0,
      cost: results.totalCost || 0,
      models: results.models || [],
    },
  };
}

/**
 * Format summary for display
 * @param {Object} summary - Summary object
 * @returns {string} Formatted summary
 */
function formatSummary(summary) {
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '                        Review Summary                          ',
    '═══════════════════════════════════════════════════════════════',
    '',
    `  Files reviewed:  ${summary.files}`,
    `  Issues found:    ${summary.issues}`,
    `  Models used:     ${summary.models.join(', ')}`,
    `  Total cost:      $${summary.cost.toFixed(4)}`,
    '',
    '═══════════════════════════════════════════════════════════════',
  ];
  return lines.join('\n');
}

module.exports = {
  executeReview,
  parseArgs,
  createAdapters,
  formatSummary,
};
