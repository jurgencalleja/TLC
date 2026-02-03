/**
 * CORS Validator Module
 *
 * Strict CORS configuration to prevent cross-origin attacks.
 * Addresses OWASP A05: Security Misconfiguration
 */

/**
 * Custom error for CORS security violations
 */
export class CorsSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CorsSecurityError';
  }
}

/**
 * Simple headers that don't need explicit CORS allowance
 */
const SIMPLE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type'];

/**
 * Validate an origin against allowed origins
 * @param {string|null} origin - Origin to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateOrigin(origin, options = {}) {
  const {
    allowedOrigins = [],
    production = false,
    allowNull = false,
  } = options;

  // Check wildcard in production
  if (allowedOrigins.includes('*') && production) {
    throw new CorsSecurityError('Wildcard origin (*) not allowed in production');
  }

  // Handle null origin
  if (origin === null) {
    return allowNull
      ? { allowed: true }
      : { allowed: false, reason: 'Null origin not allowed' };
  }

  // Wildcard in development
  if (allowedOrigins.includes('*') && !production) {
    return { allowed: true };
  }

  // Validate origin format - reject credentials in URL
  if (origin && origin.includes('@')) {
    return { allowed: false, reason: 'Origin contains credentials' };
  }

  // Reject trailing slashes
  if (origin && origin.endsWith('/')) {
    return { allowed: false, reason: 'Origin has trailing slash' };
  }

  // Reject paths
  try {
    const url = new URL(origin);
    if (url.pathname !== '/' && url.pathname !== '') {
      return { allowed: false, reason: 'Origin contains path' };
    }
  } catch {
    return { allowed: false, reason: 'Invalid origin format' };
  }

  // Normalize for comparison
  const normalizedOrigin = origin.toLowerCase();

  for (const allowed of allowedOrigins) {
    // Exact match (case insensitive)
    if (allowed.toLowerCase() === normalizedOrigin) {
      return { allowed: true };
    }

    // Subdomain wildcard pattern
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/\./g, '\\.')
        .replace(/\*/g, '[a-z0-9-]+');
      const regex = new RegExp(`^${pattern}$`, 'i');

      // Limit pattern length to prevent ReDoS
      if (origin.length <= 100 && regex.test(origin)) {
        return { allowed: true };
      }
    }
  }

  return { allowed: false, reason: 'Origin not in whitelist' };
}

/**
 * Generate CORS headers for a response
 * @param {Object} options - Header options
 * @returns {Object} CORS headers
 */
export function generateCorsHeaders(options = {}) {
  const {
    origin,
    allowedOrigins = [],
    credentials = false,
    exposeHeaders = [],
    production = false,
  } = options;

  const validation = validateOrigin(origin, { allowedOrigins, production });

  if (!validation.allowed) {
    return {};
  }

  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };

  if (credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (exposeHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = exposeHeaders.join(', ');
  }

  return headers;
}

/**
 * Handle preflight OPTIONS request
 * @param {Object} options - Preflight options
 * @returns {Object} Preflight response headers
 */
export function handlePreflight(options = {}) {
  const {
    origin,
    requestMethod,
    requestHeaders = [],
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST'],
    allowedHeaders = [],
    credentials = false,
    maxAge = 86400,
    production = false,
  } = options;

  const validation = validateOrigin(origin, { allowedOrigins, production });

  if (!validation.allowed) {
    return {};
  }

  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  };

  // Filter allowed methods
  const allowedMethodsList = allowedMethods.filter((m) =>
    requestMethod ? allowedMethods.includes(requestMethod.toUpperCase()) : true
  );
  headers['Access-Control-Allow-Methods'] = allowedMethodsList.join(', ');

  // Filter allowed headers (always allow simple headers)
  const normalizedAllowedHeaders = [
    ...allowedHeaders.map((h) => h.toLowerCase()),
    ...SIMPLE_HEADERS,
  ];
  const normalizedRequestHeaders = requestHeaders.map((h) => h.toLowerCase());

  const filteredHeaders = normalizedRequestHeaders.filter((h) =>
    normalizedAllowedHeaders.includes(h) || SIMPLE_HEADERS.includes(h)
  );

  if (filteredHeaders.length > 0 || allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = [...new Set([
      ...allowedHeaders,
      ...filteredHeaders.filter((h) => SIMPLE_HEADERS.includes(h)),
    ])].join(', ') || 'Accept, Content-Type';
  }

  if (credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (maxAge) {
    headers['Access-Control-Max-Age'] = String(maxAge);
  }

  return headers;
}

/**
 * Create a reusable CORS validator
 * @param {Object} config - CORS configuration
 * @returns {Object} CORS validator instance
 */
export function createCorsValidator(config = {}) {
  const {
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400,
    production = false,
  } = config;

  return {
    validate(origin) {
      return validateOrigin(origin, { allowedOrigins, production });
    },

    isMethodAllowed(method) {
      return allowedMethods.map((m) => m.toUpperCase()).includes(method.toUpperCase());
    },

    isHeaderAllowed(header) {
      const normalized = header.toLowerCase();
      return (
        SIMPLE_HEADERS.includes(normalized) ||
        allowedHeaders.map((h) => h.toLowerCase()).includes(normalized)
      );
    },

    getHeaders(origin) {
      return generateCorsHeaders({
        origin,
        allowedOrigins,
        credentials,
        production,
      });
    },

    handlePreflight(origin, requestMethod, requestHeaders) {
      return handlePreflight({
        origin,
        requestMethod,
        requestHeaders,
        allowedOrigins,
        allowedMethods,
        allowedHeaders,
        credentials,
        maxAge,
        production,
      });
    },

    middleware() {
      return (req, res, next) => {
        const origin = req.headers.origin;
        const headers = this.getHeaders(origin);
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        if (req.method === 'OPTIONS') {
          const preflightHeaders = this.handlePreflight(
            origin,
            req.headers['access-control-request-method'],
            (req.headers['access-control-request-headers'] || '').split(',').map((h) => h.trim())
          );
          Object.entries(preflightHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      };
    },
  };
}
