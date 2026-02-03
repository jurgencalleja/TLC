/**
 * Security Headers Generator Module
 *
 * Generates secure HTTP headers to prevent common attacks.
 * Addresses OWASP A05: Security Misconfiguration
 */

import crypto from 'crypto';

/**
 * Valid CSP directives
 */
const VALID_CSP_DIRECTIVES = new Set([
  'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
  'connect-src', 'media-src', 'object-src', 'frame-src', 'child-src',
  'worker-src', 'frame-ancestors', 'form-action', 'base-uri', 'manifest-src',
  'upgrade-insecure-requests', 'block-all-mixed-content', 'report-uri', 'report-to',
  'require-trusted-types-for', 'trusted-types', 'sandbox',
]);

/**
 * Valid Permissions-Policy features
 */
const VALID_PERMISSIONS_FEATURES = new Set([
  'accelerometer', 'ambient-light-sensor', 'autoplay', 'battery', 'camera',
  'display-capture', 'document-domain', 'encrypted-media', 'fullscreen',
  'geolocation', 'gyroscope', 'layout-animations', 'legacy-image-formats',
  'magnetometer', 'microphone', 'midi', 'oversized-images', 'payment',
  'picture-in-picture', 'publickey-credentials-get', 'sync-xhr', 'usb',
  'wake-lock', 'xr-spatial-tracking', 'interest-cohort',
]);

/**
 * Default CSP directives (strict)
 */
const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
};

/**
 * Generate Content Security Policy header value
 * @param {Object} options - CSP options
 * @returns {string} CSP header value
 */
export function generateCsp(options = {}) {
  const {
    useNonce = false,
    nonce = null,
    scriptSrc = null,
    styleSrc = null,
    imgSrc = null,
    connectSrc = null,
    frameAncestors = null,
    reportUri = null,
    reportTo = null,
    mode = null,
    reportOnly = false, // Consumed here, not passed to CSP string
    ...customDirectives
  } = options;

  // Validate custom directive names
  for (const directive of Object.keys(customDirectives)) {
    if (!VALID_CSP_DIRECTIVES.has(directive)) {
      throw new Error(`Invalid CSP directive: ${directive}`);
    }
  }

  // Start with defaults
  const directives = { ...DEFAULT_CSP };

  // Apply script-src
  if (scriptSrc && scriptSrc.length > 0) {
    directives['script-src'] = ["'self'", ...scriptSrc];
  }

  // Apply style-src
  if (styleSrc && styleSrc.length > 0) {
    directives['style-src'] = ["'self'", ...styleSrc];
  }

  // Apply img-src
  if (imgSrc && imgSrc.length > 0) {
    directives['img-src'] = ["'self'", ...imgSrc];
  }

  // Apply connect-src
  if (connectSrc && connectSrc.length > 0) {
    directives['connect-src'] = ["'self'", ...connectSrc];
  }

  // Apply frame-ancestors
  if (frameAncestors) {
    directives['frame-ancestors'] = frameAncestors;
  }

  // Add nonce if configured
  if (useNonce && nonce) {
    directives['script-src'] = [...(directives['script-src'] || ["'self'"]), `'nonce-${nonce}'`];

    // SPA mode adds strict-dynamic
    if (mode === 'spa') {
      directives['script-src'].push("'strict-dynamic'");
    }
  }

  // Build CSP string
  const parts = [];

  for (const [directive, values] of Object.entries(directives)) {
    if (values && values.length > 0) {
      parts.push(`${directive} ${values.join(' ')}`);
    } else if (directive === 'upgrade-insecure-requests' || directive === 'block-all-mixed-content') {
      parts.push(directive);
    }
  }

  // Add reporting
  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
  }
  if (reportTo) {
    parts.push(`report-to ${reportTo}`);
  }

  return parts.join('; ');
}

/**
 * Generate HSTS header value
 * @param {Object} options - HSTS options
 * @returns {string} HSTS header value
 */
export function generateHsts(options = {}) {
  const {
    maxAge = 31536000, // 1 year
    includeSubDomains = true,
    preload = false,
  } = options;

  // Preload requires at least 1 year (31536000 seconds)
  if (preload && maxAge < 31536000) {
    throw new Error('HSTS preload requires max-age of at least 31536000 seconds (1 year)');
  }

  let hsts = `max-age=${maxAge}`;

  if (includeSubDomains) {
    hsts += '; includeSubDomains';
  }

  if (preload) {
    hsts += '; preload';
  }

  return hsts;
}

