import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initMemoryStructure, MEMORY_PATHS } from './memory-storage.js';

describe('memory-storage', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('initMemoryStructure', () => {
    it('creates team decisions directory', async () => {
      await initMemoryStructure(testDir);

      const decisionsPath = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      expect(fs.existsSync(decisionsPath)).toBe(true);
    });

    it('creates team gotchas directory', async () => {
      await initMemoryStructure(testDir);

      const gotchasPath = path.join(testDir, '.tlc', 'memory', 'team', 'gotchas');
      expect(fs.existsSync(gotchasPath)).toBe(true);
    });

    it('creates local memory directory', async () => {
      await initMemoryStructure(testDir);

      const localPath = path.join(testDir, '.tlc', 'memory', '.local');
      expect(fs.existsSync(localPath)).toBe(true);
    });

    it('creates local sessions directory', async () => {
      await initMemoryStructure(testDir);

      const sessionsPath = path.join(testDir, '.tlc', 'memory', '.local', 'sessions');
      expect(fs.existsSync(sessionsPath)).toBe(true);
    });

    it('adds .local to gitignore', async () => {
      await initMemoryStructure(testDir);

      const gitignorePath = path.join(testDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('.tlc/memory/.local/');
    });

    it('does not duplicate gitignore entry', async () => {
      // Run twice
      await initMemoryStructure(testDir);
      await initMemoryStructure(testDir);

      const gitignorePath = path.join(testDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const matches = content.match(/\.tlc\/memory\/\.local\//g);
      expect(matches).toHaveLength(1);
    });

    it('preserves existing gitignore content', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n.env\n');

      await initMemoryStructure(testDir);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('.tlc/memory/.local/');
    });

    it('works with existing .tlc directory', async () => {
      const tlcDir = path.join(testDir, '.tlc');
      fs.mkdirSync(tlcDir, { recursive: true });
      fs.writeFileSync(path.join(tlcDir, 'config.json'), '{}');

      await initMemoryStructure(testDir);

      // Original file preserved
      expect(fs.existsSync(path.join(tlcDir, 'config.json'))).toBe(true);
      // Memory structure created
      expect(fs.existsSync(path.join(tlcDir, 'memory', 'team'))).toBe(true);
    });

    it('creates conventions.md template in team directory', async () => {
      await initMemoryStructure(testDir);

      const conventionsPath = path.join(testDir, '.tlc', 'memory', 'team', 'conventions.md');
      expect(fs.existsSync(conventionsPath)).toBe(true);

      const content = fs.readFileSync(conventionsPath, 'utf8');
      expect(content).toContain('# Team Conventions');
    });

    it('creates empty preferences.json in local directory', async () => {
      await initMemoryStructure(testDir);

      const prefsPath = path.join(testDir, '.tlc', 'memory', '.local', 'preferences.json');
      expect(fs.existsSync(prefsPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      expect(content).toEqual({});
    });

    it('is idempotent - running twice does not corrupt data', async () => {
      await initMemoryStructure(testDir);

      // Add some data
      const prefsPath = path.join(testDir, '.tlc', 'memory', '.local', 'preferences.json');
      fs.writeFileSync(prefsPath, JSON.stringify({ test: 'value' }));

      // Run again
      await initMemoryStructure(testDir);

      // Data preserved
      const content = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      expect(content.test).toBe('value');
    });
  });

  describe('MEMORY_PATHS', () => {
    it('exports correct path constants', () => {
      expect(MEMORY_PATHS.TEAM).toBe('.tlc/memory/team');
      expect(MEMORY_PATHS.DECISIONS).toBe('.tlc/memory/team/decisions');
      expect(MEMORY_PATHS.GOTCHAS).toBe('.tlc/memory/team/gotchas');
      expect(MEMORY_PATHS.LOCAL).toBe('.tlc/memory/.local');
      expect(MEMORY_PATHS.SESSIONS).toBe('.tlc/memory/.local/sessions');
    });
  });
});
