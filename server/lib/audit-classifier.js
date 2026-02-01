/**
 * Audit Action Classifier Module
 * Classifies agent actions into categories for filtering and compliance
 */

/**
 * Sensitive file patterns that should trigger alerts
 */
const SENSITIVE_FILE_PATTERNS = [
  /\.env($|\.)/i,
  /credentials\.json$/i,
  /\.secrets\//i,
  /secrets\.json$/i,
  /\.aws\/credentials$/i,
  /\.ssh\/(id_rsa|id_ed25519|id_dsa)$/i,
  /\.pem$/i,
  /private\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
];

/**
 * Sensitive content patterns that should trigger alerts
 */
const SENSITIVE_CONTENT_PATTERNS = [
  /password\s*[=:]/i,
  /api[_-]?key\s*[=:]/i,
  /secret\s*[=:]/i,
  /token\s*[=:]/i,
  /Bearer\s+[a-zA-Z0-9_-]+/i,
  /sk-[a-zA-Z0-9]+/i,  // OpenAI keys
  /ghp_[a-zA-Z0-9]+/i, // GitHub tokens
  /AWS_SECRET/i,
  /PRIVATE_KEY/i,
];

/**
 * Destructive command patterns
 */
const DESTRUCTIVE_COMMAND_PATTERNS = [
  /rm\s+(-rf|-r\s+-f|-f\s+-r)\s+/i,
  /git\s+push\s+--force/i,
  /git\s+push\s+-f\b/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-f/i,
];

/**
 * Classify an agent action into a category
 * @param {Object} action - Action object with tool and params
 * @returns {string} Classification category
 */
function classifyAction(action) {
  const { tool, params } = action;

  // File operations
  if (tool === 'Read') {
    return 'file:read';
  }
  if (tool === 'Write') {
    return 'file:write';
  }
  if (tool === 'Edit') {
    return 'file:edit';
  }
  if (tool === 'Glob') {
    return 'file:glob';
  }
  if (tool === 'Grep') {
    return 'file:grep';
  }

  // Network operations
  if (tool === 'WebFetch') {
    return 'network:fetch';
  }
  if (tool === 'WebSearch') {
    return 'network:search';
  }

  // Shell operations
  if (tool === 'Bash') {
    const command = params?.command || '';

    // Git commands
    if (/^\s*git\s+/i.test(command)) {
      return 'shell:git';
    }

    // NPM commands
    if (/^\s*npm\s+/i.test(command)) {
      return 'shell:npm';
    }

    return 'shell:execute';
  }

  return 'unknown';
}

/**
 * Detect if an action involves sensitive data
 * @param {Object} action - Action object with tool and params
 * @returns {Object} Detection result with isSensitive flag and reason
 */
function detectSensitive(action) {
  const { tool, params } = action;

  // Check file paths
  const filePath = params?.file_path || '';
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(filePath)) {
      let reason = 'Accessing sensitive file';
      if (/\.env/i.test(filePath)) {
        reason = 'Accessing .env file';
      } else if (/credential/i.test(filePath)) {
        reason = 'Accessing credential file';
      } else if (/\.ssh.*id_/i.test(filePath)) {
        reason = 'Accessing private key file';
      } else if (/\.aws/i.test(filePath)) {
        reason = 'Accessing AWS credentials';
      } else if (/\.secrets/i.test(filePath)) {
        reason = 'Accessing secrets directory';
      }
      return { isSensitive: true, reason };
    }
  }

  // Check command content
  const command = params?.command || '';
  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    if (pattern.test(command)) {
      return { isSensitive: true, reason: 'Command contains sensitive data' };
    }
  }

  // Check file content for write operations
  const content = params?.content || '';
  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    if (pattern.test(content)) {
      return { isSensitive: true, reason: 'File content contains sensitive data' };
    }
  }

  return { isSensitive: false, reason: null };
}

/**
 * Get severity level for an action
 * @param {Object} action - Action object with tool and params
 * @returns {string} Severity level: 'info', 'warning', or 'critical'
 */
function getSeverity(action) {
  const { tool, params } = action;

  // First check if it's a sensitive operation
  const sensitiveCheck = detectSensitive(action);
  if (sensitiveCheck.isSensitive) {
    return 'critical';
  }

  // Check for destructive commands
  const command = params?.command || '';
  for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      return 'critical';
    }
  }

  // File operations
  if (tool === 'Write' || tool === 'Edit') {
    return 'warning';
  }

  if (tool === 'Read' || tool === 'Glob' || tool === 'Grep') {
    return 'info';
  }

  // Network operations
  if (tool === 'WebFetch' || tool === 'WebSearch') {
    return 'info';
  }

  // Shell operations
  if (tool === 'Bash') {
    // Git read commands are info level
    if (/^\s*git\s+(status|log|diff|branch|show)\b/i.test(command)) {
      return 'info';
    }

    // General shell execution is warning
    return 'warning';
  }

  return 'info';
}

module.exports = {
  classifyAction,
  detectSensitive,
  getSeverity,
};
