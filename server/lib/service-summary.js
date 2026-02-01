/**
 * Service Summary Generator Module
 * Generates "What does this repo do" one-pager summaries
 */

const fs = require('fs');
const path = require('path');

/**
 * Directories to ignore when scanning
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];

/**
 * Common entry point file names
 */
const ENTRY_POINT_FILES = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts'];

/**
 * Service Summary Generator class
 */
class ServiceSummaryGenerator {
  /**
   * @param {string} repoPath - Path to the repository
   */
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.workspaceContext = null;
  }

  /**
   * Set workspace context for dependency information
   * @param {Object} context - Workspace context with getDependents/getDependencies methods
   */
  setWorkspaceContext(context) {
    this.workspaceContext = context;
  }

  /**
   * Read package.json if it exists
   * @returns {Object|null} Parsed package.json or null
   */
  readPackageJson() {
    const pkgPath = path.join(this.repoPath, 'package.json');
    try {
      if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      }
    } catch (err) {
      // Ignore parse errors
    }
    return null;
  }

  /**
   * Read README.md if it exists
   * @returns {string|null} README content or null
   */
  readReadme() {
    const readmePaths = ['README.md', 'readme.md', 'Readme.md', 'README.markdown'];
    for (const name of readmePaths) {
      const readmePath = path.join(this.repoPath, name);
      try {
        if (fs.existsSync(readmePath)) {
          return fs.readFileSync(readmePath, 'utf-8');
        }
      } catch (err) {
        // Ignore read errors
      }
    }
    return null;
  }

  /**
   * Extract purpose/description from package.json or README
   * @returns {string} Purpose description
   */
  extractPurpose() {
    const pkg = this.readPackageJson();

    // First try package.json description
    if (pkg?.description) {
      return pkg.description;
    }

    // Fall back to README first paragraph
    const readme = this.readReadme();
    if (readme) {
      const firstParagraph = this.extractFirstParagraph(readme);
      if (firstParagraph) {
        return firstParagraph;
      }
    }

    return '';
  }

  /**
   * Extract first meaningful paragraph from markdown
   * @param {string} markdown - Markdown content
   * @returns {string} First paragraph text
   */
  extractFirstParagraph(markdown) {
    const lines = markdown.split('\n');
    let paragraph = [];
    let foundHeading = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip initial title/heading
      if (trimmed.startsWith('#')) {
        foundHeading = true;
        continue;
      }

      // Skip empty lines before first paragraph
      if (!foundHeading && !trimmed) {
        continue;
      }

      // Skip empty lines after heading
      if (foundHeading && !trimmed && paragraph.length === 0) {
        continue;
      }

      // End of paragraph
      if (!trimmed && paragraph.length > 0) {
        break;
      }

      // Skip subsequent headings
      if (trimmed.startsWith('#') && paragraph.length > 0) {
        break;
      }

      // Collect paragraph content
      if (trimmed && !trimmed.startsWith('#')) {
        paragraph.push(trimmed);
      }
    }

    return paragraph.join(' ');
  }

  /**
   * Identify main entry points
   * @returns {Array} Array of entry point objects
   */
  identifyMainEntryPoints() {
    const entryPoints = [];
    const pkg = this.readPackageJson();

    // Check package.json main field
    if (pkg?.main) {
      const mainPath = path.join(this.repoPath, pkg.main);
      if (fs.existsSync(mainPath)) {
        entryPoints.push({
          file: pkg.main.replace(/^\.\//, ''),
          type: 'main',
        });
      }
    }

    // Check for common entry point files (if main not specified)
    if (!pkg?.main) {
      for (const file of ENTRY_POINT_FILES) {
        const filePath = path.join(this.repoPath, file);
        if (fs.existsSync(filePath)) {
          entryPoints.push({
            file,
            type: 'main',
          });
          break; // Only add first found
        }

        // Check in src directory
        const srcPath = path.join(this.repoPath, 'src', file);
        if (fs.existsSync(srcPath)) {
          entryPoints.push({
            file: `src/${file}`,
            type: 'main',
          });
          break;
        }
      }
    }

    // Check for bin entry points
    if (pkg?.bin) {
      const bins = typeof pkg.bin === 'string'
        ? { [pkg.name]: pkg.bin }
        : pkg.bin;

      for (const [name, binPath] of Object.entries(bins)) {
        const normalizedPath = binPath.replace(/^\.\//, '');
        const fullPath = path.join(this.repoPath, normalizedPath);
        if (fs.existsSync(fullPath)) {
          entryPoints.push({
            file: normalizedPath,
            type: 'bin',
            name,
          });
        }
      }
    }

    return entryPoints;
  }

  /**
   * List exported functions/classes from main entry point
   * @returns {Array} Array of export names
   */
  listExports() {
    const exports = [];
    const entryPoints = this.identifyMainEntryPoints();
    const pkg = this.readPackageJson();

    // Determine which file to analyze
    let entryFile = null;

    if (pkg?.main) {
      entryFile = path.join(this.repoPath, pkg.main);
    } else {
      // Try common entry points
      for (const file of ENTRY_POINT_FILES) {
        const filePath = path.join(this.repoPath, file);
        if (fs.existsSync(filePath)) {
          entryFile = filePath;
          break;
        }
      }
    }

    if (!entryFile || !fs.existsSync(entryFile)) {
      return exports;
    }

    try {
      const content = fs.readFileSync(entryFile, 'utf-8');

      // Detect CommonJS exports: module.exports = { name1, name2 }
      const cjsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
      if (cjsMatch) {
        const exportList = cjsMatch[1];
        const names = exportList.match(/\b([a-zA-Z_]\w*)\b/g);
        if (names) {
          exports.push(...names.filter(n => n !== 'exports' && n !== 'module'));
        }
      }

      // Detect ES module exports: export function name() {}
      const esExportFnRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
      let match;
      while ((match = esExportFnRegex.exec(content)) !== null) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }

      // Detect ES module class exports: export class Name {}
      const esExportClassRegex = /export\s+(?:default\s+)?class\s+(\w+)/g;
      while ((match = esExportClassRegex.exec(content)) !== null) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }

      // Detect ES module const exports: export const NAME = ...
      const esExportConstRegex = /export\s+const\s+(\w+)\s*=/g;
      while ((match = esExportConstRegex.exec(content)) !== null) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }

      // Detect default class: export default class Name {}
      const defaultClassRegex = /export\s+default\s+class\s+(\w+)/g;
      while ((match = defaultClassRegex.exec(content)) !== null) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }

    } catch (err) {
      // Ignore read errors
    }

    return exports;
  }

  /**
   * Get repos that consume/depend on this repo
   * @returns {Array} Array of consumer repo names
   */
  getConsumerRepos() {
    if (!this.workspaceContext?.getDependents) {
      return [];
    }

    const pkg = this.readPackageJson();
    const repoName = path.basename(this.repoPath);

    return this.workspaceContext.getDependents(repoName) || [];
  }

  /**
   * Get repos that this repo depends on
   * @returns {Array} Array of dependency repo names
   */
  getDependencyRepos() {
    if (!this.workspaceContext?.getDependencies) {
      return [];
    }

    const repoName = path.basename(this.repoPath);

    return this.workspaceContext.getDependencies(repoName) || [];
  }

  /**
   * Analyze file structure to infer service type
   * @returns {Object} Analysis result with type and indicators
   */
  analyzeFileStructure() {
    const indicators = [];
    let type = 'unknown';
    const pkg = this.readPackageJson();

    // Check for bin entry (CLI tool)
    if (pkg?.bin) {
      indicators.push('bin entry');
      type = 'cli';
    }

    // Check for routes directory (API service)
    const routesDirs = [
      path.join(this.repoPath, 'routes'),
      path.join(this.repoPath, 'src', 'routes'),
      path.join(this.repoPath, 'api'),
      path.join(this.repoPath, 'src', 'api'),
    ];
    for (const routesDir of routesDirs) {
      if (fs.existsSync(routesDir) && fs.statSync(routesDir).isDirectory()) {
        indicators.push('routes directory');
        type = 'api';
        break;
      }
    }

    // Check for components directory (web app)
    const componentsDirs = [
      path.join(this.repoPath, 'components'),
      path.join(this.repoPath, 'src', 'components'),
    ];
    for (const compDir of componentsDirs) {
      if (fs.existsSync(compDir) && fs.statSync(compDir).isDirectory()) {
        indicators.push('components directory');
        if (type === 'unknown') {
          type = 'web-app';
        }
        break;
      }
    }

    // Check for library pattern (src with index exports)
    if (type === 'unknown') {
      const srcDir = path.join(this.repoPath, 'src');
      if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
        for (const file of ['index.js', 'index.ts']) {
          if (fs.existsSync(path.join(srcDir, file))) {
            indicators.push('src directory with index');
            type = 'library';
            break;
          }
        }
      }
    }

    // Check root index for library pattern
    if (type === 'unknown') {
      for (const file of ['index.js', 'index.ts']) {
        if (fs.existsSync(path.join(this.repoPath, file))) {
          indicators.push('root index file');
          type = 'library';
          break;
        }
      }
    }

    return { type, indicators };
  }

  /**
   * Generate the full service summary
   * @returns {string} Complete markdown summary
   */
  generate() {
    const pkg = this.readPackageJson();
    const name = pkg?.name || path.basename(this.repoPath);
    const purpose = this.extractPurpose();
    const entryPoints = this.identifyMainEntryPoints();
    const exports = this.listExports();
    const consumers = this.getConsumerRepos();
    const dependencies = this.getDependencyRepos();
    const analysis = this.analyzeFileStructure();

    const sections = [];

    // Title
    sections.push(`# ${name}`);
    sections.push('');

    // Overview section
    sections.push('## Overview');
    sections.push('');

    if (purpose) {
      sections.push(purpose);
      sections.push('');
    }

    if (analysis.type !== 'unknown') {
      sections.push(`**Type:** ${this.formatType(analysis.type)}`);
      sections.push('');
    }

    if (pkg?.version) {
      sections.push(`**Version:** ${pkg.version}`);
      sections.push('');
    }

    // Entry Points section
    if (entryPoints.length > 0) {
      sections.push('## Entry Points');
      sections.push('');
      for (const entry of entryPoints) {
        if (entry.type === 'bin') {
          sections.push(`- \`${entry.file}\` (CLI: \`${entry.name}\`)`);
        } else {
          sections.push(`- \`${entry.file}\``);
        }
      }
      sections.push('');
    }

    // Exports section
    if (exports.length > 0) {
      sections.push('## Exports');
      sections.push('');
      for (const exp of exports) {
        sections.push(`- \`${exp}\``);
      }
      sections.push('');
    }

    // Consumers section
    if (consumers.length > 0) {
      sections.push('## Consumers');
      sections.push('');
      sections.push('The following repos depend on this service:');
      sections.push('');
      for (const consumer of consumers) {
        sections.push(`- ${consumer}`);
      }
      sections.push('');
    }

    // Dependencies section
    if (dependencies.length > 0) {
      sections.push('## Dependencies');
      sections.push('');
      sections.push('This service depends on:');
      sections.push('');
      for (const dep of dependencies) {
        sections.push(`- ${dep}`);
      }
      sections.push('');
    }

    return sections.join('\n').trim() + '\n';
  }

  /**
   * Format type for display
   * @param {string} type - Type identifier
   * @returns {string} Formatted type name
   */
  formatType(type) {
    const typeNames = {
      'api': 'API Service',
      'cli': 'CLI Tool',
      'library': 'Library',
      'web-app': 'Web Application',
      'unknown': 'Unknown',
    };
    return typeNames[type] || type;
  }

  /**
   * Write summary to disk
   * @param {string} outputPath - Custom output path (defaults to SERVICE-SUMMARY.md)
   */
  write(outputPath) {
    const summary = this.generate();
    const target = outputPath || path.join(this.repoPath, 'SERVICE-SUMMARY.md');
    fs.writeFileSync(target, summary, 'utf-8');
  }
}

