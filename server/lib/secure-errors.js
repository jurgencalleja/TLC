/**
 * Secure Errors Module
 *
 * Secure error handling patterns for code generation
 */

/**
 * Create secure error handler configuration
 * @param {Object} options - Error handler options
 * @returns {Object} Error handler configuration
 */
function createSecureErrors(options = {}) {
  const production = options.production !== undefined
    ? options.production
    : process.env.NODE_ENV === 'production';

  return {
    production,
    showStack: !production,
  };
}

/**
 * Generate error handler code
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateErrorHandler(options = {}) {
  const {
    framework = 'express',
    production = true,
    includeErrorId = true,
    statusCodes = true,
    async: isAsync = false,
  } = options;

  if (framework === 'fastify') {
    return `
fastify.setErrorHandler(${isAsync ? 'async ' : ''}(error, request, reply) => {
  ${includeErrorId ? 'const errorId = crypto.randomUUID();' : ''}

  // Log full error internally
  console.error({
    ${includeErrorId ? 'errorId,' : ''}
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Send sanitized response
  const statusCode = error.statusCode || 500;
  ${production ? `
  reply.code(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    ${includeErrorId ? 'errorId,' : ''}
  });` : `
  reply.code(statusCode).send({
    error: error.message,
    stack: error.stack,
    ${includeErrorId ? 'errorId,' : ''}
  });`}
});`;
  }

  // Express
  const fnKeyword = isAsync ? 'async function' : 'function';

  return `
const crypto = require('crypto');

${fnKeyword} errorHandler(err, req, res, next) {
  ${includeErrorId ? 'const errorId = crypto.randomUUID();' : ''}

  // Log full error internally
  console.error({
    ${includeErrorId ? 'errorId,' : ''}
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  ${statusCodes ? `
  // Map error types to status codes
  const statusMap = {
    ValidationError: 400,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    NotFoundError: 404,
  };

  const status = statusMap[err.name] || err.statusCode || 500;
  ` : 'const status = err.statusCode || 500;'}

  // Send sanitized response
  ${production ? `
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    ${includeErrorId ? 'errorId,' : ''}
  });` : `
  res.status(status).json({
    error: err.message,
    stack: err.stack,
    ${includeErrorId ? 'errorId,' : ''}
  });`}
}

module.exports = errorHandler;`;
}

/**
 * Generate structured logging code
 * @param {Object} options - Logging options
 * @returns {string} Generated code
 */
function generateStructuredLogging(options = {}) {
  const {
    format = 'json',
    excludeFields = ['password', 'token', 'secret', 'authorization'],
    includeContext = true,
    levels = ['error', 'warn', 'info', 'debug'],
    library = 'console',
    redactPii = false,
  } = options;

  if (library === 'pino') {
    return `
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ${JSON.stringify(excludeFields.map(f => `*.${f}`))},
  ${redactPii ? `
  redact: {
    paths: ['*.email', '*.phone', '*.ssn', '*.password', '*.token'],
    censor: '[REDACTED]',
  },` : ''}
  formatters: {
    level: (label) => ({ level: label }),
  },
});

${includeContext ? `
function withContext(context) {
  return logger.child({
    requestId: context.requestId,
    userId: context.userId,
  });
}` : ''}

module.exports = logger;`;
  }

  if (library === 'winston') {
    return `
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Redact sensitive fields
function redact(obj) {
  const redacted = { ...obj };
  const sensitiveFields = ${JSON.stringify(excludeFields)};

  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }

  ${redactPii ? `
  // Redact PII
  if (redacted.email) redacted.email = '[REDACTED]';
  if (redacted.phone) redacted.phone = '[REDACTED]';
  ` : ''}

  return redacted;
}

module.exports = { logger, redact };`;
  }

  // Console-based
  return `
const sensitiveFields = ${JSON.stringify(excludeFields)};

function redact(obj) {
  const redacted = { ...obj };

  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }

  return redacted;
}

function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(data),
    ${includeContext ? `
    requestId: data.requestId,
    userId: data.userId,` : ''}
  };

  console.log(JSON.stringify(entry));
}

${levels.map(l => `
function ${l}(message, data) {
  log('${l}', message, data);
}`).join('\n')}

module.exports = { ${levels.join(', ')}, log, redact };`;
}

/**
 * Generate graceful degradation code
 * @param {Object} options - Degradation options
 * @returns {string} Generated code
 */
