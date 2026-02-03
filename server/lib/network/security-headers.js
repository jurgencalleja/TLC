/**
 * Security Headers Manager
 * Generates and validates security headers for HTTP responses
 */

export const HEADER_PRESETS = {
  STRICT: {
    csp: {
      strict: true,
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      strict: true,
    },
  },
  RELAXED: {
    csp: {
      strict: false,
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: false,
    },
    xFrameOptions: 'SAMEORIGIN',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
};

/**
 * Generate Content Security Policy header value
 */
export function generateCsp(options) {
  const { strict, scriptSrc, styleSrc, reportUri, frameAncestors, upgradeInsecureRequests } =
    options;

  const directives = [];

  // Default source
  directives.push("default-src 'self'");

  // Script source
  if (scriptSrc) {
    directives.push(`script-src ${scriptSrc.join(' ')}`);
  } else if (strict) {
    directives.push("script-src 'self'");
  }

  // Style source
  if (styleSrc) {
    directives.push(`style-src ${styleSrc.join(' ')}`);
  } else if (strict) {
    directives.push("style-src 'self'");
  }

  // Frame ancestors
  if (frameAncestors) {
    directives.push(`frame-ancestors ${frameAncestors.join(' ')}`);
  }

  // Upgrade insecure requests
  if (upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }

  // Report URI
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Generate HSTS header value
 */
export function generateHsts(options) {
  const { maxAge = 31536000, includeSubDomains, preload } = options;

  let value = `max-age=${maxAge}`;

  if (includeSubDomains) {
    value += '; includeSubDomains';
  }

  if (preload) {
    value += '; preload';
  }

  return value;
}

/**
 * Generate Permissions-Policy header value
 */
export function generatePermissionsPolicy(options) {
  const { strict, camera, microphone, geolocation, payment } = options;

  const policies = [];

  // Helper to format policy value
  const formatValue = (value) => {
    if (!value || value.length === 0) {
      return '()';
    }
    const formatted = value
      .map((v) => {
        if (v === 'self') return 'self';
        return `"${v}"`;
      })
      .join(' ');
    return `(${formatted})`;
  };

  if (strict) {
    policies.push('camera=()');
    policies.push('microphone=()');
    policies.push('geolocation=()');
    policies.push('payment=()');
    policies.push('usb=()');
    policies.push('magnetometer=()');
    policies.push('gyroscope=()');
    policies.push('accelerometer=()');
  } else {
    if (camera !== undefined) {
      policies.push(`camera=${formatValue(camera)}`);
    }
    if (microphone !== undefined) {
      policies.push(`microphone=${formatValue(microphone)}`);
    }
    if (geolocation !== undefined) {
      policies.push(`geolocation=${formatValue(geolocation)}`);
    }
    if (payment !== undefined) {
      policies.push(`payment=${formatValue(payment)}`);
    }
  }

  return policies.join(', ');
}

/**
 * Generate Cross-Origin headers (COOP, COEP, CORP)
 */
export function generateCrossOriginHeaders(options) {
  const { coopPolicy, coepPolicy, corpPolicy } = options;

  const headers = {};

  if (coopPolicy) {
    headers['Cross-Origin-Opener-Policy'] = coopPolicy;
  }

  if (coepPolicy) {
    headers['Cross-Origin-Embedder-Policy'] = coepPolicy;
  }

  if (corpPolicy) {
    headers['Cross-Origin-Resource-Policy'] = corpPolicy;
  }

  return headers;
}

/**
 * Generate all security headers
 */
export function generateSecurityHeaders(options) {
  const { preset, referrerPolicy } = options;

  const presetConfig = preset ? HEADER_PRESETS[preset.toUpperCase()] : null;

  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': presetConfig?.xFrameOptions || 'DENY',
    'Referrer-Policy': referrerPolicy || presetConfig?.referrerPolicy || 'strict-origin-when-cross-origin',
  };

  if (preset === 'strict' || presetConfig) {
    headers['Content-Security-Policy'] = generateCsp(presetConfig?.csp || { strict: true });
    headers['Strict-Transport-Security'] = generateHsts(presetConfig?.hsts || {});
    headers['Permissions-Policy'] = generatePermissionsPolicy(
      presetConfig?.permissionsPolicy || { strict: true }
    );
  }

  return headers;
}

/**
 * Validate security headers
 */
export function validateHeaders(headers, options = {}) {
  const { required = [], strict = false } = options;

  const result = {
    valid: true,
    missing: [],
    warnings: [],
  };

  // Check required headers
  for (const header of required) {
    if (!headers[header]) {
      result.missing.push(header);
      result.valid = false;
    }
  }

  // Check for unsafe CSP directives in strict mode
  if (strict === true && headers['Content-Security-Policy']) {
    const cspValue = headers['Content-Security-Policy'];
    // Check for unsafe-inline
    if (cspValue.includes('unsafe-inline')) {
      result.warnings.push('unsafe-inline detected in CSP - this weakens security');
    }
    // Check for unsafe-eval
    if (cspValue.includes('unsafe-eval')) {
      result.warnings.push('unsafe-eval detected in CSP - this weakens security');
    }
  }

  return result;
}

/**
 * Create a security headers manager with default options
 */
export function createSecurityHeadersManager(config = {}) {
  const { preset } = config;

  return {
    generate(options) {
      return generateSecurityHeaders({ preset, ...options });
    },
    validate(headers, options) {
      return validateHeaders(headers, options);
    },
    getCsp(options) {
      return generateCsp(options);
    },
    getHsts(options) {
      return generateHsts(options);
    },
  };
}
