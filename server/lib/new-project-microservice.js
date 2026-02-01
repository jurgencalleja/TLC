/**
 * New Project Microservice Command
 * Integration orchestrator for /tlc:new-project --architecture microservice
 * Coordinates all Phase 24 generators to create a complete microservice project
 */

const path = require('path');

/**
 * Default options for microservice project generation
 */
const DEFAULT_OPTIONS = {
  database: 'postgres',
  gateway: 'traefik',
  contracts: 'local',
  basePort: 3001,
};

class NewProjectMicroservice {
  /**
   * Create a NewProjectMicroservice instance
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.microserviceTemplate - MicroserviceTemplate instance
   * @param {Object} dependencies.traefikConfig - TraefikConfig instance
   * @param {Object} dependencies.sharedKernel - SharedKernel instance
   * @param {Object} dependencies.messagingPatterns - MessagingPatterns instance
   * @param {Object} dependencies.contractTesting - ContractTesting instance
   * @param {Object} dependencies.exampleService - ExampleService instance
   */
  constructor(dependencies = {}) {
    this.microserviceTemplate = dependencies.microserviceTemplate;
    this.traefikConfig = dependencies.traefikConfig;
    this.sharedKernel = dependencies.sharedKernel;
    this.messagingPatterns = dependencies.messagingPatterns;
    this.contractTesting = dependencies.contractTesting;
    this.exampleService = dependencies.exampleService;

    // File system operations (injectable for testing)
    this.fs = null;
  }

  /**
   * Set file system implementation (for testing)
   * @param {Object} fs - File system implementation with mkdirSync and writeFileSync
   */
  setFs(fs) {
    this.fs = fs;
  }

  /**
   * Parse command line arguments
   * @param {string[]} args - Command line arguments
   * @returns {Object} Parsed configuration
   */
  parseArgs(args) {
    const config = {
      projectName: null,
      architecture: null,
      services: [],
      database: DEFAULT_OPTIONS.database,
      events: [],
      gateway: DEFAULT_OPTIONS.gateway,
      contracts: DEFAULT_OPTIONS.contracts,
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === '--architecture' && i + 1 < args.length) {
        config.architecture = args[i + 1];
        i += 2;
      } else if (arg === '--services' && i + 1 < args.length) {
        config.services = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
        i += 2;
      } else if (arg === '--database' && i + 1 < args.length) {
        config.database = args[i + 1];
        i += 2;
      } else if (arg === '--events' && i + 1 < args.length) {
        config.events = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
        i += 2;
      } else if (arg === '--gateway' && i + 1 < args.length) {
        config.gateway = args[i + 1];
        i += 2;
      } else if (arg === '--contracts' && i + 1 < args.length) {
        config.contracts = args[i + 1];
        i += 2;
      } else if (!arg.startsWith('--') && !config.projectName) {
        // First non-flag argument is project name
        config.projectName = arg;
        i += 1;
      } else {
        i += 1;
      }
    }

