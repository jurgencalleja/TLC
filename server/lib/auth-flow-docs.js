/**
 * Auth Flow Documentation Module
 * Generates documentation for authentication flows
 */

/**
 * Common auth flow patterns
 */
const AUTH_PATTERNS = {
  jwt: {
    name: 'JWT Bearer Token',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT token obtained from login endpoint',
    flow: [
      'POST /auth/login with credentials',
      'Receive { token: "eyJ..." }',
      'Include header: Authorization: Bearer <token>',
      'Token expires after configured TTL',
    ],
  },
  apiKey: {
    name: 'API Key',
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key for service-to-service authentication',
    flow: [
      'Obtain API key from dashboard',
      'Include header: X-API-Key: <key>',
      'Key has configured permissions',
    ],
  },
  basic: {
    name: 'HTTP Basic Auth',
    type: 'http',
    scheme: 'basic',
    description: 'Username and password in Authorization header',
    flow: [
      'Base64 encode "username:password"',
      'Include header: Authorization: Basic <encoded>',
    ],
  },
  oauth2: {
    name: 'OAuth 2.0',
    type: 'oauth2',
    description: 'OAuth 2.0 authorization flow',
    flows: {
      authorizationCode: {
        authorizationUrl: '/oauth/authorize',
        tokenUrl: '/oauth/token',
        scopes: {},
      },
    },
    flow: [
      'Redirect to /oauth/authorize with client_id',
      'User approves access',
      'Receive authorization code',
      'Exchange code for token at /oauth/token',
      'Use token in Authorization header',
    ],
  },
  session: {
    name: 'Session Cookie',
    type: 'apiKey',
    in: 'cookie',
    name: 'session',
    description: 'Session-based authentication using cookies',
    flow: [
      'POST /auth/login with credentials',
      'Receive Set-Cookie header',
      'Browser automatically includes cookie in requests',
      'Session expires after configured TTL',
    ],
  },
};

/**
 * Detect auth patterns from code
 * @param {string} content - File content
 * @returns {Array} Detected auth patterns
 */
function detectAuthPatterns(content) {
  const patterns = [];

  // JWT patterns
  if (content.includes('jwt') || content.includes('jsonwebtoken') ||
      content.includes('Bearer') || content.includes('bearer')) {
    patterns.push('jwt');
  }

  // Basic auth
  if (content.includes('basic') && content.includes('auth')) {
    patterns.push('basic');
  }

  // API key patterns
  if (content.includes('api-key') || content.includes('apiKey') ||
      content.includes('x-api-key') || content.includes('X-API-Key')) {
    patterns.push('apiKey');
  }

  // OAuth patterns
  if (content.includes('oauth') || content.includes('OAuth') ||
      content.includes('authorization_code') || content.includes('authorizationUrl')) {
    patterns.push('oauth2');
  }

  // Session patterns
  if (content.includes('session') && (content.includes('cookie') || content.includes('express-session'))) {
    patterns.push('session');
  }

  return [...new Set(patterns)];
}

/**
 * Extract security requirements from route
 * @param {Object} route - Route object
 * @param {string} handlerContent - Handler code content
 * @returns {Object} Security requirements
 */
