/**
 * Example Generator Module
 * Generates curl examples and sample request/response payloads
 */

/**
 * Sample values by type
 */
const SAMPLE_VALUES = {
  string: 'example_string',
  integer: 42,
  number: 3.14,
  boolean: true,
  array: [],
  object: {},
  // Specific formats
  email: 'user@example.com',
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  date: '2024-01-15',
  'date-time': '2024-01-15T09:30:00Z',
  time: '09:30:00',
  uri: 'https://example.com/resource',
  url: 'https://example.com/resource',
  hostname: 'api.example.com',
  ipv4: '192.168.1.1',
  ipv6: '::1',
  password: '********',
};

/**
 * Get sample value for a schema
 * @param {Object} schema - JSON Schema
 * @param {string} fieldName - Field name for context
 * @returns {any} Sample value
 */
function getSampleValue(schema, fieldName = '') {
  // Handle format first
  if (schema.format && SAMPLE_VALUES[schema.format]) {
    return SAMPLE_VALUES[schema.format];
  }

  // Handle common field names
  const nameLower = fieldName.toLowerCase();
  if (nameLower.includes('email')) return SAMPLE_VALUES.email;
  if (nameLower.includes('password')) return SAMPLE_VALUES.password;
  if (nameLower.includes('id') && !nameLower.includes('valid')) {
    return schema.type === 'string' ? SAMPLE_VALUES.uuid : 1;
  }
  if (nameLower.includes('name')) return 'John Doe';
  if (nameLower.includes('url') || nameLower.includes('link')) return SAMPLE_VALUES.uri;
  if (nameLower.includes('date') || nameLower.includes('time')) {
    return schema.type === 'string' ? SAMPLE_VALUES['date-time'] : Date.now();
  }
  if (nameLower.includes('count') || nameLower.includes('total') || nameLower.includes('amount')) {
    return 10;
  }
  if (nameLower.includes('price') || nameLower.includes('cost')) return 99.99;
  if (nameLower.includes('active') || nameLower.includes('enabled') || nameLower.includes('is_')) {
    return true;
  }

  // Handle by type
  switch (schema.type) {
    case 'string':
      return SAMPLE_VALUES.string;
    case 'integer':
    case 'number':
      return SAMPLE_VALUES[schema.type];
    case 'boolean':
      return true;
    case 'array':
      if (schema.items) {
        return [getSampleValue(schema.items)];
      }
      return [];
    case 'object':
      return generateSampleObject(schema);
    default:
      return null;
  }
}

/**
 * Generate sample object from schema
 * @param {Object} schema - JSON Schema object
 * @returns {Object} Sample object
 */
function generateSampleObject(schema) {
  if (!schema.properties) {
    return {};
  }

  const sample = {};

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    sample[key] = getSampleValue(propSchema, key);
  }

  return sample;
}

/**
 * Generate sample request body
 * @param {Object} operation - OpenAPI operation
 * @returns {Object|null} Sample request body
 */
function generateRequestExample(operation) {
  if (!operation.requestBody) {
    return null;
  }

  const content = operation.requestBody.content;
  if (!content) {
    return null;
  }

  // Prefer JSON
  const jsonContent = content['application/json'];
  if (jsonContent && jsonContent.schema) {
    return generateSampleObject(jsonContent.schema);
  }

  // Fallback to first content type
  const firstType = Object.keys(content)[0];
  if (firstType && content[firstType].schema) {
    return generateSampleObject(content[firstType].schema);
  }

  return null;
}

/**
 * Generate sample response
 * @param {Object} operation - OpenAPI operation
 * @param {string} statusCode - Status code to generate for
 * @returns {Object|null} Sample response
 */
function generateResponseExample(operation, statusCode = '200') {
  if (!operation.responses) {
    return null;
  }

  const response = operation.responses[statusCode];
  if (!response || !response.content) {
    // Generate generic response based on status
    return generateGenericResponse(statusCode);
  }

  const jsonContent = response.content['application/json'];
  if (jsonContent && jsonContent.schema) {
    return generateSampleObject(jsonContent.schema);
  }

  return generateGenericResponse(statusCode);
}

/**
 * Generate generic response for status code
 * @param {string} statusCode - HTTP status code
 * @returns {Object} Generic response
 */
function generateGenericResponse(statusCode) {
  const code = parseInt(statusCode, 10);

  if (code >= 200 && code < 300) {
    return { success: true, data: {} };
  }

  if (code >= 400 && code < 500) {
    return {
      error: {
        code: statusCode,
        message: getErrorMessage(statusCode),
      },
    };
  }

  if (code >= 500) {
    return {
      error: {
        code: statusCode,
        message: 'Internal server error',
      },
    };
  }

  return { status: statusCode };
}

/**
 * Get error message for status code
 * @param {string} statusCode - HTTP status code
 * @returns {string} Error message
 */
function getErrorMessage(statusCode) {
  const messages = {
    '400': 'Bad request - invalid input',
    '401': 'Unauthorized - authentication required',
    '403': 'Forbidden - insufficient permissions',
    '404': 'Resource not found',
    '409': 'Conflict - resource already exists',
    '422': 'Unprocessable entity - validation failed',
    '429': 'Too many requests - rate limit exceeded',
  };

  return messages[statusCode] || 'Request failed';
}