/**
 * Convenience function to generate service summary for a path
 * @param {string} repoPath - Path to repository
 * @param {Object} workspaceContext - Optional workspace context
 * @returns {string} Generated summary content
 */
function generateServiceSummary(repoPath, workspaceContext) {
  const generator = new ServiceSummaryGenerator(repoPath);
  if (workspaceContext) {
    generator.setWorkspaceContext(workspaceContext);
  }
  return generator.generate();
}

/**
 * Factory function to create a service summary generator
 * @param {string} repoPath - Path to repository
 * @returns {Object} Generator instance with bound methods
 */
function createServiceSummaryGenerator(repoPath) {
  const generator = new ServiceSummaryGenerator(repoPath);

  return {
    generate: () => generator.generate(),
    write: (outputPath) => generator.write(outputPath),
    extractPurpose: () => generator.extractPurpose(),
    identifyMainEntryPoints: () => generator.identifyMainEntryPoints(),
    listExports: () => generator.listExports(),
    getConsumerRepos: () => generator.getConsumerRepos(),
    getDependencyRepos: () => generator.getDependencyRepos(),
    analyzeFileStructure: () => generator.analyzeFileStructure(),
    setWorkspaceContext: (ctx) => generator.setWorkspaceContext(ctx),
  };
}

module.exports = {
  ServiceSummaryGenerator,
  generateServiceSummary,
  createServiceSummaryGenerator,
  IGNORE_DIRS,
  ENTRY_POINT_FILES,
};
