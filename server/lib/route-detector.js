/**
 * Route Detector Module
 * Auto-detects API routes from Express, Fastify, Hono, and other frameworks
 */

/**
 * HTTP methods to detect
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Framework patterns for route detection
 */
const FRAMEWORK_PATTERNS = {
  express: {
    // app.get('/path', handler)
    // router.post('/path', middleware, handler)
    routePattern: /(?:app|router)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    // app.use('/api', router)
    mountPattern: /(?:app|router)\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/gi,
  },
  fastify: {
    // fastify.get('/path', handler)
    routePattern: /fastify\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    // fastify.route({ method: 'GET', url: '/path' })
    routeObjectPattern: /fastify\.route\s*\(\s*\{[^}]*method:\s*['"`](\w+)['"`][^}]*url:\s*['"`]([^'"`]+)['"`]/gi,
  },
  hono: {
    // app.get('/path', handler)
    routePattern: /app\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    // app.route('/api', apiRoutes)
    mountPattern: /app\.route\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  },
  koa: {
    // router.get('/path', handler)
    routePattern: /router\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  },
};

/**
 * Detect framework from file content
 * @param {string} content - File content
 * @returns {string|null} Framework name
 */
function detectFramework(content) {
  if (content.includes('from \'express\'') || content.includes('require(\'express\')') || content.includes('from "express"')) {
    return 'express';
  }
  if (content.includes('from \'fastify\'') || content.includes('require(\'fastify\')')) {
    return 'fastify';
  }
  if (content.includes('from \'hono\'') || content.includes('from "hono"')) {
    return 'hono';
  }
  if (content.includes('from \'koa\'') || content.includes('require(\'koa\')')) {
    return 'koa';
  }
  return null;
}

/**
 * Extract routes from file content
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Array} Detected routes
 */
function extractRoutes(content, filePath = '') {
  const routes = [];
  const framework = detectFramework(content);

  if (!framework) {
    // Try generic detection
    return extractGenericRoutes(content, filePath);
  }

  const patterns = FRAMEWORK_PATTERNS[framework];

  // Extract routes using route pattern
  if (patterns.routePattern) {
    const regex = new RegExp(patterns.routePattern.source, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        framework,
        file: filePath,
      });
    }
  }

  // Extract route objects (Fastify style)
  if (patterns.routeObjectPattern) {
    const regex = new RegExp(patterns.routeObjectPattern.source, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        framework,
        file: filePath,
      });
    }
  }

  return routes;
}

/**
 * Generic route extraction for unknown frameworks
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Array} Detected routes
 */