/**
 * Generate Permissions-Policy header value
 * @param {Object} policies - Feature policies
 * @returns {string} Permissions-Policy value
 */
export function generatePermissionsPolicy(policies = {}) {
  // Validate feature names
  for (const feature of Object.keys(policies)) {
    if (!VALID_PERMISSIONS_FEATURES.has(feature)) {
      throw new Error(`Invalid Permissions-Policy feature: ${feature}`);
    }
  }

  const defaultPolicies = {
    accelerometer: [],
    'ambient-light-sensor': [],
    autoplay: [],
    battery: [],
    camera: [],
    'display-capture': [],
    'encrypted-media': [],
    fullscreen: ['self'],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    midi: [],
    payment: [],
    'picture-in-picture': [],
    'publickey-credentials-get': [],
    'sync-xhr': [],
    usb: [],
    'interest-cohort': [],
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
 * Generate all security headers
 * @param {Object} options - Header options
 * @returns {Object} Security headers
 */
export function generateSecurityHeaders(options = {}) {
  const {
    csp = {},
    frameOptions = 'DENY',
    contentTypeOptions = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    hsts = {},
    permissionsPolicy = {},
  } = options;

  const headers = {};

  // Content Security Policy
  headers['Content-Security-Policy'] = generateCsp(csp);

  // X-Frame-Options (clickjacking protection)
  if (frameOptions) {
    headers['X-Frame-Options'] = frameOptions;
  }

  // X-Content-Type-Options (MIME sniffing protection)
  if (contentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer-Policy
  if (referrerPolicy) {
    headers['Referrer-Policy'] = referrerPolicy;
  }

  // Strict-Transport-Security
  headers['Strict-Transport-Security'] = generateHsts(hsts);

  // Permissions-Policy
  headers['Permissions-Policy'] = generatePermissionsPolicy(permissionsPolicy);

  // Cross-Origin headers
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';

  return headers;
}

/**
 * Create a headers generator with preset configuration
 * @param {Object} config - Generator configuration
 * @returns {Object} Headers generator instance
 */
export function createHeadersGenerator(config = {}) {
  const {
    csp = {},
    cspReportOnly = null,
    hsts = {},
    permissionsPolicy = {},
  } = config;

  return {
    /**
     * Generate headers
     * @param {Object} options - Per-request options
     * @returns {Object} Security headers
     */
    generate(options = {}) {
      const { overrides = {}, route } = options;

      // Merge CSP options
      let cspOptions = { ...csp };
      if (overrides.csp) {
        cspOptions = { ...cspOptions, ...overrides.csp };
      }

      // Auto-generate nonce if useNonce is configured
      if (cspOptions.useNonce && !cspOptions.nonce) {
        cspOptions.nonce = crypto.randomBytes(16).toString('base64');
      }

      const headers = {};

      // Generate main CSP
      if (csp.reportOnly) {
        headers['Content-Security-Policy-Report-Only'] = generateCsp(cspOptions);
      } else {
        headers['Content-Security-Policy'] = generateCsp(cspOptions);
      }

      // Generate report-only CSP if configured separately
      if (cspReportOnly) {
        headers['Content-Security-Policy-Report-Only'] = generateCsp(cspReportOnly);
      }

      // HSTS
      const hstsOptions = overrides.hsts ? { ...hsts, ...overrides.hsts } : hsts;
      headers['Strict-Transport-Security'] = generateHsts(hstsOptions);

      // Other headers
      headers['X-Frame-Options'] = 'DENY';
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      headers['Permissions-Policy'] = generatePermissionsPolicy(permissionsPolicy);
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';

      return headers;
    },

    /**
     * Generate headers with nonce
     * @returns {{headers: Object, nonce: string}} Headers and nonce
     */
    generateWithNonce() {
      const nonce = crypto.randomBytes(16).toString('base64');
      const cspOptions = { ...csp, useNonce: true, nonce };

      const headers = {};
      headers['Content-Security-Policy'] = generateCsp(cspOptions);

      // HSTS
      headers['Strict-Transport-Security'] = generateHsts(hsts);

      // Other headers
      headers['X-Frame-Options'] = 'DENY';
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      headers['Permissions-Policy'] = generatePermissionsPolicy(permissionsPolicy);
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';

      return { headers, nonce };
    },

    /**
     * Express middleware
     */
    middleware() {
      return (req, res, next) => {
        const headers = this.generate();
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        next();
      };
    },
  };
}
