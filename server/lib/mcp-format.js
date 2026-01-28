/**
 * MCP Format Module
 * Generates AI-agent-friendly API documentation for MCP tool use
 */

/**
 * Convert OpenAPI type to MCP/JSON Schema type
 * @param {Object} schema - OpenAPI schema
 * @returns {Object} MCP-compatible schema
 */
function convertToMcpSchema(schema) {
  if (!schema) return { type: 'string' };

  const result = { type: schema.type || 'string' };

  if (schema.format) {
    result.format = schema.format;
  }

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.enum) {
    result.enum = schema.enum;
  }

  if (schema.default !== undefined) {
    result.default = schema.default;
  }

  if (schema.type === 'object' && schema.properties) {
    result.properties = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      result.properties[key] = convertToMcpSchema(prop);
    }
    if (schema.required) {
      result.required = schema.required;
    }
  }

  if (schema.type === 'array' && schema.items) {
    result.items = convertToMcpSchema(schema.items);
  }

  return result;
}

/**
 * Generate MCP tool name from operation
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {string} operationId - Operation ID if available
 * @returns {string} MCP tool name
 */
function generateToolName(method, path, operationId = null) {
  if (operationId) {
    // Convert camelCase to snake_case
    return operationId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  // Generate from method and path
  const cleanPath = path
    .replace(/[{}:]/g, '')
    .split('/')
    .filter(Boolean)
    .join('_');

  return `${method.toLowerCase()}_${cleanPath}`;
}

/**
 * Generate MCP tool description
 * @param {Object} operation - OpenAPI operation
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @returns {string} Tool description
 */
function generateToolDescription(operation, method, path) {
  if (operation.summary) {
    return operation.summary;
  }

  if (operation.description) {
    // Take first sentence
    const firstSentence = operation.description.split('.')[0];
    return firstSentence.length > 100
      ? firstSentence.slice(0, 97) + '...'
      : firstSentence;
  }

  return `${method.toUpperCase()} ${path}`;
}

/**
 * Extract input schema from operation parameters and request body
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} MCP input schema
 */
function extractInputSchema(operation) {
  const properties = {};
  const required = [];

  // Path and query parameters
  if (operation.parameters) {
    for (const param of operation.parameters) {
      const paramSchema = convertToMcpSchema(param.schema || { type: 'string' });
      paramSchema.description = param.description || `${param.name} parameter`;

      if (param.in === 'path') {
        paramSchema._in = 'path';
      } else if (param.in === 'query') {
        paramSchema._in = 'query';
      } else if (param.in === 'header') {
        paramSchema._in = 'header';
      }

      properties[param.name] = paramSchema;

      if (param.required) {
        required.push(param.name);
      }
    }
  }

  // Request body
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    const jsonContent = content?.['application/json'];

    if (jsonContent?.schema) {
      const bodySchema = jsonContent.schema;

      if (bodySchema.properties) {
        for (const [key, prop] of Object.entries(bodySchema.properties)) {
          properties[key] = convertToMcpSchema(prop);
          properties[key]._in = 'body';
        }

        if (bodySchema.required) {
          required.push(...bodySchema.required);
        }
      } else {
        // Entire body as single parameter
        properties.body = convertToMcpSchema(bodySchema);
        properties.body._in = 'body';
        if (operation.requestBody.required) {
          required.push('body');
        }
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Extract output schema from operation responses
 * @param {Object} operation - OpenAPI operation
 * @returns {Object} MCP output schema
 */
function extractOutputSchema(operation) {
  if (!operation.responses) {
    return { type: 'object' };
  }

  // Prefer 200/201 response
  const successResponse = operation.responses['200'] || operation.responses['201'];

  if (successResponse?.content?.['application/json']?.schema) {
    return convertToMcpSchema(successResponse.content['application/json'].schema);
  }

  return { type: 'object' };
}

/**
 * Convert OpenAPI operation to MCP tool definition
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @param {Object} operation - OpenAPI operation
 * @param {Object} options - Conversion options
 * @returns {Object} MCP tool definition
 */
function operationToMcpTool(path, method, operation, options = {}) {
  const { baseUrl = 'http://localhost:3000' } = options;

  return {
    name: generateToolName(method, path, operation.operationId),
    description: generateToolDescription(operation, method, path),
    inputSchema: extractInputSchema(operation),
    outputSchema: extractOutputSchema(operation),
    // Execution hints
    _meta: {
      method: method.toUpperCase(),
      path,
      url: `${baseUrl}${path}`,
      tags: operation.tags || [],
      security: operation.security || [],
    },
  };
}

/**
 * Convert OpenAPI spec to MCP tools list
 * @param {Object} spec - OpenAPI specification
 * @param {Object} options - Conversion options
 * @returns {Array} Array of MCP tool definitions
 */
function specToMcpTools(spec, options = {}) {
  const tools = [];

  if (!spec.paths) {
    return tools;
  }

  const baseUrl = spec.servers?.[0]?.url || options.baseUrl || 'http://localhost:3000';

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      // Skip non-operation properties
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        continue;
      }

      tools.push(operationToMcpTool(path, method, operation, { ...options, baseUrl }));
    }
  }

  return tools;
}

/**
 * Generate MCP server manifest
 * @param {Object} spec - OpenAPI specification
 * @param {Object} options - Manifest options
 * @returns {Object} MCP server manifest
 */
function generateMcpManifest(spec, options = {}) {
  const {
    name = 'api-tools',
    version = '1.0.0',
    description = 'Auto-generated API tools',
  } = options;

  const tools = specToMcpTools(spec, options);

  return {
    name,
    version,
    description: spec.info?.description || description,
    tools,
    // Server capabilities
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
  };
}

/**
 * Generate tool invocation example
 * @param {Object} tool - MCP tool definition
 * @returns {Object} Example invocation
 */
function generateToolExample(tool) {
  const args = {};

  if (tool.inputSchema.properties) {
    for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
      if (tool.inputSchema.required?.includes(key)) {
        args[key] = getExampleValue(schema, key);
      }
    }
  }

  return {
    tool: tool.name,
    arguments: args,
  };
}

