/**
 * Dependency Graph Builder
 * Build file dependency graph from import/require statements
 */

const path = require('path');
const fs = require('fs');

class DependencyGraph {
  constructor(options = {}) {
    this.options = options;
    this.basePath = options.basePath || process.cwd();
    this.extensions = options.extensions || ['.js', '.ts', '.jsx', '.tsx', '.mjs'];
    this.tsConfigPaths = options.tsConfigPaths || {};
    this.graph = new Map(); // file -> { imports: [], importedBy: [] }
    this.external = new Set(); // node_modules dependencies
  }

  /**
   * Build dependency graph from entry points or directory
   */
  async build(entryPoints) {
    const files = Array.isArray(entryPoints) ? entryPoints : [entryPoints];
    const visited = new Set();

    for (const file of files) {
      await this.processFile(file, visited);
    }

    return this.getGraph();
  }

  /**
   * Build graph from all files in a directory
   */
  async buildFromDirectory(dir, options = {}) {
    const { ignore = ['node_modules', '.git', 'dist', 'build'] } = options;
    const files = await this.findFiles(dir, ignore);

    for (const file of files) {
      await this.processFile(file, new Set());
    }

    return this.getGraph();
  }

  /**
   * Find all source files in directory
   */
  async findFiles(dir, ignore = []) {
    const results = [];
    const readDir = this.options.readDir || fs.promises.readdir;
    const stat = this.options.stat || fs.promises.stat;

    const scan = async (currentDir) => {
      const entries = await readDir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (ignore.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (this.extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    };

    await scan(dir);
    return results;
  }

  /**
   * Process a single file
   */
  async processFile(filePath, visited) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.basePath, filePath);

    if (visited.has(absolutePath)) {
      return; // Prevent infinite loops on circular deps
    }

    visited.add(absolutePath);

    if (!this.graph.has(absolutePath)) {
      this.graph.set(absolutePath, { imports: [], importedBy: [] });
    }

    try {
      const content = await this.readFile(absolutePath);
      const imports = this.parseImports(content, absolutePath);

      for (const imp of imports) {
        const resolved = this.resolveImport(imp, absolutePath);

        if (resolved.external) {
          this.external.add(resolved.module);
          continue;
        }

        if (resolved.path) {
          // Add to graph
          this.graph.get(absolutePath).imports.push(resolved.path);

          if (!this.graph.has(resolved.path)) {
            this.graph.set(resolved.path, { imports: [], importedBy: [] });
          }
          this.graph.get(resolved.path).importedBy.push(absolutePath);

          // Recursively process
          await this.processFile(resolved.path, visited);
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read
      if (this.options.verbose) {
        console.error(`Error processing ${absolutePath}:`, error.message);
      }
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath) {
    const readFile = this.options.readFile || fs.promises.readFile;
    return await readFile(filePath, 'utf-8');
  }

  /**
   * Parse import statements from code
   */
  parseImports(code, filePath) {
    const imports = [];

    // ES6 imports: import x from 'y', import { x } from 'y', import 'y'
    const es6Regex = /import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6Regex.exec(code)) !== null) {
      imports.push({ type: 'es6', module: match[1], raw: match[0] });
    }

    // CommonJS: require('x'), require("x")
    const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = cjsRegex.exec(code)) !== null) {
      imports.push({ type: 'commonjs', module: match[1], raw: match[0] });
    }

    // Dynamic imports: import('x')
    const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicRegex.exec(code)) !== null) {
      imports.push({ type: 'dynamic', module: match[1], raw: match[0] });
    }

    // Export from: export { x } from 'y'
    const exportFromRegex = /export\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = exportFromRegex.exec(code)) !== null) {
      imports.push({ type: 'export-from', module: match[1], raw: match[0] });
    }

    return imports;
  }

  /**
   * Resolve import path to absolute path
   */
  resolveImport(imp, fromFile) {
    const modulePath = imp.module;

    // Check if external (node_modules)
    if (!modulePath.startsWith('.') && !modulePath.startsWith('/')) {
      // Check tsconfig paths first
      const aliasResolved = this.resolveAlias(modulePath);
      if (aliasResolved) {
        return { path: aliasResolved, external: false };
      }

      return { module: modulePath.split('/')[0], external: true };
    }

    // Relative path
    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, modulePath);

    // Try adding extensions
    resolved = this.resolveExtension(resolved);

    return { path: resolved, external: false };
  }

  /**
   * Resolve TypeScript path aliases
   */
  resolveAlias(modulePath) {
    for (const [alias, paths] of Object.entries(this.tsConfigPaths)) {
      const pattern = alias.replace('*', '(.*)');
      const regex = new RegExp(`^${pattern}$`);
      const match = modulePath.match(regex);

      if (match) {
        const replacement = paths[0].replace('*', match[1] || '');
        return path.resolve(this.basePath, replacement);
      }
    }
    return null;
  }

  /**
   * Try resolving with different extensions
   */
  resolveExtension(filePath) {
    // Already has extension
    if (this.extensions.some(ext => filePath.endsWith(ext))) {
      return filePath;
    }

    // Try each extension
    for (const ext of this.extensions) {
      const withExt = filePath + ext;
      if (this.fileExists(withExt)) {
        return withExt;
      }
    }

    // Try index files
    for (const ext of this.extensions) {
      const indexFile = path.join(filePath, `index${ext}`);
      if (this.fileExists(indexFile)) {
        return indexFile;
      }
    }

    // Return original with first extension as fallback
    return filePath + this.extensions[0];
  }

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    if (this.options.fileExists) {
      return this.options.fileExists(filePath);
    }
    try {
      fs.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the built graph
   */
  getGraph() {
    const nodes = [];
    const edges = [];

    for (const [file, data] of this.graph.entries()) {
      nodes.push({
        id: file,
        name: path.relative(this.basePath, file),
        imports: data.imports.length,
        importedBy: data.importedBy.length,
      });

      for (const imp of data.imports) {
        edges.push({
          from: file,
          to: imp,
          fromName: path.relative(this.basePath, file),
          toName: path.relative(this.basePath, imp),
        });
      }
    }

    return {
      nodes,
      edges,
      external: Array.from(this.external),
      stats: {
        totalFiles: nodes.length,
        totalEdges: edges.length,
        externalDeps: this.external.size,
      },
    };
  }

  /**
   * Get files that import a given file
   */
  getImporters(filePath) {
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.basePath, filePath);

    const node = this.graph.get(absolute);
    return node ? node.importedBy : [];
  }

  /**
   * Get files that a given file imports
   */
  getImports(filePath) {
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.basePath, filePath);

    const node = this.graph.get(absolute);
    return node ? node.imports : [];
  }

  /**
   * Check if graph has circular dependencies
   */
  hasCircular() {
    const visited = new Set();
    const stack = new Set();

    const dfs = (node) => {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      const data = this.graph.get(node);
      if (data) {
        for (const imp of data.imports) {
          if (dfs(imp)) return true;
        }
      }

      stack.delete(node);
      return false;
    };

    for (const node of this.graph.keys()) {
      if (dfs(node)) return true;
    }

    return false;
  }

  /**
   * Get all files in the graph
   */
  getFiles() {
    return Array.from(this.graph.keys());
  }

  /**
   * Clear the graph
   */
  clear() {
    this.graph.clear();
    this.external.clear();
  }
}

module.exports = { DependencyGraph };
