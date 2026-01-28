/**
 * Docs Generator Module
 * Orchestrates API documentation generation from multiple sources
 */

const fs = require('fs');
const path = require('path');

const { extractRoutes, mergeRoutes } = require('./route-detector.js');
const { generateOpenAPIDocument, serializeToJSON, serializeToYAML, validateDocument } = require('./openapi-generator.js');
const { findSpecFiles, loadSpec, isOpenAPI3, filterNewRoutes, mergeIntoSpec, createMergeReport } = require('./spec-merger.js');
const { parseSchema, generateOpenAPISchemas } = require('./orm-schema-parser.js');
const { createExampleGenerator } = require('./example-generator.js');

/**
 * Default file patterns to scan for routes
 */
const ROUTE_FILE_PATTERNS = [
  '**/routes/**/*.{js,ts}',
  '**/api/**/*.{js,ts}',
  '**/controllers/**/*.{js,ts}',
  '**/*.routes.{js,ts}',
  '**/*.controller.{js,ts}',
  'server.{js,ts}',
  'app.{js,ts}',
  'index.{js,ts}',
];

/**
 * Default file patterns for ORM schemas
 */
const SCHEMA_FILE_PATTERNS = [
  '**/schema/**/*.{js,ts}',
  '**/models/**/*.{js,ts}',
  '**/entities/**/*.{js,ts}',
  '**/*.schema.{js,ts}',
  '**/*.model.{js,ts}',
  '**/*.entity.{js,ts}',
  '**/schema.prisma',
  '**/prisma/schema.prisma',
];

/**
 * Scan directory for route files
 * @param {string} baseDir - Base directory
 * @param {Function} globFn - Glob function to use
 * @returns {Array} Found file paths
 */
async function findRouteFiles(baseDir, globFn) {
  const files = new Set();

  for (const pattern of ROUTE_FILE_PATTERNS) {
    const matches = await globFn(pattern, { cwd: baseDir, ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
    for (const match of matches) {
      files.add(path.join(baseDir, match));
    }
  }

  return Array.from(files);
}

/**
 * Scan directory for schema files
 * @param {string} baseDir - Base directory
 * @param {Function} globFn - Glob function to use
 * @returns {Array} Found file paths
 */
async function findSchemaFiles(baseDir, globFn) {
  const files = new Set();

  for (const pattern of SCHEMA_FILE_PATTERNS) {
    const matches = await globFn(pattern, { cwd: baseDir, ignore: ['**/node_modules/**', '**/dist/**'] });
    for (const match of matches) {
      files.add(path.join(baseDir, match));
    }
  }

  return Array.from(files);
}

/**
 * Extract routes from multiple files
 * @param {Array} files - File paths
 * @returns {Array} All routes
 */
function extractRoutesFromFiles(files) {
  const routeArrays = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const routes = extractRoutes(content, file);
      if (routes.length > 0) {
        routeArrays.push(routes);
      }
    } catch (error) {
      // Skip unreadable files
    }
  }

  return mergeRoutes(routeArrays);
}

/**
 * Extract schemas from multiple files
 * @param {Array} files - File paths
 * @returns {Object} Parsed schemas
 */
function extractSchemasFromFiles(files) {
  const allModels = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const result = parseSchema(content, file);
      if (result.models.length > 0) {
        allModels.push(...result.models);
      }
    } catch (error) {
      // Skip unreadable files
    }
  }

  return {
    models: allModels,
    schemas: generateOpenAPISchemas(allModels),
  };
}

/**
 * Generate documentation
 * @param {Object} options - Generation options
 * @returns {Object} Generated documentation
 */
