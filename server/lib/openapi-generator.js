/**
 * OpenAPI Generator Module
 * Generates OpenAPI 3.x specifications from detected routes
 */

const {
  normalizePathToOpenAPI,
  extractPathParams,
  inferTags,
  generateOperationId,
} = require('./route-detector.js');

/**
 * Default OpenAPI info object
 */
const DEFAULT_INFO = {
  title: 'API Documentation',
  version: '1.0.0',
  description: 'Auto-generated API documentation',
};

/**
 * HTTP status code descriptions
 */
const STATUS_DESCRIPTIONS = {
  200: 'Successful response',
  201: 'Created successfully',
  204: 'No content',
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
  422: 'Unprocessable entity',
  500: 'Internal server error',
};

/**
 * Create base OpenAPI document structure
 * @param {Object} options - Configuration options
 * @returns {Object} Base OpenAPI document
 */
function createBaseDocument(options = {}) {
  const info = { ...DEFAULT_INFO, ...options.info };

  const doc = {
    openapi: '3.0.3',
    info,
    servers: options.servers || [{ url: 'http://localhost:3000' }],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {},
    },
    tags: [],
  };

  return doc;
}

/**
 * Generate parameter schema from path param
 * @param {Object} param - Path parameter
 * @returns {Object} OpenAPI parameter object
 */
function generateParameterSchema(param) {
  return {
    name: param.name,
    in: param.in || 'path',
    required: param.required !== false,
    schema: {
      type: param.type || 'string',
    },
    description: param.description || `The ${param.name} parameter`,
  };
}

/**
 * Generate request body schema from field hints
 * @param {Object} bodyHints - Request body hints from detectRequestBody
 * @returns {Object} OpenAPI request body object
 */
function generateRequestBodySchema(bodyHints) {
  if (!bodyHints || !bodyHints.hasBody || bodyHints.fields.length === 0) {
    return null;
  }

  const properties = {};
  for (const field of bodyHints.fields) {
    properties[field] = {
      type: 'string',
      description: `The ${field} field`,
    };
  }

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties,
        },
      },
    },
  };
}

/**
 * Generate response schema from response hints
 * @param {Array} responseHints - Response hints from detectResponses
 * @returns {Object} OpenAPI responses object
 */
function generateResponseSchemas(responseHints) {
  const responses = {};

  if (!responseHints || responseHints.length === 0) {
    // Default 200 response
    responses['200'] = {
      description: STATUS_DESCRIPTIONS[200],
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    };
    return responses;
  }

  for (const hint of responseHints) {
    const status = String(hint.status);
    responses[status] = {
      description: STATUS_DESCRIPTIONS[hint.status] || `Status ${hint.status}`,
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    };
  }

  return responses;
}

/**
 * Generate operation object from route
 * @param {Object} route - Route object
 * @param {Object} options - Generation options
 * @returns {Object} OpenAPI operation object
 */
function generateOperation(route, options = {}) {
  const path = normalizePathToOpenAPI(route.path);
  const params = extractPathParams(route.path);
  const tags = route.tags || inferTags(route.path);
  const operationId = route.operationId || generateOperationId(route.method, route.path);

  const operation = {
    operationId,
    summary: route.summary || `${route.method} ${path}`,
    description: route.description || '',
    tags,
    parameters: params.map(generateParameterSchema),
    responses: generateResponseSchemas(route.responses),
  };

  // Add request body for methods that support it
  if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
    const requestBody = generateRequestBodySchema(route.requestBody);
    if (requestBody) {
      operation.requestBody = requestBody;
    }
  }

  // Add security if specified
  if (route.security) {
    operation.security = route.security;
  }

  return operation;
}

/**
 * Add route to OpenAPI paths
 * @param {Object} paths - OpenAPI paths object
 * @param {Object} route - Route to add
 * @param {Object} options - Generation options
 */
function addRouteToPath(paths, route, options = {}) {
  const path = normalizePathToOpenAPI(route.path);
  const method = route.method.toLowerCase();

  if (!paths[path]) {
    paths[path] = {};
  }

  paths[path][method] = generateOperation(route, options);
}

/**
 * Collect unique tags from routes
 * @param {Array} routes - Array of routes
 * @returns {Array} OpenAPI tags array
 */
