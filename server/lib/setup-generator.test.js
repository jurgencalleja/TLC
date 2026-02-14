/**
 * Setup Generator Tests
 *
 * Tests for generating setup.md (human-readable instructions) and
 * setup.sh (automated workspace rebuild script) from the projects registry.
 *
 * The setup generator:
 * - Reads the projects registry to discover repos
 * - Detects project types (Node, Python, Go) from marker files
 * - Generates a setup.md with prerequisites and step-by-step instructions
 * - Generates a setup.sh bash script with clone, install, and rebuild commands
 * - Produces idempotent scripts (safe to run multiple times)
 *
 * These tests are written BEFORE the implementation (Red phase).
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createSetupGenerator } from './setup-generator.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock projects registry that returns a configurable list of
 * projects. Mirrors the shape returned by createProjectsRegistry().
 * @param {Array} projects - Array of project entries
 * @returns {object} Mock registry with listProjects stub
 */
function createMockRegistry(projects = []) {
  return {
    load: vi.fn().mockResolvedValue({ version: 1, projects }),
    listProjects: vi.fn().mockResolvedValue(projects),
    save: vi.fn().mockResolvedValue(undefined),
    addProject: vi.fn().mockResolvedValue(undefined),
    removeProject: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Sample project data
// ---------------------------------------------------------------------------

const sampleNodeProject = {
  name: 'api-service',
  gitUrl: 'git@github.com:myorg/api-service.git',
  localPath: 'api-service',
  defaultBranch: 'main',
  hasTlc: true,
  description: 'REST API service',
};

const samplePythonProject = {
  name: 'ml-pipeline',
  gitUrl: 'https://github.com/myorg/ml-pipeline.git',
  localPath: 'ml-pipeline',
  defaultBranch: 'main',
  hasTlc: false,
  description: 'ML training pipeline',
};

const sampleGoProject = {
  name: 'gateway',
  gitUrl: 'git@github.com:myorg/gateway.git',
  localPath: 'gateway',
  defaultBranch: 'main',
  hasTlc: false,
  description: 'API gateway in Go',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fake project directory with the right marker files for
 * project-type detection.
 * @param {string} root - Workspace root
 * @param {string} localPath - Relative path to project dir
 * @param {'node'|'python'|'go'|'unknown'} type - Project type to simulate
 * @param {object} [options] - Extra options
 * @param {string} [options.nodeVersion] - Node.js version for .nvmrc
 * @param {object} [options.engines] - package.json engines field
 */
function createFakeProject(root, localPath, type, options = {}) {
  const dir = path.join(root, localPath);
  fs.mkdirSync(dir, { recursive: true });

  if (type === 'node') {
    const pkg = { name: localPath, version: '1.0.0' };
    if (options.engines) {
      pkg.engines = options.engines;
    }
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
    if (options.nodeVersion) {
      fs.writeFileSync(path.join(dir, '.nvmrc'), options.nodeVersion);
    }
  } else if (type === 'python') {
    fs.writeFileSync(
      path.join(dir, 'requirements.txt'),
      'flask==3.0.0\nnumpy==1.26.0\n'
    );
  } else if (type === 'go') {
    fs.writeFileSync(
      path.join(dir, 'go.mod'),
      'module example.com/gateway\n\ngo 1.21\n'
    );
  }
  // 'unknown' — no marker files
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setup-generator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-generator-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 1. Generates setup.md with prerequisites section
  // -------------------------------------------------------------------------
  it('generates setup.md with prerequisites section', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const md = await generator.generateSetupMd(tempDir);

    expect(md).toContain('# ');                    // Has a markdown heading
    expect(md).toContain('Prerequisites');          // Has prerequisites section
    expect(md).toContain('Node');                   // Mentions Node as a prerequisite
  });

  // -------------------------------------------------------------------------
  // 2. Generates setup.sh with clone commands
  // -------------------------------------------------------------------------
  it('generates setup.sh with clone commands for each project', async () => {
    const registry = createMockRegistry([sampleNodeProject, samplePythonProject]);
    createFakeProject(tempDir, 'api-service', 'node');
    createFakeProject(tempDir, 'ml-pipeline', 'python');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    expect(sh).toContain('#!/bin/bash');
    expect(sh).toContain('git clone');
    expect(sh).toContain('git@github.com:myorg/api-service.git');
    expect(sh).toContain('https://github.com/myorg/ml-pipeline.git');
  });

  // -------------------------------------------------------------------------
  // 3. Setup.sh includes npm install for Node projects
  // -------------------------------------------------------------------------
  it('setup.sh includes npm install for Node projects', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    expect(sh).toContain('npm install');
  });

  // -------------------------------------------------------------------------
  // 4. Setup.sh includes pip install for Python projects
  // -------------------------------------------------------------------------
  it('setup.sh includes pip install for Python projects', async () => {
    const registry = createMockRegistry([samplePythonProject]);
    createFakeProject(tempDir, 'ml-pipeline', 'python');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    expect(sh).toContain('pip install');
  });

  // -------------------------------------------------------------------------
  // 5. Detects Node.js version from .nvmrc or package.json engines
  // -------------------------------------------------------------------------
  it('detects Node.js version from .nvmrc or package.json engines', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node', { nodeVersion: '20.11.0' });

    const generator = createSetupGenerator({ registry });
    const md = await generator.generateSetupMd(tempDir);

    expect(md).toContain('20.11.0');
  });

  // -------------------------------------------------------------------------
  // 5b. Detects Node.js version from package.json engines field
  // -------------------------------------------------------------------------
  it('detects Node.js version from package.json engines field', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node', {
      engines: { node: '>=18.0.0' },
    });

    const generator = createSetupGenerator({ registry });
    const md = await generator.generateSetupMd(tempDir);

    expect(md).toContain('>=18.0.0');
  });

  // -------------------------------------------------------------------------
  // 6. Includes Ollama model pull command
  // -------------------------------------------------------------------------
  it('includes Ollama model pull command', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    expect(sh).toContain('ollama pull mxbai-embed-large');
  });

  // -------------------------------------------------------------------------
  // 7. Includes vector rebuild mention
  // -------------------------------------------------------------------------
  it('includes vector rebuild mention in setup.sh', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    // Should mention vector rebuild in some form
    expect(sh).toMatch(/vector|rebuild|index/i);
  });

  // -------------------------------------------------------------------------
  // 8. Script is idempotent (contains if [ ! -d checks before clone)
  // -------------------------------------------------------------------------
  it('script is idempotent with directory existence checks before clone', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const sh = await generator.generateSetupSh(tempDir);

    // Should contain idempotency guards — check for directory before cloning
    expect(sh).toContain('if [ ! -d');
  });

  // -------------------------------------------------------------------------
  // 9. Setup.md includes TLC dashboard start instructions
  // -------------------------------------------------------------------------
  it('setup.md includes TLC dashboard start instructions', async () => {
    const registry = createMockRegistry([sampleNodeProject]);
    createFakeProject(tempDir, 'api-service', 'node');

    const generator = createSetupGenerator({ registry });
    const md = await generator.generateSetupMd(tempDir);

    // Should mention starting the TLC dashboard
    expect(md).toMatch(/dashboard|tlc.*start|tlc-server/i);
  });

  // -------------------------------------------------------------------------
  // 10. Handles workspace with mixed project types (Node + Python)
  // -------------------------------------------------------------------------
  it('handles workspace with mixed project types (Node, Python, Go)', async () => {
    const registry = createMockRegistry([
      sampleNodeProject,
      samplePythonProject,
      sampleGoProject,
    ]);
    createFakeProject(tempDir, 'api-service', 'node');
    createFakeProject(tempDir, 'ml-pipeline', 'python');
    createFakeProject(tempDir, 'gateway', 'go');

    const generator = createSetupGenerator({ registry });

    const sh = await generator.generateSetupSh(tempDir);
    const md = await generator.generateSetupMd(tempDir);

    // sh should have npm install for Node project
    expect(sh).toContain('npm install');
    // sh should have pip install for Python project
    expect(sh).toContain('pip install');
    // sh should clone all three repos
    expect(sh).toContain('api-service');
    expect(sh).toContain('ml-pipeline');
    expect(sh).toContain('gateway');

    // md should mention multiple prerequisites
    expect(md).toContain('Node');
    expect(md).toContain('Python');
    expect(md).toContain('Go');
  });
});
