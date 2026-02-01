/**
 * Workspace Test Runner - Run tests across all workspace repos
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WorkspaceTestRunner {
  constructor(workspaceRoot, repos) {
    this.workspaceRoot = workspaceRoot;
    this.repos = repos;
    this.repoPackages = new Map();
    this.repoNames = new Map();
    this.dependencyGraph = {};

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
        if (typeof depVersion === 'string' && depVersion.startsWith('workspace:')) {
          const depRepo = this.repoNames.get(depName);
          if (depRepo && depRepo !== repo) {
            this.dependencyGraph[repo].push(depRepo);
          }
        }

        if (typeof depVersion === 'string' && depVersion.startsWith('file:')) {
          const filePath = depVersion.slice(5);
          const resolvedPath = path.resolve(path.join(this.workspaceRoot, repo), filePath);
          const relativePath = path.relative(this.workspaceRoot, resolvedPath);

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
   * Get topological order for test runs (dependencies first)
   */
  getTopologicalOrder() {
    const visited = new Set();
    const result = [];

    const visit = repo => {
      if (visited.has(repo)) return;
      visited.add(repo);

      const deps = this.dependencyGraph[repo] || [];
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
   * Get affected repos when one changes (repo + dependents)
   */
  getAffectedRepos(changedRepo) {
    const affected = new Set([changedRepo]);
    const queue = [changedRepo];
    const visited = new Set([changedRepo]);

    while (queue.length > 0) {
      const current = queue.shift();

      for (const [repo, deps] of Object.entries(this.dependencyGraph)) {
        if (deps.includes(current) && !visited.has(repo)) {
          visited.add(repo);
          affected.add(repo);
          queue.push(repo);
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Get test command for a repo
   */
  getTestCommand(repo) {
    const repoPath = path.join(this.workspaceRoot, repo);

    // Check .tlc.json first
    const tlcPath = path.join(repoPath, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      try {
        const tlcConfig = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
        if (tlcConfig.commands && tlcConfig.commands.test) {
          return tlcConfig.commands.test;
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Fall back to package.json scripts.test
    const pkg = this.repoPackages.get(repo) || {};
    if (pkg.scripts && pkg.scripts.test) {
      return 'npm test';
    }

    return null;
  }

  /**
   * Run tests for a single repo
   */
  async runRepoTests(repo) {
    const repoPath = path.join(this.workspaceRoot, repo);
    const testCommand = this.getTestCommand(repo);

    if (!testCommand) {
      return {
        repo,
        success: true,
        noTests: true,
        duration: 0,
        output: '',
      };
    }

    const startTime = Date.now();

    return new Promise(resolve => {
      const child = spawn('sh', ['-c', testCommand], {
        cwd: repoPath,
        env: { ...process.env },
      });

      let output = '';

      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.stderr.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        const duration = Date.now() - startTime;
        resolve({
          repo,
          success: code === 0,
          duration,
          output,
          exitCode: code,
        });
      });

      child.on('error', err => {
        const duration = Date.now() - startTime;
        resolve({
          repo,
          success: false,
          duration,
          output: err.message,
          error: err,
        });
      });
    });
  }

  /**
   * Run tests across all workspace repos
   */
  async runTests(options = {}) {
    const { parallel = false, bail = false, filter = null, affected = null } = options;

    let reposToTest = this.repos;

    // Apply filter
    if (filter && filter.length > 0) {
      reposToTest = filter.filter(r => this.repos.includes(r));
    }

    // Apply affected filter
    if (affected) {
      const affectedRepos = this.getAffectedRepos(affected);
      reposToTest = reposToTest.filter(r => affectedRepos.includes(r));
    }

    // Get test order (topological sort)
    const fullOrder = this.getTopologicalOrder();
    const testOrder = fullOrder.filter(r => reposToTest.includes(r));

    const result = {
      repos: {},
      order: [],
      summary: {
        total: testOrder.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        noTests: 0,
      },
      startTime: Date.now(),
    };

    if (parallel && !bail) {
      // Run all in parallel
      const promises = testOrder.map(repo => this.runRepoTests(repo));
      const results = await Promise.all(promises);

      for (const repoResult of results) {
        result.repos[repoResult.repo] = repoResult;
        result.order.push(repoResult.repo);

        if (repoResult.noTests) {
          result.summary.noTests++;
        } else if (repoResult.success) {
          result.summary.passed++;
        } else {
          result.summary.failed++;
        }
      }
    } else {
      // Run sequentially
      let shouldBail = false;

      for (const repo of testOrder) {
        if (shouldBail) {
          result.repos[repo] = {
            repo,
            skipped: true,
            success: false,
            duration: 0,
            output: '',
          };
          result.summary.skipped++;
          continue;
        }

        const repoResult = await this.runRepoTests(repo);
        result.repos[repo] = repoResult;
        result.order.push(repo);

        if (repoResult.noTests) {
          result.summary.noTests++;
        } else if (repoResult.success) {
          result.summary.passed++;
        } else {
          result.summary.failed++;
          if (bail) {
            shouldBail = true;
          }
        }
      }
    }

    result.duration = Date.now() - result.startTime;

    return result;
  }
}

module.exports = {
  WorkspaceTestRunner,
};
