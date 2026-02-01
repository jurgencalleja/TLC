import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { BulkRepoInit } = await import('./bulk-repo-init.js');

describe('BulkRepoInit', () => {
  let tempDir;
  let bulkInit;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-repo-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detection', () => {
    it('detects repo without .tlc.json', () => {
      // Create a repo without TLC config
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "my-repo"}');

      bulkInit = new BulkRepoInit(tempDir);
      const repos = bulkInit.findUninitializedRepos();

      expect(repos).toContain('my-repo');
    });

    it('skips repos that already have .tlc.json', () => {
      // Create a repo WITH TLC config
      const repoPath = path.join(tempDir, 'initialized-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "initialized-repo"}');
      fs.writeFileSync(path.join(repoPath, '.tlc.json'), '{}');

      bulkInit = new BulkRepoInit(tempDir);
      const repos = bulkInit.findUninitializedRepos();

      expect(repos).not.toContain('initialized-repo');
    });
  });

  describe('project type detection', () => {
    it('detects Node.js project (package.json)', () => {
      const repoPath = path.join(tempDir, 'node-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "node-repo"}');

      bulkInit = new BulkRepoInit(tempDir);
      const projectType = bulkInit.detectProjectType(repoPath);

      expect(projectType).toBe('node');
    });

    it('detects Python project (pyproject.toml)', () => {
      const repoPath = path.join(tempDir, 'python-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'pyproject.toml'), '[project]\nname = "python-repo"');

      bulkInit = new BulkRepoInit(tempDir);
      const projectType = bulkInit.detectProjectType(repoPath);

      expect(projectType).toBe('python');
    });

    it('detects Python project (setup.py)', () => {
      const repoPath = path.join(tempDir, 'python-repo-2');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'setup.py'), 'from setuptools import setup\nsetup()');

      bulkInit = new BulkRepoInit(tempDir);
      const projectType = bulkInit.detectProjectType(repoPath);

      expect(projectType).toBe('python');
    });

    it('detects Go project (go.mod)', () => {
      const repoPath = path.join(tempDir, 'go-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'go.mod'), 'module example.com/go-repo\n\ngo 1.21');

      bulkInit = new BulkRepoInit(tempDir);
      const projectType = bulkInit.detectProjectType(repoPath);

      expect(projectType).toBe('go');
    });

    it('returns unknown for unrecognized project type', () => {
      const repoPath = path.join(tempDir, 'unknown-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'README.md'), '# Unknown Project');

      bulkInit = new BulkRepoInit(tempDir);
      const projectType = bulkInit.detectProjectType(repoPath);

      expect(projectType).toBe('unknown');
    });
  });

  describe('test framework detection', () => {
    it('infers vitest from vite.config', () => {
      const repoPath = path.join(tempDir, 'vitest-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "vitest-repo"}');
      fs.writeFileSync(path.join(repoPath, 'vite.config.js'), 'export default {}');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('vitest');
    });

    it('infers vitest from vitest.config', () => {
      const repoPath = path.join(tempDir, 'vitest-repo-2');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "vitest-repo-2"}');
      fs.writeFileSync(path.join(repoPath, 'vitest.config.js'), 'export default {}');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('vitest');
    });

    it('infers jest from jest.config', () => {
      const repoPath = path.join(tempDir, 'jest-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "jest-repo"}');
      fs.writeFileSync(path.join(repoPath, 'jest.config.js'), 'module.exports = {}');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('jest');
    });

    it('infers pytest from pytest.ini', () => {
      const repoPath = path.join(tempDir, 'pytest-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'pyproject.toml'), '[project]\nname = "pytest-repo"');
      fs.writeFileSync(path.join(repoPath, 'pytest.ini'), '[pytest]\ntestpaths = tests');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('pytest');
    });

    it('infers pytest from pyproject.toml with pytest config', () => {
      const repoPath = path.join(tempDir, 'pytest-repo-2');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'pyproject.toml'),
        '[project]\nname = "pytest-repo-2"\n\n[tool.pytest.ini_options]\ntestpaths = ["tests"]'
      );

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('pytest');
    });

    it('infers mocha from mocha config', () => {
      const repoPath = path.join(tempDir, 'mocha-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "mocha-repo"}');
      fs.writeFileSync(path.join(repoPath, '.mocharc.json'), '{}');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('mocha');
    });

    it('infers test framework from package.json devDependencies', () => {
      const repoPath = path.join(tempDir, 'jest-dep-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'jest-dep-repo',
          devDependencies: { jest: '^29.0.0' },
        })
      );

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBe('jest');
    });

    it('returns null for unknown test framework', () => {
      const repoPath = path.join(tempDir, 'no-test-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "no-test-repo"}');

      bulkInit = new BulkRepoInit(tempDir);
      const framework = bulkInit.detectTestFramework(repoPath);

      expect(framework).toBeNull();
    });
  });

  describe('initialization', () => {
    it('creates .tlc.json with inferred settings', () => {
      const repoPath = path.join(tempDir, 'init-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'init-repo' })
      );
      fs.writeFileSync(path.join(repoPath, 'jest.config.js'), 'module.exports = {}');

      bulkInit = new BulkRepoInit(tempDir);
      bulkInit.initializeRepo('init-repo');

      const tlcConfigPath = path.join(repoPath, '.tlc.json');
      expect(fs.existsSync(tlcConfigPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(tlcConfigPath, 'utf-8'));
      expect(config.project).toBe('init-repo');
      expect(config.testFrameworks.primary).toBe('jest');
    });

    it('creates minimal .tlc.json for each repo', () => {
      const repoPath = path.join(tempDir, 'minimal-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "minimal-repo"}');

      bulkInit = new BulkRepoInit(tempDir);
      bulkInit.initializeRepo('minimal-repo');

      const tlcConfigPath = path.join(repoPath, '.tlc.json');
      const config = JSON.parse(fs.readFileSync(tlcConfigPath, 'utf-8'));

      // Should have minimal required fields
      expect(config).toHaveProperty('project');
      expect(config).toHaveProperty('testFrameworks');
      expect(config).toHaveProperty('paths');
    });

    it('sets project name from package.json', () => {
      const repoPath = path.join(tempDir, 'named-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: '@scope/my-package' })
      );

      bulkInit = new BulkRepoInit(tempDir);
      bulkInit.initializeRepo('named-repo');

      const tlcConfigPath = path.join(repoPath, '.tlc.json');
      const config = JSON.parse(fs.readFileSync(tlcConfigPath, 'utf-8'));

      expect(config.project).toBe('@scope/my-package');
    });
  });

  describe('bulk initialization', () => {
    it('initializes multiple repos at once', () => {
      // Create multiple repos
      ['repo-a', 'repo-b', 'repo-c'].forEach(name => {
        const repoPath = path.join(tempDir, name);
        fs.mkdirSync(repoPath);
        fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify({ name }));
      });

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeAll();

      expect(result.initialized).toBe(3);
      expect(fs.existsSync(path.join(tempDir, 'repo-a', '.tlc.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'repo-b', '.tlc.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'repo-c', '.tlc.json'))).toBe(true);
    });

    it('handles mixed project types in workspace', () => {
      // Create Node repo
      const nodeRepo = path.join(tempDir, 'node-app');
      fs.mkdirSync(nodeRepo);
      fs.writeFileSync(path.join(nodeRepo, 'package.json'), '{"name": "node-app"}');

      // Create Python repo
      const pythonRepo = path.join(tempDir, 'python-app');
      fs.mkdirSync(pythonRepo);
      fs.writeFileSync(path.join(pythonRepo, 'pyproject.toml'), '[project]\nname = "python-app"');

      // Create Go repo
      const goRepo = path.join(tempDir, 'go-app');
      fs.mkdirSync(goRepo);
      fs.writeFileSync(path.join(goRepo, 'go.mod'), 'module example.com/go-app\n\ngo 1.21');

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeAll();

      expect(result.initialized).toBe(3);

      // Verify each has correct project type
      const nodeConfig = JSON.parse(fs.readFileSync(path.join(nodeRepo, '.tlc.json'), 'utf-8'));
      expect(nodeConfig.projectType).toBe('node');

      const pythonConfig = JSON.parse(fs.readFileSync(path.join(pythonRepo, '.tlc.json'), 'utf-8'));
      expect(pythonConfig.projectType).toBe('python');

      const goConfig = JSON.parse(fs.readFileSync(path.join(goRepo, '.tlc.json'), 'utf-8'));
      expect(goConfig.projectType).toBe('go');
    });

    it('reports summary (X initialized, Y failed)', () => {
      // Create repos - 2 that can be initialized
      ['good-repo-1', 'good-repo-2'].forEach(name => {
        const repoPath = path.join(tempDir, name);
        fs.mkdirSync(repoPath);
        fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify({ name }));
      });

      // Create a repo that already has .tlc.json (should be skipped, not failed)
      const existingRepo = path.join(tempDir, 'existing-repo');
      fs.mkdirSync(existingRepo);
      fs.writeFileSync(path.join(existingRepo, 'package.json'), '{"name": "existing-repo"}');
      fs.writeFileSync(path.join(existingRepo, '.tlc.json'), '{}');

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeAll();

      expect(result.initialized).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(3);
    });

    it('reports failures per repo', () => {
      // Create a repo with read-only .tlc.json location (simulate failure)
      const repoPath = path.join(tempDir, 'fail-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "fail-repo"}');

      // Create a directory named .tlc.json to cause write failure
      fs.mkdirSync(path.join(repoPath, '.tlc.json'));

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeAll();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].repo).toBe('fail-repo');
      expect(result.errors[0].error).toBeDefined();
    });

    it('provides list of initialized repos in result', () => {
      ['repo-x', 'repo-y'].forEach(name => {
        const repoPath = path.join(tempDir, name);
        fs.mkdirSync(repoPath);
        fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify({ name }));
      });

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeAll();

      expect(result.repos).toContain('repo-x');
      expect(result.repos).toContain('repo-y');
    });
  });

  describe('selective initialization', () => {
    it('can initialize specific repos only', () => {
      // Create multiple repos
      ['repo-1', 'repo-2', 'repo-3'].forEach(name => {
        const repoPath = path.join(tempDir, name);
        fs.mkdirSync(repoPath);
        fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify({ name }));
      });

      bulkInit = new BulkRepoInit(tempDir);
      const result = bulkInit.initializeRepos(['repo-1', 'repo-3']);

      expect(result.initialized).toBe(2);
      expect(fs.existsSync(path.join(tempDir, 'repo-1', '.tlc.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'repo-2', '.tlc.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'repo-3', '.tlc.json'))).toBe(true);
    });
  });
});
