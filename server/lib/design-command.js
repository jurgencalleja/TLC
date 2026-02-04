/**
 * Design Command Module
 *
 * CLI for design-to-code operations
 */

const { parseMockup, generateDesignTokens } = require('./design-parser.js');
const { generateReact, generateVue, generateHTML, generateTailwind } = require('./code-generator.js');

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
    command: parts[0] || 'import',
  };

  let argIndex = 1;

  // Handle positional argument (image path)
  if (parts[1] && !parts[1].startsWith('--')) {
    result.imagePath = parts[1];
    argIndex = 2;
  }

  // Parse flags
  for (let i = argIndex; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--framework' && parts[i + 1]) {
      result.framework = parts[i + 1];
      i++;
    } else if (part === '--format' && parts[i + 1]) {
      result.format = parts[i + 1];
      i++;
    } else if (part === '--library' && parts[i + 1]) {
      result.library = parts[i + 1];
      i++;
    } else if (part === '--feedback' && parts[i + 1]) {
      result.feedback = parts[i + 1];
      i++;
    } else if (part === '--typescript') {
      result.typescript = true;
    }
  }

  return result;
}

/**
 * Format design summary
 * @param {Object} design - Design data
 * @returns {string} Formatted summary
 */
function formatDesignSummary(design) {
  const lines = [
    'Design Summary',
    '═'.repeat(40),
    '',
  ];

  // Layout
  if (design.layout) {
    lines.push(`Layout: ${design.layout.type || 'unknown'}${design.layout.columns ? ` (${design.layout.columns} columns)` : ''}`);
  }

  // Components
  if (design.components && design.components.length > 0) {
    lines.push(`Components: ${design.components.length} found`);
    const types = [...new Set(design.components.map(c => c.type))];
    lines.push(`  Types: ${types.join(', ')}`);
  }

  // Colors
  if (design.colors && design.colors.length > 0) {
    lines.push('', 'Colors:');
    for (const color of design.colors.slice(0, 5)) {
      lines.push(`  ${color.hex || color} ${color.role ? `(${color.role})` : ''}`);
    }
    if (design.colors.length > 5) {
      lines.push(`  ... and ${design.colors.length - 5} more`);
    }
  }

  // Typography
  if (design.typography && Object.keys(design.typography).length > 0) {
    lines.push('', 'Typography:');
    for (const [name, style] of Object.entries(design.typography).slice(0, 3)) {
      lines.push(`  ${name}: ${style.size || '?'}px ${style.weight || ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format code preview
 * @param {string} code - Generated code
 * @param {Object} options - Format options
 * @returns {string} Formatted preview
 */
function formatCodePreview(code, options = {}) {
  const { maxLines = 20, language = 'javascript' } = options;

  const lines = code.split('\n');
  const lineCount = lines.length;

  let preview = lines.slice(0, maxLines).join('\n');

  if (lineCount > maxLines) {
    preview += `\n\n... (${lineCount - maxLines} more lines)`;
  }

  return `Generated Code (${lineCount} lines):\n${'─'.repeat(40)}\n${preview}`;
}

/**
 * Design Command class
 */
class DesignCommand {
  /**
   * Create a design command handler
   * @param {Object} options - Dependencies
   * @param {Object} options.parser - Design parser
   * @param {Object} options.generator - Code generator
   */
  constructor(options) {
    this.parser = options.parser;
    this.generator = options.generator;
    this.currentDesign = null;
    this.currentCode = null;
    this.history = [];
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'import':
        return this.executeImport(args);

      case 'generate':
        return this.executeGenerate(args);

      case 'tokens':
        return this.executeTokens(args);

      case 'iterate':
        return this.executeIterate(args);

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute import command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Import result
   */
  async executeImport(args) {
    try {
      const design = await parseMockup(this.parser, {
        imagePath: args.imagePath,
      });

      this.currentDesign = design;
      this.history.push({ type: 'import', design, timestamp: new Date() });

      return {
        success: true,
        output: formatDesignSummary(design),
        design,
      };
    } catch (error) {
      return {
        success: false,
        output: `Import failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute generate command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Generation result
   */
  async executeGenerate(args) {
    try {
      // Import first if path provided
      if (args.imagePath && !this.currentDesign) {
        await this.executeImport(args);
      }

      if (!this.currentDesign) {
        return {
          success: false,
          output: 'No design loaded. Run import first.',
        };
      }

      const framework = args.framework || 'react';
      let result;

      switch (framework) {
        case 'react':
          result = await generateReact(this.generator, {
            design: this.currentDesign,
            typescript: args.typescript,
          });
          break;
        case 'vue':
          result = await generateVue(this.generator, {
            design: this.currentDesign,
          });
          break;
        case 'html':
          result = await generateHTML(this.generator, {
            design: this.currentDesign,
            includeCSS: true,
          });
          break;
        case 'tailwind':
          result = await generateTailwind(this.generator, {
            design: this.currentDesign,
          });
          break;
        default:
          result = await generateReact(this.generator, {
            design: this.currentDesign,
          });
      }

      this.currentCode = result.code;
      this.history.push({ type: 'generate', framework, code: result.code, timestamp: new Date() });

      return {
        success: true,
        output: formatCodePreview(result.code),
        code: result.code,
        framework,
      };
    } catch (error) {
      return {
        success: false,
        output: `Generation failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute tokens command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Tokens result
   */
  async executeTokens(args) {
    try {
      if (!this.currentDesign && args.imagePath) {
        await this.executeImport(args);
      }

      if (!this.currentDesign) {
        return {
          success: false,
          output: 'No design loaded. Run import first.',
        };
      }

      const format = args.format || 'json';
      const tokens = await generateDesignTokens(this.parser, {
        imagePath: args.imagePath || 'current',
        format,
      });

      // Use the already extracted data from currentDesign
      tokens.colors = this.currentDesign.colors;
      tokens.typography = this.currentDesign.typography;
      tokens.spacing = this.currentDesign.spacing;

      let output;
      if (format === 'css') {
        const cssLines = [':root {'];
        for (const color of tokens.colors || []) {
          const varName = color.role ? `--color-${color.role}` : `--color-${(tokens.colors || []).indexOf(color)}`;
          cssLines.push(`  ${varName}: ${color.hex || color};`);
        }
        cssLines.push('}');
        output = cssLines.join('\n');
        tokens.css = output;
      } else {
        output = JSON.stringify(tokens, null, 2);
        tokens.json = output;
      }

      return {
        success: true,
        output,
        tokens,
        format,
      };
    } catch (error) {
      return {
        success: false,
        output: `Token extraction failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Execute iterate command
   * @param {Object} args - Parsed arguments
   * @returns {Promise<Object>} Iteration result
   */
  async executeIterate(args) {
    if (!this.currentDesign || !this.currentCode) {
      return {
        success: false,
        output: 'No design or code to iterate on. Run import and generate first.',
      };
    }

    const comparison = {
      design: formatDesignSummary(this.currentDesign),
      code: formatCodePreview(this.currentCode, { maxLines: 10 }),
      iterations: this.history.filter(h => h.type === 'generate').length,
    };

    if (args.feedback) {
      // In a real implementation, this would regenerate with feedback
      this.history.push({ type: 'feedback', feedback: args.feedback, timestamp: new Date() });

      return {
        success: true,
        output: `Feedback received: "${args.feedback}"\nRegenerating with feedback...`,
        comparison,
      };
    }

    return {
      success: true,
      output: `Design-to-Code Comparison\n${'═'.repeat(40)}\n\n${comparison.design}\n\n${comparison.code}\n\nIterations: ${comparison.iterations}`,
      comparison,
    };
  }
}

module.exports = {
  DesignCommand,
  parseArgs,
  formatDesignSummary,
  formatCodePreview,
};
