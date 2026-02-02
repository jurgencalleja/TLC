import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentRegistry,
  getAgentRegistry,
  resetRegistry,
} from './agent-registry.js';

describe('AgentRegistry', () => {
  let registry;

  beforeEach(() => {
    resetRegistry();
    registry = new AgentRegistry();
  });

  describe('registerAgent', () => {
    it('adds agent to registry', () => {
      const agent = {
        name: 'test-agent',
        model: 'claude-3',
        type: 'worker',
        status: 'idle',
      };

      registry.registerAgent(agent);

      const agents = registry.listAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('test-agent');
    });

    it('generates unique ID', () => {
      const agent1 = { name: 'agent-1', model: 'claude-3', type: 'worker' };
      const agent2 = { name: 'agent-2', model: 'claude-3', type: 'worker' };

      const id1 = registry.registerAgent(agent1);
      const id2 = registry.registerAgent(agent2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('sets default status to idle', () => {
      const agent = { name: 'test-agent', model: 'claude-3', type: 'worker' };

      registry.registerAgent(agent);

      const agents = registry.listAgents();
      expect(agents[0].status).toBe('idle');
    });

    it('stores metadata with agent', () => {
      const agent = {
        name: 'test-agent',
        model: 'claude-3-opus',
        type: 'orchestrator',
        capabilities: ['planning', 'coding'],
        maxConcurrency: 5,
      };

      registry.registerAgent(agent);

      const agents = registry.listAgents();
      expect(agents[0].model).toBe('claude-3-opus');
      expect(agents[0].type).toBe('orchestrator');
      expect(agents[0].capabilities).toEqual(['planning', 'coding']);
      expect(agents[0].maxConcurrency).toBe(5);
    });

    it('records registration timestamp', () => {
      const beforeTime = Date.now();
      const agent = { name: 'test-agent', model: 'claude-3', type: 'worker' };

      registry.registerAgent(agent);

      const agents = registry.listAgents();
      expect(agents[0].registeredAt).toBeDefined();
      expect(agents[0].registeredAt).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('listAgents', () => {
    it('returns all agents', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker' });
      registry.registerAgent({ name: 'agent-2', model: 'gpt-4', type: 'reviewer' });
      registry.registerAgent({ name: 'agent-3', model: 'claude-3', type: 'worker' });

      const agents = registry.listAgents();

      expect(agents).toHaveLength(3);
    });

    it('filters by status', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker', status: 'idle' });
      registry.registerAgent({ name: 'agent-2', model: 'claude-3', type: 'worker', status: 'busy' });
      registry.registerAgent({ name: 'agent-3', model: 'claude-3', type: 'worker', status: 'idle' });

      const idleAgents = registry.listAgents({ status: 'idle' });

      expect(idleAgents).toHaveLength(2);
      expect(idleAgents.every(a => a.status === 'idle')).toBe(true);
    });

    it('filters by model', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker' });
      registry.registerAgent({ name: 'agent-2', model: 'gpt-4', type: 'worker' });
      registry.registerAgent({ name: 'agent-3', model: 'claude-3', type: 'worker' });

      const claudeAgents = registry.listAgents({ model: 'claude-3' });

      expect(claudeAgents).toHaveLength(2);
      expect(claudeAgents.every(a => a.model === 'claude-3')).toBe(true);
    });

    it('filters by type', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker' });
      registry.registerAgent({ name: 'agent-2', model: 'claude-3', type: 'orchestrator' });
      registry.registerAgent({ name: 'agent-3', model: 'claude-3', type: 'worker' });

      const workers = registry.listAgents({ type: 'worker' });

      expect(workers).toHaveLength(2);
      expect(workers.every(a => a.type === 'worker')).toBe(true);
    });

    it('combines multiple filters', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker', status: 'idle' });
      registry.registerAgent({ name: 'agent-2', model: 'claude-3', type: 'worker', status: 'busy' });
      registry.registerAgent({ name: 'agent-3', model: 'gpt-4', type: 'worker', status: 'idle' });

      const filtered = registry.listAgents({ model: 'claude-3', status: 'idle' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('agent-1');
    });

    it('returns empty array when no agents match', () => {
      registry.registerAgent({ name: 'agent-1', model: 'claude-3', type: 'worker' });

      const filtered = registry.listAgents({ model: 'non-existent' });

      expect(filtered).toEqual([]);
    });
  });

  describe('getAgent', () => {
    it('returns agent by ID', () => {
      const id = registry.registerAgent({ name: 'test-agent', model: 'claude-3', type: 'worker' });

      const agent = registry.getAgent(id);

      expect(agent).toBeDefined();
      expect(agent.name).toBe('test-agent');
      expect(agent.id).toBe(id);
    });

    it('returns null for unknown ID', () => {
      const agent = registry.getAgent('non-existent-id');

      expect(agent).toBeNull();
    });
  });

  describe('removeAgent', () => {
    it('deletes from registry', () => {
      const id = registry.registerAgent({ name: 'test-agent', model: 'claude-3', type: 'worker' });

      const result = registry.removeAgent(id);

      expect(result).toBe(true);
      expect(registry.getAgent(id)).toBeNull();
      expect(registry.listAgents()).toHaveLength(0);
    });

    it('returns false for unknown ID', () => {
      const result = registry.removeAgent('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('updateAgent', () => {
    it('updates agent status', () => {
      const id = registry.registerAgent({ name: 'test-agent', model: 'claude-3', type: 'worker', status: 'idle' });

      registry.updateAgent(id, { status: 'busy' });

      const agent = registry.getAgent(id);
      expect(agent.status).toBe('busy');
    });

    it('updates multiple fields', () => {
      const id = registry.registerAgent({ name: 'test-agent', model: 'claude-3', type: 'worker' });

      registry.updateAgent(id, { status: 'busy', currentTask: 'task-123' });

      const agent = registry.getAgent(id);
      expect(agent.status).toBe('busy');
      expect(agent.currentTask).toBe('task-123');
    });

    it('returns false for unknown ID', () => {
      const result = registry.updateAgent('non-existent-id', { status: 'busy' });

      expect(result).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('returns same instance across calls', () => {
      const instance1 = getAgentRegistry();
      const instance2 = getAgentRegistry();

      expect(instance1).toBe(instance2);
    });

    it('shares state across imports', () => {
      const instance1 = getAgentRegistry();
      instance1.registerAgent({ name: 'shared-agent', model: 'claude-3', type: 'worker' });

      const instance2 = getAgentRegistry();
      const agents = instance2.listAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('shared-agent');
    });

    it('resetRegistry clears singleton', () => {
      const instance1 = getAgentRegistry();
      instance1.registerAgent({ name: 'test-agent', model: 'claude-3', type: 'worker' });

      resetRegistry();

      const instance2 = getAgentRegistry();
      expect(instance2.listAgents()).toHaveLength(0);
    });
  });
});
