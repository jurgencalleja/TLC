/**
 * Export Command Module
 * Handles /tlc:export command for generating tool-specific rule files
 */

const fs = require('fs');
const path = require('path');
const {
  SUPPORTED_TOOLS,
  TOOL_FILE_PATHS,
  generateToolRules,
  generateAllToolRules,
  getSupportedTools,
} = require('./tool-rules.js');
const {
  AI_TOOLS,
  detectAITool,
  getToolDisplayName,
} = require('./tool-detector.js');

/**
 * Parse export command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseExportArgs(args = '') {
  const options = {
    tools: [], // Empty means all tools
    projectName: null,
    testFramework: null,
    output: null,
    dryRun: false,
    detect: false,
    list: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--all') {
      options.tools = getSupportedTools();
    } else if (part === '--tool' && parts[i + 1]) {
      const tool = parts[++i].toLowerCase();
      if (!options.tools.includes(tool)) {
        options.tools.push(tool);
      }
    } else if (part === '--project' && parts[i + 1]) {
      options.projectName = parts[++i];
    } else if (part === '--framework' && parts[i + 1]) {
      options.testFramework = parts[++i];
    } else if (part === '--output' && parts[i + 1]) {
      options.output = parts[++i];
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (part === '--detect') {
      options.detect = true;
    } else if (part === '--list') {
      options.list = true;
    } else if (Object.values(SUPPORTED_TOOLS).includes(part)) {
      // Direct tool name
      if (!options.tools.includes(part)) {
        options.tools.push(part);
      }
    } else if (part === 'all') {
      options.tools = getSupportedTools();
    }
  }

  return options;
}

/**
 * Load project configuration
 * @param {string} projectDir - Project directory
 * @returns {Object} Project config
 */
function loadProjectConfig(projectDir) {
  const config = {
    projectName: 'Project',
    testFramework: 'vitest',
  };

  // Try package.json
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        config.projectName = pkg.name;
      }
      // Detect test framework from dependencies
      if (pkg.devDependencies || pkg.dependencies) {
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vitest) config.testFramework = 'vitest';
        else if (deps.jest) config.testFramework = 'jest';
        else if (deps.mocha) config.testFramework = 'mocha';
        else if (deps.pytest) config.testFramework = 'pytest';
      }
    }
  } catch {
    // Ignore
  }

  // Try .tlc.json
  try {
    const tlcPath = path.join(projectDir, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      const tlc = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
      if (tlc.projectName) {
        config.projectName = tlc.projectName;
      }
      if (tlc.testFrameworks?.primary) {
        config.testFramework = tlc.testFrameworks.primary;
      }
    }
  } catch {
    // Ignore
  }

  // Try PROJECT.md
  try {
    const projectPath = path.join(projectDir, 'PROJECT.md');
    if (fs.existsSync(projectPath)) {
      const content = fs.readFileSync(projectPath, 'utf-8');
      const nameMatch = /^#\s+(.+)$/m.exec(content);
      if (nameMatch) {
        config.projectName = nameMatch[1].trim();
      }
    }
  } catch {
    // Ignore
  }

  return config;
}

/**
 * Ensure directory exists for a file path
 * @param {string} filePath - File path
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Write a rule file
 * @param {string} filePath - File path
 * @param {string} content - File content
 */
