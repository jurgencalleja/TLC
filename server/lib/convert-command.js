/**
 * Convert Command
 * Main orchestrator for /tlc:convert skill - microservice conversion planning
 */

class ConvertCommand {
  constructor(options = {}) {
    this.options = options;
    this.conversionPlanner = options.conversionPlanner;
    this.serviceScaffold = options.serviceScaffold;
    this.boundaryDetector = options.boundaryDetector;

    // Callbacks for interactive mode
    this.onConfirm = options.onConfirm || (async () => true);
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Parse command arguments
   * @param {string} args - Command arguments
   * @returns {Object} Parsed options
   */
  parseArgs(args = '') {
    const options = {
      action: null,
      service: null,
      dryRun: false,
      scaffold: false,
      force: false,
      output: null,
    };

    const parts = args.trim().split(/\s+/).filter(Boolean);
    const knownActions = ['microservice'];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === 'microservice') {
        options.action = 'microservice';
      } else if (!part.startsWith('--') && !options.action && parts[i - 1] !== '--service' && parts[i - 1] !== '--output') {
        // Treat unrecognized non-flag as action
        options.action = part;
      } else if (part === '--service' && parts[i + 1]) {
        options.service = parts[++i];
      } else if (part === '--dry-run') {
        options.dryRun = true;
      } else if (part === '--scaffold') {
        options.scaffold = true;
      } else if (part === '--force') {
        options.force = true;
      } else if (part === '--output' && parts[i + 1]) {
        options.output = parts[++i];
      }
    }

