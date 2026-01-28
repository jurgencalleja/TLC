/**
 * Spec Merger Module
 * Merges existing OpenAPI specs with auto-detected routes
 */

const fs = require('fs');
const path = require('path');
const { normalizePathToOpenAPI } = require('./route-detector.js');
const { generateOperation } = require('./openapi-generator.js');

/**
 * Known OpenAPI spec file names
 */
const SPEC_FILE_NAMES = [
  'swagger.json',
  'swagger.yaml',
  'swagger.yml',
  'openapi.json',
  'openapi.yaml',
  'openapi.yml',
  'api.json',
  'api.yaml',
  'api.yml',
];

/**
 * Common directories where specs might live
 */
const SPEC_DIRECTORIES = [
  '.',
  'docs',
  'api',
  'spec',
  'specs',
  'swagger',
  'openapi',
];

/**
 * Find existing OpenAPI spec files in a directory
 * @param {string} baseDir - Base directory to search
 * @returns {Array} Found spec file paths
 */
function findSpecFiles(baseDir) {
  const found = [];

  for (const dir of SPEC_DIRECTORIES) {
    const fullDir = path.join(baseDir, dir);

    if (!fs.existsSync(fullDir)) {
      continue;
    }

    for (const filename of SPEC_FILE_NAMES) {
      const filePath = path.join(fullDir, filename);
      if (fs.existsSync(filePath)) {
        found.push(filePath);
      }
    }
  }

  return found;
}

/**
 * Parse YAML content (simple parser, no deps)
 * @param {string} content - YAML content
 * @returns {Object|null} Parsed object or null
 */
function parseYAML(content) {
  try {
    // Very basic YAML parsing for common OpenAPI patterns
    // For full YAML support, users should use JSON format
    const lines = content.split('\n');
    const result = {};
    const stack = [{ obj: result, indent: -1 }];

    for (let line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      // Array item
      if (trimmed.startsWith('- ')) {
        const value = trimmed.slice(2).trim();
        // Find appropriate array context
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        const current = stack[stack.length - 1].obj;
        if (Array.isArray(current)) {
          if (value.includes(':')) {
            const obj = {};
            current.push(obj);
            const [key, val] = parseKeyValue(value);
            obj[key] = parseValue(val);
          } else {
            current.push(parseValue(value));
          }
        }
        continue;
      }

      // Key-value pair
      if (trimmed.includes(':')) {
        const [key, value] = parseKeyValue(trimmed);

        // Pop stack to find parent
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }

        const current = stack[stack.length - 1].obj;

        if (value === '' || value === null) {
          // New object or array
          const nextLine = lines[lines.indexOf(line) + 1];
          if (nextLine && nextLine.trim().startsWith('-')) {
            current[key] = [];
            stack.push({ obj: current[key], indent });
          } else {
            current[key] = {};
            stack.push({ obj: current[key], indent });
          }
        } else {
          current[key] = parseValue(value);
        }
      }
    }

    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Parse a key-value pair from YAML line
 * @param {string} line - YAML line
 * @returns {Array} [key, value]
 */
function parseKeyValue(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return [line.trim(), null];
  }
  const key = line.slice(0, colonIndex).trim();
  const value = line.slice(colonIndex + 1).trim();
  return [key, value === '' ? null : value];
}

/**
 * Parse a YAML value
 * @param {string} value - Raw value string
 * @returns {any} Parsed value
 */
function parseValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Null
  if (value.toLowerCase() === 'null') return null;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * Load and parse spec file
 * @param {string} filePath - Path to spec file
 * @returns {Object|null} Parsed spec or null
 */
function loadSpec(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      return JSON.parse(content);
    }

    if (ext === '.yaml' || ext === '.yml') {
      return parseYAML(content);
    }

    // Try JSON first, then YAML
    try {
      return JSON.parse(content);
    } catch {
      return parseYAML(content);
    }
  } catch (error) {
    return null;
  }
}

/**
 * Check if spec is valid OpenAPI 3.x
 * @param {Object} spec - Spec object
 * @returns {boolean} True if valid OpenAPI 3.x
 */
function isOpenAPI3(spec) {
  if (!spec || typeof spec !== 'object') return false;
  return typeof spec.openapi === 'string' && spec.openapi.startsWith('3.');
}

/**
 * Check if spec is Swagger 2.x
 * @param {Object} spec - Spec object
 * @returns {boolean} True if Swagger 2.x
 */
function isSwagger2(spec) {
  if (!spec || typeof spec !== 'object') return false;
  return spec.swagger === '2.0';
}