/**
 * Generate curl command for operation
 * @param {Object} options - Curl generation options
 * @returns {string} Curl command
 */
function generateCurlCommand(options) {
  const {
    method,
    url,
    headers = {},
    body = null,
    queryParams = {},
    pathParams = {},
    auth = null,
  } = options;

  const parts = ['curl'];

  // Method
  if (method !== 'GET') {
    parts.push(`-X ${method}`);
  }

  // Build URL with path params substituted
  let fullUrl = url;
  for (const [key, value] of Object.entries(pathParams)) {
    fullUrl = fullUrl.replace(`{${key}}`, value);
  }

  // Add query params
  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  if (queryString) {
    fullUrl += `?${queryString}`;
  }

  // Headers
  const allHeaders = { ...headers };

  // Auth header
  if (auth) {
    if (auth.type === 'bearer') {
      allHeaders['Authorization'] = `Bearer ${auth.token || '<token>'}`;
    } else if (auth.type === 'basic') {
      allHeaders['Authorization'] = `Basic ${auth.credentials || '<base64-credentials>'}`;
    } else if (auth.type === 'apiKey') {
      if (auth.in === 'header') {
        allHeaders[auth.name] = auth.value || '<api-key>';
      }
    }
  }

  // Add Content-Type for body
  if (body && !allHeaders['Content-Type']) {
    allHeaders['Content-Type'] = 'application/json';
  }

  // Format headers
  for (const [key, value] of Object.entries(allHeaders)) {
    parts.push(`-H '${key}: ${value}'`);
  }

  // Body
  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    parts.push(`-d '${bodyStr}'`);
  }

  // URL (quoted to handle special chars)
  parts.push(`'${fullUrl}'`);

  return parts.join(' \\\n  ');
}

/**
 * Generate curl example from OpenAPI operation
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @param {Object} operation - OpenAPI operation
 * @param {string} baseUrl - Base URL
 * @returns {string} Curl command
 */
function generateCurlFromOperation(path, method, operation, baseUrl = 'http://localhost:3000') {
  const options = {
    method: method.toUpperCase(),
    url: `${baseUrl}${path}`,
    headers: {},
    pathParams: {},
    queryParams: {},
  };

  // Generate path params
  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (param.in === 'path') {
        options.pathParams[param.name] = getSampleValue(param.schema || { type: 'string' }, param.name);
      } else if (param.in === 'query') {
        options.queryParams[param.name] = getSampleValue(param.schema || { type: 'string' }, param.name);
      } else if (param.in === 'header') {
        options.headers[param.name] = getSampleValue(param.schema || { type: 'string' }, param.name);
      }
    }
  }

  // Generate request body
  if (operation.requestBody) {
    options.body = generateRequestExample(operation);
  }

  // Handle security
  if (operation.security && operation.security.length > 0) {
    const secScheme = Object.keys(operation.security[0])[0];
    if (secScheme) {
      if (secScheme.toLowerCase().includes('bearer') || secScheme.toLowerCase().includes('jwt')) {
        options.auth = { type: 'bearer' };
      } else if (secScheme.toLowerCase().includes('basic')) {
        options.auth = { type: 'basic' };
      } else {
        options.auth = { type: 'apiKey', name: 'X-API-Key', in: 'header' };
      }
    }
  }

  return generateCurlCommand(options);
}

/**
 * Generate all examples for an operation
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @param {Object} operation - OpenAPI operation
 * @param {Object} options - Generation options
 * @returns {Object} Generated examples
 */
function generateOperationExamples(path, method, operation, options = {}) {
  const { baseUrl = 'http://localhost:3000' } = options;

  const examples = {
    curl: generateCurlFromOperation(path, method, operation, baseUrl),
    request: null,
    responses: {},
  };

  // Request body example
  if (operation.requestBody) {
    examples.request = generateRequestExample(operation);
  }

  // Response examples
  if (operation.responses) {
    for (const statusCode of Object.keys(operation.responses)) {
      examples.responses[statusCode] = generateResponseExample(operation, statusCode);
    }
  }

  return examples;
}

/**
 * Create example generator instance
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createExampleGenerator(options = {}) {
  const { baseUrl = 'http://localhost:3000' } = options;

  return {
    getSampleValue,
    generateSampleObject,
    generateRequestExample,
    generateResponseExample,
    generateCurlCommand,
    generateCurlFromOperation: (path, method, op) =>
      generateCurlFromOperation(path, method, op, baseUrl),
    generateOperationExamples: (path, method, op) =>
      generateOperationExamples(path, method, op, { baseUrl }),
  };
}

module.exports = {
  SAMPLE_VALUES,
  getSampleValue,
  generateSampleObject,
  generateRequestExample,
  generateResponseExample,
  generateGenericResponse,
  getErrorMessage,
  generateCurlCommand,
  generateCurlFromOperation,
  generateOperationExamples,
  createExampleGenerator,
};
