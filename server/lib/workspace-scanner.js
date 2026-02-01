/**
 * Workspace Scanner - Discover and index repos in workspace
 */

const fs = require('fs');
const path = require('path');

const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];

class WorkspaceScanner {
  constructor(workspaceConfig) {
    this.workspaceConfig = workspaceConfig;
    this.rootDir = workspaceConfig.rootDir;
    this.cachedResult = null;
  }

  /**
   * Scan all repos in the workspace
   * @param {Object} options - Scan options
   * @param {boolean} options.force - Force rescan (ignore cache)
   * @param {boolean} options.scanImports - Scan source files for import references
   * @returns {Object} Scan result with repos, graphs, and stats
   */
  scan(options = {}) {
    const { force = false, scanImports = false } = options;

    // Return cached result if available and not forcing
    if (this.cachedResult && !force) {
      return this.cachedResult;
    }

    const config = this.workspaceConfig.getConfig();
    const repos = [];
    const byPath = {};
    const byName = {};
    const dependencyGraph = {};

    // Scan each repo
    for (const repoPath of config.repos) {
      const repoInfo = this.scanRepo(repoPath, scanImports);
      repos.push(repoInfo);
      byPath[repoPath] = repoInfo;
      if (repoInfo.name) {
        byName[repoInfo.name] = repoInfo;
      }
    }

    // Build dependency graph after all repos are scanned
    for (const repo of repos) {
      dependencyGraph[repo.path] = this.findDependencyPaths(repo, byName);
    }

    // Detect circular dependencies
    const { hasCircular, cycles } = this.detectCircularDeps(dependencyGraph);

    // Calculate dependency order (topological sort)
    const dependencyOrder = this.calculateDependencyOrder(dependencyGraph);

    // Build stats
    const stats = {
      totalRepos: repos.length,
      reposWithPackageJson: repos.filter(r => r.hasPackageJson).length,
      reposWithCircularDeps: hasCircular ? cycles.length : 0,
    };

    const result = {
      repos,
      byPath,
      byName,
      dependencyGraph,
      dependencyOrder,
      hasCircularDeps: hasCircular,
      circularDeps: cycles,
      stats,
    };

    this.cachedResult = result;
    return result;
  }

