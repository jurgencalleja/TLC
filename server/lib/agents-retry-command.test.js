import { describe, it, beforeEach, vi } from 'vitest';
const assert = require('node:assert');
const {
  execute,
  createRetryAgent,
  canRetry,
  getRetryContext,
} = require('./agents-retry-command.js');

describe('agents-retry-command', () => {
  const failedAgent = {
    id: 'agent-failed',
    name: 'Failed Builder',
    model: 'gpt-4',
    status: 'failed',
    prompt: 'Build the feature',
    error: { message: 'Rate limit exceeded' },
    cost: 0.10,
  };

  describe('execute', () => {
    const createMockRegistry = (agents = [], budget = { remaining: 100 }) => ({
      getAgent: (id) => agents.find(a => a.id === id),
      createAgent: (data) => {
        const newAgent = { id: `agent-${Date.now()}`, ...data };
        agents.push(newAgent);
        return newAgent;
      },
      budget,
    });

    it('retries failed agent', async () => {
      const agents = [{ ...failedAgent }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-failed',
      });
      assert.ok(result.success);
      assert.ok(result.newAgentId);
    });

    it('creates new agent', async () => {
      const agents = [{ ...failedAgent }];
      const registry = createMockRegistry(agents);
      const result = await execute({
        registry,
        agentId: 'agent-failed',
      });
      assert.strictEqual(agents.length, 2);
    });

    it('includes failure context', async () => {
      const agents = [{ ...failedAgent }];
      const registry = createMockRegistry(agents);
      const result = await execute({
        registry,
        agentId: 'agent-failed',
      });
      const newAgent = agents.find(a => a.id === result.newAgentId);
      assert.ok(newAgent.retryContext || newAgent.parentId);
    });

    it('with --model overrides', async () => {
      const agents = [{ ...failedAgent }];
      const registry = createMockRegistry(agents);
      const result = await execute({
        registry,
        agentId: 'agent-failed',
        options: { model: 'claude-3-opus' },
      });
      const newAgent = agents.find(a => a.id === result.newAgentId);
      assert.strictEqual(newAgent.model, 'claude-3-opus');
    });

    it('handles not failed agent', async () => {
      const agents = [{ id: 'agent-1', status: 'running' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not failed') || result.error.includes('Cannot retry'));
    });

    it('handles unknown agent ID', async () => {
      const result = await execute({
        registry: createMockRegistry([]),
        agentId: 'unknown',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found'));
    });

    it('shows new agent ID', async () => {
      const agents = [{ ...failedAgent }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-failed',
      });
      assert.ok(result.newAgentId);
      assert.ok(result.message.includes(result.newAgentId));
    });

    it('tracks retry parent', async () => {
      const agents = [{ ...failedAgent }];
      const registry = createMockRegistry(agents);
      const result = await execute({
        registry,
        agentId: 'agent-failed',
      });
      const newAgent = agents.find(a => a.id === result.newAgentId);
      assert.strictEqual(newAgent.parentId, 'agent-failed');
    });

    it('inherits original prompt', async () => {
      const agents = [{ ...failedAgent }];
      const registry = createMockRegistry(agents);
      const result = await execute({
        registry,
        agentId: 'agent-failed',
      });
      const newAgent = agents.find(a => a.id === result.newAgentId);
      assert.strictEqual(newAgent.prompt, 'Build the feature');
    });

    it('respects budget limits', async () => {
      const agents = [{ ...failedAgent }];
      const result = await execute({
        registry: createMockRegistry(agents, { remaining: 0 }),
        agentId: 'agent-failed',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('budget') || result.error.includes('Budget'));
    });
  });

  describe('createRetryAgent', () => {
    it('creates agent with parent reference', () => {
      const parent = { id: 'parent-1', model: 'gpt-4', prompt: 'test' };
      const agent = createRetryAgent(parent, {});
      assert.strictEqual(agent.parentId, 'parent-1');
    });

    it('uses parent model by default', () => {
      const parent = { id: 'parent-1', model: 'gpt-4', prompt: 'test' };
      const agent = createRetryAgent(parent, {});
      assert.strictEqual(agent.model, 'gpt-4');
    });

    it('allows model override', () => {
      const parent = { id: 'parent-1', model: 'gpt-4', prompt: 'test' };
      const agent = createRetryAgent(parent, { model: 'claude' });
      assert.strictEqual(agent.model, 'claude');
    });
  });

  describe('canRetry', () => {
    it('returns true for failed agent', () => {
      const result = canRetry({ status: 'failed' });
      assert.ok(result.canRetry);
    });

    it('returns true for cancelled agent', () => {
      const result = canRetry({ status: 'cancelled' });
      assert.ok(result.canRetry);
    });

    it('returns false for running agent', () => {
      const result = canRetry({ status: 'running' });
      assert.strictEqual(result.canRetry, false);
    });

    it('returns false for completed agent', () => {
      const result = canRetry({ status: 'completed' });
      assert.strictEqual(result.canRetry, false);
    });
  });

  describe('getRetryContext', () => {
    it('includes error message', () => {
      const agent = { error: { message: 'Rate limit' } };
      const context = getRetryContext(agent);
      assert.ok(context.includes('Rate limit'));
    });

    it('includes retry count', () => {
      const agent = { retryCount: 2 };
      const context = getRetryContext(agent);
      assert.ok(context.includes('2'));
    });
  });
});