async function generateDocs(options = {}) {
  const {
    baseDir = process.cwd(),
    globFn = async () => [],
    info = {},
    servers = [],
    baseUrl = 'http://localhost:3000',
  } = options;

  const result = {
    spec: null,
    examples: {},
    report: {
      routeFiles: 0,
      schemaFiles: 0,
      existingSpec: null,
      totalRoutes: 0,
      newRoutes: 0,
      schemas: 0,
    },
    validation: null,
  };

  // Find existing spec
  const existingSpecFiles = findSpecFiles(baseDir);
  let existingSpec = null;

  if (existingSpecFiles.length > 0) {
    existingSpec = loadSpec(existingSpecFiles[0]);
    result.report.existingSpec = existingSpecFiles[0];
  }

  // Find and extract routes
  const routeFiles = await findRouteFiles(baseDir, globFn);
  result.report.routeFiles = routeFiles.length;

  const detectedRoutes = extractRoutesFromFiles(routeFiles);
  result.report.totalRoutes = detectedRoutes.length;

  // Find and extract schemas
  const schemaFiles = await findSchemaFiles(baseDir, globFn);
  result.report.schemaFiles = schemaFiles.length;

  const { models, schemas } = extractSchemasFromFiles(schemaFiles);
  result.report.schemas = models.length;

  // Generate or merge spec
  if (existingSpec && isOpenAPI3(existingSpec)) {
    // Merge new routes into existing spec
    const existingRoutes = new Set(
      Object.entries(existingSpec.paths || {}).flatMap(([path, methods]) =>
        Object.keys(methods)
          .filter(m => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
          .map(m => `${m.toUpperCase()}:${path}`)
      )
    );

    const newRoutes = filterNewRoutes(detectedRoutes, existingRoutes);
    result.report.newRoutes = newRoutes.length;

    result.spec = mergeIntoSpec(existingSpec, newRoutes, { updateTags: true });

    // Add schemas to components
    if (Object.keys(schemas).length > 0) {
      result.spec.components = result.spec.components || {};
      result.spec.components.schemas = {
        ...(result.spec.components.schemas || {}),
        ...schemas,
      };
    }
  } else {
    // Generate new spec
    result.spec = generateOpenAPIDocument(detectedRoutes, {
      info: { title: 'API Documentation', version: '1.0.0', ...info },
      servers: servers.length > 0 ? servers : [{ url: baseUrl }],
    });
    result.report.newRoutes = detectedRoutes.length;

    // Add schemas
    if (Object.keys(schemas).length > 0) {
      result.spec.components.schemas = schemas;
    }
  }

  // Generate examples
  const exampleGenerator = createExampleGenerator({ baseUrl });
  for (const [path, methods] of Object.entries(result.spec.paths)) {
    result.examples[path] = {};
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        result.examples[path][method] = exampleGenerator.generateOperationExamples(
          path, method, operation
        );
      }
    }
  }

  // Validate
  result.validation = validateDocument(result.spec);

  return result;
}

/**
 * Write documentation files
 * @param {Object} docs - Generated documentation
 * @param {string} outputDir - Output directory
 * @param {Object} options - Write options
 */
function writeDocs(docs, outputDir, options = {}) {
  const { format = 'both' } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write OpenAPI spec
  if (format === 'json' || format === 'both') {
    const jsonPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(jsonPath, serializeToJSON(docs.spec));
  }

  if (format === 'yaml' || format === 'both') {
    const yamlPath = path.join(outputDir, 'openapi.yaml');
    fs.writeFileSync(yamlPath, serializeToYAML(docs.spec));
  }

  // Write examples
  const examplesPath = path.join(outputDir, 'examples.json');
  fs.writeFileSync(examplesPath, JSON.stringify(docs.examples, null, 2));

  // Write report
  const reportPath = path.join(outputDir, 'docs-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated: new Date().toISOString(),
    ...docs.report,
    validation: docs.validation,
  }, null, 2));

  return {
    files: [
      format !== 'yaml' ? path.join(outputDir, 'openapi.json') : null,
      format !== 'json' ? path.join(outputDir, 'openapi.yaml') : null,
      examplesPath,
      reportPath,
    ].filter(Boolean),
  };
}

/**
 * Create docs generator instance
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createDocsGenerator(options = {}) {
  return {
    generate: (opts) => generateDocs({ ...options, ...opts }),
    write: (docs, outputDir, opts) => writeDocs(docs, outputDir, opts),
    findRouteFiles: (dir, globFn) => findRouteFiles(dir, globFn),
    findSchemaFiles: (dir, globFn) => findSchemaFiles(dir, globFn),
    extractRoutes: extractRoutesFromFiles,
    extractSchemas: extractSchemasFromFiles,
  };
}

module.exports = {
  ROUTE_FILE_PATTERNS,
  SCHEMA_FILE_PATTERNS,
  findRouteFiles,
  findSchemaFiles,
  extractRoutesFromFiles,
  extractSchemasFromFiles,
  generateDocs,
  writeDocs,
  createDocsGenerator,
};
