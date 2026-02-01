/**
 * README Generator Module
 * Generates README.md files for repositories based on their characteristics
 */

const fs = require('fs');
const path = require('path');
const { extractRoutes } = require('./route-detector.js');

/**
 * Glob patterns for route files
 */
const ROUTE_FILE_PATTERNS = [
  '**/routes/**/*.js',
  '**/routes/**/*.ts',
  '**/api/**/*.js',
  '**/api/**/*.ts',
  '**/controllers/**/*.js',
  '**/controllers/**/*.ts',
  'src/**/*.routes.js',
  'src/**/*.routes.ts',
];

/**
 * Directories to ignore when scanning
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];

/**
 * README Generator class
 */
class ReadmeGenerator {
  /**
   * @param {string} repoPath - Path to the repository
   */
  constructor(repoPath) {
    this.repoPath = repoPath;
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
   * Extract project name and description from package.json
   * @returns {Object} Project info with name and description
   */
  extractProjectInfo() {
    const pkg = this.readPackageJson();
    const defaultName = path.basename(this.repoPath);

    return {
      name: pkg?.name || defaultName,
      description: pkg?.description || '',
      version: pkg?.version || '',
      license: pkg?.license || '',
      author: pkg?.author || '',
      repository: pkg?.repository || null,
    };
  }

  /**
   * Extract npm scripts from package.json
   * @returns {Array} Array of {name, command} objects
   */
  extractScripts() {
    const pkg = this.readPackageJson();
    if (!pkg?.scripts) {
      return [];
    }

    return Object.entries(pkg.scripts).map(([name, command]) => ({
      name,
      command,
    }));
  }

  /**
   * Extract dependencies from package.json
   * @returns {Object} Object with runtime and dev dependency arrays
   */
  extractDependencies() {
    const pkg = this.readPackageJson();

    const runtime = pkg?.dependencies
      ? Object.entries(pkg.dependencies).map(([name, version]) => ({
          name,
          version,
        }))
      : [];

    const dev = pkg?.devDependencies
      ? Object.entries(pkg.devDependencies).map(([name, version]) => ({
          name,
          version,
        }))
      : [];

    return { runtime, dev };
  }

  /**
   * Extract environment variables from .env.example
   * @returns {Array} Array of env var objects with name, example, and comment
   */
  extractEnvVars() {
    const envPath = path.join(this.repoPath, '.env.example');
    const envVars = [];

    try {
      if (!fs.existsSync(envPath)) {
        return [];
      }

      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      let lastComment = '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Track comments
        if (trimmed.startsWith('#')) {
          lastComment = trimmed.slice(1).trim();
          continue;
        }

        // Skip empty lines
        if (!trimmed) {
          lastComment = '';
          continue;
        }

        // Parse variable
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (match) {
          envVars.push({
            name: match[1],
            example: match[2],
            comment: lastComment,
          });
          lastComment = '';
        }
      }
    } catch (err) {
      // Ignore read errors
    }

    return envVars;
  }

  /**
   * Recursively find files matching patterns
   * @param {string} dir - Directory to search
   * @param {string[]} extensions - File extensions to match
   * @returns {string[]} Array of file paths
   */
  findFiles(dir, extensions = ['.js', '.ts']) {
    const files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            files.push(...this.findFiles(fullPath, extensions));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignore read errors
    }

