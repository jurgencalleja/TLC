/**
 * Request Validator
 * Validates request size, content type, JSON depth, and prevents path traversal
 */

export const REQUEST_LIMITS = {
  MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_JSON_DEPTH: 10,
  MAX_QUERY_LENGTH: 2048,
  MAX_HEADER_SIZE: 8192,
  MAX_PARAMS: 100,
};

/**
 * Validate request size against limit
 */
export function validateRequestSize(options) {
  const { contentLength, maxSize = REQUEST_LIMITS.MAX_BODY_SIZE } = options;

  if (contentLength === undefined || contentLength === null) {
    return {
      valid: true,
      warning: 'Content-Length header not provided',
    };
  }

  if (contentLength > maxSize) {
    return {
      valid: false,
      error: `Request size ${contentLength} exceeds maximum allowed size of ${maxSize}`,
    };
  }

  return { valid: true };
}

/**
 * Validate content type against allowed types
 */
export function validateContentType(options) {
  const { contentType, allowedTypes } = options;

  if (!contentType) {
    return {
      valid: false,
      error: 'Content-Type header is required',
    };
  }

  // Extract base content type (without charset, etc.)
  const baseType = contentType.split(';')[0].trim().toLowerCase();

  const isAllowed = allowedTypes.some((allowed) => {
    const allowedLower = allowed.toLowerCase();

    // Handle wildcard types (e.g., image/*)
    if (allowedLower.endsWith('/*')) {
      const prefix = allowedLower.slice(0, -1); // Remove *
      return baseType.startsWith(prefix);
    }

    return baseType === allowedLower;
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `Content-Type '${baseType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate depth of a JSON object/array
 */
function calculateDepth(obj, currentDepth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  currentDepth++;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentDepth;
    return Math.max(...obj.map((item) => calculateDepth(item, currentDepth)));
  }

  const values = Object.values(obj);
  if (values.length === 0) return currentDepth;
  return Math.max(...values.map((value) => calculateDepth(value, currentDepth)));
}

/**
 * Validate JSON depth against limit
 */
export function validateJsonDepth(options) {
  const { json, maxDepth = REQUEST_LIMITS.MAX_JSON_DEPTH } = options;

  const depth = calculateDepth(json);

  if (depth > maxDepth) {
    return {
      valid: false,
      error: `JSON depth ${depth} exceeds maximum allowed depth of ${maxDepth}`,
      depth,
    };
  }

  return { valid: true, depth };
}

/**
 * Validate query string length and parameters
 */
export function validateQueryString(options) {
  const {
    queryString,
    maxLength = REQUEST_LIMITS.MAX_QUERY_LENGTH,
    maxParams = REQUEST_LIMITS.MAX_PARAMS,
    allowDuplicates = true,
  } = options;

  if (!queryString) {
    return { valid: true };
  }

  // Check length
  if (queryString.length > maxLength) {
    return {
      valid: false,
      error: `query string length ${queryString.length} exceeds maximum of ${maxLength}`,
    };
  }

  // Parse parameters
  const params = queryString.split('&').filter((p) => p.length > 0);

  // Check parameter count
  if (params.length > maxParams) {
    return {
      valid: false,
      error: `Query string has ${params.length} parameters, exceeds maximum of ${maxParams}`,
    };
  }

  // Check for duplicates
  if (!allowDuplicates) {
    const names = params.map((p) => p.split('=')[0]);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      return {
        valid: false,
        error: 'Query string contains duplicate parameter names',
      };
    }
  }

  return { valid: true };
}

/**
 * Validate headers size and format
 */
export function validateHeaders(options) {
  const {
    headers,
    maxSize = REQUEST_LIMITS.MAX_HEADER_SIZE,
    maxHeaderSize,
    validateNames = false,
  } = options;

  // Calculate total headers size
  let totalSize = 0;
  for (const [name, value] of Object.entries(headers)) {
    const headerSize = name.length + String(value).length;
    totalSize += headerSize;

    // Check individual header size
    if (maxHeaderSize && headerSize > maxHeaderSize) {
      return {
        valid: false,
        error: `Header '${name}' size ${headerSize} exceeds maximum of ${maxHeaderSize}`,
      };
    }

    // Validate header name format (RFC 7230)
    if (validateNames) {
      const validHeaderName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
      if (!validHeaderName.test(name)) {
        return {
          valid: false,
          error: `Header name '${name}' contains invalid characters`,
        };
      }
    }
  }

  if (totalSize > maxSize) {
    return {
      valid: false,
      error: `Total header size ${totalSize} exceeds maximum of ${maxSize}`,
    };
  }

  return { valid: true };
}

/**
 * Validate path for security issues
 */
export function validatePath(options) {
  const { path, allowedPaths } = options;

  // Decode the path to catch encoded attacks
  let decodedPath;
  try {
    // Double decode to catch double-encoding attacks
    decodedPath = decodeURIComponent(decodeURIComponent(path));
  } catch {
    // If decoding fails, use single decode or original
    try {
      decodedPath = decodeURIComponent(path);
    } catch {
      decodedPath = path;
    }
  }

  // Check for null bytes
  if (path.includes('%00') || path.includes('\0') || decodedPath.includes('\0')) {
    return {
      valid: false,
      error: 'Path contains null byte injection attempt',
    };
  }

  // Check for path traversal
  if (
    decodedPath.includes('..') ||
    decodedPath.includes('..\\') ||
    path.includes('%2e%2e') ||
    path.includes('%252e')
  ) {
    return {
      valid: false,
      error: 'Path contains traversal attempt',
    };
  }

  // Check against allowed paths
  if (allowedPaths && allowedPaths.length > 0) {
    const isAllowed = allowedPaths.some((allowed) => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -1);
        return path.startsWith(prefix);
      }
      return path === allowed || path.startsWith(allowed + '/');
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Path '${path}' is not in allowed paths`,
      };
    }
  }

  return { valid: true };
}

