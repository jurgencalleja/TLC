import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initMemorySystem, isMemoryInitialized } from './memory-init.js';

describe('memory-init', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('initMemorySystem', () => {
    it('creates .tlc/memory/team directory', async () => {
      await initMemorySystem(testDir);

      const teamDir = path.join(testDir, '.tlc', 'memory', 'team');
      expect(fs.existsSync(teamDir)).toBe(true);
    });

    it('creates .tlc/memory/.local directory', async () => {
      await initMemorySystem(testDir);

      const localDir = path.join(testDir, '.tlc', 'memory', '.local');
      expect(fs.existsSync(localDir)).toBe(true);
    });

    it('creates subdirectories in team', async () => {
      await initMemorySystem(testDir);

      const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      const gotchasDir = path.join(testDir, '.tlc', 'memory', 'team', 'gotchas');
      expect(fs.existsSync(decisionsDir)).toBe(true);
      expect(fs.existsSync(gotchasDir)).toBe(true);
    });

    it('creates subdirectories in .local', async () => {
      await initMemorySystem(testDir);

      const preferencesDir = path.join(testDir, '.tlc', 'memory', '.local', 'preferences');
      const sessionsDir = path.join(testDir, '.tlc', 'memory', '.local', 'sessions');
      expect(fs.existsSync(preferencesDir)).toBe(true);
      expect(fs.existsSync(sessionsDir)).toBe(true);
    });

    it('adds .local to .gitignore if not present', async () => {
      await initMemorySystem(testDir);

      const gitignorePath = path.join(testDir, '.tlc', 'memory', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('.local');
    });

    it('does not duplicate .local in .gitignore', async () => {
      const gitignorePath = path.join(testDir, '.tlc', 'memory', '.gitignore');
      fs.mkdirSync(path.dirname(gitignorePath), { recursive: true });
      fs.writeFileSync(gitignorePath, '.local\n');

      await initMemorySystem(testDir);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const matches = content.match(/\.local/g);
      expect(matches.length).toBe(1);
    });

    it('skips creation if already exists', async () => {
      const teamDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'test.json'), '{"test": true}');

      await initMemorySystem(testDir);

      // File should still exist
      expect(fs.existsSync(path.join(teamDir, 'test.json'))).toBe(true);
    });

    it('returns initialization status', async () => {
      const result = await initMemorySystem(testDir);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('directories');
    });

    it('handles missing .tlc directory', async () => {
      // Should create .tlc directory if not present
      await initMemorySystem(testDir);

      expect(fs.existsSync(path.join(testDir, '.tlc'))).toBe(true);
    });
  });

  describe('isMemoryInitialized', () => {
    it('returns false for empty directory', async () => {
      const result = await isMemoryInitialized(testDir);
      expect(result).toBe(false);
    });

    it('returns true after initialization', async () => {
      await initMemorySystem(testDir);

      const result = await isMemoryInitialized(testDir);
      expect(result).toBe(true);
    });

    it('returns false for partial initialization', async () => {
      // Only create team dir, not local
      fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team'), { recursive: true });

      const result = await isMemoryInitialized(testDir);
      expect(result).toBe(false);
    });
  });
});