function extractSecurityRequirements(route, handlerContent = '') {
  const requirements = {
    requiresAuth: false,
    schemes: [],
    scopes: [],
    roles: [],
  };

  // Check for auth middleware patterns
  const authMiddlewarePatterns = [
    /auth(?:enticate)?(?:d)?/i,
    /requireAuth/i,
    /isAuthenticated/i,
    /protect(?:ed)?/i,
    /verifyToken/i,
  ];

  for (const pattern of authMiddlewarePatterns) {
    if (pattern.test(handlerContent)) {
      requirements.requiresAuth = true;
      break;
    }
  }

  // Extract roles
  const rolePatterns = [
    /role[s]?\s*[=:]\s*['"`]([^'"`]+)['"`]/gi,
    /hasRole\(['"`]([^'"`]+)['"`]\)/gi,
    /requireRole\(['"`]([^'"`]+)['"`]\)/gi,
  ];

  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(handlerContent)) !== null) {
      requirements.roles.push(match[1]);
    }
  }

  // Detect schemes
  const detectedSchemes = detectAuthPatterns(handlerContent);
  requirements.schemes = detectedSchemes;

  if (detectedSchemes.length > 0) {
    requirements.requiresAuth = true;
  }

  return requirements;
}

/**
 * Generate OpenAPI security scheme
 * @param {string} patternName - Auth pattern name
 * @param {Object} customConfig - Custom configuration
 * @returns {Object} OpenAPI security scheme
 */
function generateSecurityScheme(patternName, customConfig = {}) {
  const basePattern = AUTH_PATTERNS[patternName];
  if (!basePattern) {
    return null;
  }

  const scheme = {
    type: basePattern.type,
    description: customConfig.description || basePattern.description,
  };

  switch (basePattern.type) {
    case 'http':
      scheme.scheme = customConfig.scheme || basePattern.scheme;
      if (basePattern.bearerFormat) {
        scheme.bearerFormat = customConfig.bearerFormat || basePattern.bearerFormat;
      }
      break;
    case 'apiKey':
      scheme.in = customConfig.in || basePattern.in;
      scheme.name = customConfig.name || basePattern.name;
      break;
    case 'oauth2':
      scheme.flows = customConfig.flows || basePattern.flows;
      break;
  }

  return scheme;
}

/**
 * Generate auth flow documentation
 * @param {Array} detectedPatterns - Detected auth patterns
 * @param {Object} options - Documentation options
 * @returns {Object} Auth documentation
 */
function generateAuthDocs(detectedPatterns, options = {}) {
  const docs = {
    securitySchemes: {},
    flows: [],
    endpoints: {
      login: null,
      logout: null,
      register: null,
      refresh: null,
      verify: null,
    },
  };

  // Generate schemes for detected patterns
  for (const pattern of detectedPatterns) {
    const schemeName = pattern === 'jwt' ? 'bearerAuth' :
                       pattern === 'apiKey' ? 'apiKeyAuth' :
                       pattern === 'basic' ? 'basicAuth' :
                       pattern === 'oauth2' ? 'oauth2' :
                       pattern === 'session' ? 'sessionAuth' : pattern;

    docs.securitySchemes[schemeName] = generateSecurityScheme(pattern, options[pattern]);

    if (AUTH_PATTERNS[pattern]) {
      docs.flows.push({
        name: AUTH_PATTERNS[pattern].name,
        scheme: schemeName,
        steps: AUTH_PATTERNS[pattern].flow,
      });
    }
  }

  // Detect common auth endpoints
  if (options.routes) {
    for (const route of options.routes) {
      const pathLower = route.path.toLowerCase();

      if (pathLower.includes('login') && route.method === 'POST') {
        docs.endpoints.login = route;
      }
      if (pathLower.includes('logout') && route.method === 'POST') {
        docs.endpoints.logout = route;
      }
      if (pathLower.includes('register') && route.method === 'POST') {
        docs.endpoints.register = route;
      }
      if (pathLower.includes('refresh') && route.method === 'POST') {
        docs.endpoints.refresh = route;
      }
      if ((pathLower.includes('verify') || pathLower.includes('me')) && route.method === 'GET') {
        docs.endpoints.verify = route;
      }
    }
  }

  return docs;
}

/**
 * Format auth flow for display
 * @param {Object} flow - Auth flow object
 * @returns {string} Formatted flow
 */
function formatAuthFlow(flow) {
  const lines = [
    `## ${flow.name}`,
    '',
    'Steps:',
    ...flow.steps.map((step, i) => `${i + 1}. ${step}`),
    '',
  ];

  return lines.join('\n');
}

/**
 * Generate auth documentation markdown
 * @param {Object} authDocs - Auth documentation object
 * @returns {string} Markdown documentation
 */
function generateAuthMarkdown(authDocs) {
  const sections = [];

  sections.push('# Authentication');
  sections.push('');

  // Security schemes
  if (Object.keys(authDocs.securitySchemes).length > 0) {
    sections.push('## Security Schemes');
    sections.push('');

    for (const [name, scheme] of Object.entries(authDocs.securitySchemes)) {
      sections.push(`### ${name}`);
      sections.push('');
      sections.push(`- **Type:** ${scheme.type}`);
      if (scheme.scheme) {
        sections.push(`- **Scheme:** ${scheme.scheme}`);
      }
      if (scheme.bearerFormat) {
        sections.push(`- **Format:** ${scheme.bearerFormat}`);
      }
      if (scheme.description) {
        sections.push(`- **Description:** ${scheme.description}`);
      }
      sections.push('');
    }
  }

  // Auth flows
  if (authDocs.flows.length > 0) {
    sections.push('## Authentication Flows');
    sections.push('');

    for (const flow of authDocs.flows) {
      sections.push(formatAuthFlow(flow));
    }
  }

  // Auth endpoints
  const hasEndpoints = Object.values(authDocs.endpoints).some(e => e !== null);
  if (hasEndpoints) {
    sections.push('## Auth Endpoints');
    sections.push('');

    for (const [name, endpoint] of Object.entries(authDocs.endpoints)) {
      if (endpoint) {
        sections.push(`- **${name}:** \`${endpoint.method} ${endpoint.path}\``);
      }
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Create auth flow documentation generator
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createAuthDocsGenerator(options = {}) {
  return {
    detectPatterns: detectAuthPatterns,
    extractRequirements: extractSecurityRequirements,
    generateScheme: generateSecurityScheme,
    generateDocs: (patterns, opts) => generateAuthDocs(patterns, { ...options, ...opts }),
    toMarkdown: generateAuthMarkdown,
    formatFlow: formatAuthFlow,
  };
}

module.exports = {
  AUTH_PATTERNS,
  detectAuthPatterns,
  extractSecurityRequirements,
  generateSecurityScheme,
  generateAuthDocs,
  formatAuthFlow,
  generateAuthMarkdown,
  createAuthDocsGenerator,
};
