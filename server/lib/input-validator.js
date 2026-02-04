/**
 * Input Validator Module
 *
 * Input sanitization and validation patterns for secure code generation
 */

const path = require('path');

/**
 * Create an input validator
 * @param {Object} options - Validator options
 * @returns {Object} Validator instance
 */
function createInputValidator(options = {}) {
  return {
    rules: {
      maxLength: options.rules?.maxLength || 10000,
      ...options.rules,
    },
  };
}

/**
 * Sanitize a string input
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  let result = String(input);

  // Remove null bytes
  result = result.replace(/\x00/g, '');

  // Trim whitespace
  result = result.trim();

  // Normalize unicode
  if (options.normalize) {
    result = result.normalize('NFC');
  }

  // Escape HTML entities
  if (options.escapeHtml) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Enforce max length
  if (options.maxLength && result.length > options.maxLength) {
    result = result.substring(0, options.maxLength);
  }

  return result;
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  // Reject dangerous characters
  if (/["<>]/.test(email)) {
    return { valid: false, error: 'Email contains invalid characters' };
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate file path
 * @param {string} filePath - Path to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validatePath(filePath, options = {}) {
  const { basePath } = options;

  if (!filePath) {
    return { valid: false, error: 'Path is required' };
  }

  // Check for null bytes
  if (filePath.includes('\x00')) {
    return { valid: false, error: 'Path contains null bytes' };
  }

  // Normalize the path
  const normalized = path.normalize(filePath);

  // Check for path traversal
  if (filePath.includes('..') && basePath) {
    const resolved = path.resolve(basePath, filePath);
    const baseResolved = path.resolve(basePath);

    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      return { valid: false, error: 'Path traversal detected' };
    }
  }

  // Check if within base path (for absolute paths)
  if (basePath && path.isAbsolute(filePath)) {
    const resolved = path.resolve(filePath);
    const baseResolved = path.resolve(basePath);

    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      return { valid: false, error: 'Path is outside allowed directory' };
    }
  }

  return { valid: true, normalized };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateUrl(url, options = {}) {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  // Check dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = url.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, error: `Dangerous protocol: ${protocol}` };
    }
  }

  try {
    const parsed = new URL(url);

    // Check allowed hosts
    if (options.allowedHosts && options.allowedHosts.length > 0) {
      if (!options.allowedHosts.includes(parsed.hostname)) {
        return { valid: false, error: 'Host not in allowed list' };
      }
    }

    // Block private IP addresses
    if (options.blockPrivate) {
      const privatePatterns = [
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^127\./,
        /^localhost$/i,
      ];

      for (const pattern of privatePatterns) {
        if (pattern.test(parsed.hostname)) {
          return { valid: false, error: 'Private IP addresses are blocked' };
        }
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Check for SQL injection patterns
 * @param {string} input - Input to check
 * @returns {Object} Detection result
 */
