/**
 * Shared Kernel Generator Module
 * Generates shared code structure for microservices
 */

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate package.json for shared kernel
 * @param {Object} config - Configuration
 * @param {string} config.projectName - Project name
 * @returns {Object} Package.json content
 */
function generatePackageJson(config) {
  const { projectName = 'app' } = config;

  return {
    name: `@${projectName}/shared`,
    version: '1.0.0',
    description: `Shared types, contracts, and utilities for ${projectName}`,
    type: 'module',
    main: './index.js',
    types: './index.d.ts',
    exports: {
      '.': {
        types: './index.d.ts',
        import: './index.js',
      },
      './types': {
        types: './types/index.d.ts',
        import: './types/index.js',
      },
      './contracts': {
        types: './contracts/index.d.ts',
        import: './contracts/index.js',
      },
      './events': {
        types: './events/index.d.ts',
        import: './events/index.js',
      },
      './utils': {
        types: './utils/index.d.ts',
        import: './utils/index.js',
      },
    },
    scripts: {
      build: 'tsc',
      clean: 'rm -rf dist',
    },
    devDependencies: {
      typescript: '^5.0.0',
    },
  };
}

/**
 * Generate TypeScript types for shared kernel
 * @param {Object} config - Configuration
 * @param {Array<string>} config.services - Service names
 * @returns {string} TypeScript type definitions
 */
function generateTypes(config) {
  const { services = [] } = config;

  const lines = [];

  // Common types
  lines.push('// Common Types');
  lines.push('');
  lines.push('export type ID = string;');
  lines.push('');
  lines.push('export type Timestamp = string;');
  lines.push('');
  lines.push('export interface PaginatedResponse<T> {');
  lines.push('  data: T[];');
  lines.push('  total: number;');
  lines.push('  page: number;');
  lines.push('  pageSize: number;');
  lines.push('  hasMore: boolean;');
  lines.push('}');
  lines.push('');

  // Service-specific types
  if (services.length > 0) {
    lines.push('// Service-Specific Types');
    lines.push('');

    for (const service of services) {
      const typeName = capitalize(service);
      lines.push(`export interface ${typeName} {`);
      lines.push('  id: ID;');
      lines.push('  createdAt: Timestamp;');
      lines.push('  updatedAt: Timestamp;');
      lines.push('}');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate JSON Schema contracts for services
 * @param {Array<string>} services - Service names
 * @returns {Object} Contract schemas by service
 */
function generateContracts(services) {
  const contracts = {};

  for (const service of services) {
    const serviceName = capitalize(service);

    contracts[service] = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: `${service}-contract`,
      title: `${serviceName} Service Contract`,
      description: `API contract for ${serviceName} service`,
      definitions: {
        Request: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Resource identifier' },
          },
        },
        Response: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
      },
    };
  }

  return contracts;
}

/**
 * Generate event definitions for shared kernel
 * @param {Array<string>} events - Event names
 * @returns {Object} Event definitions
 */
function generateEvents(events) {
  // Base event interface
  const base = `// Base Event Interface
export interface BaseEvent<T = unknown> {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  payload: T;
  metadata?: Record<string, unknown>;
}
`;

  // Per-event schemas
  const schemas = {};
  for (const event of events) {
    schemas[event] = `export interface ${event}Event extends BaseEvent<${event}Payload> {
  type: '${event}';
  payload: ${event}Payload;
}

export interface ${event}Payload {
  // Define payload fields for ${event}
}
`;
  }

  // Event catalog
  const catalogLines = [
    '// Event Catalog',
    '',
    'export const EventCatalog = {',
  ];

  for (const event of events) {
    catalogLines.push(`  ${event}: '${event}',`);
  }

  catalogLines.push('} as const;');
  catalogLines.push('');
  catalogLines.push('export type EventType = keyof typeof EventCatalog;');

  const catalog = catalogLines.join('\n');

  return {
    base,
    schemas,
    catalog,
  };
}

/**
 * Generate utility modules for shared kernel
 * @returns {Object} Utility module contents
 */
function generateUtils() {
  const logger = `// Logger Utility

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(name: string): Logger {
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    console[level](\`[\${timestamp}] [\${level.toUpperCase()}] [\${name}] \${message}\`, meta || '');
  };

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    log,
  };
}
`;

  const errors = `// Error Classes

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string = 'APP_ERROR', statusCode: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? \`\${resource} with id '\${id}' not found\` : \`\${resource} not found\`;
    super(message, 'NOT_FOUND', 404, { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}
`;

  const validation = `// Validation Helpers

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export function validate<T>(
  data: T,
  rules: Record<keyof T, (value: unknown) => string | null>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, rule] of Object.entries(rules) as Array<[keyof T, (value: unknown) => string | null]>) {
    const error = rule(data[field]);
    if (error) {
      errors.push({
        field: String(field),
        message: error,
        code: 'VALIDATION_FAILED',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const validators = {
  required: (value: unknown) => (value == null || value === '' ? 'Required' : null),
  email: (value: unknown) =>
    typeof value === 'string' && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value) ? null : 'Invalid email',
  minLength: (min: number) => (value: unknown) =>
    typeof value === 'string' && value.length >= min ? null : \`Minimum length is \${min}\`,
  maxLength: (max: number) => (value: unknown) =>
    typeof value === 'string' && value.length <= max ? null : \`Maximum length is \${max}\`,
  uuid: (value: unknown) =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
      ? null
      : 'Invalid UUID',
};
`;

  return {
    logger,
    errors,
    validation,
  };
}

