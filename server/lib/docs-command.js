/**
 * Docs Command Module
 * CLI command handler for /tlc:docs
 */

const fs = require('fs');
const path = require('path');
const { createDocsGenerator } = require('./docs-generator.js');

/**
 * Default output directory
 */
const DEFAULT_OUTPUT_DIR = 'docs/api';

/**
 * Simple glob implementation (no external deps)
 * @param {string} pattern - Glob pattern
 * @param {Object} options - Options
 * @returns {Promise<Array>} Matching files
 */
async function simpleGlob(pattern, options = {}) {
  const { cwd = process.cwd(), ignore = [] } = options;
  const results = [];

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\{([^}]+)\}/g, (_, group) => `(${group.split(',').join('|')})`);

  const regex = new RegExp(`^${regexPattern}$`);

  function walkDir(dir, baseDir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        // Check ignore patterns
        const shouldIgnore = ignore.some(ig => {
          if (ig.includes('**')) {
            return relativePath.includes(ig.replace(/\*\*/g, ''));
          }
          return relativePath.includes(ig);
        });

        if (shouldIgnore) continue;

        if (entry.isDirectory()) {
          walkDir(fullPath, baseDir);
        } else if (regex.test(relativePath)) {
          results.push(relativePath);
        }
      }
    } catch (error) {
      // Skip unreadable directories
    }
  }

  walkDir(cwd, cwd);
  return results;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Run docs generation command
 * @param {Object} options - Command options
 * @returns {Object} Command result
 */
async function runDocsCommand(options = {}) {
  const {
    baseDir = process.cwd(),
    outputDir = DEFAULT_OUTPUT_DIR,
    format = 'both',
    title = null,
    version = null,
    baseUrl = 'http://localhost:3000',
    verbose = false,
  } = options;

  const result = {
    success: false,
    message: '',
    files: [],
    report: null,
    errors: [],
  };

  try {
    // Create generator
    const generator = createDocsGenerator({ baseDir, baseUrl });

    // Generate docs
    const info = {};
    if (title) info.title = title;
    if (version) info.version = version;

    const docs = await generator.generate({
      baseDir,
      globFn: simpleGlob,
      info,
      baseUrl,
    });

    // Check validation
    if (!docs.validation.valid) {
      result.errors = docs.validation.errors;
      if (verbose) {
        console.warn('Validation warnings:', docs.validation.warnings);
      }
    }

    // Write output
    const fullOutputDir = path.isAbsolute(outputDir)
      ? outputDir
      : path.join(baseDir, outputDir);

    const writeResult = generator.write(docs, fullOutputDir, { format });

    result.success = true;
    result.files = writeResult.files;
    result.report = docs.report;

    // Build summary message
    const parts = [];
    parts.push(`Generated API documentation`);

    if (docs.report.existingSpec) {
      parts.push(`  Based on: ${path.basename(docs.report.existingSpec)}`);
    }

    parts.push(`  Routes: ${docs.report.totalRoutes} detected, ${docs.report.newRoutes} documented`);

    if (docs.report.schemas > 0) {
      parts.push(`  Schemas: ${docs.report.schemas} models`);
    }

    parts.push(`  Output: ${fullOutputDir}`);

    for (const file of writeResult.files) {
      const stats = fs.statSync(file);
      parts.push(`    - ${path.basename(file)} (${formatSize(stats.size)})`);
    }

    result.message = parts.join('\n');

  } catch (error) {
    result.success = false;
    result.message = `Documentation generation failed: ${error.message}`;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Parse command arguments
 * @param {string} args - Command arguments string
 * @returns {Object} Parsed options
 */
function parseArgs(args = '') {
  const options = {};
  const parts = args.split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--output' || part === '-o') {
      options.outputDir = parts[++i];
    } else if (part === '--format' || part === '-f') {
      options.format = parts[++i];
    } else if (part === '--title' || part === '-t') {
      options.title = parts[++i];
    } else if (part === '--version' || part === '-v') {
      options.version = parts[++i];
    } else if (part === '--base-url' || part === '-b') {
      options.baseUrl = parts[++i];
    } else if (part === '--verbose') {
      options.verbose = true;
    } else if (part === '--help' || part === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Get help text
 * @returns {string} Help text
 */
function getHelpText() {
  return `
/tlc:docs - Generate API Documentation

Usage:
  /tlc:docs [options]

Options:
  -o, --output <dir>     Output directory (default: docs/api)
  -f, --format <type>    Output format: json, yaml, both (default: both)
  -t, --title <name>     API title
  -v, --version <ver>    API version
  -b, --base-url <url>   Base URL (default: http://localhost:3000)
  --verbose              Show detailed output
  -h, --help             Show this help

Examples:
  /tlc:docs                           # Generate with defaults
  /tlc:docs -o api-docs               # Custom output directory
  /tlc:docs -f yaml -t "My API"       # YAML only with custom title
  /tlc:docs -b https://api.example.com

What it does:
  1. Finds existing OpenAPI/Swagger specs (adopts them first)
  2. Scans code for routes (Express, Fastify, Hono, Koa)
  3. Parses ORM schemas (Drizzle, Prisma, TypeORM)
  4. Generates OpenAPI 3.x specification
  5. Creates curl examples and sample payloads
  6. Merges detected routes into existing specs

Output files:
  - openapi.json / openapi.yaml - OpenAPI specification
  - examples.json - Curl commands and sample payloads
  - docs-report.json - Generation report
`.trim();
}

/**
 * Command entry point
 * @param {string} args - Command arguments
 * @returns {Promise<Object>} Command result
 */
async function docsCommand(args = '') {
  const options = parseArgs(args);

  if (options.help) {
    return {
      success: true,
      message: getHelpText(),
      files: [],
      report: null,
    };
  }

  return runDocsCommand(options);
}

module.exports = {
  DEFAULT_OUTPUT_DIR,
  simpleGlob,
  formatSize,
  runDocsCommand,
  parseArgs,
  getHelpText,
  docsCommand,
};
