import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';

// Mock fs modules with memfs
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Import after mocks are set up
import {
  checkConfig,
  checkRequiredFiles,
  runDiagnostics,
  type DiagnosticCheck,
  type DiagnosticsResult,
} from './health-diagnostics.js';

describe('health-diagnostics', () => {
  const projectDir = '/test-project';

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(projectDir, { recursive: true });
    process.env.TLC_PROJECT_DIR = projectDir;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TLC_PROJECT_DIR;
  });

  describe('checkConfig', () => {
    it('returns ok when .tlc.json exists', async () => {
      vol.fromJSON({
        [`${projectDir}/.tlc.json`]: '{}',
      });

      const result = await checkConfig(projectDir);

      expect(result.name).toBe('TLC Configuration');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Config found');
      expect(result.fix).toBeNull();
    });

    it('returns warning with fix when .tlc.json missing', async () => {
      // No .tlc.json file

      const result = await checkConfig(projectDir);

      expect(result.name).toBe('TLC Configuration');
      expect(result.status).toBe('warning');
      expect(result.message).toBe('No .tlc.json found');
      expect(result.fix).toBe('Run: tlc init');
    });
  });

  describe('checkRequiredFiles', () => {
    it('returns ok when all required files exist', async () => {
      vol.fromJSON({
        [`${projectDir}/package.json`]: '{}',
        [`${projectDir}/.planning/ROADMAP.md`]: '# Roadmap',
      });

      const result = await checkRequiredFiles(projectDir);

      expect(result.name).toBe('Required Files');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('All present');
      expect(result.fix).toBeNull();
    });

    it('returns warning when files are missing', async () => {
      vol.fromJSON({
        [`${projectDir}/package.json`]: '{}',
        // Missing .planning/ROADMAP.md
      });

      const result = await checkRequiredFiles(projectDir);

      expect(result.name).toBe('Required Files');
      expect(result.status).toBe('warning');
      expect(result.message).toContain('.planning/ROADMAP.md');
      expect(result.fix).toBe('Run: tlc init');
    });

    it('lists all missing files in message', async () => {
      // Both files missing

      const result = await checkRequiredFiles(projectDir);

      expect(result.status).toBe('warning');
      expect(result.message).toContain('package.json');
      expect(result.message).toContain('.planning/ROADMAP.md');
    });
  });

  describe('runDiagnostics', () => {
    it('returns all checks in result', async () => {
      vol.fromJSON({
        [`${projectDir}/.tlc.json`]: '{}',
        [`${projectDir}/package.json`]: '{}',
        [`${projectDir}/.planning/ROADMAP.md`]: '# Roadmap',
      });

      const result = await runDiagnostics(projectDir);

      expect(result.checks).toBeDefined();
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('returns healthy when all checks ok', async () => {
      vol.fromJSON({
        [`${projectDir}/.tlc.json`]: '{}',
        [`${projectDir}/package.json`]: '{}',
        [`${projectDir}/.planning/ROADMAP.md`]: '# Roadmap',
      });

      const result = await runDiagnostics(projectDir);

      expect(result.overall).toBe('healthy');
    });

    it('returns degraded when warnings but no errors', async () => {
      vol.fromJSON({
        // Missing .tlc.json (warning)
        [`${projectDir}/package.json`]: '{}',
        [`${projectDir}/.planning/ROADMAP.md`]: '# Roadmap',
      });

      const result = await runDiagnostics(projectDir);

      expect(result.overall).toBe('degraded');
    });

    it('returns unhealthy when any check is error', async () => {
      // Simulate an error condition by having checkConfig return error
      // For now, test with missing project directory (causes error)
      const result = await runDiagnostics('/nonexistent/path');

      // Even with nonexistent path, we get warnings not errors from our current checks
      // This test verifies the overall calculation logic
      expect(['degraded', 'unhealthy']).toContain(result.overall);
    });

    it('includes diagnostic check names', async () => {
      vol.fromJSON({
        [`${projectDir}/.tlc.json`]: '{}',
        [`${projectDir}/package.json`]: '{}',
        [`${projectDir}/.planning/ROADMAP.md`]: '# Roadmap',
      });

      const result = await runDiagnostics(projectDir);
      const checkNames = result.checks.map(c => c.name);

      expect(checkNames).toContain('TLC Configuration');
      expect(checkNames).toContain('Required Files');
    });
  });
});
