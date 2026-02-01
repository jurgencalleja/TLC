/**
 * Workspace Docs Command - CLI interface for workspace documentation generation
 *
 * Commands:
 * --docs readme   - Generate READMEs for all repos
 * --docs flow     - Generate cross-repo flow diagrams
 * --docs summary  - Generate service summaries
 * --docs adr      - Create new ADR or list existing
 * --docs all      - Generate all documentation
 * --output <dir>  - Specify output directory
 */

const fs = require('fs');
const path = require('path');
const { ReadmeGenerator } = require('./readme-generator.js');
const { FlowDiagramGenerator } = require('./flow-diagram-generator.js');
const { ServiceSummaryGenerator } = require('./service-summary.js');
const { createAdr, listAdrs } = require('./adr-generator.js');

const CONFIG_FILENAME = '.tlc-workspace.json';

/**
 * WorkspaceDocsCommand class for CLI documentation generation
 */
class WorkspaceDocsCommand {
  /**
   * Create a WorkspaceDocsCommand instance
   * @param {string} rootDir - Workspace root directory
   */
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.configPath = path.join(rootDir, CONFIG_FILENAME);
    this.config = null;
    this._loadConfig();
  }

  /**
   * Load existing workspace config
   * @private
   */
  _loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      } catch (err) {
        this.config = null;
      }
    }
  }

  /**
   * Check if workspace is initialized
   * @returns {boolean}
   */
  isWorkspaceInitialized() {
    return this.config !== null;
  }

  /**
   * Ensure workspace is initialized, throw if not
   * @private
   */
  _ensureInitialized() {
    if (!this.isWorkspaceInitialized()) {
      throw new Error('Workspace not initialized. Run /tlc:workspace init first.');
    }
  }

  /**
   * Generate READMEs for all workspace repos
   * @param {Object} options - Options
   * @param {string} [options.outputDir] - Custom output directory
   * @returns {Promise<Object>} Result with generated repos list
   */
  async readme(options = {}) {
    this._ensureInitialized();

    const repos = this.config.repos || [];
    const generated = [];
    const errors = [];

    if (repos.length === 0) {
      return {
        success: true,
        generated: [],
        errors: [],
        message: 'No repos found in workspace. Nothing to generate.',
      };
    }

    for (const repoName of repos) {
      const repoPath = path.join(this.rootDir, repoName);

      // Check if repo exists
      if (!fs.existsSync(repoPath)) {
        errors.push(`Repo not found: ${repoName}`);
        continue;
      }

      try {
        const generator = new ReadmeGenerator(repoPath);
        const readmeContent = generator.generate();

        // Determine output path
        let outputPath;
        if (options.outputDir) {
          const outputRepoDir = path.join(options.outputDir, repoName);
          fs.mkdirSync(outputRepoDir, { recursive: true });
          outputPath = path.join(outputRepoDir, 'README.md');
        } else {
          outputPath = path.join(repoPath, 'README.md');
        }

        fs.writeFileSync(outputPath, readmeContent, 'utf-8');
        generated.push(repoName);
      } catch (err) {
        errors.push(`Error generating README for ${repoName}: ${err.message}`);
      }
    }

    return {
      success: true,
      generated,
      errors,
      message: `Generated ${generated.length} README(s)`,
    };
  }

  /**
   * Generate cross-repo flow diagrams
   * @param {Object} options - Options
   * @param {string} [options.outputDir] - Custom output directory
   * @returns {Promise<Object>} Result with diagram
   */
  async flow(options = {}) {
    this._ensureInitialized();

    const repos = this.config.repos || [];
    const generator = new FlowDiagramGenerator();

    // Collect files from all repos
    const files = {};

    for (const repoName of repos) {
      const repoPath = path.join(this.rootDir, repoName);

      if (!fs.existsSync(repoPath)) {
        continue;
      }

      // Find JS/TS files (non-recursively for simplicity, check src and root)
      const filesToCheck = [
        path.join(repoPath, 'src', 'index.js'),
        path.join(repoPath, 'src', 'index.ts'),
        path.join(repoPath, 'index.js'),
        path.join(repoPath, 'index.ts'),
      ];

      for (const filePath of filesToCheck) {
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Use workspace-relative path for proper repo detection
            const relativePath = `/workspace/${repoName}/${path.relative(repoPath, filePath)}`;
            files[relativePath] = content;
          } catch (err) {
            // Skip files that can't be read
          }
        }
      }
    }

    // Analyze files and generate diagram
    const analysisResult = generator.analyzeFiles(files);
    const diagram = generator.generateMermaid(analysisResult);

    // Wrap in markdown
    const diagramContent = `# Workspace Flow Diagram

\`\`\`mermaid
${diagram}
\`\`\`

*Generated at: ${new Date().toISOString()}*
`;

    // Determine output path
    let outputPath;
    if (options.outputDir) {
      fs.mkdirSync(options.outputDir, { recursive: true });
      outputPath = path.join(options.outputDir, 'workspace-flow.md');
    } else {
      const planningDir = path.join(this.rootDir, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      outputPath = path.join(planningDir, 'workspace-flow.md');
    }

    fs.writeFileSync(outputPath, diagramContent, 'utf-8');

    return {
      success: true,
      diagram,
      outputPath,
      message: `Generated flow diagram at ${outputPath}`,
    };
  }

  /**
   * Generate service summaries for all repos
   * @param {Object} options - Options
   * @param {string} [options.outputDir] - Custom output directory
   * @returns {Promise<Object>} Result with summaries list
   */
  async summary(options = {}) {
    this._ensureInitialized();

    const repos = this.config.repos || [];
    const summaries = [];
    const errors = [];

    if (repos.length === 0) {
      return {
        success: true,
        summaries: [],
        errors: [],
        message: 'No repos found in workspace. Nothing to generate.',
      };
    }

    // Create workspace context for dependency tracking
    const workspaceContext = this._createWorkspaceContext();

    for (const repoName of repos) {
      const repoPath = path.join(this.rootDir, repoName);

      // Check if repo exists
      if (!fs.existsSync(repoPath)) {
        errors.push(`Repo not found: ${repoName}`);
        continue;
      }

      try {
        const generator = new ServiceSummaryGenerator(repoPath);
        generator.setWorkspaceContext(workspaceContext);
        const summaryContent = generator.generate();

        // Determine output path
        let outputPath;
        if (options.outputDir) {
          const outputRepoDir = path.join(options.outputDir, repoName);
          fs.mkdirSync(outputRepoDir, { recursive: true });
          outputPath = path.join(outputRepoDir, 'SERVICE-SUMMARY.md');
        } else {
          outputPath = path.join(repoPath, 'SERVICE-SUMMARY.md');
        }

        fs.writeFileSync(outputPath, summaryContent, 'utf-8');
        summaries.push({
          repo: repoName,
          outputPath,
        });
      } catch (err) {
        errors.push(`Error generating summary for ${repoName}: ${err.message}`);
      }
    }

    return {
      success: true,
      summaries,
      errors,
      message: `Generated ${summaries.length} service summary(ies)`,
    };
  }

  /**
   * Create workspace context for dependency tracking
   * @private
   * @returns {Object} Workspace context with dependency methods
   */
  _createWorkspaceContext() {
    const repos = this.config.repos || [];
    const dependencies = {};
    const dependents = {};

    // Build dependency graph from package.json files
    for (const repoName of repos) {
      const pkgPath = path.join(this.rootDir, repoName, 'package.json');

      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };

          dependencies[repoName] = [];
          for (const [depName, version] of Object.entries(allDeps)) {
            if (version && version.startsWith('workspace:')) {
              dependencies[repoName].push(depName);

              // Track reverse dependency
              if (!dependents[depName]) {
                dependents[depName] = [];
              }
              dependents[depName].push(repoName);
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }

    return {
      getDependencies: (repoName) => dependencies[repoName] || [],
      getDependents: (repoName) => dependents[repoName] || [],
    };
  }

  /**
   * Create or list ADRs
   * @param {Object} options - Options
   * @param {string} [options.action='list'] - 'create' or 'list'
   * @param {string} [options.title] - ADR title (for create)
   * @param {string} [options.context] - ADR context (for create)
   * @param {string} [options.decision] - ADR decision (for create)
   * @param {string} [options.consequences] - ADR consequences (for create)
   * @returns {Promise<Object>} Result
   */
  async adr(options = {}) {
    const action = options.action || 'list';

    if (action === 'create') {
      const adrResult = await createAdr(this.rootDir, {
        title: options.title || 'Untitled Decision',
        context: options.context || 'No context provided.',
        decision: options.decision || 'No decision provided.',
        consequences: options.consequences || 'No consequences provided.',
        status: 'proposed',
      });

      return {
        success: true,
        adr: adrResult,
        message: `Created ADR ${adrResult.number}: ${adrResult.title}`,
      };
    } else {
      // List ADRs
      const adrs = await listAdrs(this.rootDir);

      return {
        success: true,
        adrs,
        message: adrs.length > 0
          ? `Found ${adrs.length} ADR(s)`
          : 'No ADRs found',
      };
    }
  }

  /**
   * Generate all documentation at once
   * @param {Object} options - Options
   * @param {string} [options.outputDir] - Custom output directory
   * @returns {Promise<Object>} Combined result
   */
  async all(options = {}) {
    this._ensureInitialized();

    const readmeResult = await this.readme(options);

    // For flow diagram, use outputDir directly (not nested in repos)
    const flowOptions = {
      outputDir: options.outputDir || undefined,
    };
    const flowResult = await this.flow(flowOptions);

    const summaryResult = await this.summary(options);

    return {
      success: true,
      readme: readmeResult,
      flow: flowResult,
      summary: summaryResult,
      message: 'Generated all documentation',
    };
  }

  /**
   * Parse command line arguments
   * @param {string} argsString - Command arguments string
   * @returns {Object} Parsed options
   */
  parseArgs(argsString) {
    const options = {};
    const args = argsString.trim();

    if (!args) {
      return options;
    }

    // Parse --docs type
    const docsMatch = args.match(/--docs\s+(\w+)/);
    if (docsMatch) {
      options.docsType = docsMatch[1];
    }

    // Parse --output or -o
    const outputMatch = args.match(/(?:--output|-o)\s+([^\s]+)/);
    if (outputMatch) {
      options.outputDir = outputMatch[1];
    }

    // Parse --help or -h
    if (args.includes('--help') || args.match(/\s-h\b/) || args === '-h') {
      options.help = true;
    }

    // Parse ADR action flags
    if (args.includes('--create')) {
      options.adrAction = 'create';
    }
    if (args.includes('--list')) {
      options.adrAction = 'list';
    }

    // Parse ADR create options
    const titleMatch = args.match(/--title\s+"([^"]+)"/);
    if (titleMatch) {
      options.title = titleMatch[1];
    }

    const contextMatch = args.match(/--context\s+"([^"]+)"/);
    if (contextMatch) {
      options.context = contextMatch[1];
    }

    const decisionMatch = args.match(/--decision\s+"([^"]+)"/);
    if (decisionMatch) {
      options.decision = decisionMatch[1];
    }

    const consequencesMatch = args.match(/--consequences\s+"([^"]+)"/);
    if (consequencesMatch) {
      options.consequences = consequencesMatch[1];
    }

    return options;
  }

  /**
   * Run command based on parsed arguments
   * @param {string} argsString - Command arguments string
   * @returns {Promise<Object>} Command result
   */
  async run(argsString) {
    const options = this.parseArgs(argsString);

    // Handle help
    if (options.help || !argsString.trim()) {
      return {
        success: true,
        message: this.getHelpText(),
      };
    }

    const docsType = options.docsType;

    if (!docsType) {
      return {
        success: true,
        message: this.getHelpText(),
      };
    }

    switch (docsType) {
      case 'readme':
        return this.readme({ outputDir: options.outputDir });

      case 'flow':
        return this.flow({ outputDir: options.outputDir });

      case 'summary':
        return this.summary({ outputDir: options.outputDir });

      case 'adr':
        return this.adr({
          action: options.adrAction || 'list',
          title: options.title,
          context: options.context,
          decision: options.decision,
          consequences: options.consequences,
        });

      case 'all':
        return this.all({ outputDir: options.outputDir });

      default:
        return {
          success: false,
          error: `Unknown docs type: ${docsType}. Use readme, flow, summary, adr, or all.`,
        };
    }
  }

  /**
   * Get help text
   * @returns {string} Help text
   */
  getHelpText() {
    return `
Usage: /tlc:workspace --docs <type> [options]

Documentation Types:
  readme     Generate README.md for all repos
  flow       Generate cross-repo flow diagrams
  summary    Generate SERVICE-SUMMARY.md for all repos
  adr        Create or list Architecture Decision Records
  all        Generate all documentation at once

Options:
  --output <dir>, -o <dir>    Specify output directory
  --help, -h                  Show this help message

ADR Options (when using --docs adr):
  --create                    Create a new ADR
  --list                      List existing ADRs (default)
  --title "Title"             ADR title
  --context "Context"         ADR context section
  --decision "Decision"       ADR decision section
  --consequences "Impact"     ADR consequences section

Examples:
  /tlc:workspace --docs readme
  /tlc:workspace --docs flow --output ./docs
  /tlc:workspace --docs summary
  /tlc:workspace --docs adr --list
  /tlc:workspace --docs adr --create --title "Use PostgreSQL" --context "Need a database" --decision "PostgreSQL" --consequences "Need to manage DB"
  /tlc:workspace --docs all --output ./generated-docs
`.trim();
  }
}

module.exports = {
  WorkspaceDocsCommand,
};
