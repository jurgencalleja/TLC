/**
 * Visual Command Module
 *
 * CLI for visual regression testing
 */

const path = require('path');
const {
  createBaseline,
  updateBaseline,
  runVisualTest,
  formatVisualReport,
} = require('./visual-testing.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = input.split(/\s+/);
  const result = {
    command: parts[0] || 'test',
  };

  let argIndex = 1;

  // Handle positional name argument
  if (parts[1] && !parts[1].startsWith('--')) {
    result.name = parts[1];
    argIndex = 2;
  }

  // Parse flags
  for (let i = argIndex; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--url' && parts[i + 1]) {
      result.url = parts[i + 1];
      i++;
    } else if (part === '--viewport' && parts[i + 1]) {
      result.viewport = parts[i + 1];
      i++;
    } else if (part === '--selector' && parts[i + 1]) {
      result.selector = parts[i + 1];
      i++;
    } else if (part === '--threshold' && parts[i + 1]) {
      result.threshold = parts[i + 1];
      i++;
    } else if (part === '--pattern' && parts[i + 1]) {
      result.pattern = parts[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Parse viewport string (e.g., "375x812")
 * @param {string} viewport - Viewport string
 * @returns {Object} Viewport object
 */
function parseViewport(viewport) {
  if (!viewport) return null;

  const [width, height] = viewport.split('x').map(Number);
  return { width, height };
}

/**
 * Format test summary
 * @param {Array} results - Test results
 * @param {Object} [options] - Format options
 * @returns {string} Formatted summary
 */
function formatTestSummary(results, options = {}) {
  const { showTiming = false } = options;

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  const lines = [
    'Visual Test Summary',
    '═'.repeat(40),
    '',
    `Total: ${total} | Pass: ${passed} | Fail: ${failed}`,
    '',
  ];

  for (const result of results) {
    const status = result.pass ? '✓ PASS' : '✗ FAIL';
    let line = `${status} ${result.name}`;

    if (result.similarity !== undefined && !result.pass) {
      line += ` (${Math.round(result.similarity * 100)}% similar)`;
    }

    if (showTiming && result.duration) {
      line += ` [${result.duration}ms]`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Visual Command class
 */
class VisualCommand {
  /**
   * Create a visual command handler
   * @param {Object} options - Dependencies
   * @param {Object} options.tester - Visual tester instance
   */
  constructor(options) {
    this.tester = options.tester;
    this.pendingApprovals = new Map();
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'baseline':
        return this.executeBaseline(args);

      case 'test':
        return this.executeTest(args);

      case 'approve':
        return this.executeApprove(args);

      case 'list':
        return this.executeList(args);

      case 'run':
        return this.executeRun(args);

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute baseline command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Baseline result
   */
  async executeBaseline(args) {
    try {
      const viewport = parseViewport(args.viewport);

      const baseline = await createBaseline(this.tester, {
        name: args.name,
        url: args.url,
        viewport,
        selector: args.selector,
      });

      return {
        success: true,
        output: `Baseline created: ${args.name}`,
        baseline,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to create baseline: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute test command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Test result
   */
  async executeTest(args) {
    try {
      if (args.threshold) {
        this.tester.threshold = parseFloat(args.threshold);
      }

      const result = await runVisualTest(this.tester, {
        name: args.name,
        url: args.url,
        createIfMissing: false,
      });

      if (!result.pass) {
        // Store for potential approval
        this.pendingApprovals.set(args.name, {
          url: args.url,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        pass: result.pass,
        output: result.pass
          ? `✓ Visual test passed: ${args.name}`
          : `✗ Visual test failed: ${args.name} (${Math.round(result.similarity * 100)}% similar)`,
        similarity: result.similarity,
        differences: result.differences,
        duration: result.duration,
      };
    } catch (error) {
      return {
        success: false,
        pass: false,
        output: `Test failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute approve command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Approval result
   */
  async executeApprove(args) {
    try {
      await updateBaseline(this.tester, {
        name: args.name,
      });

      this.pendingApprovals.delete(args.name);

      return {
        success: true,
        output: `Baseline updated: ${args.name}`,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to approve: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute list command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} List result
   */
  async executeList(args) {
    try {
      const files = await this.tester._listFiles(this.tester.baselineDir);
      const baselines = files.filter(f => f.endsWith('.png')).map(f => path.basename(f, '.png'));

      const lines = [
        'Visual Baselines',
        '═'.repeat(40),
        '',
        ...baselines.map(b => `  - ${b}`),
      ];

      return {
        success: true,
        output: lines.join('\n'),
        baselines,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to list baselines: ${error.message}`,
        baselines: [],
      };
    }
  }

  /**
   * Execute run command (all tests)
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Run result
   */
  async executeRun(args) {
    try {
      const files = await this.tester._listFiles(this.tester.baselineDir);
      let baselines = files.filter(f => f.endsWith('.png')).map(f => path.basename(f, '.png'));

      // Filter by pattern if specified
      if (args.pattern) {
        baselines = baselines.filter(b => b.includes(args.pattern));
      }

      const results = [];

      for (const name of baselines) {
        // Load metadata for URL
        const metadataPath = path.join(this.tester.baselineDir, `${name}.json`);
        let url;

        try {
          const metadata = JSON.parse(await this.tester._readFile(metadataPath));
          url = metadata.url;
        } catch {
          url = 'http://localhost:3000'; // Default
        }

        const result = await runVisualTest(this.tester, {
          name,
          url,
        });

        results.push(result);
      }

      return {
        success: true,
        output: formatVisualReport(results),
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.pass).length,
          failed: results.filter(r => !r.pass).length,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to run tests: ${error.message}`,
        results: [],
      };
    }
  }
}

module.exports = {
  VisualCommand,
  parseArgs,
  parseViewport,
  formatTestSummary,
};
