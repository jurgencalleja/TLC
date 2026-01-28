/**
 * AI Tool Detector
 * Detects which AI coding tool is currently running
 */

const fs = require('fs');
const path = require('path');

const AI_TOOLS = {
  CLAUDE_CODE: 'claude-code',
  CURSOR: 'cursor',
  ANTIGRAVITY: 'antigravity',
  WINDSURF: 'windsurf',
  COPILOT: 'copilot',
  CONTINUE: 'continue',
  CODY: 'cody',
  AMAZON_Q: 'amazon-q',
  AIDER: 'aider',
  UNKNOWN: 'unknown',
};

/**
 * Environment variable patterns for each tool
 */
const ENV_PATTERNS = {
  [AI_TOOLS.CLAUDE_CODE]: ['CLAUDE_CODE', 'ANTHROPIC_API_KEY'],
  [AI_TOOLS.CURSOR]: ['CURSOR_SESSION', 'CURSOR_TRACE'],
  [AI_TOOLS.ANTIGRAVITY]: ['ANTIGRAVITY_', 'GOOGLE_ANTIGRAVITY'],
  [AI_TOOLS.WINDSURF]: ['WINDSURF_', 'CODEIUM_'],
  [AI_TOOLS.COPILOT]: ['GITHUB_COPILOT', 'COPILOT_'],
  [AI_TOOLS.CONTINUE]: ['CONTINUE_', 'CONTINUE_GLOBAL_DIR'],
  [AI_TOOLS.CODY]: ['SRC_ACCESS_TOKEN', 'CODY_'],
  [AI_TOOLS.AMAZON_Q]: ['AWS_Q_', 'AMAZON_Q_'],
  [AI_TOOLS.AIDER]: ['AIDER_', 'OPENAI_API_KEY'],
};

/**
 * Process name patterns for each tool
 */
const PROCESS_PATTERNS = {
  [AI_TOOLS.CLAUDE_CODE]: ['claude', 'anthropic'],
  [AI_TOOLS.CURSOR]: ['cursor', 'Cursor'],
  [AI_TOOLS.ANTIGRAVITY]: ['antigravity'],
  [AI_TOOLS.WINDSURF]: ['windsurf', 'codeium'],
  [AI_TOOLS.COPILOT]: ['copilot'],
  [AI_TOOLS.CONTINUE]: ['continue'],
  [AI_TOOLS.CODY]: ['cody', 'sourcegraph'],
  [AI_TOOLS.AMAZON_Q]: ['amazon-q', 'aws-toolkit'],
  [AI_TOOLS.AIDER]: ['aider'],
};

/**
 * Config file indicators for each tool
 */
const CONFIG_FILES = {
  [AI_TOOLS.CLAUDE_CODE]: ['CLAUDE.md', '.claude'],
  [AI_TOOLS.CURSOR]: ['.cursor', '.cursorrc'],
  [AI_TOOLS.ANTIGRAVITY]: ['.antigravity'],
  [AI_TOOLS.WINDSURF]: ['.windsurfrules'],
  [AI_TOOLS.COPILOT]: ['.github/copilot-instructions.md'],
  [AI_TOOLS.CONTINUE]: ['.continue', '.continuerc'],
  [AI_TOOLS.CODY]: ['.cody'],
  [AI_TOOLS.AMAZON_Q]: ['.amazonq'],
  [AI_TOOLS.AIDER]: ['.aider.conf.yml', '.aider'],
};

/**
 * Check environment variables for tool indicators
 */
function detectFromEnvironment(env = process.env) {
  const detected = [];

  for (const [tool, patterns] of Object.entries(ENV_PATTERNS)) {
    for (const pattern of patterns) {
      const hasMatch = Object.keys(env).some((key) =>
        key.startsWith(pattern) || key.includes(pattern)
      );
      if (hasMatch && !detected.includes(tool)) {
        detected.push(tool);
      }
    }
  }

  return detected;
}

/**
 * Check parent process name for tool indicators
 */
function detectFromProcess(processInfo = {}) {
  const {
    execPath = process.execPath || '',
    argv = process.argv || [],
    ppid = process.ppid,
  } = processInfo;

  const detected = [];
  const processString = [execPath, ...argv].join(' ').toLowerCase();

  for (const [tool, patterns] of Object.entries(PROCESS_PATTERNS)) {
    for (const pattern of patterns) {
      if (processString.includes(pattern.toLowerCase())) {
        if (!detected.includes(tool)) {
          detected.push(tool);
        }
      }
    }
  }

  return detected;
}

/**
 * Check for config files in project directory
 */