function writeRuleFile(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Format tool list for display
 * @returns {string} Formatted list
 */
function formatToolList() {
  const lines = [];

  lines.push('# Supported AI Tools');
  lines.push('');
  lines.push('| Tool | File Path |');
  lines.push('|------|-----------|');

  for (const tool of getSupportedTools()) {
    const filePath = TOOL_FILE_PATHS[tool];
    const displayName = getToolDisplayName(tool) || tool;
    lines.push(`| ${displayName} | \`${filePath}\` |`);
  }

  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push('```');
  lines.push('/tlc:export all                    # Export all tools');
  lines.push('/tlc:export cursor                 # Export specific tool');
  lines.push('/tlc:export --tool cursor --tool copilot  # Multiple tools');
  lines.push('/tlc:export --detect               # Detect current tool');
  lines.push('/tlc:export --dry-run              # Preview without writing');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format detection result for display
 * @param {Object} detection - Detection result
 * @returns {string} Formatted result
 */
function formatDetectionResult(detection) {
  const lines = [];

  lines.push('# AI Tool Detection');
  lines.push('');

  if (detection.primaryTool === AI_TOOLS.UNKNOWN) {
    lines.push('**Status:** No AI tool detected');
    lines.push('');
    lines.push('Run this command within an AI coding tool to detect it.');
  } else {
    const toolName = getToolDisplayName(detection.primaryTool);
    lines.push(`**Primary Tool:** ${toolName}`);
    lines.push(`**Confidence:** ${detection.confidence}%`);
    lines.push('');

    if (detection.allDetected.length > 1) {
      lines.push('## All Detected Tools');
      lines.push('');
      lines.push('| Tool | Confidence |');
      lines.push('|------|------------|');
      for (const { tool, confidence } of detection.allDetected) {
        const name = getToolDisplayName(tool);
        lines.push(`| ${name} | ${confidence}% |`);
      }
      lines.push('');
    }

    lines.push('## Detection Sources');
    lines.push('');
    if (detection.sources.environment.length > 0) {
      lines.push(`- **Environment:** ${detection.sources.environment.join(', ')}`);
    }
    if (detection.sources.process.length > 0) {
      lines.push(`- **Process:** ${detection.sources.process.join(', ')}`);
    }
    if (detection.sources.configFiles.length > 0) {
      lines.push(`- **Config Files:** ${detection.sources.configFiles.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format export summary
 * @param {Object} result - Export result
 * @returns {string} Formatted summary
 */
function formatExportSummary(result) {
  const lines = [];

  lines.push('# TLC Rules Exported');
  lines.push('');
  lines.push(`**Project:** ${result.projectName}`);
  lines.push(`**Test Framework:** ${result.testFramework}`);
  lines.push('');
  lines.push('## Generated Files');
  lines.push('');

  for (const file of result.files) {
    const status = file.written ? 'Created' : 'Skipped';
    lines.push(`- [${status}] \`${file.path}\``);
  }

  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Commit the generated files');
  lines.push('2. Your AI tool will now follow TLC workflow');
  lines.push('3. Check `.planning/ROADMAP.md` for current progress');

  return lines.join('\n');
}

/**
 * Execute export command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Object} Command result
 */
async function executeExportCommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;
  const options = parseExportArgs(args);

  try {
    // Handle --list flag
    if (options.list) {
      return {
        success: true,
        output: formatToolList(),
      };
    }

    // Handle --detect flag
    if (options.detect) {
      const detection = detectAITool({ projectDir });
      return {
        success: true,
        detection,
        output: formatDetectionResult(detection),
      };
    }

    // Load project config
    const projectConfig = loadProjectConfig(projectDir);
    const genOptions = {
      projectName: options.projectName || projectConfig.projectName,
      testFramework: options.testFramework || projectConfig.testFramework,
    };

    // Determine which tools to export
    const tools = options.tools.length > 0 ? options.tools : getSupportedTools();

    // Validate tools
    const validTools = getSupportedTools();
    for (const tool of tools) {
      if (!validTools.includes(tool)) {
        return {
          success: false,
          error: `Unknown tool: ${tool}. Use --list to see supported tools.`,
        };
      }
    }

    // Generate rules
    const files = [];
    for (const tool of tools) {
      const content = generateToolRules(tool, genOptions);
      const relativePath = TOOL_FILE_PATHS[tool];
      const fullPath = path.join(projectDir, relativePath);

      const fileInfo = {
        tool,
        path: relativePath,
        fullPath,
        content,
        written: false,
      };

      if (!options.dryRun) {
        writeRuleFile(fullPath, content);
        fileInfo.written = true;
      }

      files.push(fileInfo);
    }

    const result = {
      success: true,
      projectName: genOptions.projectName,
      testFramework: genOptions.testFramework,
      files,
      dryRun: options.dryRun,
    };

    if (options.dryRun) {
      result.output = `Would generate ${files.length} rule files:\n\n` +
        files.map((f) => `- ${f.path}`).join('\n');
    } else {
      result.output = formatExportSummary(result);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create export command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createExportCommand(options = {}) {
  return {
    execute: (args, ctx) => executeExportCommand(args, { ...options, ...ctx }),
    parseArgs: parseExportArgs,
    loadProjectConfig,
    formatToolList,
    formatDetectionResult,
    formatExportSummary,
    SUPPORTED_TOOLS,
    AI_TOOLS,
  };
}

module.exports = {
  parseExportArgs,
  loadProjectConfig,
  ensureDir,
  writeRuleFile,
  formatToolList,
  formatDetectionResult,
  formatExportSummary,
  executeExportCommand,
  createExportCommand,
};
