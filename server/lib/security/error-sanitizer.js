/**
 * Error Sanitizer Module
 *
 * Sanitizes error messages to prevent information disclosure.
 * Addresses OWASP A01: Broken Access Control (info leakage)
 */

import crypto from 'crypto';

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
  // Port numbers
  /:\d{2,5}\b/g,
  // Connection strings
  /(?:postgresql|mysql|mongodb|redis):\/\/[^\s]+/gi,
  // Environment variables in messages
  /\$[A-Z_][A-Z0-9_]*/g,
  // Memory addresses
  /0x[0-9a-f]{8,}/gi,
];

/**
 * Sensitive property names to remove
 */
const SENSITIVE_PROPERTIES = [
  'password', 'passwd', 'pass', 'secret', 'apiKey', 'api_key',
  'token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'privateKey', 'private_key', 'credential', 'credentials',
];

/**
 * Patterns that indicate database errors
 */
const DATABASE_ERROR_PATTERNS = [
  /ECONNREFUSED/i,
  /postgresql/i,
  /mysql/i,
  /mongodb/i,
  /database/i,
  /sql/i,
  /syntax error/i,
  /query/i,
];

/**
 * Status code to error code mapping
 */
const STATUS_CODE_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Internal error codes for classification
 */
export const ERROR_CODES = {
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
 * Generate a unique error ID
 * @returns {string} Unique error ID
 */
function generateErrorId() {
  return crypto.randomUUID();
}

/**
 * Check if an error message indicates a database error
 * @param {string} message - Error message
 * @returns {boolean} True if database error
 */
function isDatabaseError(message) {
  return DATABASE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Redact sensitive information from a string
 * @param {string} text - Text to redact
 * @param {RegExp[]} additionalPatterns - Additional patterns to redact
 * @returns {string} Redacted text
 */
function redactSensitiveInfo(text, additionalPatterns = []) {
  if (!text) return '';

  let redacted = text;
  const allPatterns = [...SENSITIVE_PATTERNS, ...additionalPatterns];

  for (const pattern of allPatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

/**
 * Sanitize an error for safe client response
 * @param {Error|null|undefined|string} error - Error to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized error object
 */
export function sanitizeError(error, options = {}) {
  const {
    production = true,
    redactPatterns = [],
    genericMessages = {},
  } = options;

  // Handle null/undefined
  if (error === null || error === undefined) {
    return {
      message: 'An unexpected error occurred',
      id: generateErrorId(),
    };
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return {
      message: 'An error occurred',
      id: generateErrorId(),
    };
  }

  // Handle Error objects
  const originalMessage = error.message || '';
  const id = generateErrorId();
  const result = { id };

  // Check if user-friendly message should be preserved
  if (error.isUserFriendly) {
    result.message = originalMessage;
  } else if (production) {
    // Check for database errors
    if (isDatabaseError(originalMessage)) {
      result.message = genericMessages.database || 'A database error occurred';
    } else if (!originalMessage) {
      result.message = 'An unexpected error occurred';
    } else {
      // Redact sensitive info
      const sanitized = redactSensitiveInfo(originalMessage, redactPatterns);
      // If heavily redacted, use generic message
      if (sanitized.includes('[REDACTED]') || sanitized.split('[REDACTED]').length > 2) {
        result.message = 'An unexpected error occurred';
      } else {
        result.message = sanitized;
      }
    }
  } else {
    // Development mode - include more details without redaction
    result.message = originalMessage;
    if (error.stack) {
      result.stack = error.stack;
    }
    if (error.cause) {
      result.cause = error.cause;
    }
  }

  // Remove sensitive properties
  for (const prop of SENSITIVE_PROPERTIES) {
    if (result[prop]) {
      delete result[prop];
    }
  }

  return result;
}

/**
 * Determine if an error is operational (expected) vs programmer error
 * @param {Error} error - Error to check
 * @returns {boolean} True if operational
 */
export function isOperationalError(error) {
  if (!error) return false;

  // Explicitly marked as operational
  if (error.isOperational === true) return true;

  // Status codes 4xx are operational
  if (error.statusCode >= 400 && error.statusCode < 500) return true;

  // TypeError, ReferenceError, etc. are programmer errors
  if (error instanceof TypeError || error instanceof ReferenceError ||
      error instanceof SyntaxError || error instanceof RangeError) {
    return false;
  }

  // 5xx errors are not operational
  if (error.statusCode >= 500) return false;

  return false;
}

/**
 * Format error for HTTP response
 * @param {Error} error - Error to format
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted response
 */
export function formatErrorResponse(error, options = {}) {
  const { production = true, includeStatus = false } = options;

  const statusCode = error.statusCode || 500;
  const code = STATUS_CODE_MAP[statusCode] || 'INTERNAL_ERROR';
  const id = generateErrorId();

  const errorObj = {
    message: error.isUserFriendly ? error.message : (error.message || 'An error occurred'),
    code,
    id,
  };

  // Include status if requested
  if (includeStatus) {
    errorObj.status = statusCode;
  }

  // Include validation errors for 400
  if (statusCode === 400 && error.validationErrors) {
    errorObj.details = error.validationErrors;
  }

  // Include stack in development
  if (!production && error.stack) {
    errorObj.stack = error.stack;
  }

  return { error: errorObj };
}

/**
 * Classify an error into a category
 * @param {Error} error - Error to classify
 * @returns {string} Error code
 */
export function classifyError(error) {
  if (!error) return ERROR_CODES.INTERNAL_ERROR;

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

  if (isDatabaseError(message)) {
    return ERROR_CODES.DATABASE_ERROR;
  }

  if (message.includes('connect') || message.includes('timeout') || message.includes('network')) {
    return ERROR_CODES.NETWORK_ERROR;
  }

  // Check for database-specific error codes
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
 * Create an error sanitizer with preset configuration
 * @param {Object} config - Sanitizer configuration
 * @returns {Object} Error sanitizer instance
 */
export function createErrorSanitizer(config = {}) {
  const {
    production = true,
    redactPatterns = [],
    genericMessages = {},
    logger = null,
  } = config;

  return {
    /**
     * Sanitize an error
     * @param {Error} error - Error to sanitize
     * @param {Object} context - Additional context
     * @returns {Object} Sanitized error
     */
    sanitize(error, context = {}) {
      // Log original error if logger provided
      if (logger) {
        logger({
          originalMessage: error.message,
          stack: error.stack,
          code: error.code,
          ...context,
        });
      }

      return sanitizeError(error, {
        production,
        redactPatterns,
        genericMessages,
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
      if (error.statusCode) return error.statusCode;

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
