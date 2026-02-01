/**
 * Service Summary Generator Tests
 * Generate "What does this repo do" one-pager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { ServiceSummaryGenerator, generateServiceSummary, createServiceSummaryGenerator } = await import('./service-summary.js');

describe('ServiceSummaryGenerator', () => {
  let tempDir;
  let generator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-summary-test-'));
    generator = new ServiceSummaryGenerator(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractPurpose', () => {
    it('extracts purpose from package.json description', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'user-service',
          description: 'Handles user authentication and profile management',
        })
      );

      const purpose = generator.extractPurpose();

      expect(purpose).toBe('Handles user authentication and profile management');
    });

    it('falls back to README first paragraph when no package.json description', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'my-service',
        })
      );
      fs.writeFileSync(
        path.join(tempDir, 'README.md'),
        `# My Service

This service provides API endpoints for managing orders and inventory.

## Installation

Run npm install.
`
      );

      const purpose = generator.extractPurpose();

      expect(purpose).toContain('API endpoints');
      expect(purpose).toContain('orders');
    });

    it('returns empty string when no description available', () => {
      // No package.json, no README
      const purpose = generator.extractPurpose();

      expect(purpose).toBe('');
    });

    it('handles package.json with empty description', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'empty-desc',
          description: '',
        })
      );

      const purpose = generator.extractPurpose();

      expect(purpose).toBe('');
    });
  });

  describe('identifyMainEntryPoints', () => {
    it('identifies index.js as main entry point', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-pkg' })
      );
      fs.writeFileSync(path.join(tempDir, 'index.js'), 'module.exports = {};');

      const entryPoints = generator.identifyMainEntryPoints();

      expect(entryPoints).toContainEqual(
        expect.objectContaining({
          file: 'index.js',
          type: 'main',
        })
      );
    });

    it('identifies main.ts as entry point', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'ts-pkg' })
      );
      fs.writeFileSync(path.join(tempDir, 'main.ts'), 'export default {};');

      const entryPoints = generator.identifyMainEntryPoints();

      expect(entryPoints).toContainEqual(
        expect.objectContaining({
          file: 'main.ts',
          type: 'main',
        })
      );
    });

    it('uses package.json main field when specified', () => {
      fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'with-main',
          main: 'dist/index.js',
        })
      );
      fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), '');

      const entryPoints = generator.identifyMainEntryPoints();

      expect(entryPoints).toContainEqual(
        expect.objectContaining({
          file: 'dist/index.js',
          type: 'main',
        })
      );
    });

    it('identifies bin entry points for CLI tools', () => {
      fs.mkdirSync(path.join(tempDir, 'bin'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'cli-tool',
          bin: {
            'my-cli': './bin/cli.js',
          },
        })
      );
      fs.writeFileSync(path.join(tempDir, 'bin', 'cli.js'), '#!/usr/bin/env node');

      const entryPoints = generator.identifyMainEntryPoints();

      expect(entryPoints).toContainEqual(
        expect.objectContaining({
          file: 'bin/cli.js',
          type: 'bin',
          name: 'my-cli',
        })
      );
    });

    it('returns empty array when no entry points found', () => {
      // Empty directory
      const entryPoints = generator.identifyMainEntryPoints();

      expect(entryPoints).toEqual([]);
    });
  });

  describe('listExports', () => {
    it('lists exported functions from index.js', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'exports-test' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'index.js'),
        `
module.exports = {
  createUser,
  deleteUser,
  updateUser,
};

function createUser() {}
function deleteUser() {}
function updateUser() {}
`
      );

      const exports = generator.listExports();

      expect(exports).toContain('createUser');
      expect(exports).toContain('deleteUser');
      expect(exports).toContain('updateUser');
    });

    it('lists exported classes from ES modules', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'class-exports', type: 'module' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'index.js'),
        `
export class UserService {}
export class AuthService {}
export default class MainApp {}
`
      );

      const exports = generator.listExports();

      expect(exports).toContain('UserService');
      expect(exports).toContain('AuthService');
      expect(exports).toContain('MainApp');
    });

    it('lists named exports from TypeScript', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'ts-exports', main: 'index.ts' })
      );
      fs.writeFileSync(
        path.join(tempDir, 'index.ts'),
        `
export function processOrder(order: Order): void {}
export const ORDER_STATUS = { PENDING: 'pending' };
export interface Order { id: string; }
export type OrderId = string;
`
      );

      const exports = generator.listExports();

      expect(exports).toContain('processOrder');
      expect(exports).toContain('ORDER_STATUS');
      // Interfaces and types may or may not be listed depending on implementation
    });

    it('returns empty array when no exports found', () => {
      // No files
      const exports = generator.listExports();

      expect(exports).toEqual([]);
    });
  });

  describe('getConsumerRepos', () => {
    it('shows consumer repos from dependency tracker', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: '@myorg/core', version: '1.0.0' })
      );

      // Mock workspace context with dependents
      const mockWorkspace = {
        getDependents: vi.fn().mockReturnValue(['api-service', 'web-app']),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const consumers = generator.getConsumerRepos();

      expect(consumers).toContain('api-service');
      expect(consumers).toContain('web-app');
    });

    it('returns empty array when no workspace context', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'standalone' })
      );

      const consumers = generator.getConsumerRepos();

      expect(consumers).toEqual([]);
    });

    it('returns empty array when no consumers exist', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: '@myorg/leaf-service' })
      );

      const mockWorkspace = {
        getDependents: vi.fn().mockReturnValue([]),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const consumers = generator.getConsumerRepos();

      expect(consumers).toEqual([]);
    });
  });

  describe('getDependencyRepos', () => {
    it('shows dependency repos from dependency tracker', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: '@myorg/api',
          dependencies: {
            '@myorg/core': 'workspace:*',
            '@myorg/utils': 'workspace:*',
          },
        })
      );

      const mockWorkspace = {
        getDependencies: vi.fn().mockReturnValue(['core', 'utils']),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const deps = generator.getDependencyRepos();

      expect(deps).toContain('core');
      expect(deps).toContain('utils');
    });

    it('returns empty array when no workspace context', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'standalone' })
      );

      const deps = generator.getDependencyRepos();

      expect(deps).toEqual([]);
    });

    it('returns empty array when no workspace dependencies', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: '@myorg/core',
          dependencies: {
            express: '^4.18.0', // External, not workspace
          },
        })
      );

      const mockWorkspace = {
        getDependencies: vi.fn().mockReturnValue([]),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const deps = generator.getDependencyRepos();

      expect(deps).toEqual([]);
    });
  });

  describe('analyzeFileStructure', () => {
    it('infers API service from routes directory', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'api-service' })
      );
      fs.mkdirSync(path.join(tempDir, 'src', 'routes'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src', 'routes', 'users.js'), '');

      const analysis = generator.analyzeFileStructure();

      expect(analysis.type).toBe('api');
      expect(analysis.indicators).toContain('routes directory');
    });

    it('infers CLI tool from bin directory', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'my-cli',
          bin: { 'my-cli': './bin/cli.js' },
        })
      );
      fs.mkdirSync(path.join(tempDir, 'bin'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'bin', 'cli.js'), '');

      const analysis = generator.analyzeFileStructure();

      expect(analysis.type).toBe('cli');
      expect(analysis.indicators).toContain('bin entry');
    });

    it('infers library from src with index exports', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-lib' })
      );
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), 'export const lib = {};');

      const analysis = generator.analyzeFileStructure();

      expect(analysis.type).toBe('library');
    });

    it('infers web app from components directory', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'web-app' })
      );
      fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src', 'components', 'App.jsx'), '');

      const analysis = generator.analyzeFileStructure();

      expect(analysis.type).toBe('web-app');
      expect(analysis.indicators).toContain('components directory');
    });

    it('returns unknown type for unrecognized structure', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'mystery' })
      );

      const analysis = generator.analyzeFileStructure();

      expect(analysis.type).toBe('unknown');
    });
  });

  describe('generate', () => {
    it('generates markdown summary', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'user-service',
          description: 'Manages user accounts',
          version: '2.1.0',
        })
      );
      fs.writeFileSync(
        path.join(tempDir, 'index.js'),
        `
module.exports = { createUser, getUser };
function createUser() {}
function getUser() {}
`
      );
      fs.mkdirSync(path.join(tempDir, 'src', 'routes'), { recursive: true });

      const summary = generator.generate();

      expect(summary).toContain('# user-service');
      expect(summary).toContain('Manages user accounts');
      expect(summary).toContain('## Overview');
      expect(summary).toContain('## Entry Points');
      expect(summary).toContain('## Exports');
    });

    it('includes consumers section when consumers exist', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: '@myorg/shared' })
      );

      const mockWorkspace = {
        getDependents: vi.fn().mockReturnValue(['api', 'web']),
        getDependencies: vi.fn().mockReturnValue([]),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const summary = generator.generate();

      expect(summary).toContain('## Consumers');
      expect(summary).toContain('api');
      expect(summary).toContain('web');
    });

    it('includes dependencies section when dependencies exist', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: '@myorg/api' })
      );

      const mockWorkspace = {
        getDependents: vi.fn().mockReturnValue([]),
        getDependencies: vi.fn().mockReturnValue(['core', 'utils']),
      };

      generator.setWorkspaceContext(mockWorkspace);
      const summary = generator.generate();

      expect(summary).toContain('## Dependencies');
      expect(summary).toContain('core');
      expect(summary).toContain('utils');
    });

    it('handles repo with minimal info', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'minimal' })
      );

      const summary = generator.generate();

      expect(summary).toContain('# minimal');
      // Should not throw and should produce valid markdown
      expect(summary).toMatch(/^# /);
    });

    it('skips empty sections', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'empty-sections' })
      );

      const summary = generator.generate();

      // Should not have Consumers section if no consumers
      expect(summary).not.toContain('## Consumers');
      // Should not have Dependencies section if no workspace deps
      expect(summary).not.toContain('## Dependencies');
    });
  });

  describe('write', () => {
    it('writes summary to disk', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'writeable' })
      );

      generator.write();

      const outputPath = path.join(tempDir, 'SERVICE-SUMMARY.md');
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('# writeable');
    });

    it('accepts custom output path', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'custom-path' })
      );
      fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });

      const customPath = path.join(tempDir, 'docs', 'SUMMARY.md');
      generator.write(customPath);

      expect(fs.existsSync(customPath)).toBe(true);
    });
  });
});

describe('generateServiceSummary', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-summary-fn-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('is a convenience function that generates summary for a path', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'quick-service',
        description: 'Quick generation test',
      })
    );

    const summary = generateServiceSummary(tempDir);

    expect(summary).toContain('# quick-service');
    expect(summary).toContain('Quick generation test');
  });
});

describe('createServiceSummaryGenerator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-summary-factory-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a generator with methods', () => {
    const gen = createServiceSummaryGenerator(tempDir);

    expect(gen.generate).toBeDefined();
    expect(gen.write).toBeDefined();
    expect(gen.extractPurpose).toBeDefined();
    expect(gen.identifyMainEntryPoints).toBeDefined();
    expect(gen.listExports).toBeDefined();
    expect(gen.getConsumerRepos).toBeDefined();
    expect(gen.getDependencyRepos).toBeDefined();
    expect(gen.analyzeFileStructure).toBeDefined();
    expect(gen.setWorkspaceContext).toBeDefined();
  });

  it('generates summary through factory instance', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'factory-service' })
    );

    const gen = createServiceSummaryGenerator(tempDir);
    const summary = gen.generate();

    expect(summary).toContain('# factory-service');
  });
});