    return options;
  }

  /**
   * Run the convert command
   * @param {string} args - Command arguments
   * @param {Object} context - Execution context
   * @returns {Object} Command result
   */
  async run(args = '', context = {}) {
    const options = this.parseArgs(args);
    const { projectDir = process.cwd() } = context;

    const result = {
      success: false,
      action: options.action,
      dryRun: options.dryRun,
      plan: null,
      scaffolded: [],
      output: '',
    };

    try {
      if (!options.action) {
        return {
          ...result,
          error: 'No action specified. Use: microservice',
          output: this.formatHelp(),
        };
      }

      if (options.action === 'microservice') {
        return await this.handleMicroservice(options, context, result);
      }

      return {
        ...result,
        error: `Unknown action: ${options.action}`,
      };
    } catch (error) {
      return {
        ...result,
        error: error.message,
      };
    }
  }

  /**
   * Handle microservice conversion
   */
  async handleMicroservice(options, context, result) {
    const { projectDir = process.cwd() } = context;

    this.onProgress({ phase: 'analyzing', message: 'Detecting service boundaries...' });

    // Step 1: Detect boundaries
    const graph = context.graph || { nodes: [], edges: [] };
    const couplingData = context.couplingData || {};
    const cohesionData = context.cohesionData || {};

    const boundaries = this.boundaryDetector.detect(graph, couplingData, cohesionData);

    // Step 2: Generate conversion plan
    this.onProgress({ phase: 'planning', message: 'Generating conversion plan...' });

    let plan;
    if (options.service) {
      // Extract specific service
      const service = boundaries.services.find(s => s.name === options.service);
      if (!service) {
        return {
          ...result,
          error: `Service not found: ${options.service}. Available: ${boundaries.services.map(s => s.name).join(', ')}`,
        };
      }
      plan = this.conversionPlanner.planServiceExtraction(service, boundaries);
    } else {
      // Full conversion plan
      plan = this.conversionPlanner.planFullConversion(boundaries);
    }

    result.plan = plan;

    // Step 3: Handle dry run
    if (options.dryRun) {
      result.success = true;
      result.output = this.formatDryRunOutput(plan, options);
      return result;
    }

    // Step 4: Confirm before destructive changes
    if (!options.force && plan.destructiveChanges && plan.destructiveChanges.length > 0) {
      const confirmed = await this.onConfirm({
        type: 'destructive',
        message: `This will make ${plan.destructiveChanges.length} destructive changes`,
        changes: plan.destructiveChanges,
      });

      if (!confirmed) {
        result.cancelled = true;
        result.output = 'Conversion cancelled by user.';
        return result;
      }
    }

    // Step 5: Handle scaffold
    if (options.scaffold) {
      this.onProgress({ phase: 'scaffolding', message: 'Creating service directories...' });

      const scaffoldResult = await this.serviceScaffold.createDirectories(
        plan.services || [plan.service],
        { projectDir, dryRun: false }
      );

      result.scaffolded = scaffoldResult.created || [];
    }

    result.success = true;
    result.output = this.formatOutput(plan, result.scaffolded, options);
    return result;
  }

  /**
   * Format dry run output
   */
  formatDryRunOutput(plan, options) {
    const lines = [];

    lines.push('# Conversion Plan (Dry Run)');
    lines.push('');
    lines.push('**No files will be modified.**');
    lines.push('');

    if (options.service) {
      lines.push(`## Service Extraction: ${options.service}`);
    } else {
      lines.push('## Full Microservice Conversion');
    }

    lines.push('');

    if (plan.services) {
      lines.push('### Identified Services');
      lines.push('');
      for (const service of plan.services) {
        lines.push(`- **${service.name}** (${service.files?.length || 0} files)`);
        if (service.dependencies?.length > 0) {
          lines.push(`  - Dependencies: ${service.dependencies.join(', ')}`);
        }
      }
      lines.push('');
    }

    if (plan.service) {
      lines.push('### Service Details');
      lines.push('');
      lines.push(`- **Name:** ${plan.service.name}`);
      lines.push(`- **Files:** ${plan.service.files?.length || 0}`);
      if (plan.service.dependencies?.length > 0) {
        lines.push(`- **Dependencies:** ${plan.service.dependencies.join(', ')}`);
      }
      lines.push('');
    }

    if (plan.shared?.length > 0) {
      lines.push('### Shared Kernel');
      lines.push('');
      lines.push('Files used by multiple services:');
      for (const file of plan.shared.slice(0, 10)) {
        lines.push(`- ${file}`);
      }
      if (plan.shared.length > 10) {
        lines.push(`- ...and ${plan.shared.length - 10} more`);
      }
      lines.push('');
    }

    if (plan.destructiveChanges?.length > 0) {
      lines.push('### Destructive Changes');
      lines.push('');
      lines.push('**Warning:** These changes will modify existing files:');
      for (const change of plan.destructiveChanges) {
        lines.push(`- ${change.type}: ${change.file}`);
      }
      lines.push('');
    }

    if (plan.steps?.length > 0) {
      lines.push('### Conversion Steps');
      lines.push('');
      for (let i = 0; i < plan.steps.length; i++) {
        lines.push(`${i + 1}. ${plan.steps[i]}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('Remove `--dry-run` to execute this plan.');

    return lines.join('\n');
  }

  /**
   * Format output after execution
   */
  formatOutput(plan, scaffolded, options) {
    const lines = [];

    lines.push('# Conversion Complete');
    lines.push('');

    if (options.service) {
      lines.push(`## Extracted Service: ${options.service}`);
    } else {
      lines.push('## Microservice Conversion');
    }

    lines.push('');

    if (scaffolded.length > 0) {
      lines.push('### Created Directories');
      lines.push('');
      for (const dir of scaffolded) {
        lines.push(`- ${dir}`);
      }
      lines.push('');
    }

    if (plan.services) {
      lines.push('### Services');
      lines.push('');
      lines.push('| Service | Files | Quality |');
      lines.push('|---------|-------|---------|');
      for (const service of plan.services) {
        lines.push(`| ${service.name} | ${service.files?.length || 0} | ${service.quality || 'N/A'} |`);
      }
      lines.push('');
    }

    lines.push('### Next Steps');
    lines.push('');
    lines.push('1. Review the generated service structure');
    lines.push('2. Move files to their respective services');
    lines.push('3. Update imports and dependencies');
    lines.push('4. Add service-specific configurations');

    return lines.join('\n');
  }

  /**
   * Format help output
   */
  formatHelp() {
    return `# /tlc:convert

Convert monolith to microservices.

## Usage

\`\`\`
/tlc:convert microservice           # Generate full conversion plan
/tlc:convert microservice --service auth  # Extract specific service
/tlc:convert microservice --dry-run       # Preview without changes
/tlc:convert microservice --scaffold      # Create service directories
\`\`\`

## Options

| Option | Description |
|--------|-------------|
| \`microservice\` | Generate microservice conversion plan |
| \`--service NAME\` | Extract specific service only |
| \`--dry-run\` | Show plan without making changes |
| \`--scaffold\` | Create service directory structure |
| \`--force\` | Skip confirmation for destructive changes |
| \`--output PATH\` | Output path for generated files |
`;
  }
}

/**
 * Create convert command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createConvertCommand(options = {}) {
  const command = new ConvertCommand(options);
  return {
    execute: (args, ctx) => command.run(args, ctx),
    parseArgs: (args) => command.parseArgs(args),
    formatHelp: () => command.formatHelp(),
  };
}

module.exports = { ConvertCommand, createConvertCommand };