function generateGracefulDegradation(options = {}) {
  const {
    type = 'fallback',
    maxRetries = 3,
    timeoutMs = 5000,
  } = options;

  if (type === 'circuit-breaker') {
    return `
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'closed'; // closed, open, half-open
    this.failures = 0;
    this.lastFailure = null;
  }

  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}`;
  }

  if (type === 'retry') {
    return `
async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxRetries || ${maxRetries};
  const baseDelay = options.baseDelay || 1000;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}`;
  }

  if (type === 'timeout') {
    return `
async function withTimeout(fn, timeout = ${timeoutMs}) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeout)
    ),
  ]);
}`;
  }

  if (type === 'cache-fallback') {
    return `
const cache = new Map();

async function withCacheFallback(key, fn) {
  try {
    const result = await fn();
    cache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    // Return stale cache on error
    const cached = cache.get(key);
    if (cached) {
      console.warn(\`Returning stale cache for \${key}\`);
      return cached.data;
    }
    throw error;
  }
}`;
  }

  if (type === 'health-routing') {
    return `
const backends = [];

async function getHealthyBackend() {
  for (const backend of backends) {
    try {
      const response = await fetch(backend.healthUrl);
      if (response.ok) {
        return backend;
      }
    } catch {
      // Backend unhealthy
    }
  }

  throw new Error('No healthy backends available');
}`;
  }

  // Default fallback
  return `
async function withFallback(fn, fallbackValue) {
  try {
    return await fn();
  } catch (error) {
    console.error('Operation failed, returning fallback:', error.message);
    return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
  }
}`;
}

/**
 * Sanitize error message for external display
 * @param {string} message - Error message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  if (!message) return 'An error occurred';

  let sanitized = message;

  // Remove file paths
  sanitized = sanitized.replace(/\/[\w/.-]+\.(js|ts|py|go|java|rb)/g, '[file]');
  sanitized = sanitized.replace(/[A-Z]:\\[\w\\.-]+\.(js|ts|py|go|java|rb)/gi, '[file]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[ip]');

  // Remove database connection strings
  sanitized = sanitized.replace(/(postgres|mysql|mongodb)(\+srv)?:\/\/[^:]+:[^@]+@[^/\s]+/gi, '[database]');

  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');

  // Remove stack traces
  sanitized = sanitized.replace(/\n\s+at\s+.+/g, '');
  sanitized = sanitized.replace(/at\s+\w+\s+\(.+\)/g, '');

  return sanitized.trim();
}

/**
 * Generate complete error handling code
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateErrorCode(options = {}) {
  const {
    language = 'javascript',
    features = [],
    errorTypes = [],
    httpErrors = false,
  } = options;

  if (language === 'typescript') {
    return `
interface ErrorResponse {
  error: string;
  code?: string;
  errorId?: string;
}

class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

${errorTypes.map(type => `
class ${type} extends AppError {
  constructor(message: string) {
    super(message, ${type.includes('NotFound') ? 404 : type.includes('Auth') ? 401 : 400}, '${type.toUpperCase()}');
  }
}`).join('\n')}

function handleError(error: Error): ErrorResponse {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code };
  }
  return { error: 'Internal server error' };
}`;
  }

  if (language === 'python') {
    return `
class AppError(Exception):
    def __init__(self, message, status_code=500, code='INTERNAL_ERROR'):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)

${errorTypes.map(type => `
class ${type}(AppError):
    def __init__(self, message):
        super().__init__(message, ${type.includes('NotFound') ? 404 : type.includes('Auth') ? 401 : 400}, '${type.upper()}')`).join('\n')}

def handle_error(error):
    if isinstance(error, AppError):
        return {'error': error.message, 'code': error.code}
    return {'error': 'Internal server error'}`;
  }

  // JavaScript
  return `
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
  }
}

${errorTypes.map(type => `
class ${type} extends AppError {
  constructor(message) {
    super(message, ${type.includes('NotFound') ? 404 : type.includes('Auth') ? 401 : 400}, '${type.toUpperCase()}');
  }
}`).join('\n')}

${httpErrors ? `
const httpErrors = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
};
` : ''}

function handleError(error) {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code };
  }
  return { error: 'Internal server error' };
}

module.exports = { AppError, ${errorTypes.join(', ')}${errorTypes.length ? ', ' : ''}handleError };`;
}

module.exports = {
  createSecureErrors,
  generateErrorHandler,
  generateStructuredLogging,
  generateGracefulDegradation,
  sanitizeErrorMessage,
  generateErrorCode,
};
