/**
 * Security Headers Generator Module
 *
 * Generates secure HTTP headers to prevent common attacks.
 * Addresses OWASP A05: Security Misconfiguration
 */

/**
 * Default Content Security Policy directives
 */
const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Generate Content Security Policy header value
 * @param {Object} directives - CSP directives
 * @param {Object} options - CSP options
 * @returns {string} CSP header value
 */
export function generateCsp(directives = {}, options = {}) {
  const {
    reportOnly = false,
    reportUri = null,
    nonce = null,
  } = options;

  const merged = { ...DEFAULT_CSP, ...directives };

  // Add nonce to script-src if provided
  if (nonce && merged['script-src']) {
    merged['script-src'] = [...merged['script-src'], `'nonce-${nonce}'`];
  }

  // Build CSP string
  const parts = Object.entries(merged)
    .filter(([, values]) => values && values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`);

  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Generate all security headers
 * @param {Object} options - Header options
 * @returns {Object} Security headers
 */
export function generateSecurityHeaders(options = {}) {
  const {
    csp = {},
    cspReportOnly = false,
    cspReportUri = null,
    cspNonce = null,
    frameOptions = 'DENY',
    xssProtection = true,
    contentTypeOptions = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    strictTransportSecurity = true,
    hstsDuration = 31536000,
    hstsIncludeSubDomains = true,
    hstsPreload = false,
    permissionsPolicy = {},
  } = options;

  const headers = {};

  // Content Security Policy
  const cspValue = generateCsp(csp, {
    reportOnly: cspReportOnly,
    reportUri: cspReportUri,
    nonce: cspNonce,
  });

  if (cspReportOnly) {
    headers['Content-Security-Policy-Report-Only'] = cspValue;
  } else {
    headers['Content-Security-Policy'] = cspValue;
  }

  // X-Frame-Options (clickjacking protection)
  if (frameOptions) {
    headers['X-Frame-Options'] = frameOptions;
  }

  // X-XSS-Protection (legacy XSS filter)
  if (xssProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  // X-Content-Type-Options (MIME sniffing protection)
  if (contentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer-Policy
  if (referrerPolicy) {
    headers['Referrer-Policy'] = referrerPolicy;
  }

  // Strict-Transport-Security (HTTPS enforcement)
  if (strictTransportSecurity) {
    let hsts = `max-age=${hstsDuration}`;
    if (hstsIncludeSubDomains) {
      hsts += '; includeSubDomains';
    }
    if (hstsPreload) {
      hsts += '; preload';
    }
    headers['Strict-Transport-Security'] = hsts;
  }

  // Permissions-Policy (feature restrictions)
  if (Object.keys(permissionsPolicy).length > 0) {
    headers['Permissions-Policy'] = generatePermissionsPolicy(permissionsPolicy);
  }

  // Cross-Origin headers
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  // Cache control for sensitive resources
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  return headers;
}

/**
 * Generate Permissions-Policy header value
 * @param {Object} policies - Feature policies
 * @returns {string} Permissions-Policy value
 */
export function generatePermissionsPolicy(policies = {}) {
  const defaultPolicies = {
    accelerometer: [],
    'ambient-light-sensor': [],
    autoplay: [],
    battery: [],
    camera: [],
    'display-capture': [],
    'document-domain': [],
    'encrypted-media': [],
    fullscreen: ['self'],
    geolocation: [],
    gyroscope: [],
    'layout-animations': ['self'],
    'legacy-image-formats': ['self'],
    magnetometer: [],
    microphone: [],
    midi: [],
    'oversized-images': ['self'],
    payment: [],
    'picture-in-picture': [],
    'publickey-credentials-get': [],
    'sync-xhr': [],
    usb: [],
    'wake-lock': [],
    'xr-spatial-tracking': [],
  };

  const merged = { ...defaultPolicies, ...policies };

  return Object.entries(merged)
    .map(([feature, allowList]) => {
      if (allowList.length === 0) {
        return `${feature}=()`;
      }
      const formatted = allowList.map((item) => {
        if (item === 'self') return 'self';
        if (item === '*') return '*';
        return `"${item}"`;
      }).join(' ');
      return `${feature}=(${formatted})`;
    })
    .join(', ');
}

/**
 * Generate headers for API responses
 * @param {Object} options - API header options
 * @returns {Object} API security headers
 */
export function generateApiHeaders(options = {}) {
  const {
    cacheControl = 'no-store',
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  } = options;

  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': cacheControl,
    'Content-Type': 'application/json; charset=utf-8',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/**
 * Create a headers generator with preset configuration
 * @param {Object} config - Generator configuration
 * @returns {Object} Headers generator instance
 */
export function createHeadersGenerator(config = {}) {
  const {
    csp = {},
    production = true,
  } = config;

  return {
    /**
     * Get security headers
     * @param {Object} requestOptions - Per-request options
     * @returns {Object} Security headers
     */
    getHeaders(requestOptions = {}) {
      const { nonce } = requestOptions;

      return generateSecurityHeaders({
        ...config,
        csp,
        cspNonce: nonce,
        strictTransportSecurity: production,
      });
    },

    /**
     * Get API headers
     * @param {Object} options - API options
     * @returns {Object} API headers
     */
    getApiHeaders(options = {}) {
      return generateApiHeaders(options);
    },

    /**
     * Express middleware
     */
    middleware() {
      return (req, res, next) => {
        const headers = this.getHeaders({ nonce: res.locals.cspNonce });
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        next();
      };
    },

    /**
     * Generate a nonce for CSP
     * @returns {string} Base64-encoded nonce
     */
    generateNonce() {
      const crypto = require('crypto');
      return crypto.randomBytes(16).toString('base64');
    },
  };
}