function preventSqlInjection(input) {
  if (!input) {
    return { dangerous: false, patterns: [] };
  }

  const patterns = [];

  // Check for common SQL injection patterns
  const sqlPatterns = [
    { regex: /['"]\s*;\s*--/i, name: 'comment-injection' },
    { regex: /'\s*OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, name: 'or-injection' },
    { regex: /UNION\s+SELECT/i, name: 'union-injection' },
    { regex: /DROP\s+TABLE/i, name: 'drop-table' },
    { regex: /DELETE\s+FROM/i, name: 'delete-injection' },
    { regex: /INSERT\s+INTO/i, name: 'insert-injection' },
    { regex: /EXEC\s*\(/i, name: 'exec-injection' },
    { regex: /xp_cmdshell/i, name: 'cmdshell-injection' },
  ];

  for (const { regex, name } of sqlPatterns) {
    if (regex.test(input)) {
      patterns.push(name);
    }
  }

  // Check for string concatenation in queries
  if (/["']\s*\+\s*["']?[^"']*["']?/.test(input)) {
    patterns.push('string-concatenation');
  }

  const dangerous = patterns.length > 0;

  return {
    dangerous,
    patterns,
    suggestion: 'Use parameterized queries instead of string concatenation',
  };
}

/**
 * Check for command injection patterns
 * @param {string} input - Input to check
 * @returns {Object} Detection result
 */
function preventCommandInjection(input) {
  if (!input) {
    return { dangerous: false, safePattern: null };
  }

  const dangerous = [
    /[;&|]/, // Command chaining
    /\|/, // Pipe
    /`/, // Backtick substitution
    /\$\(/, // $() substitution
    />\s*\//, // Output redirection
    /<\s*\//, // Input redirection
    /\n/, // Newline
    /\r/, // Carriage return
  ].some((pattern) => pattern.test(input));

  return {
    dangerous,
    safePattern: 'Use allowlist validation for filenames and escape shell arguments',
  };
}

/**
 * Generate validation code
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateValidationCode(options = {}) {
  const { type, language = 'javascript', includeErrors = false, rules = {} } = options;

  const generators = {
    javascript: {
      email: () => `
function validateEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!regex.test(email)) {
    ${includeErrors ? 'return { valid: false, error: "Invalid email format" };' : 'return false;'}
  }
  ${includeErrors ? 'return { valid: true };' : 'return true;'}
}`,
      path: () => `
function validatePath(filePath, basePath) {
  const path = require('path');
  const resolved = path.resolve(basePath, filePath);
  if (!resolved.startsWith(path.resolve(basePath))) {
    ${includeErrors ? 'return { valid: false, error: "Path traversal detected" };' : 'return false;'}
  }
  ${includeErrors ? 'return { valid: true };' : 'return true;'}
}`,
      custom: () => `
function validate(input) {
  ${rules.minLength ? `if (input.length < ${rules.minLength}) return false;` : ''}
  ${rules.maxLength ? `if (input.length > ${rules.maxLength}) return false;` : ''}
  ${rules.pattern ? `if (!/${rules.pattern}/.test(input)) return false;` : ''}
  return true;
}`,
    },
    typescript: {
      email: () => `
function validateEmail(email: string): { valid: boolean; error?: string } {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!regex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
}`,
      path: () => `
function validatePath(filePath: string, basePath: string): { valid: boolean; error?: string } {
  const path = require('path');
  const resolved = path.resolve(basePath, filePath);
  if (!resolved.startsWith(path.resolve(basePath))) {
    return { valid: false, error: "Path traversal detected" };
  }
  return { valid: true };
}`,
      custom: () => `
function validate(input: string): boolean {
  ${rules.minLength ? `if (input.length < ${rules.minLength}) return false;` : ''}
  ${rules.maxLength ? `if (input.length > ${rules.maxLength}) return false;` : ''}
  ${rules.pattern ? `if (!/${rules.pattern}/.test(input)) return false;` : ''}
  return true;
}`,
    },
    python: {
      email: () => `
import re

def validate_email(email: str) -> dict:
    pattern = r'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    if not re.match(pattern, email):
        return {"valid": False, "error": "Invalid email format"}
    return {"valid": True}`,
      path: () => `
import os

def validate_path(file_path: str, base_path: str) -> dict:
    resolved = os.path.abspath(os.path.join(base_path, file_path))
    if not resolved.startswith(os.path.abspath(base_path)):
        return {"valid": False, "error": "Path traversal detected"}
    return {"valid": True}`,
      custom: () => `
def validate(input: str) -> bool:
    ${rules.minLength ? `if len(input) < ${rules.minLength}: return False` : ''}
    ${rules.maxLength ? `if len(input) > ${rules.maxLength}: return False` : ''}
    return True`,
    },
  };

  const lang = generators[language] || generators.javascript;
  const gen = lang[type] || lang.email;

  return gen();
}

module.exports = {
  createInputValidator,
  sanitizeString,
  validateEmail,
  validatePath,
  validateUrl,
  preventSqlInjection,
  preventCommandInjection,
  generateValidationCode,
};