/**
 * Get routes from existing spec
 * @param {Object} spec - OpenAPI spec
 * @returns {Set} Set of "METHOD:path" strings
 */
function getExistingRoutes(spec) {
  const routes = new Set();

  if (!spec || !spec.paths) {
    return routes;
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of Object.keys(methods)) {
      // Skip non-HTTP methods (like parameters, $ref)
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method.toLowerCase())) {
        routes.add(`${method.toUpperCase()}:${path}`);
      }
    }
  }

  return routes;
}

/**
 * Filter detected routes to only new ones
 * @param {Array} detectedRoutes - Routes from detection
 * @param {Set} existingRoutes - Routes from existing spec
 * @returns {Array} Only new routes
 */
function filterNewRoutes(detectedRoutes, existingRoutes) {
  return detectedRoutes.filter(route => {
    // Normalize path for comparison
    const normalizedPath = route.path.replace(/:([\w]+)/g, '{$1}');
    const key = `${route.method}:${normalizedPath}`;
    return !existingRoutes.has(key);
  });
}

/**
 * Merge detected routes into existing spec
 * @param {Object} existingSpec - Existing OpenAPI spec
 * @param {Array} newRoutes - New routes to add
 * @param {Object} options - Merge options
 * @returns {Object} Merged spec
 */
function mergeIntoSpec(existingSpec, newRoutes, options = {}) {
  // Deep clone the existing spec
  const merged = JSON.parse(JSON.stringify(existingSpec));

  // Ensure paths object exists
  if (!merged.paths) {
    merged.paths = {};
  }

  // Add new routes
  for (const route of newRoutes) {
    const path = normalizePathToOpenAPI(route.path);
    const method = route.method.toLowerCase();

    if (!merged.paths[path]) {
      merged.paths[path] = {};
    }

    // Only add if not already present
    if (!merged.paths[path][method]) {
      merged.paths[path][method] = generateOperation(route, options);

      // Mark as auto-detected
      merged.paths[path][method]['x-auto-detected'] = true;
      merged.paths[path][method]['x-detected-from'] = route.file || 'unknown';
    }
  }

  // Update tags if needed
  if (options.updateTags !== false) {
    const existingTags = new Set((merged.tags || []).map(t => t.name));
    for (const route of newRoutes) {
      const tags = route.tags || [route.path.split('/').filter(Boolean)[0] || 'default'];
      for (const tag of tags) {
        if (!existingTags.has(tag)) {
          existingTags.add(tag);
          if (!merged.tags) merged.tags = [];
          merged.tags.push({
            name: tag,
            description: `Auto-detected: ${tag}`,
          });
        }
      }
    }
  }

  return merged;
}

/**
 * Create merge report
 * @param {Object} existingSpec - Original spec
 * @param {Array} detectedRoutes - All detected routes
 * @param {Array} newRoutes - Routes that were added
 * @returns {Object} Merge report
 */
function createMergeReport(existingSpec, detectedRoutes, newRoutes) {
  const existingRoutes = getExistingRoutes(existingSpec);

  return {
    existingRouteCount: existingRoutes.size,
    detectedRouteCount: detectedRoutes.length,
    newRouteCount: newRoutes.length,
    skippedRouteCount: detectedRoutes.length - newRoutes.length,
    newRoutes: newRoutes.map(r => ({
      method: r.method,
      path: r.path,
      file: r.file,
    })),
    existingPaths: Object.keys(existingSpec.paths || {}),
  };
}

/**
 * Create spec merger instance
 * @param {string} baseDir - Base directory to search for specs
 * @returns {Object} Merger instance
 */
function createSpecMerger(baseDir) {
  return {
    findSpecs: () => findSpecFiles(baseDir),
    loadSpec: (filePath) => loadSpec(filePath),
    isOpenAPI3,
    isSwagger2,
    getExistingRoutes,
    filterNewRoutes,
    merge: (spec, routes, options) => mergeIntoSpec(spec, routes, options),
    createReport: (spec, detected, added) => createMergeReport(spec, detected, added),
  };
}

module.exports = {
  SPEC_FILE_NAMES,
  SPEC_DIRECTORIES,
  findSpecFiles,
  parseYAML,
  parseKeyValue,
  parseValue,
  loadSpec,
  isOpenAPI3,
  isSwagger2,
  getExistingRoutes,
  filterNewRoutes,
  mergeIntoSpec,
  createMergeReport,
  createSpecMerger,
};
