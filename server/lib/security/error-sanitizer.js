/**
 * Error Sanitizer Module
 *
 * Sanitizes error messages to prevent information disclosure.
 * Addresses OWASP A01: Broken Access Control (info leakage)
 */

/**
 * Sensitive patterns to redact from error messages
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /(?:\/[\w.-]+)+(?:\.[\w]+)?/g,
  // Windows paths
  /[A-Z]:\\[\w\\.-]+/gi,
  // Stack trace line numbers
  /:\d+:\d+/g,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Connection strings
  /(?:postgresql|mysql|mongodb|redis):\/\/[^\s]+/gi,
  // Environment variables in messages
  /\$[A-Z_][A-Z0-9_]*/g,
  // Memory addresses
  /0x[0-9a-f]{8,}/gi,
];

/**
 * Internal error codes for classification
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

/**
 * User-friendly error messages by code
 */
const USER_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: 'The provided data is invalid',
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Authentication failed',
  [ERROR_CODES.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please try again later',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred',
  [ERROR_CODES.NETWORK_ERROR]: 'A network error occurred',
};

/**
 * Sanitize an error for safe client response
 * @param {Error} error - Error to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized error object
 */
export function sanitizeError(error, options = {}) {
  const {
    production = true,
    includeCode = true,
    includeRequestId = true,
    requestId = null,
    customMessages = {},
  } = options;

  // Classify the error
  const code = classifyError(error);
  const message = customMessages[code] || USER_MESSAGES[code] || USER_MESSAGES[ERROR_CODES.INTERNAL_ERROR];

  const sanitized = {
    error: true,
    message,
  };

  if (includeCode) {
    sanitized.code = code;
  }

  if (includeRequestId && requestId) {
    sanitized.requestId = requestId;
  }

  // In development, include more details
  if (!production) {
    sanitized.debug = {
      originalMessage: redactSensitiveInfo(error.message),
      name: error.name,
      stack: redactSensitiveInfo(error.stack || ''),
    };
  }

  return sanitized;
}

/**
 * Classify an error into a category
 * @param {Error} error - Error to classify
 * @returns {string} Error code
 */
export function classifyError(error) {
  const message = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();

  // Check by error name
  if (name.includes('validation') || name.includes('invalid')) {
    return ERROR_CODES.VALIDATION_ERROR;
  }

  if (name.includes('auth') || name.includes('unauthorized')) {
    return ERROR_CODES.AUTHENTICATION_ERROR;
  }

  if (name.includes('forbidden') || name.includes('permission')) {
    return ERROR_CODES.AUTHORIZATION_ERROR;
  }

  if (name.includes('notfound') || name === 'notfounderror') {
    return ERROR_CODES.NOT_FOUND;
  }

  // Check by error message
  if (message.includes('not found') || message.includes('does not exist')) {
    return ERROR_CODES.NOT_FOUND;
  }

  if (message.includes('invalid') || message.includes('required')) {
    return ERROR_CODES.VALIDATION_ERROR;
  }

  if (message.includes('unauthorized') || message.includes('invalid credentials')) {
    return ERROR_CODES.AUTHENTICATION_ERROR;
  }

  if (message.includes('forbidden') || message.includes('permission denied')) {
    return ERROR_CODES.AUTHORIZATION_ERROR;
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return ERROR_CODES.RATE_LIMITED;
  }

  if (message.includes('database') || message.includes('sql') || message.includes('query')) {
    return ERROR_CODES.DATABASE_ERROR;
  }

  if (message.includes('connect') || message.includes('timeout') || message.includes('network')) {
    return ERROR_CODES.NETWORK_ERROR;
  }

  // Check for database-specific errors
  if (error.code) {
    const code = String(error.code);
    if (code.startsWith('23') || code.startsWith('42')) {
      return ERROR_CODES.DATABASE_ERROR;
    }
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      return ERROR_CODES.NETWORK_ERROR;
    }
  }

  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Redact sensitive information from a string
 * @param {string} text - Text to redact
 * @returns {string} Redacted text
 */
export function redactSensitiveInfo(text) {
  if (!text) return '';

  let redacted = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

/**
 * Create an error sanitizer with preset configuration
 * @param {Object} config - Sanitizer configuration
 * @returns {Object} Error sanitizer instance
 */
export function createErrorSanitizer(config = {}) {
  const {
    production = true,
    customMessages = {},
    logger = null,
    includeRequestId = true,
  } = config;

  return {
    /**
     * Sanitize an error
     * @param {Error} error - Error to sanitize
     * @param {Object} context - Additional context
     * @returns {Object} Sanitized error
     */
    sanitize(error, context = {}) {
      const { requestId } = context;

      // Log the original error in production
      if (production && logger) {
        logger.error('Error occurred', {
          error: error.message,
          stack: error.stack,
          code: error.code,
          requestId,
        });
      }

      return sanitizeError(error, {
        production,
        customMessages,
        includeRequestId,
        requestId,
      });
    },

    /**
     * Express error handler middleware
     */
    middleware() {
      return (error, req, res, next) => {
        const sanitized = this.sanitize(error, {
          requestId: req.id || req.headers['x-request-id'],
        });

        const statusCode = this.getStatusCode(error);
        res.status(statusCode).json(sanitized);
      };
    },

    /**
     * Get HTTP status code for error
     * @param {Error} error - Error to check
     * @returns {number} HTTP status code
     */
    getStatusCode(error) {
      const code = classifyError(error);

      switch (code) {
        case ERROR_CODES.VALIDATION_ERROR:
          return 400;
        case ERROR_CODES.AUTHENTICATION_ERROR:
          return 401;
        case ERROR_CODES.AUTHORIZATION_ERROR:
          return 403;
        case ERROR_CODES.NOT_FOUND:
          return 404;
        case ERROR_CODES.RATE_LIMITED:
          return 429;
        default:
          return 500;
      }
    },

    /**
     * Wrap an async handler with error sanitization
     * @param {Function} handler - Async handler function
     * @returns {Function} Wrapped handler
     */
    wrap(handler) {
      return async (req, res, next) => {
        try {
          await handler(req, res, next);
        } catch (error) {
          const sanitized = this.sanitize(error, {
            requestId: req.id || req.headers['x-request-id'],
          });
          const statusCode = this.getStatusCode(error);
          res.status(statusCode).json(sanitized);
        }
      };
    },
  };
}

export { ERROR_CODES };
