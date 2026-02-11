import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { GlobalConfig } = await import('./global-config.js');

describe('GlobalConfig', () => {
  let tempDir;
  let originalEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-config-test-'));
    originalEnv = process.env.TLC_CONFIG_DIR;
    process.env.TLC_CONFIG_DIR = tempDir;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TLC_CONFIG_DIR = originalEnv;
    } else {
      delete process.env.TLC_CONFIG_DIR;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates config directory if not exists', () => {
      const configDir = path.join(tempDir, 'subdir');
      process.env.TLC_CONFIG_DIR = configDir;

      const config = new GlobalConfig();
      config.load();

      expect(fs.existsSync(configDir)).toBe(true);
    });

    it('creates config file with defaults on first access', () => {
      const config = new GlobalConfig();
      const data = config.load();

      expect(data).toBeDefined();
      expect(data.version).toBe(1);
      expect(data.roots).toEqual([]);
      expect(data.scanDepth).toBe(5);
    });

    it('respects TLC_CONFIG_DIR environment variable', () => {
      const customDir = path.join(tempDir, 'custom');
      process.env.TLC_CONFIG_DIR = customDir;

      const config = new GlobalConfig();
      config.load();

      const configPath = path.join(customDir, 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('config schema has version field', () => {
      const config = new GlobalConfig();
      const data = config.load();

      expect(data.version).toBe(1);
    });
  });

  describe('getRoots', () => {
    it('returns empty roots when not configured', () => {
      const config = new GlobalConfig();

      const roots = config.getRoots();

      expect(roots).toEqual([]);
    });

    it('returns configured roots', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        const roots = config.getRoots();

        expect(roots).toContain(rootPath);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });
  });

  describe('addRoot', () => {
    it('adds root path and persists to disk', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        // Re-read from disk
        const config2 = new GlobalConfig();
        const roots = config2.getRoots();

        expect(roots).toContain(rootPath);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });

    it('rejects non-existent directory path', () => {
      const config = new GlobalConfig();

      expect(() => config.addRoot('/tmp/does-not-exist-xyz-123')).toThrow(/does not exist/i);
    });

    it('rejects file path (must be directory)', () => {
      const filePath = path.join(tempDir, 'somefile.txt');
      fs.writeFileSync(filePath, 'hello');

      const config = new GlobalConfig();

      expect(() => config.addRoot(filePath)).toThrow(/not a directory/i);
    });

    it('duplicate root paths rejected', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        expect(() => config.addRoot(rootPath)).toThrow(/already configured/i);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });

    it('multiple roots supported', () => {
      const root1 = fs.mkdtempSync(path.join(os.tmpdir(), 'root1-'));
      const root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'root2-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(root1);
        config.addRoot(root2);

        const roots = config.getRoots();

        expect(roots).toHaveLength(2);
        expect(roots).toContain(root1);
        expect(roots).toContain(root2);
      } finally {
        fs.rmSync(root1, { recursive: true, force: true });
        fs.rmSync(root2, { recursive: true, force: true });
      }
    });
  });

  describe('removeRoot', () => {
    it('removes root path', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);
        config.removeRoot(rootPath);

        const roots = config.getRoots();

        expect(roots).not.toContain(rootPath);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });

    it('removing non-existent root does not throw', () => {
      const config = new GlobalConfig();

      expect(() => config.removeRoot('/some/path')).not.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('returns false with no roots', () => {
      const config = new GlobalConfig();

      expect(config.isConfigured()).toBe(false);
    });

    it('returns true with roots', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        expect(config.isConfigured()).toBe(true);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });
  });

  describe('scanDepth', () => {
    it('defaults to 5', () => {
      const config = new GlobalConfig();
      const data = config.load();

      expect(data.scanDepth).toBe(5);
    });

    it('can be updated', () => {
      const config = new GlobalConfig();
      config.setScanDepth(3);

      const config2 = new GlobalConfig();
      const data = config2.load();

      expect(data.scanDepth).toBe(3);
    });
  });

  describe('lastScan tracking', () => {
    it('stores lastScan timestamp per root', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        const now = Date.now();
        config.setLastScan(rootPath, now);

        const lastScan = config.getLastScan(rootPath);

        expect(lastScan).toBe(now);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });

    it('returns null for root that has not been scanned', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        const lastScan = config.getLastScan(rootPath);

        expect(lastScan).toBeNull();
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });
  });

  describe('error handling', () => {
    it('handles corrupted JSON gracefully (resets to defaults)', () => {
      const configPath = path.join(tempDir, 'config.json');
      fs.writeFileSync(configPath, '{invalid json!!!');

      const config = new GlobalConfig();
      const data = config.load();

      expect(data.version).toBe(1);
      expect(data.roots).toEqual([]);
    });

    it('atomic write prevents partial file corruption', () => {
      const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'root-'));

      try {
        const config = new GlobalConfig();
        config.addRoot(rootPath);

        // Verify file is valid JSON after write
        const configPath = path.join(tempDir, 'config.json');
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);

        expect(parsed.roots).toContain(rootPath);
      } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
      }
    });
  });
});
