import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectUncommittedMemory, generateCommitMessage, commitTeamMemory } from './memory-committer.js';
import { initMemoryStructure } from './memory-storage.js';
import { writeTeamDecision, writeTeamGotcha } from './memory-writer.js';

describe('memory-committer', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-committer-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('detectUncommittedMemory', () => {
    it('returns empty array for no memory files', async () => {
      const uncommitted = await detectUncommittedMemory(testDir);
      expect(uncommitted).toHaveLength(0);
    });

    it('detects new decision files', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use PostgreSQL',
        reasoning: 'JSONB support',
      });

      const uncommitted = await detectUncommittedMemory(testDir);

      expect(uncommitted.length).toBeGreaterThan(0);
      expect(uncommitted.some(f => f.includes('decisions'))).toBe(true);
    });

    it('detects new gotcha files', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth delay',
        issue: 'warmup needed',
      });

      const uncommitted = await detectUncommittedMemory(testDir);

      expect(uncommitted.length).toBeGreaterThan(0);
      expect(uncommitted.some(f => f.includes('gotchas'))).toBe(true);
    });

    it('excludes .local files', async () => {
      // .local files should never be in uncommitted list
      const localFile = path.join(testDir, '.tlc', 'memory', '.local', 'test.json');
      fs.mkdirSync(path.dirname(localFile), { recursive: true });
      fs.writeFileSync(localFile, '{}');

      const uncommitted = await detectUncommittedMemory(testDir);

      expect(uncommitted.every(f => !f.includes('.local'))).toBe(true);
    });

    // Phase 81 Task 4: detectUncommittedMemory should use git status
    it('returns empty for already-committed files in a git repo', async () => {
      // Create a git repo, add a decision, and commit it
      const { execSync } = await import('child_process');
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });

      await writeTeamDecision(testDir, {
        title: 'Committed Decision',
        reasoning: 'Already committed',
      });

      execSync('git add -A', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

      // Now detect uncommitted — should be empty since everything is committed
      const uncommitted = await detectUncommittedMemory(testDir);
      expect(uncommitted).toHaveLength(0);
    });
  });

  describe('generateCommitMessage', () => {
    it('generates message for decisions', () => {
      const files = ['.tlc/memory/team/decisions/001.json'];
      const message = generateCommitMessage(files);

      expect(message).toContain('memory');
      expect(message).toContain('decision');
    });

    it('generates message for gotchas', () => {
      const files = ['.tlc/memory/team/gotchas/001.json'];
      const message = generateCommitMessage(files);

      expect(message).toContain('gotcha');
    });

    it('generates message for mixed types', () => {
      const files = [
        '.tlc/memory/team/decisions/001.json',
        '.tlc/memory/team/gotchas/001.json',
      ];
      const message = generateCommitMessage(files);

      expect(message).toContain('decision');
      expect(message).toContain('gotcha');
    });

    it('uses conventional commit format', () => {
      const files = ['.tlc/memory/team/decisions/001.json'];
      const message = generateCommitMessage(files);

      // Should start with docs: or chore: or similar (with optional scope)
      expect(message).toMatch(/^(docs|chore|feat)(\([\w-]+\))?:/);
    });

    it('handles empty files array', () => {
      const message = generateCommitMessage([]);
      expect(message).toBe('');
    });
  });

  describe('commitTeamMemory', () => {
    it('returns success false for no uncommitted files', async () => {
      const result = await commitTeamMemory(testDir, { dryRun: true });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('nothing');
    });

    it('returns files that would be committed', async () => {
      await writeTeamDecision(testDir, {
        title: 'Test decision',
        reasoning: 'Test',
      });

      const result = await commitTeamMemory(testDir, { dryRun: true });

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.message).toBeTruthy();
    });

    it('respects dryRun option', async () => {
      await writeTeamDecision(testDir, {
        title: 'Test decision',
        reasoning: 'Test',
      });

      const result = await commitTeamMemory(testDir, { dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(result.committed).toBe(false);
    });
  });
});
