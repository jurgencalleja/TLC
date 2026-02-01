import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceMemory } = await import('./workspace-memory.js');

describe('WorkspaceMemory', () => {
  let tempDir;
  let workspaceRoot;
  let repoA;
  let repoB;

  beforeEach(() => {
    // Create temp workspace with two repos
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-memory-test-'));
    workspaceRoot = tempDir;

    // Create repo-a
    repoA = path.join(tempDir, 'repo-a');
    fs.mkdirSync(repoA);
    fs.writeFileSync(path.join(repoA, 'package.json'), JSON.stringify({ name: 'repo-a' }));

    // Create repo-b
    repoB = path.join(tempDir, 'repo-b');
    fs.mkdirSync(repoB);
    fs.writeFileSync(path.join(repoB, 'package.json'), JSON.stringify({ name: 'repo-b' }));

    // Create workspace config
    fs.writeFileSync(
      path.join(tempDir, '.tlc-workspace.json'),
      JSON.stringify({
        root: tempDir,
        repos: ['repo-a', 'repo-b'],
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates workspace memory directory', () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      const memoryDir = path.join(workspaceRoot, '.tlc-workspace', 'memory');
      expect(fs.existsSync(memoryDir)).toBe(true);
    });

    it('creates decisions subdirectory in workspace memory', () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      const decisionsDir = path.join(workspaceRoot, '.tlc-workspace', 'memory', 'decisions');
      expect(fs.existsSync(decisionsDir)).toBe(true);
    });

    it('creates gotchas subdirectory in workspace memory', () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      const gotchasDir = path.join(workspaceRoot, '.tlc-workspace', 'memory', 'gotchas');
      expect(fs.existsSync(gotchasDir)).toBe(true);
    });
  });

  describe('workspace-level memory', () => {
    it('writes to workspace-level memory', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeDecision({
        title: 'Use ESM modules across all repos',
        reasoning: 'Consistent module system',
        level: 'workspace',
      });

      const decisionsDir = path.join(workspaceRoot, '.tlc-workspace', 'memory', 'decisions');
      const files = fs.readdirSync(decisionsDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/use-esm-modules-across-all-repos\.md$/);
    });

    it('reads from workspace-level memory', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeDecision({
        title: 'Use TypeScript everywhere',
        reasoning: 'Type safety',
        level: 'workspace',
      });

      const decisions = await memory.getDecisions('workspace');
      expect(decisions.length).toBe(1);
      expect(decisions[0].title).toBe('Use TypeScript everywhere');
    });

    it('workspace memory visible to all repos', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace-level decision
      await memory.writeDecision({
        title: 'Shared API conventions',
        reasoning: 'Consistency across services',
        level: 'workspace',
      });

      // Read from repo-a context
      const decisionsA = await memory.getDecisions('all', repoA);
      expect(decisionsA.some(d => d.title === 'Shared API conventions')).toBe(true);

      // Read from repo-b context
      const decisionsB = await memory.getDecisions('all', repoB);
      expect(decisionsB.some(d => d.title === 'Shared API conventions')).toBe(true);
    });
  });

  describe('repo-level memory', () => {
    it('writes to repo-level memory', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeDecision({
        title: 'Use Jest for testing',
        reasoning: 'Already configured',
        level: 'repo',
        repoPath: repoA,
      });

      const decisionsDir = path.join(repoA, '.tlc', 'memory', 'team', 'decisions');
      expect(fs.existsSync(decisionsDir)).toBe(true);
      const files = fs.readdirSync(decisionsDir);
      expect(files.length).toBe(1);
    });

    it('reads from repo-level memory', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeDecision({
        title: 'Custom logging format',
        reasoning: 'Repo-specific needs',
        level: 'repo',
        repoPath: repoA,
      });

      const decisions = await memory.getDecisions('repo', repoA);
      expect(decisions.length).toBe(1);
      expect(decisions[0].title).toBe('Custom logging format');
    });

    it('repo memory only visible to that repo', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write repo-a specific decision
      await memory.writeDecision({
        title: 'RepoA-only config',
        reasoning: 'Only for repo-a',
        level: 'repo',
        repoPath: repoA,
      });

      // Read from repo-a - should see it
      const decisionsA = await memory.getDecisions('repo', repoA);
      expect(decisionsA.some(d => d.title === 'RepoA-only config')).toBe(true);

      // Read from repo-b - should NOT see it
      const decisionsB = await memory.getDecisions('repo', repoB);
      expect(decisionsB.some(d => d.title === 'RepoA-only config')).toBe(false);
    });
  });

  describe('reads from both levels', () => {
    it('returns both workspace and repo decisions with getDecisions("all")', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace decision
      await memory.writeDecision({
        title: 'Workspace-wide rule',
        reasoning: 'Applies everywhere',
        level: 'workspace',
      });

      // Write repo decision
      await memory.writeDecision({
        title: 'Repo-specific rule',
        reasoning: 'Only repo-a',
        level: 'repo',
        repoPath: repoA,
      });

      // Read all from repo-a context
      const decisions = await memory.getDecisions('all', repoA);
      expect(decisions.length).toBe(2);
      expect(decisions.some(d => d.title === 'Workspace-wide rule')).toBe(true);
      expect(decisions.some(d => d.title === 'Repo-specific rule')).toBe(true);
    });
  });

  describe('conflict resolution', () => {
    it('repo overrides workspace for same key', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace decision
      await memory.writeDecision({
        title: 'Testing framework',
        reasoning: 'Use Vitest',
        level: 'workspace',
      });

      // Write repo decision with same title (override)
      await memory.writeDecision({
        title: 'Testing framework',
        reasoning: 'Use Jest instead',
        level: 'repo',
        repoPath: repoA,
      });

      // Get resolved decisions - repo should win
      const resolved = await memory.getResolvedDecisions(repoA);
      const testingDecision = resolved.find(d => d.title === 'Testing framework');
      expect(testingDecision).toBeDefined();
      expect(testingDecision.reasoning).toContain('Jest');
      expect(testingDecision.level).toBe('repo');
    });

    it('workspace applies when no repo override', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace decision
      await memory.writeDecision({
        title: 'Code style',
        reasoning: 'Use Prettier',
        level: 'workspace',
      });

      // Get resolved decisions from repo-a (no override)
      const resolved = await memory.getResolvedDecisions(repoA);
      const styleDecision = resolved.find(d => d.title === 'Code style');
      expect(styleDecision).toBeDefined();
      expect(styleDecision.reasoning).toContain('Prettier');
      expect(styleDecision.level).toBe('workspace');
    });
  });

  describe('memory search', () => {
    it('memory search spans workspace', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace decision
      await memory.writeDecision({
        title: 'API versioning strategy',
        reasoning: 'Use URL path versioning /v1/, /v2/',
        level: 'workspace',
      });

      // Write repo-a decision
      await memory.writeDecision({
        title: 'Database connection pooling',
        reasoning: 'Pool size of 10',
        level: 'repo',
        repoPath: repoA,
      });

      // Write repo-b decision
      await memory.writeDecision({
        title: 'Cache expiration',
        reasoning: 'TTL of 5 minutes',
        level: 'repo',
        repoPath: repoB,
      });

      // Search across all
      const results = await memory.search('versioning');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('API versioning strategy');

      // Search finds repo-specific content
      const poolResults = await memory.search('pooling');
      expect(poolResults.length).toBe(1);
      expect(poolResults[0].title).toBe('Database connection pooling');
    });

    it('search returns results from all repos', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write decisions with common term
      await memory.writeDecision({
        title: 'Config for repo-a',
        reasoning: 'Configuration pattern',
        level: 'repo',
        repoPath: repoA,
      });

      await memory.writeDecision({
        title: 'Config for repo-b',
        reasoning: 'Configuration pattern',
        level: 'repo',
        repoPath: repoB,
      });

      const results = await memory.search('config');
      expect(results.length).toBe(2);
    });
  });

  describe('gotchas', () => {
    it('writes workspace-level gotcha', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeGotcha({
        title: 'Cross-repo import issue',
        issue: 'Circular dependencies between repos',
        level: 'workspace',
      });

      const gotchasDir = path.join(workspaceRoot, '.tlc-workspace', 'memory', 'gotchas');
      const files = fs.readdirSync(gotchasDir);
      expect(files.length).toBe(1);
    });

    it('writes repo-level gotcha', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeGotcha({
        title: 'Node version mismatch',
        issue: 'Must use Node 18+',
        level: 'repo',
        repoPath: repoA,
      });

      const gotchasDir = path.join(repoA, '.tlc', 'memory', 'team', 'gotchas');
      expect(fs.existsSync(gotchasDir)).toBe(true);
      const files = fs.readdirSync(gotchasDir);
      expect(files.length).toBe(1);
    });

    it('reads gotchas from both levels', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      await memory.writeGotcha({
        title: 'Workspace gotcha',
        issue: 'Shared issue',
        level: 'workspace',
      });

      await memory.writeGotcha({
        title: 'Repo gotcha',
        issue: 'Repo-specific issue',
        level: 'repo',
        repoPath: repoA,
      });

      const gotchas = await memory.getGotchas('all', repoA);
      expect(gotchas.length).toBe(2);
    });
  });

  describe('sync decisions', () => {
    it('syncs decisions from workspace to repo', async () => {
      const memory = new WorkspaceMemory(workspaceRoot);
      memory.init();

      // Write workspace decision
      await memory.writeDecision({
        title: 'Sync test decision',
        reasoning: 'Testing sync',
        level: 'workspace',
      });

      // Sync to repo-a
      await memory.syncToRepo(repoA);

      // Repo-a should be able to read workspace decisions in its context
      const decisions = await memory.getDecisions('all', repoA);
      expect(decisions.some(d => d.title === 'Sync test decision')).toBe(true);
    });
  });

  describe('getWorkspaceConfig', () => {
    it('loads workspace config', () => {
      const memory = new WorkspaceMemory(workspaceRoot);

      const config = memory.getWorkspaceConfig();
      expect(config).toBeDefined();
      expect(config.repos).toContain('repo-a');
      expect(config.repos).toContain('repo-b');
    });
  });
});