/**
 * Get example value for schema
 * @param {Object} schema - JSON Schema
 * @param {string} name - Field name
 * @returns {any} Example value
 */
function getExampleValue(schema, name = '') {
  if (schema.default !== undefined) {
    return schema.default;
  }

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  const nameLower = name.toLowerCase();

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (schema.format === 'date') return '2024-01-15';
      if (schema.format === 'date-time') return '2024-01-15T09:30:00Z';
      if (nameLower.includes('id')) return '123';
      if (nameLower.includes('name')) return 'Example';
      return 'string';
    case 'integer':
    case 'number':
      if (nameLower.includes('id')) return 1;
      return 42;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

/**
 * Format tools for display
 * @param {Array} tools - MCP tools
 * @returns {string} Formatted tools list
 */
function formatToolsList(tools) {
  const lines = [];

  for (const tool of tools) {
    lines.push(`## ${tool.name}`);
    lines.push('');
    lines.push(tool.description);
    lines.push('');
    lines.push(`**Endpoint:** ${tool._meta.method} ${tool._meta.path}`);
    lines.push('');

    if (tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0) {
      lines.push('**Parameters:**');
      for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
        const required = tool.inputSchema.required?.includes(key) ? ' (required)' : '';
        const location = schema._in ? ` [${schema._in}]` : '';
        lines.push(`- \`${key}\`${required}${location}: ${schema.type}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create MCP format generator
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createMcpFormatGenerator(options = {}) {
  return {
    convertSchema: convertToMcpSchema,
    generateToolName,
    generateToolDescription,
    extractInputSchema,
    extractOutputSchema,
    operationToTool: (path, method, op) => operationToMcpTool(path, method, op, options),
    specToTools: (spec) => specToMcpTools(spec, options),
    generateManifest: (spec, opts) => generateMcpManifest(spec, { ...options, ...opts }),
    generateExample: generateToolExample,
    formatTools: formatToolsList,
  };
}

module.exports = {
  convertToMcpSchema,
  generateToolName,
  generateToolDescription,
  extractInputSchema,
  extractOutputSchema,
  operationToMcpTool,
  specToMcpTools,
  generateMcpManifest,
  generateToolExample,
  getExampleValue,
  formatToolsList,
  createMcpFormatGenerator,
};
