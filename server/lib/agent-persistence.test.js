import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  saveAgent,
  loadAgent,
  loadAllAgents,
  deleteAgent,
  getStoragePath,
  cleanupOldAgents,
} from './agent-persistence.js';

describe('AgentPersistence', () => {
  let testDir;
  let originalEnv;

  beforeEach(() => {
    // Create a temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-persistence-test-'));
    originalEnv = process.env.TLC_PROJECT_ROOT;
    process.env.TLC_PROJECT_ROOT = testDir;
  });

  afterEach(() => {
    // Clean up temp directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    process.env.TLC_PROJECT_ROOT = originalEnv;
  });

  describe('getStoragePath', () => {
    it('returns correct path for agent ID', () => {
      const agentId = 'agent-123';
      const storagePath = getStoragePath(testDir, agentId);

      expect(storagePath).toBe(path.join(testDir, '.tlc', 'agents', 'agent-123.json'));
    });

    it('returns directory path when no agent ID provided', () => {
      const storagePath = getStoragePath(testDir);

      expect(storagePath).toBe(path.join(testDir, '.tlc', 'agents'));
    });

    it('uses TLC_PROJECT_ROOT when projectRoot not specified', () => {
      const storagePath = getStoragePath(null, 'agent-456');

      expect(storagePath).toBe(path.join(testDir, '.tlc', 'agents', 'agent-456.json'));
    });
  });

  describe('saveAgent', () => {
    it('writes agent data to file', async () => {
      const agentData = {
        id: 'agent-save-test',
        state: 'running',
        metadata: { taskType: 'build' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAgent(testDir, agentData);

      const filePath = getStoragePath(testDir, agentData.id);
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(saved.id).toBe('agent-save-test');
      expect(saved.state).toBe('running');
    });

    it('creates directory if missing', async () => {
      const agentData = {
        id: 'agent-dir-test',
        state: 'pending',
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Directory should not exist yet
      const agentsDir = path.join(testDir, '.tlc', 'agents');
      expect(fs.existsSync(agentsDir)).toBe(false);

      await saveAgent(testDir, agentData);

      // Directory should be created
      expect(fs.existsSync(agentsDir)).toBe(true);
    });

    it('uses atomic write to prevent corruption', async () => {
      const agentData = {
        id: 'agent-atomic-test',
        state: 'completed',
        metadata: { result: 'success' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Spy on fs.renameSync to verify atomic write
      const renameSpy = vi.spyOn(fs, 'renameSync');

      await saveAgent(testDir, agentData);

      // Should use rename for atomic write
      expect(renameSpy).toHaveBeenCalled();
      const callArg = renameSpy.mock.calls[0][0];
      expect(callArg).toMatch(/\.tmp$/);

      renameSpy.mockRestore();
    });

    it('updates existing agent file', async () => {
      const agentData = {
        id: 'agent-update-test',
        state: 'pending',
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAgent(testDir, agentData);

      // Update the agent
      agentData.state = 'running';
      agentData.updatedAt = Date.now() + 1000;
      await saveAgent(testDir, agentData);

      const saved = await loadAgent(testDir, agentData.id);
      expect(saved.state).toBe('running');
    });

    it('throws error if agent ID is missing', async () => {
      const agentData = { state: 'pending' };

      await expect(saveAgent(testDir, agentData)).rejects.toThrow('Agent ID is required');
    });
  });

  describe('loadAgent', () => {
    it('reads agent from file', async () => {
      const agentData = {
        id: 'agent-load-test',
        state: 'running',
        metadata: { model: 'claude-3' },
        createdAt: 1000,
        updatedAt: 2000,
      };

      // Write directly to file
      const agentsDir = path.join(testDir, '.tlc', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentsDir, 'agent-load-test.json'),
        JSON.stringify(agentData),
        'utf8'
      );

      const loaded = await loadAgent(testDir, 'agent-load-test');

      expect(loaded).toEqual(agentData);
    });

    it('returns null if file does not exist', async () => {
      const loaded = await loadAgent(testDir, 'nonexistent-agent');

      expect(loaded).toBeNull();
    });

    it('handles corrupted files gracefully', async () => {
      const agentsDir = path.join(testDir, '.tlc', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentsDir, 'corrupted-agent.json'),
        'not valid json {{{',
        'utf8'
      );

      const loaded = await loadAgent(testDir, 'corrupted-agent');

      expect(loaded).toBeNull();
    });

    it('handles empty files gracefully', async () => {
      const agentsDir = path.join(testDir, '.tlc', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentsDir, 'empty-agent.json'),
        '',
        'utf8'
      );

      const loaded = await loadAgent(testDir, 'empty-agent');

      expect(loaded).toBeNull();
    });
  });

  describe('loadAllAgents', () => {
    it('returns all saved agents', async () => {
      const agents = [
        { id: 'agent-1', state: 'pending', metadata: {}, createdAt: 1000, updatedAt: 1000 },
        { id: 'agent-2', state: 'running', metadata: {}, createdAt: 2000, updatedAt: 2000 },
        { id: 'agent-3', state: 'completed', metadata: {}, createdAt: 3000, updatedAt: 3000 },
      ];

      for (const agent of agents) {
        await saveAgent(testDir, agent);
      }

      const loaded = await loadAllAgents(testDir);

      expect(loaded).toHaveLength(3);
      expect(loaded.map(a => a.id).sort()).toEqual(['agent-1', 'agent-2', 'agent-3']);
    });

    it('returns empty array if no agents saved', async () => {
      const loaded = await loadAllAgents(testDir);

      expect(loaded).toEqual([]);
    });

    it('skips corrupted files', async () => {
      const agentsDir = path.join(testDir, '.tlc', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      // Write one valid and one corrupted
      await saveAgent(testDir, {
        id: 'valid-agent',
        state: 'running',
        metadata: {},
        createdAt: 1000,
        updatedAt: 1000,
      });

      fs.writeFileSync(
        path.join(agentsDir, 'corrupted.json'),
        'invalid json',
        'utf8'
      );

      const loaded = await loadAllAgents(testDir);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('valid-agent');
    });

    it('returns empty array when directory does not exist', async () => {
      // Use a fresh project root without the agents directory
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-test-'));
      try {
        const loaded = await loadAllAgents(emptyDir);
        expect(loaded).toEqual([]);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('deleteAgent', () => {
    it('removes agent file', async () => {
      const agentData = {
        id: 'agent-to-delete',
        state: 'completed',
        metadata: {},
        createdAt: 1000,
        updatedAt: 1000,
      };

      await saveAgent(testDir, agentData);

      const filePath = getStoragePath(testDir, agentData.id);
      expect(fs.existsSync(filePath)).toBe(true);

      const deleted = await deleteAgent(testDir, agentData.id);

      expect(deleted).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('returns false if agent does not exist', async () => {
      const deleted = await deleteAgent(testDir, 'nonexistent-agent');

      expect(deleted).toBe(false);
    });

    it('does not throw if directory does not exist', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-test-'));
      try {
        const deleted = await deleteAgent(emptyDir, 'any-agent');
        expect(deleted).toBe(false);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('cleanupOldAgents', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes agents older than specified max age', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Create agents with different ages
      await saveAgent(testDir, {
        id: 'old-agent',
        state: 'completed',
        metadata: {},
        createdAt: now - (2 * oneDayMs), // 2 days old
        updatedAt: now - (2 * oneDayMs),
      });

      await saveAgent(testDir, {
        id: 'new-agent',
        state: 'completed',
        metadata: {},
        createdAt: now - (12 * 60 * 60 * 1000), // 12 hours old
        updatedAt: now - (12 * 60 * 60 * 1000),
      });

      // Clean up agents older than 1 day
      const cleaned = await cleanupOldAgents(testDir, oneDayMs);

      expect(cleaned).toBe(1);
      expect(await loadAgent(testDir, 'old-agent')).toBeNull();
      expect(await loadAgent(testDir, 'new-agent')).not.toBeNull();
    });

    it('does not remove running agents regardless of age', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      await saveAgent(testDir, {
        id: 'old-running-agent',
        state: 'running',
        metadata: {},
        createdAt: now - (5 * oneDayMs), // 5 days old but still running
        updatedAt: now - (5 * oneDayMs),
      });

      const cleaned = await cleanupOldAgents(testDir, oneDayMs);

      expect(cleaned).toBe(0);
      expect(await loadAgent(testDir, 'old-running-agent')).not.toBeNull();
    });

    it('returns 0 when no agents exist', async () => {
      const cleaned = await cleanupOldAgents(testDir, 1000);

      expect(cleaned).toBe(0);
    });

    it('uses default max age of 7 days', async () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      await saveAgent(testDir, {
        id: 'week-old-agent',
        state: 'completed',
        metadata: {},
        createdAt: now - (8 * 24 * 60 * 60 * 1000), // 8 days old
        updatedAt: now - (8 * 24 * 60 * 60 * 1000),
      });

      await saveAgent(testDir, {
        id: 'recent-agent',
        state: 'completed',
        metadata: {},
        createdAt: now - (6 * 24 * 60 * 60 * 1000), // 6 days old
        updatedAt: now - (6 * 24 * 60 * 60 * 1000),
      });

      // No maxAge parameter - should use 7 day default
      const cleaned = await cleanupOldAgents(testDir);

      expect(cleaned).toBe(1);
      expect(await loadAgent(testDir, 'week-old-agent')).toBeNull();
      expect(await loadAgent(testDir, 'recent-agent')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles special characters in agent ID', async () => {
      // Agent IDs typically follow a pattern but let's ensure safety
      const agentData = {
        id: 'agent-m5k3y7-abc123',
        state: 'pending',
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAgent(testDir, agentData);
      const loaded = await loadAgent(testDir, agentData.id);

      expect(loaded).toEqual(agentData);
    });

    it('handles large metadata objects', async () => {
      const largeMetadata = {
        history: Array(100).fill({ event: 'transition', timestamp: Date.now() }),
        parameters: { nested: { deeply: { value: 'test' } } },
      };

      const agentData = {
        id: 'agent-large-metadata',
        state: 'running',
        metadata: largeMetadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAgent(testDir, agentData);
      const loaded = await loadAgent(testDir, agentData.id);

      expect(loaded.metadata).toEqual(largeMetadata);
    });

    it('preserves all agent fields through save/load cycle', async () => {
      const agentData = {
        id: 'agent-full-test',
        state: 'completed',
        metadata: {
          model: 'claude-3-opus',
          taskType: 'code-review',
          inputTokens: 1500,
          outputTokens: 500,
        },
        createdAt: 1705312800000,
        updatedAt: 1705316400000,
        customField: 'preserved',
      };

      await saveAgent(testDir, agentData);
      const loaded = await loadAgent(testDir, agentData.id);

      expect(loaded).toEqual(agentData);
    });

    it('concurrent saves do not corrupt data', async () => {
      const agentIds = Array.from({ length: 10 }, (_, i) => `concurrent-agent-${i}`);
      const saves = agentIds.map(id =>
        saveAgent(testDir, {
          id,
          state: 'pending',
          metadata: { index: parseInt(id.split('-').pop()) },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );

      await Promise.all(saves);

      const loaded = await loadAllAgents(testDir);
      expect(loaded).toHaveLength(10);

      // Verify each agent has correct data
      for (const id of agentIds) {
        const agent = await loadAgent(testDir, id);
        expect(agent).not.toBeNull();
        expect(agent.id).toBe(id);
      }
    });
  });
});