/**
 * Shared Kernel class for generating microservice shared code
 */
class SharedKernel {
  /**
   * Create a SharedKernel instance
   * @param {Object} options - Configuration options
   * @param {string} options.projectName - Project name
   */
  constructor(options = {}) {
    this.projectName = options.projectName || 'app';
  }

  /**
   * Generate complete shared kernel
   * @param {Object} config - Generation config
   * @param {Array<string>} config.services - Service names
   * @param {Array<string>} config.events - Event names
   * @returns {Object} Generated structure
   */
  generate(config) {
    const { services = [], events = [] } = config;

    const directories = [
      'shared',
      'shared/types',
      'shared/contracts',
      'shared/events',
      'shared/utils',
    ];

    const files = [];

    // Package.json
    const pkg = generatePackageJson({ projectName: this.projectName });
    files.push({
      path: 'shared/package.json',
      content: JSON.stringify(pkg, null, 2),
    });

    // Types
    const types = generateTypes({ services });
    files.push({
      path: 'shared/types/index.ts',
      content: types,
    });

    // Contracts
    const contracts = generateContracts(services);
    files.push({
      path: 'shared/contracts/index.ts',
      content: this._generateContractsIndex(contracts),
    });

    for (const [service, schema] of Object.entries(contracts)) {
      files.push({
        path: `shared/contracts/${service}.schema.json`,
        content: JSON.stringify(schema, null, 2),
      });
    }

    // Events
    const eventDefs = generateEvents(events);
    files.push({
      path: 'shared/events/index.ts',
      content: this._generateEventsIndex(eventDefs, events),
    });

    // Utils
    const utils = generateUtils();
    files.push({
      path: 'shared/utils/logger.ts',
      content: utils.logger,
    });
    files.push({
      path: 'shared/utils/errors.ts',
      content: utils.errors,
    });
    files.push({
      path: 'shared/utils/validation.ts',
      content: utils.validation,
    });
    files.push({
      path: 'shared/utils/index.ts',
      content: this._generateUtilsIndex(),
    });

    // Root index
    files.push({
      path: 'shared/index.ts',
      content: this._generateRootIndex(),
    });

    // tsconfig
    files.push({
      path: 'shared/tsconfig.json',
      content: JSON.stringify(this._generateTsConfig(), null, 2),
    });

    return { directories, files };
  }

  /**
   * Generate contracts index file
   * @private
   */
  _generateContractsIndex(contracts) {
    const lines = ['// Contract schemas'];
    lines.push('');

    for (const service of Object.keys(contracts)) {
      lines.push(`export { default as ${capitalize(service)}Contract } from './${service}.schema.json';`);
    }

    if (Object.keys(contracts).length === 0) {
      lines.push('// No contracts defined');
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Generate events index file
   * @private
   */
  _generateEventsIndex(eventDefs, events) {
    const lines = [];
    lines.push(eventDefs.base);
    lines.push('');

    for (const event of events) {
      lines.push(eventDefs.schemas[event]);
    }

    lines.push(eventDefs.catalog);

    return lines.join('\n');
  }

  /**
   * Generate utils index file
   * @private
   */
  _generateUtilsIndex() {
    return `export * from './logger';
export * from './errors';
export * from './validation';
`;
  }

  /**
   * Generate root index file
   * @private
   */
  _generateRootIndex() {
    return `export * from './types';
export * from './events';
export * from './utils';
`;
  }

  /**
   * Generate TypeScript config
   * @private
   */
  _generateTsConfig() {
    return {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: './dist',
        rootDir: './',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
      },
      include: ['./**/*.ts'],
      exclude: ['node_modules', 'dist'],
    };
  }
}

/**
 * Create shared kernel generator instance
 * @param {Object} options - Generator options
 * @returns {Object} Generator instance
 */
function createSharedKernel(options = {}) {
  const kernel = new SharedKernel(options);
  return {
    generate: (config) => kernel.generate(config),
    generatePackageJson: () => generatePackageJson({ projectName: kernel.projectName }),
    generateTypes: (config) => generateTypes(config),
    generateContracts: (services) => generateContracts(services),
    generateEvents: (events) => generateEvents(events),
    generateUtils: () => generateUtils(),
  };
}

module.exports = {
  SharedKernel,
  createSharedKernel,
  generatePackageJson,
  generateTypes,
  generateContracts,
  generateEvents,
  generateUtils,
  capitalize,
};