function extractGenericRoutes(content, filePath) {
  const routes = [];

  // Look for common patterns
  for (const method of HTTP_METHODS) {
    // pattern: .method('/path'
    const pattern = new RegExp(`\\.(${method})\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'gi');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        framework: 'unknown',
        file: filePath,
      });
    }
  }

  return routes;
}

/**
 * Extract route parameters from path
 * @param {string} path - Route path
 * @returns {Array} Parameters
 */
function extractPathParams(path) {
  const params = [];

  // Express style: /users/:id
  const colonPattern = /:(\w+)/g;
  let match;
  while ((match = colonPattern.exec(path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      type: 'string',
    });
  }

  // OpenAPI style: /users/{id}
  const bracePattern = /\{(\w+)\}/g;
  while ((match = bracePattern.exec(path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      type: 'string',
    });
  }

  return params;
}

/**
 * Normalize route path to OpenAPI format
 * @param {string} path - Route path
 * @returns {string} Normalized path
 */
function normalizePathToOpenAPI(path) {
  // Convert :param to {param}
  return path.replace(/:(\w+)/g, '{$1}');
}

/**
 * Detect request body schema from handler code
 * @param {string} content - File content around the route
 * @returns {Object|null} Schema hints
 */
function detectRequestBody(content) {
  const hints = {
    hasBody: false,
    fields: [],
  };

  // Look for req.body.field patterns
  const bodyFieldPattern = /req\.body\.(\w+)/g;
  let match;
  while ((match = bodyFieldPattern.exec(content)) !== null) {
    hints.hasBody = true;
    if (!hints.fields.includes(match[1])) {
      hints.fields.push(match[1]);
    }
  }

  // Look for destructuring: const { field1, field2 } = req.body
  const destructurePattern = /const\s*\{([^}]+)\}\s*=\s*req\.body/;
  const destructureMatch = content.match(destructurePattern);
  if (destructureMatch) {
    hints.hasBody = true;
    const fields = destructureMatch[1].split(',').map(f => f.trim().split(':')[0].trim());
    for (const field of fields) {
      if (field && !hints.fields.includes(field)) {
        hints.fields.push(field);
      }
    }
  }

  return hints.hasBody ? hints : null;
}

/**
 * Detect response patterns from handler code
 * @param {string} content - File content
 * @returns {Array} Response hints
 */
function detectResponses(content) {
  const responses = [];

  // res.status(200).json(...)
  const statusJsonPattern = /res\.status\((\d+)\)\.json/g;
  let match;
  while ((match = statusJsonPattern.exec(content)) !== null) {
    const status = parseInt(match[1], 10);
    if (!responses.some(r => r.status === status)) {
      responses.push({ status, type: 'json' });
    }
  }

  // res.json(...) implies 200
  if (content.includes('res.json(') && !responses.some(r => r.status === 200)) {
    responses.push({ status: 200, type: 'json' });
  }

  // res.send(...) implies 200
  if (content.includes('res.send(') && !responses.some(r => r.status === 200)) {
    responses.push({ status: 200, type: 'text' });
  }

  // Common error patterns
  if (content.includes('404') || content.includes('Not found') || content.includes('not found')) {
    if (!responses.some(r => r.status === 404)) {
      responses.push({ status: 404, type: 'json' });
    }
  }

  if (content.includes('401') || content.includes('Unauthorized') || content.includes('unauthorized')) {
    if (!responses.some(r => r.status === 401)) {
      responses.push({ status: 401, type: 'json' });
    }
  }

  if (content.includes('500') || content.includes('Internal') || content.includes('error')) {
    if (!responses.some(r => r.status === 500)) {
      responses.push({ status: 500, type: 'json' });
    }
  }

  return responses;
}

/**
 * Merge routes from multiple files
 * @param {Array} routeArrays - Arrays of routes from different files
 * @returns {Array} Merged and deduplicated routes
 */
function mergeRoutes(routeArrays) {
  const allRoutes = routeArrays.flat();
  const seen = new Set();
  const unique = [];

  for (const route of allRoutes) {
    const key = `${route.method}:${route.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(route);
    }
  }

  // Sort by path then method
  return unique.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
}

/**
 * Group routes by base path
 * @param {Array} routes - Array of routes
 * @returns {Object} Routes grouped by base path
 */
function groupRoutesByBasePath(routes) {
  const groups = {};

  for (const route of routes) {
    const parts = route.path.split('/').filter(Boolean);
    const basePath = parts.length > 0 ? `/${parts[0]}` : '/';

    if (!groups[basePath]) {
      groups[basePath] = [];
    }
    groups[basePath].push(route);
  }

  return groups;
}

/**
 * Infer route tags from path
 * @param {string} path - Route path
 * @returns {Array} Tags
 */
function inferTags(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return ['root'];

  // Use first path segment as tag
  const firstSegment = parts[0].replace(/[{}:]/g, '');
  return [firstSegment];
}

/**
 * Generate operation ID from method and path
 * @param {string} method - HTTP method
 * @param {string} path - Route path
 * @returns {string} Operation ID
 */
function generateOperationId(method, path) {
  const cleanPath = path
    .replace(/[{}:]/g, '')
    .split('/')
    .filter(Boolean)
    .map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `${method.toLowerCase()}${cleanPath.charAt(0).toUpperCase()}${cleanPath.slice(1)}`;
}

module.exports = {
  HTTP_METHODS,
  FRAMEWORK_PATTERNS,
  detectFramework,
  extractRoutes,
  extractGenericRoutes,
  extractPathParams,
  normalizePathToOpenAPI,
  detectRequestBody,
  detectResponses,
  mergeRoutes,
  groupRoutesByBasePath,
  inferTags,
  generateOperationId,
};