    return config;
  }

  /**
   * Generate complete microservice project
   * @param {Object} config - Project configuration
   * @param {string} config.projectName - Project name
   * @param {string[]} config.services - Service names
   * @param {string} config.database - Database type
   * @param {string[]} config.events - Event names
   * @param {string} config.gateway - Gateway type (default: traefik)
   * @param {string} config.contracts - Contract mode (default: local)
   * @returns {Object} Combined result { directories: [...], files: [...] }
   */
  generate(config) {
    const {
      projectName,
      services = [],
      database = DEFAULT_OPTIONS.database,
      events = [],
      gateway = DEFAULT_OPTIONS.gateway,
      contracts = DEFAULT_OPTIONS.contracts,
    } = config;

    const allDirectories = [];
    const allFiles = [];

    // 1. Generate monorepo structure from MicroserviceTemplate
    const monorepo = this.microserviceTemplate.generateStructure({
      projectName,
      services,
      database,
    });
    allDirectories.push(...monorepo.directories);
    allFiles.push(...monorepo.files.map(f => ({ path: f, content: '' })));

    // Generate root-level files
    allFiles.push({
      path: `${projectName}/package.json`,
      content: this.microserviceTemplate.generateRootPackageJson({ projectName }),
    });
    allFiles.push({
      path: `${projectName}/docker-compose.yml`,
      content: this.microserviceTemplate.generateDockerCompose({ projectName, services, database }),
    });
    allFiles.push({
      path: `${projectName}/.env.example`,
      content: this.microserviceTemplate.generateEnvExample({ projectName, services, database }),
    });
    allFiles.push({
      path: `${projectName}/README.md`,
      content: this.microserviceTemplate.generateReadme({ projectName, services, database }),
    });

    // 2. Generate gateway configuration
    if (gateway === 'traefik' && this.traefikConfig) {
      allDirectories.push(`${projectName}/gateway/traefik`);
      allDirectories.push(`${projectName}/gateway/traefik/dynamic`);

      allFiles.push({
        path: `${projectName}/gateway/traefik/traefik.yml`,
        content: this.traefikConfig.generateTraefikYml({ services }),
      });
      allFiles.push({
        path: `${projectName}/gateway/traefik/dynamic/routes.yml`,
        content: this.traefikConfig.generateDynamicConfig({ services }),
      });
    }

    // 3. Generate shared kernel
    if (this.sharedKernel) {
      const shared = this.sharedKernel.generate({ services, events });

      // Prefix all directories with project name
      for (const dir of shared.directories) {
        allDirectories.push(`${projectName}/${dir}`);
      }

      // Prefix all file paths with project name
      for (const file of shared.files) {
        allFiles.push({
          path: `${projectName}/${file.path}`,
          content: file.content,
        });
      }
    }

    // 4. Generate messaging patterns
    if (this.messagingPatterns) {
      const messaging = this.messagingPatterns.generate({ events, broker: 'redis' });

      allDirectories.push(`${projectName}/messaging`);

      for (const file of messaging.files) {
        allFiles.push({
          path: `${projectName}/${file.path}`,
          content: file.content,
        });
      }
    }

    // 5. Generate contract testing setup
    if (this.contractTesting) {
      const contractResult = this.contractTesting.generate({
        services,
        broker: contracts,
      });

      allDirectories.push(`${projectName}/contracts`);

      for (const file of contractResult.files) {
        allFiles.push({
          path: `${projectName}/contracts/${file.name}`,
          content: file.content,
        });
      }
    }

    // 6. Generate example services
    if (this.exampleService) {
      let port = DEFAULT_OPTIONS.basePort;

      for (const serviceName of services) {
        const serviceResult = this.exampleService.generate({
          name: serviceName,
          port,
          database,
        });

        // Prefix directories with project name/services
        for (const dir of serviceResult.directories) {
          allDirectories.push(`${projectName}/services/${dir}`);
        }

        // Prefix file paths with project name/services
        for (const file of serviceResult.files) {
          allFiles.push({
            path: `${projectName}/services/${file.path}`,
            content: file.content,
          });
        }

        port++;
      }
    }

    // Deduplicate directories
    const uniqueDirectories = [...new Set(allDirectories)];

    // Deduplicate files by path (keep last occurrence)
    const fileMap = new Map();
    for (const file of allFiles) {
      if (file.path && file.content) {
        fileMap.set(file.path, file);
      }
    }
    const uniqueFiles = [...fileMap.values()];

    return {
      directories: uniqueDirectories,
      files: uniqueFiles,
    };
  }

  /**
   * Get interactive prompts for CLI
   * @returns {Object[]} Array of prompt configurations
   */
  interactivePrompts() {
    return [
      {
        name: 'projectName',
        type: 'input',
        message: 'Project name:',
        default: 'my-platform',
        validate: (value) => {
          if (!value || !value.trim()) {
            return 'Project name is required';
          }
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Project name can only contain lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        name: 'services',
        type: 'input',
        message: 'Services to create (comma-separated):',
        default: 'user,order,notification',
        transform: (value) => {
          return value.split(',').map(s => s.trim()).filter(Boolean);
        },
      },
      {
        name: 'database',
        type: 'select',
        message: 'Database:',
        choices: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
          { value: 'none', label: 'None' },
        ],
        default: 'postgres',
      },
      {
        name: 'events',
        type: 'input',
        message: 'Event names (comma-separated, optional):',
        default: '',
        transform: (value) => {
          if (!value) return [];
          return value.split(',').map(s => s.trim()).filter(Boolean);
        },
      },
      {
        name: 'gateway',
        type: 'select',
        message: 'API Gateway:',
        choices: [
          { value: 'traefik', label: 'Traefik (recommended)' },
          { value: 'nginx', label: 'Nginx' },
        ],
        default: 'traefik',
      },
      {
        name: 'contracts',
        type: 'select',
        message: 'Contract testing mode:',
        choices: [
          { value: 'local', label: 'Local (contracts stored in repo)' },
          { value: 'pactflow', label: 'Pactflow (managed broker)' },
        ],
        default: 'local',
      },
    ];
  }

  /**
   * Generate next steps instructions
   * @param {Object} config - Project configuration
   * @returns {string} Next steps text
   */
  generateNextSteps(config) {
    const { projectName, services = [] } = config;
    const basePort = DEFAULT_OPTIONS.basePort;

    const lines = [
      '',
      'Next steps:',
      '',
      `  1. cd ${projectName}`,
      '',
      '  2. Install dependencies:',
      '     npm install',
      '',
      '  3. Start all services:',
      '     docker-compose up -d',
      '',
      '  4. Access your services:',
    ];

    // Add service URLs
    services.forEach((service, index) => {
      const port = basePort + index;
      lines.push(`     - ${service}: http://localhost:${port}/api/${service}`);
    });

    // Add gateway and dashboard URLs
    lines.push('');
    lines.push('  5. API Gateway:');
    lines.push('     - Gateway: http://localhost:80');
    lines.push('     - Traefik Dashboard: http://localhost:8080');
    lines.push('');
    lines.push('  6. Run tests:');
    lines.push('     npm test');
    lines.push('');
    lines.push('  7. Run contract tests:');
    lines.push('     npm run test:contracts');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Write generated files to disk
   * @param {string} outputPath - Base output path
   * @param {Object} result - Generation result with directories and files
   * @returns {Object} Status { success, error, filesWritten, directoriesCreated }
   */
  createProjectFiles(outputPath, result) {
    const fs = this.fs || require('fs');
    const status = {
      success: true,
      error: null,
      filesWritten: 0,
      directoriesCreated: 0,
    };

    try {
      // Create directories
      for (const dir of result.directories) {
        const fullPath = path.join(outputPath, dir);
        fs.mkdirSync(fullPath, { recursive: true });
        status.directoriesCreated++;
      }

      // Write files
      for (const file of result.files) {
        const fullPath = path.join(outputPath, file.path);
        // Ensure parent directory exists
        const parentDir = path.dirname(fullPath);
        fs.mkdirSync(parentDir, { recursive: true });
        fs.writeFileSync(fullPath, file.content, 'utf-8');
        status.filesWritten++;
      }
    } catch (error) {
      status.success = false;
      status.error = error.message;
    }

    return status;
  }
}

/**
 * Create a NewProjectMicroservice instance with default dependencies
 * @param {Object} options - Options passed to dependencies
 * @returns {NewProjectMicroservice} Configured instance
 */
function createNewProjectMicroservice(options = {}) {
  // Lazy load dependencies to avoid circular requires
  const { MicroserviceTemplate } = require('./microservice-template.js');
  const { TraefikConfig } = require('./traefik-config.js');
  const { SharedKernel } = require('./shared-kernel.js');
  const { MessagingPatterns } = require('./messaging-patterns.js');
  const { ContractTesting } = require('./contract-testing.js');
  const { ExampleService } = require('./example-service.js');

  return new NewProjectMicroservice({
    microserviceTemplate: new MicroserviceTemplate(options),
    traefikConfig: new TraefikConfig(options),
    sharedKernel: new SharedKernel(options),
    messagingPatterns: new MessagingPatterns(options),
    contractTesting: new ContractTesting(options),
    exampleService: new ExampleService(options),
  });
}

module.exports = {
  NewProjectMicroservice,
  createNewProjectMicroservice,
  DEFAULT_OPTIONS,
};