function detectFromConfigFiles(projectDir = process.cwd()) {
  const detected = [];

  for (const [tool, files] of Object.entries(CONFIG_FILES)) {
    for (const file of files) {
      const filePath = path.join(projectDir, file);
      try {
        if (fs.existsSync(filePath)) {
          if (!detected.includes(tool)) {
            detected.push(tool);
          }
        }
      } catch {
        // Ignore access errors
      }
    }
  }

  return detected;
}

/**
 * Detect AI tool from Claude Code specific indicators
 */
function detectClaudeCode(env = process.env) {
  // Claude Code sets specific environment variables
  if (env.CLAUDE_CODE === '1' || env.CLAUDE_CODE === 'true') {
    return true;
  }

  // Check for Claude-specific process indicators
  const execPath = process.execPath || '';
  if (execPath.includes('claude') || execPath.includes('anthropic')) {
    return true;
  }

  return false;
}

/**
 * Get confidence score for a tool detection
 */
function getConfidenceScore(tool, detectionSources) {
  let score = 0;

  if (detectionSources.environment.includes(tool)) {
    score += 40;
  }

  if (detectionSources.process.includes(tool)) {
    score += 35;
  }

  if (detectionSources.configFiles.includes(tool)) {
    score += 25;
  }

  return Math.min(score, 100);
}

/**
 * Detect which AI tool is currently running
 * @param {Object} options - Detection options
 * @returns {Object} Detection result
 */
function detectAITool(options = {}) {
  const {
    env = process.env,
    projectDir = process.cwd(),
    processInfo = {},
  } = options;

  const detectionSources = {
    environment: detectFromEnvironment(env),
    process: detectFromProcess(processInfo),
    configFiles: detectFromConfigFiles(projectDir),
  };

  // Collect all detected tools with confidence scores
  const allDetected = new Set([
    ...detectionSources.environment,
    ...detectionSources.process,
    ...detectionSources.configFiles,
  ]);

  const results = [];

  for (const tool of allDetected) {
    const confidence = getConfidenceScore(tool, detectionSources);
    results.push({ tool, confidence });
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);

  // Special handling for Claude Code
  if (detectClaudeCode(env)) {
    // Ensure Claude Code is at the top if detected
    const claudeIndex = results.findIndex((r) => r.tool === AI_TOOLS.CLAUDE_CODE);
    if (claudeIndex === -1) {
      results.unshift({ tool: AI_TOOLS.CLAUDE_CODE, confidence: 90 });
    } else {
      results[claudeIndex].confidence = Math.max(results[claudeIndex].confidence, 90);
      results.sort((a, b) => b.confidence - a.confidence);
    }
  }

  return {
    primaryTool: results.length > 0 ? results[0].tool : AI_TOOLS.UNKNOWN,
    confidence: results.length > 0 ? results[0].confidence : 0,
    allDetected: results,
    sources: detectionSources,
  };
}

/**
 * Check if a specific tool is active
 */
function isToolActive(tool, options = {}) {
  const result = detectAITool(options);
  return result.allDetected.some((d) => d.tool === tool);
}

/**
 * Get display name for a tool
 */
function getToolDisplayName(tool) {
  const names = {
    [AI_TOOLS.CLAUDE_CODE]: 'Claude Code',
    [AI_TOOLS.CURSOR]: 'Cursor',
    [AI_TOOLS.ANTIGRAVITY]: 'Google Antigravity',
    [AI_TOOLS.WINDSURF]: 'Windsurf',
    [AI_TOOLS.COPILOT]: 'GitHub Copilot',
    [AI_TOOLS.CONTINUE]: 'Continue',
    [AI_TOOLS.CODY]: 'Sourcegraph Cody',
    [AI_TOOLS.AMAZON_Q]: 'Amazon Q Developer',
    [AI_TOOLS.AIDER]: 'Aider',
    [AI_TOOLS.UNKNOWN]: 'Unknown',
  };

  return names[tool] || tool;
}

/**
 * Create tool detector with preset options
 */
function createToolDetector(defaultOptions = {}) {
  return {
    detect: (options) => detectAITool({ ...defaultOptions, ...options }),
    isToolActive: (tool, options) =>
      isToolActive(tool, { ...defaultOptions, ...options }),
    getToolDisplayName,
    AI_TOOLS,
    ENV_PATTERNS,
    PROCESS_PATTERNS,
    CONFIG_FILES,
  };
}

module.exports = {
  AI_TOOLS,
  ENV_PATTERNS,
  PROCESS_PATTERNS,
  CONFIG_FILES,
  detectFromEnvironment,
  detectFromProcess,
  detectFromConfigFiles,
  detectClaudeCode,
  getConfidenceScore,
  detectAITool,
  isToolActive,
  getToolDisplayName,
  createToolDetector,
};