function collectTags(routes) {
  const tagSet = new Set();

  for (const route of routes) {
    const tags = route.tags || inferTags(route.path);
    for (const tag of tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet)
    .sort()
    .map(name => ({
      name,
      description: `Operations related to ${name}`,
    }));
}

/**
 * Generate complete OpenAPI document from routes
 * @param {Array} routes - Array of detected routes
 * @param {Object} options - Generation options
 * @returns {Object} Complete OpenAPI document
 */
function generateOpenAPIDocument(routes, options = {}) {
  const doc = createBaseDocument(options);

  // Add routes to paths
  for (const route of routes) {
    addRouteToPath(doc.paths, route, options);
  }

  // Collect and add tags
  doc.tags = collectTags(routes);

  return doc;
}

/**
 * Serialize OpenAPI document to JSON
 * @param {Object} doc - OpenAPI document
 * @param {boolean} pretty - Pretty print
 * @returns {string} JSON string
 */
function serializeToJSON(doc, pretty = true) {
  return JSON.stringify(doc, null, pretty ? 2 : 0);
}

/**
 * Serialize OpenAPI document to YAML
 * @param {Object} doc - OpenAPI document
 * @returns {string} YAML string
 */
function serializeToYAML(doc) {
  // Simple YAML serialization (no external deps)
  return yamlStringify(doc, 0);
}

/**
 * Simple YAML stringifier (no external deps)
 * @param {any} value - Value to stringify
 * @param {number} indent - Current indent level
 * @returns {string} YAML string
 */
function yamlStringify(value, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    // Check if string needs quoting
    if (value === '' ||
        value.includes(':') ||
        value.includes('#') ||
        value.includes('\n') ||
        value.startsWith(' ') ||
        value.endsWith(' ') ||
        /^[0-9]/.test(value) ||
        ['true', 'false', 'null', 'yes', 'no'].includes(value.toLowerCase())) {
      return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map(item => {
        const itemStr = yamlStringify(item, indent + 1);
        if (typeof item === 'object' && item !== null) {
          return `${spaces}- ${itemStr.trimStart()}`;
        }
        return `${spaces}- ${itemStr}`;
      })
      .join('\n');
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    return keys
      .map(key => {
        const val = value[key];
        const valStr = yamlStringify(val, indent + 1);
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length > 0) {
          return `${spaces}${key}:\n${valStr}`;
        }
        if (Array.isArray(val) && val.length > 0) {
          return `${spaces}${key}:\n${valStr}`;
        }
        return `${spaces}${key}: ${valStr}`;
      })
      .join('\n');
  }

  return String(value);
}

/**
 * Validate OpenAPI document structure
 * @param {Object} doc - OpenAPI document
 * @returns {Object} Validation result
 */
function validateDocument(doc) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!doc.openapi) {
    errors.push('Missing required field: openapi');
  } else if (!doc.openapi.startsWith('3.')) {
    errors.push('openapi version must be 3.x');
  }

  if (!doc.info) {
    errors.push('Missing required field: info');
  } else {
    if (!doc.info.title) {
      errors.push('Missing required field: info.title');
    }
    if (!doc.info.version) {
      errors.push('Missing required field: info.version');
    }
  }

  if (!doc.paths) {
    errors.push('Missing required field: paths');
  } else {
    // Validate paths
    for (const [path, methods] of Object.entries(doc.paths)) {
      if (!path.startsWith('/')) {
        errors.push(`Path must start with /: ${path}`);
      }

      for (const [method, operation] of Object.entries(methods)) {
        if (!operation.responses || Object.keys(operation.responses).length === 0) {
          warnings.push(`No responses defined for ${method.toUpperCase()} ${path}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create OpenAPI generator with options
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createGenerator(options = {}) {
  return {
    generate: (routes) => generateOpenAPIDocument(routes, options),
    toJSON: (doc) => serializeToJSON(doc, options.pretty !== false),
    toYAML: (doc) => serializeToYAML(doc),
    validate: (doc) => validateDocument(doc),
  };
}

module.exports = {
  DEFAULT_INFO,
  STATUS_DESCRIPTIONS,
  createBaseDocument,
  generateParameterSchema,
  generateRequestBodySchema,
  generateResponseSchemas,
  generateOperation,
  addRouteToPath,
  collectTags,
  generateOpenAPIDocument,
  serializeToJSON,
  serializeToYAML,
  yamlStringify,
  validateDocument,
  createGenerator,
};