/**
 * Create a request validator instance
 */
export function createRequestValidator(config = {}) {
  const {
    maxBodySize = REQUEST_LIMITS.MAX_BODY_SIZE,
    maxJsonDepth = REQUEST_LIMITS.MAX_JSON_DEPTH,
    allowedContentTypes = ['application/json'],
    allowedPaths,
  } = config;

  return {
    validate(request) {
      const errors = [];

      // Validate size
      const sizeResult = validateRequestSize({
        contentLength: request.contentLength,
        maxSize: maxBodySize,
      });
      if (!sizeResult.valid) {
        errors.push(sizeResult.error);
      }

      // Validate content type
      if (request.contentType) {
        const contentTypeResult = validateContentType({
          contentType: request.contentType,
          allowedTypes: allowedContentTypes,
        });
        if (!contentTypeResult.valid) {
          errors.push(contentTypeResult.error);
        }
      }

      // Validate path
      if (request.path) {
        const pathResult = validatePath({
          path: request.path,
          allowedPaths,
        });
        if (!pathResult.valid) {
          errors.push(pathResult.error);
        }
      }

      // Validate JSON depth
      if (request.body && typeof request.body === 'object') {
        const jsonResult = validateJsonDepth({
          json: request.body,
          maxDepth: maxJsonDepth,
        });
        if (!jsonResult.valid) {
          errors.push(jsonResult.error);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    validateSize(options) {
      return validateRequestSize({ ...options, maxSize: maxBodySize });
    },

    validateContentType(options) {
      return validateContentType({ ...options, allowedTypes: allowedContentTypes });
    },

    validateJson(json) {
      return validateJsonDepth({ json, maxDepth: maxJsonDepth });
    },

    validatePath(path) {
      return validatePath({ path, allowedPaths });
    },
  };
}
