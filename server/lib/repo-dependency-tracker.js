/**
 * Repo Dependency Tracker - Track dependencies between repos in a workspace
 */

const fs = require('fs');
const path = require('path');

class RepoDependencyTracker {
  constructor(workspaceRoot, repos) {
    this.workspaceRoot = workspaceRoot;
    this.repos = repos;
    this.repoPackages = new Map(); // repo -> package.json data
    this.repoNames = new Map(); // package name -> repo directory
    this.dependencyGraph = {}; // repo -> [dependencies]

    this.loadRepoData();
    this.buildDependencyGraph();
  }

  /**
   * Load package.json for all repos
   */
  loadRepoData() {
    for (const repo of this.repos) {
      const pkgPath = path.join(this.workspaceRoot, repo, 'package.json');

      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          this.repoPackages.set(repo, pkg);
          if (pkg.name) {
            this.repoNames.set(pkg.name, repo);
          }
        } catch (err) {
          // Invalid JSON, skip
          this.repoPackages.set(repo, {});
        }
      } else {
        this.repoPackages.set(repo, {});
      }
    }
  }

  /**
   * Build dependency graph from repo data
   */
  buildDependencyGraph() {
    for (const repo of this.repos) {
      this.dependencyGraph[repo] = [];
      const pkg = this.repoPackages.get(repo) || {};

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };

      for (const [depName, depVersion] of Object.entries(allDeps || {})) {
        // Check for workspace: protocol
        if (typeof depVersion === 'string' && depVersion.startsWith('workspace:')) {
          const depRepo = this.repoNames.get(depName);
          if (depRepo && depRepo !== repo) {
            this.dependencyGraph[repo].push(depRepo);
          }
        }

        // Check for file: protocol pointing to another repo
        if (typeof depVersion === 'string' && depVersion.startsWith('file:')) {
          const filePath = depVersion.slice(5); // Remove 'file:'
          const resolvedPath = path.resolve(path.join(this.workspaceRoot, repo), filePath);
          const relativePath = path.relative(this.workspaceRoot, resolvedPath);

          // Check if it points to one of our repos
          for (const otherRepo of this.repos) {
            if (relativePath === otherRepo || relativePath.startsWith(otherRepo + path.sep)) {
              if (otherRepo !== repo) {
                this.dependencyGraph[repo].push(otherRepo);
              }
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Get dependencies of a repo
   * @param {string} repo - Repo directory name
   * @returns {string[]} Array of repo names this repo depends on
   */
  getDependencies(repo) {
    return this.dependencyGraph[repo] || [];
  }

  /**
   * Check if repoA depends on repoB
   * @param {string} repoA
   * @param {string} repoB
   * @returns {boolean}
   */
  dependsOn(repoA, repoB) {
    const deps = this.getDependencies(repoA);
    return deps.includes(repoB);
  }

  /**
   * Get repos that depend on the given repo
   * @param {string} repo
   * @returns {string[]}
   */
  getDependents(repo) {
    const dependents = [];

    for (const [r, deps] of Object.entries(this.dependencyGraph)) {
      if (deps.includes(repo)) {
        dependents.push(r);
      }
    }

    return dependents;
  }

  /**
   * Get all repos affected when the given repo changes (transitive dependents)
   * @param {string} repo
   * @returns {string[]}
   */
  getAffectedRepos(repo) {
    const affected = new Set();
    const queue = [repo];
    const visited = new Set([repo]);

    while (queue.length > 0) {
      const current = queue.shift();
      const dependents = this.getDependents(current);

      for (const dep of dependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          affected.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Get topological order for build/test runs
   * @returns {string[]}
   */
  getTopologicalOrder() {
    const visited = new Set();
    const result = [];

    const visit = (repo) => {
      if (visited.has(repo)) return;
      visited.add(repo);

      const deps = this.getDependencies(repo);
      for (const dep of deps) {
        visit(dep);
      }

      result.push(repo);
    };

    for (const repo of this.repos) {
      visit(repo);
    }

    return result;
  }

  /**
   * Detect circular dependencies
   * @returns {string[][]} Array of cycles found
   */
  detectCircularDependencies() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    const dfs = (repo) => {
      visited.add(repo);
      recursionStack.add(repo);
      path.push(repo);

      const deps = this.getDependencies(repo);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          const cycle = dfs(dep);
          if (cycle) return cycle;
        } else if (recursionStack.has(dep)) {
          // Found cycle
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          cycle.push(dep); // Complete the cycle
          cycles.push(cycle);
          return cycle;
        }
      }

      path.pop();
      recursionStack.delete(repo);
      return null;
    };

    for (const repo of this.repos) {
      if (!visited.has(repo)) {
        dfs(repo);
      }
    }

    return cycles;
  }

  /**
   * Generate Mermaid diagram of dependencies
   * @returns {string}
   */
  generateMermaidDiagram() {
    const lines = ['graph TD'];

    // Add all nodes
    for (const repo of this.repos) {
      lines.push(`  ${this.sanitizeId(repo)}[${repo}]`);
    }

    // Add edges
    for (const [repo, deps] of Object.entries(this.dependencyGraph)) {
      for (const dep of deps) {
        lines.push(`  ${this.sanitizeId(repo)} --> ${this.sanitizeId(dep)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Sanitize repo name for Mermaid ID
   */
  sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Get the full dependency graph
   * @returns {Object}
   */
  getDependencyGraph() {
    return { ...this.dependencyGraph };
  }
}

module.exports = {
  RepoDependencyTracker,
};