  /**
   * Scan a single repo for project info
   * @param {string} repoPath - Relative path to repo
   * @param {boolean} scanImports - Whether to scan source files for imports
   * @returns {Object} Repo info
   */
  scanRepo(repoPath, scanImports = false) {
    const absolutePath = path.join(this.rootDir, repoPath);
    const packageJsonPath = path.join(absolutePath, 'package.json');

    const info = {
      path: repoPath,
      name: repoPath, // Default to path if no package.json
      version: null,
      description: null,
      main: null,
      module: null,
      scripts: {},
      dependencies: [],
      devDependencies: [],
      workspaceDeps: [],
      importedRepos: [],
      hasPackageJson: false,
    };

    // Try to read package.json
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        info.hasPackageJson = true;
        info.name = pkg.name || repoPath;
        info.version = pkg.version || null;
        info.description = pkg.description || null;
        info.main = pkg.main || null;
        info.module = pkg.module || null;
        info.scripts = pkg.scripts || {};

        // Extract dependencies
        info.dependencies = Object.keys(pkg.dependencies || {});
        info.devDependencies = Object.keys(pkg.devDependencies || {});

        // Detect workspace dependencies
        info.workspaceDeps = this.extractWorkspaceDeps(pkg);
      } catch (err) {
        // Ignore parse errors, use defaults
      }
    }

    // Scan source files for import references if requested
    if (scanImports) {
      info.importedRepos = this.scanImportReferences(absolutePath);
    }

    return info;
  }

  /**
   * Extract workspace dependencies from package.json
   * @param {Object} pkg - Parsed package.json
   * @returns {string[]} Array of workspace dependency names
   */
  extractWorkspaceDeps(pkg) {
    const workspaceDeps = [];
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      // Detect workspace: protocol
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        workspaceDeps.push(name);
      }
      // Detect file: protocol (relative path)
      else if (typeof version === 'string' && version.startsWith('file:')) {
        workspaceDeps.push(name);
      }
    }

    return workspaceDeps;
  }

  /**
   * Scan source files for import references to workspace packages
   * @param {string} repoDir - Absolute path to repo
   * @returns {string[]} Array of imported workspace package names
   */
  scanImportReferences(repoDir) {
    const importedRepos = new Set();
    const workspacePackages = this.getWorkspacePackageNames();

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip ignored directories
          if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
              continue;
            }
            scanDir(fullPath);
          } else if (SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
            // Scan source file for imports
            const imports = this.extractImportsFromFile(fullPath);
            for (const imp of imports) {
              if (workspacePackages.has(imp)) {
                importedRepos.add(imp);
              }
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    };

    scanDir(repoDir);
    return Array.from(importedRepos);
  }

  /**
   * Get all workspace package names
   * @returns {Set<string>} Set of package names
   */
  getWorkspacePackageNames() {
    const names = new Set();
    const config = this.workspaceConfig.getConfig();

    for (const repoPath of config.repos) {
      const packageJsonPath = path.join(this.rootDir, repoPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          if (pkg.name) {
            names.add(pkg.name);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }

    return names;
  }

  /**
   * Extract import/require statements from a file
   * @param {string} filePath - Absolute path to file
   * @returns {string[]} Array of imported module names
   */
  extractImportsFromFile(filePath) {
    const imports = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // ES6 imports: import x from 'y', import { x } from 'y'
      const es6Regex = /import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = es6Regex.exec(content)) !== null) {
        imports.push(this.getPackageName(match[1]));
      }

      // CommonJS: require('x')
      const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = cjsRegex.exec(content)) !== null) {
        imports.push(this.getPackageName(match[1]));
      }

      // Dynamic imports: import('x')
      const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = dynamicRegex.exec(content)) !== null) {
        imports.push(this.getPackageName(match[1]));
      }
    } catch (err) {
      // Ignore read errors
    }

    return imports;
  }

  /**
   * Get package name from import path
   * @param {string} importPath - Import path
   * @returns {string} Package name (handles scoped packages)
   */
  getPackageName(importPath) {
    // Handle relative paths
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return importPath;
    }

    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    }

    // Regular package
    return importPath.split('/')[0];
  }

  /**
   * Find repo paths that a repo depends on
   * @param {Object} repoInfo - Repo info object
   * @param {Object} byName - Repos indexed by name
   * @returns {string[]} Array of dependency repo paths
   */
  findDependencyPaths(repoInfo, byName) {
    const depPaths = [];

    // Check workspace deps (include self-references for circular dep detection)
    for (const depName of repoInfo.workspaceDeps) {
      const depRepo = byName[depName];
      if (depRepo && !depPaths.includes(depRepo.path)) {
        depPaths.push(depRepo.path);
      }
    }

    // Check imported repos
    for (const importedName of repoInfo.importedRepos) {
      const depRepo = byName[importedName];
      if (depRepo && !depPaths.includes(depRepo.path)) {
        depPaths.push(depRepo.path);
      }
    }

    return depPaths;
  }

  /**
   * Detect circular dependencies in the graph
   * @param {Object} graph - Dependency graph { repoPath: [depPaths] }
   * @returns {Object} { hasCircular: boolean, cycles: string[][] }
   */
  detectCircularDeps(graph) {
    const cycles = [];
    const visited = new Set();
    const stack = new Set();
    const path = [];

    const dfs = (node) => {
      if (stack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        cycle.push(node);
        cycles.push(cycle);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      stack.add(node);
      path.push(node);

      const deps = graph[node] || [];
      for (const dep of deps) {
        dfs(dep);
      }

      path.pop();
      stack.delete(node);
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return {
      hasCircular: cycles.length > 0,
      cycles,
    };
  }

  /**
   * Calculate topological order for dependencies
   * @param {Object} graph - Dependency graph { repoPath: [depPaths] }
   * @returns {string[]} Ordered array of repo paths
   */
  calculateDependencyOrder(graph) {
    const nodes = Object.keys(graph);
    const visited = new Set();
    const order = [];

    const visit = (node) => {
      if (visited.has(node)) {
        return;
      }
      visited.add(node);

      // Visit dependencies first
      const deps = graph[node] || [];
      for (const dep of deps) {
        if (graph.hasOwnProperty(dep)) {
          visit(dep);
        }
      }

      order.push(node);
    };

    // Visit all nodes
    for (const node of nodes) {
      visit(node);
    }

    return order;
  }

  /**
   * Get repos affected by changes to a given repo
   * @param {string} repoPath - Path of changed repo
   * @returns {string[]} Array of affected repo paths
   */
  getAffectedRepos(repoPath) {
    // Make sure we have scanned
    if (!this.cachedResult) {
      this.scan();
    }

    const affected = new Set();
    const graph = this.cachedResult.dependencyGraph;

    // Build reverse graph (dependents -> dependencies)
    const reverseGraph = {};
    for (const [repo, deps] of Object.entries(graph)) {
      for (const dep of deps) {
        if (!reverseGraph[dep]) {
          reverseGraph[dep] = [];
        }
        reverseGraph[dep].push(repo);
      }
    }

    // BFS to find all affected repos
    const queue = [repoPath];
    while (queue.length > 0) {
      const current = queue.shift();
      const dependents = reverseGraph[current] || [];

      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Clear cached results
   */
  clearCache() {
    this.cachedResult = null;
  }
}

module.exports = { WorkspaceScanner };
