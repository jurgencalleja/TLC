/**
 * Sensitive Data Detector Module
 * Detects and classifies sensitive data types like API keys, PII, and secrets
 */

/**
 * Patterns for detecting sensitive data
 */
const PATTERNS = {
  // API Keys and Tokens
  openai_api_key: /sk-[a-zA-Z0-9]{32,}/g,
  aws_access_key: /AKIA[0-9A-Z]{16}/g,
  github_token: /ghp_[a-zA-Z0-9]{36,}/g,
  github_pat: /github_pat_[a-zA-Z0-9_]{22,}/g,

  // Private Keys
  private_key: /-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----/g,

  // Passwords in config files
  password: /(?:password|passwd|pwd|secret|api_key|apikey|auth_token|access_token)[=:]\s*["']?([^"'\s\n]+)["']?/gi,

  // PII
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phone_number: /(?:\(\d{3}\)\s*|\b\d{3}[-.])\d{3}[-.]?\d{4}\b/g,
};

/**
 * Sensitivity levels for different data types
 */
const SENSITIVITY_LEVELS = {
  // Critical - secrets that can lead to unauthorized access
  openai_api_key: 'critical',
  aws_access_key: 'critical',
  github_token: 'critical',
  github_pat: 'critical',
  private_key: 'critical',
  password: 'critical',

  // High - sensitive PII
  ssn: 'high',
  credit_card: 'high',

  // Medium - contact information
  email: 'medium',
  phone_number: 'medium',
};

/**
 * Detect sensitive data in content
 * @param {string} content - The content to scan
 * @returns {Array<{type: string, match: string, index: number}>} Array of detected sensitive items
 */
function detectSensitive(content) {
  const results = [];

  for (const [type, pattern] of Object.entries(PATTERNS)) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.push({
        type,
        match: match[0],
        index: match.index,
      });
    }
  }

  // Sort by index for consistent ordering
  results.sort((a, b) => a.index - b.index);

  return results;
}

/**
 * Get the sensitivity level for a given data type
 * @param {string} type - The type of sensitive data
 * @returns {string} Sensitivity level: 'critical', 'high', 'medium', or 'low'
 */
function getSensitivityLevel(type) {
  return SENSITIVITY_LEVELS[type] || 'low';
}

/**
 * Classify a string to determine its sensitive data type
 * @param {string} value - The string to classify
 * @returns {string|null} The type of sensitive data, or null if not sensitive
 */
function classifyType(value) {
  // Check each pattern to find a match
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;

    if (pattern.test(value)) {
      return type;
    }
  }

  return null;
}

module.exports = {
  detectSensitive,
  getSensitivityLevel,
  classifyType,
  PATTERNS,
  SENSITIVITY_LEVELS,
};