    return files;
  }

  /**
   * Detect API endpoints from route files
   * @returns {Array} Array of endpoint objects with method and path
   */
  detectApiEndpoints() {
    const endpoints = [];

    // Find potential route files
    const allFiles = this.findFiles(this.repoPath);
    const routeFiles = allFiles.filter(f => {
      const rel = path.relative(this.repoPath, f).toLowerCase();
      return (
        rel.includes('route') ||
        rel.includes('api') ||
        rel.includes('controller') ||
        rel.includes('endpoint')
      );
    });

    for (const file of routeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const routes = extractRoutes(content, file);
        endpoints.push(...routes);
      } catch (err) {
        // Ignore read errors
      }
    }

    // Deduplicate
    const seen = new Set();
    return endpoints.filter(e => {
      const key = `${e.method}:${e.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate the installation section
   * @returns {string} Markdown for installation section
   */
  generateInstallationSection() {
    const info = this.extractProjectInfo();
    const lines = ['## Installation', ''];

    // Add git clone if repository is available
    if (info.repository) {
      let repoUrl = '';
      if (typeof info.repository === 'string') {
        repoUrl = info.repository;
      } else if (info.repository.url) {
        repoUrl = info.repository.url;
      }

      if (repoUrl) {
        // Clean up git URL
        repoUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
        lines.push('```bash');
        lines.push(`git clone ${repoUrl}`);
        lines.push(`cd ${info.name.replace(/^@[^/]+\//, '')}`);
        lines.push('```');
        lines.push('');
      }
    }

    lines.push('```bash');
    lines.push('npm install');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Generate scripts section markdown
   * @param {Array} scripts - Array of script objects
   * @returns {string} Markdown content
   */
  generateScriptsSection(scripts) {
    if (!scripts.length) return '';

    const lines = ['## Scripts', ''];

    for (const script of scripts) {
      lines.push(`### \`npm run ${script.name}\``);
      lines.push('');
      lines.push('```bash');
      lines.push(`npm run ${script.name}`);
      lines.push('```');
      lines.push('');
      lines.push(`Runs: \`${script.command}\``);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate dependencies section markdown
   * @param {Object} deps - Dependencies object with runtime and dev arrays
   * @returns {string} Markdown content
   */
  generateDependenciesSection(deps) {
    if (!deps.runtime.length && !deps.dev.length) return '';

    const lines = ['## Dependencies', ''];

    if (deps.runtime.length) {
      lines.push('### Runtime Dependencies');
      lines.push('');
      lines.push('| Package | Version |');
      lines.push('|---------|---------|');
      for (const dep of deps.runtime.slice(0, 15)) {
        // Limit to top 15
        lines.push(`| ${dep.name} | ${dep.version} |`);
      }
      if (deps.runtime.length > 15) {
        lines.push(`| ... | *(${deps.runtime.length - 15} more)* |`);
      }
      lines.push('');
    }

    if (deps.dev.length) {
      lines.push('### Development Dependencies');
      lines.push('');
      lines.push('| Package | Version |');
      lines.push('|---------|---------|');
      for (const dep of deps.dev.slice(0, 10)) {
        // Limit to top 10
        lines.push(`| ${dep.name} | ${dep.version} |`);
      }
      if (deps.dev.length > 10) {
        lines.push(`| ... | *(${deps.dev.length - 10} more)* |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate environment variables section markdown
   * @param {Array} envVars - Array of env var objects
   * @returns {string} Markdown content
   */
  generateEnvVarsSection(envVars) {
    if (!envVars.length) return '';

    const lines = ['## Environment Variables', ''];
    lines.push('Copy `.env.example` to `.env` and configure the following variables:');
    lines.push('');
    lines.push('| Variable | Description | Example |');
    lines.push('|----------|-------------|---------|');

    for (const envVar of envVars) {
      const desc = envVar.comment || '-';
      const example = envVar.example || '-';
      lines.push(`| \`${envVar.name}\` | ${desc} | \`${example}\` |`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate API endpoints section markdown
   * @param {Array} endpoints - Array of endpoint objects
   * @returns {string} Markdown content
   */
  generateApiSection(endpoints) {
    if (!endpoints.length) return '';

    const lines = ['## API Endpoints', ''];
    lines.push('| Method | Path |');
    lines.push('|--------|------|');

    for (const endpoint of endpoints) {
      lines.push(`| ${endpoint.method} | \`${endpoint.path}\` |`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate the full README content
   * @returns {string} Complete README markdown
   */
  generate() {
    const info = this.extractProjectInfo();
    const scripts = this.extractScripts();
    const deps = this.extractDependencies();
    const envVars = this.extractEnvVars();
    const endpoints = this.detectApiEndpoints();

    const sections = [];

    // Title
    sections.push(`# ${info.name}`);
    sections.push('');

    // Description
    if (info.description) {
      sections.push(info.description);
      sections.push('');
    }

    // Installation
    sections.push(this.generateInstallationSection());
    sections.push('');

    // Scripts
    const scriptsSection = this.generateScriptsSection(scripts);
    if (scriptsSection) {
      sections.push(scriptsSection);
    }

    // Environment variables
    const envSection = this.generateEnvVarsSection(envVars);
    if (envSection) {
      sections.push(envSection);
    }

    // API endpoints
    const apiSection = this.generateApiSection(endpoints);
    if (apiSection) {
      sections.push(apiSection);
    }

    // Dependencies
    const depsSection = this.generateDependenciesSection(deps);
    if (depsSection) {
      sections.push(depsSection);
    }

    // License
    if (info.license) {
      sections.push('## License');
      sections.push('');
      sections.push(info.license);
      sections.push('');
    }

    return sections.join('\n').trim() + '\n';
  }

  /**
   * Write README to disk
   * @param {string} outputPath - Custom output path (defaults to README.md in repo)
   */
  write(outputPath) {
    const readme = this.generate();
    const target = outputPath || path.join(this.repoPath, 'README.md');
    fs.writeFileSync(target, readme, 'utf-8');
  }
}

/**
 * Convenience function to generate README for a path
 * @param {string} repoPath - Path to repository
 * @returns {string} Generated README content
 */
function generateReadme(repoPath) {
  const generator = new ReadmeGenerator(repoPath);
  return generator.generate();
}

/**
 * Factory function to create a README generator
 * @param {string} repoPath - Path to repository
 * @returns {Object} Generator instance with bound methods
 */
function createReadmeGenerator(repoPath) {
  const generator = new ReadmeGenerator(repoPath);

  return {
    generate: () => generator.generate(),
    write: (outputPath) => generator.write(outputPath),
    extractProjectInfo: () => generator.extractProjectInfo(),
    extractScripts: () => generator.extractScripts(),
    extractDependencies: () => generator.extractDependencies(),
    extractEnvVars: () => generator.extractEnvVars(),
    detectApiEndpoints: () => generator.detectApiEndpoints(),
  };
}

module.exports = {
  ReadmeGenerator,
  generateReadme,
  createReadmeGenerator,
  ROUTE_FILE_PATTERNS,
  IGNORE_DIRS,
};
