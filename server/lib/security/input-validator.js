/**
 * Input Validator Module
 *
 * Validates and sanitizes all user inputs to prevent injection attacks.
 * Addresses OWASP A03: Injection
 */

/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|create|truncate)\b.*\b(from|into|table|database)\b)/i,
  /(\bor\b|\band\b)\s*[\d\w'"=]+\s*[=<>]/i,
  /['"]?\s*;\s*(drop|delete|update|insert|alter|create)/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
  /0x[0-9a-f]+/i,
  /\bexec\s*\(/i,
  /\bchar\s*\(\d+\)/i,
];

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/,
  /\$\([^)]+\)/,
  /`[^`]+`/,
  /\|\|/,
  /&&/,
  />\s*\/\w+/,
  /<\s*\/\w+/,
];

/**
 * XSS patterns for HTML sanitization
 */
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<style\b[^>]*>[\s\S]*?<\/style>/gi,
  /\bon\w+\s*=\s*["'][^"']*["']/gi,
  /\bon\w+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
];

/**
 * Validate a string input
 * @param {string} value - The string to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateString(value, options = {}) {
  const {
    minLength = 0,
    maxLength = Infinity,
    pattern = null,
    trim = false,
    required = false,
  } = options;

  let processedValue = value;

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (required) {
      return { valid: false, error: 'Value is required' };
    }
    return { valid: true, value: '' };
  }

  // Convert to string
  if (typeof value !== 'string') {
    processedValue = String(value);
  }

  // Trim if requested
  if (trim) {
    processedValue = processedValue.trim();
  }

  // Check required
  if (required && processedValue.length === 0) {
    return { valid: false, error: 'Value is required' };
  }

  // Check min length
  if (processedValue.length < minLength) {
    return { valid: false, error: `Value must be at least ${minLength} characters in length` };
  }

  // Check max length
  if (processedValue.length > maxLength) {
    return { valid: false, error: `Value must not exceed ${maxLength} characters in length` };
  }

  // Check pattern
  if (pattern && !pattern.test(processedValue)) {
    return { valid: false, error: 'Value does not match required pattern' };
  }

  return { valid: true, value: processedValue };
}

/**
 * Detect SQL injection patterns
 * @param {string} input - The input to check
 * @returns {Object} Detection result
 */
export function detectSqlInjection(input) {
  if (!input || typeof input !== 'string') {
    return { detected: false };
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        detected: true,
        threat: 'sql_injection',
        pattern: pattern.toString(),
      };
    }
  }

  return { detected: false };
}

/**
 * Detect command injection patterns
 * @param {string} input - The input to check
 * @returns {Object} Detection result
 */
export function detectCommandInjection(input) {
  if (!input || typeof input !== 'string') {
    return { detected: false };
  }

  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        detected: true,
        threat: 'command_injection',
        pattern: pattern.toString(),
      };
    }
  }

  return { detected: false };
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} input - The HTML to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const { allowTags = [] } = options;

  let sanitized = input;

  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // If no tags allowed, strip all HTML
  if (allowTags.length === 0) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // Keep only allowed tags
    const tagPattern = new RegExp(`<(?!\/?(?:${allowTags.join('|')})\\b)[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '');
  }

  return sanitized;
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {Object} Validation result
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Additional checks
  if (email.includes(' ')) {
    return { valid: false, error: 'Email cannot contain spaces' };
  }

  return { valid: true, value: email.toLowerCase() };
}

/**
 * Validate URL format
 * @param {string} url - The URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateUrl(url, options = {}) {
  const { allowHttp = false, allowedProtocols = ['https'] } = options;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return { valid: false, error: `Protocol ${protocol} is not allowed` };
    }
  }

  try {
    const parsed = new URL(url);

    // Check protocol
    const protocols = allowHttp ? [...allowedProtocols, 'http'] : allowedProtocols;
    if (!protocols.includes(parsed.protocol.replace(':', ''))) {
      return { valid: false, error: 'URL must use HTTPS protocol' };
    }

    return { valid: true, value: url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate numeric input
 * @param {number} value - The number to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateNumeric(value, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    allowFloat = true,
  } = options;

  // Check for NaN and Infinity
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return { valid: false, error: 'Value must be a valid number' };
  }

  // Check for integer requirement
  if (!allowFloat && !Number.isInteger(value)) {
    return { valid: false, error: 'Value must be an integer' };
  }

  // Check minimum
  if (value < min) {
    return { valid: false, error: `Value must be at least ${min} (minimum)` };
  }

  // Check maximum
  if (value > max) {
    return { valid: false, error: `Value must be at most ${max} (maximum)` };
  }

  return { valid: true, value };
}

/**
 * Validate UUID format
 * @param {string} uuid - The UUID to validate
 * @returns {Object} Validation result
 */
export function validateUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID is required' };
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true, value: uuid.toLowerCase() };
}

/**
 * Create a reusable validator with schema
 * @param {Object} schema - Validation schema
 * @param {Object} options - Validator options
 * @returns {Object} Validator instance
 */
export function createValidator(schema, options = {}) {
  const { stopOnFirst = false } = options;

  return {
    validate(data) {
      const errors = {};
      let valid = true;

      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        let result;

        switch (rules.type) {
          case 'string':
            result = validateString(value, rules);
            break;
          case 'email':
            result = validateEmail(value);
            break;
          case 'url':
            result = validateUrl(value, rules);
            break;
          case 'numeric':
            result = validateNumeric(value, rules);
            break;
          case 'uuid':
            result = validateUuid(value);
            break;
          default:
            result = validateString(value, rules);
        }

        if (!result.valid) {
          valid = false;
          errors[field] = result.error;

          if (stopOnFirst) {
            break;
          }
        }
      }

      return valid ? { valid: true, data } : { valid: false, errors };
    },
  };
}
