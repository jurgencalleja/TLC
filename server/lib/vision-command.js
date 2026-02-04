/**
 * Vision Command Module
 *
 * CLI commands for vision operations
 */

const {
  analyzeImage,
  compareImages,
  extractComponents,
  auditAccessibility,
} = require('./gemini-vision.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (const char of input) {
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  const result = {
    command: parts[0] || 'analyze',
  };

  let argIndex = 1;

  // Handle positional arguments based on command
  if (result.command === 'analyze' || result.command === 'a11y' || result.command === 'extract') {
    if (parts[1] && !parts[1].startsWith('--')) {
      result.imagePath = parts[1];
      argIndex = 2;
    }
  } else if (result.command === 'compare') {
    if (parts[1] && !parts[1].startsWith('--')) {
      result.beforeImage = parts[1];
      argIndex = 2;
    }
    if (parts[2] && !parts[2].startsWith('--')) {
      result.afterImage = parts[2];
      argIndex = 3;
    }
  }

  // Parse flags
  for (let i = argIndex; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--prompt' && parts[i + 1]) {
      result.prompt = parts[i + 1];
      i++;
    } else if (part === '--type' && parts[i + 1]) {
      result.type = parts[i + 1];
      i++;
    } else if (part === '--format' && parts[i + 1]) {
      result.format = parts[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Format analysis output
 * @param {Object} analysis - Analysis result
 * @returns {string} Formatted output
 */
function formatAnalysis(analysis) {
  const lines = [
    'Image Analysis',
    '═'.repeat(40),
    '',
    'Description:',
    analysis.description || 'No description available',
    '',
  ];

  if (analysis.elements && analysis.elements.length > 0) {
    lines.push('Elements Found:');
    for (const element of analysis.elements) {
      lines.push(`  - ${element}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format comparison output
 * @param {Object} comparison - Comparison result
 * @returns {string} Formatted output
 */
function formatComparison(comparison) {
  const lines = [
    'Image Comparison',
    '═'.repeat(40),
    '',
    `Similarity: ${Math.round(comparison.similarity * 100)}%`,
    '',
  ];

  if (comparison.differences.length === 0) {
    lines.push('Images are identical - no differences found.');
  } else {
    lines.push(`Found ${comparison.differences.length} difference(s):`);
    lines.push('');

    for (const diff of comparison.differences) {
      const icon = diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : '~';
      lines.push(`  ${icon} [${diff.type.toUpperCase()}] ${diff.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format accessibility report
 * @param {Object} audit - Accessibility audit
 * @returns {string} Formatted output
 */
function formatAccessibilityReport(audit) {
  const lines = [
    'Accessibility Audit',
    '═'.repeat(40),
    '',
    `Score: ${audit.score}/100`,
    '',
  ];

  if (audit.issues.length === 0) {
    lines.push('No accessibility issues found!');
  } else {
    // Group by severity
    const bySeverity = {
      high: [],
      medium: [],
      low: [],
    };

    for (const issue of audit.issues) {
      const severity = issue.severity || 'medium';
      if (!bySeverity[severity]) bySeverity[severity] = [];
      bySeverity[severity].push(issue);
    }

    if (bySeverity.high.length > 0) {
      lines.push('HIGH Severity:');
      for (const issue of bySeverity.high) {
        lines.push(`  - [${issue.type}] ${issue.description}`);
      }
      lines.push('');
    }

    if (bySeverity.medium.length > 0) {
      lines.push('MEDIUM Severity:');
      for (const issue of bySeverity.medium) {
        lines.push(`  - [${issue.type}] ${issue.description}`);
      }
      lines.push('');
    }

    if (bySeverity.low.length > 0) {
      lines.push('LOW Severity:');
      for (const issue of bySeverity.low) {
        lines.push(`  - [${issue.type}] ${issue.description}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format components output
 * @param {Array} components - Extracted components
 * @returns {string} Formatted output
 */
function formatComponents(components) {
  const lines = [
    'Extracted Components',
    '═'.repeat(40),
    '',
    `Found ${components.length} component(s):`,
    '',
  ];

  for (const comp of components) {
    let line = `  - [${comp.type}]`;
    if (comp.label) line += ` "${comp.label}"`;
    else if (comp.placeholder) line += ` (placeholder: "${comp.placeholder}")`;
    else if (comp.content) line += ` "${comp.content.substring(0, 30)}..."`;
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Vision Command class
 */
class VisionCommand {
  /**
   * Create a vision command handler
   * @param {Object} options - Dependencies
   * @param {Object} options.client - Gemini vision client
   */
  constructor(options) {
    this.client = options.client;
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'analyze':
        return this.executeAnalyze(args);

      case 'compare':
        return this.executeCompare(args);

      case 'a11y':
        return this.executeA11y(args);

      case 'extract':
        return this.executeExtract(args);

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute analyze command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalyze(args) {
    try {
      const analysis = await analyzeImage(this.client, {
        imagePath: args.imagePath,
        prompt: args.prompt,
      });

      return {
        success: true,
        output: formatAnalysis(analysis),
        analysis,
      };
    } catch (error) {
      return {
        success: false,
        output: `Analysis failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute compare command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Comparison result
   */
  async executeCompare(args) {
    try {
      const comparison = await compareImages(this.client, {
        beforeImage: args.beforeImage,
        afterImage: args.afterImage,
      });

      return {
        success: true,
        output: formatComparison(comparison),
        comparison,
      };
    } catch (error) {
      return {
        success: false,
        output: `Comparison failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute accessibility audit command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Audit result
   */
  async executeA11y(args) {
    try {
      const audit = await auditAccessibility(this.client, {
        imagePath: args.imagePath,
      });

      return {
        success: true,
        output: formatAccessibilityReport(audit),
        audit,
      };
    } catch (error) {
      return {
        success: false,
        output: `Audit failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute component extraction command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Extraction result
   */
  async executeExtract(args) {
    try {
      const types = args.type ? [args.type] : undefined;
      const result = await extractComponents(this.client, {
        imagePath: args.imagePath,
        types,
      });

      return {
        success: true,
        output: formatComponents(result.components),
        components: result.components,
      };
    } catch (error) {
      return {
        success: false,
        output: `Extraction failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}

module.exports = {
  VisionCommand,
  parseArgs,
  formatAnalysis,
  formatComparison,
  formatAccessibilityReport,
  formatComponents,
};
