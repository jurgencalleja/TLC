const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  cancelAgent,
  cancelAllRunning,
  requiresConfirmation,
} = require('./agents-cancel-command.js');

describe('agents-cancel-command', () => {
  describe('execute', () => {
    const createMockRegistry = (agents = []) => ({
      getAgent: (id) => agents.find(a => a.id === id),
      listAgents: () => agents,
      updateAgent: (id, updates) => {
        const agent = agents.find(a => a.id === id);
        if (agent) Object.assign(agent, updates);
        return agent;
      },
    });

    it('cancels agent', async () => {
      const agents = [
        { id: 'agent-1', status: 'running' },
      ];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.ok(result.success);
      assert.strictEqual(agents[0].status, 'cancelled');
    });

    it('shows confirmation prompt', async () => {
      const agents = [{ id: 'agent-1', status: 'running' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: {},
      });
      assert.ok(result.needsConfirmation);
    });

    it('with --force skips prompt', async () => {
      const agents = [{ id: 'agent-1', status: 'running' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.ok(result.success);
      assert.ok(!result.needsConfirmation);
    });

    it('--all cancels all running', async () => {
      const agents = [
        { id: 'agent-1', status: 'running' },
        { id: 'agent-2', status: 'running' },
        { id: 'agent-3', status: 'completed' },
      ];
      const result = await execute({
        registry: createMockRegistry(agents),
        options: { all: true, force: true },
      });
      assert.ok(result.success);
      assert.strictEqual(result.cancelled, 2);
    });

    it('handles unknown agent ID', async () => {
      const result = await execute({
        registry: createMockRegistry([]),
        agentId: 'unknown',
        options: { force: true },
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found'));
    });

    it('handles already cancelled', async () => {
      const agents = [{ id: 'agent-1', status: 'cancelled' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('already'));
    });

    it('handles already completed', async () => {
      const agents = [{ id: 'agent-1', status: 'completed' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('already') || result.error.includes('completed'));
    });

    it('shows result message', async () => {
      const agents = [{ id: 'agent-1', status: 'running' }];
      const result = await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.ok(result.message);
      assert.ok(result.message.includes('cancelled') || result.message.includes('Cancelled'));
    });

    it('updates agent state', async () => {
      const agents = [{ id: 'agent-1', status: 'running' }];
      await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
      });
      assert.strictEqual(agents[0].status, 'cancelled');
    });

    it('triggers cleanup', async () => {
      let cleanupCalled = false;
      const agents = [{ id: 'agent-1', status: 'running' }];
      await execute({
        registry: createMockRegistry(agents),
        agentId: 'agent-1',
        options: { force: true },
        onCleanup: () => { cleanupCalled = true; },
      });
      assert.ok(cleanupCalled);
    });
  });

  describe('cancelAgent', () => {
    it('sets status to cancelled', () => {
      const agent = { id: 'agent-1', status: 'running' };
      const updateAgent = (id, updates) => Object.assign(agent, updates);
      cancelAgent(agent, updateAgent);
      assert.strictEqual(agent.status, 'cancelled');
    });

    it('sets end time', () => {
      const agent = { id: 'agent-1', status: 'running' };
      const updateAgent = (id, updates) => Object.assign(agent, updates);
      cancelAgent(agent, updateAgent);
      assert.ok(agent.endTime);
    });
  });

  describe('cancelAllRunning', () => {
    it('cancels only running agents', () => {
      const agents = [
        { id: '1', status: 'running' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'running' },
      ];
      const updateAgent = (id, updates) => {
        const agent = agents.find(a => a.id === id);
        Object.assign(agent, updates);
      };
      const count = cancelAllRunning(agents, updateAgent);
      assert.strictEqual(count, 2);
      assert.strictEqual(agents[0].status, 'cancelled');
      assert.strictEqual(agents[1].status, 'completed');
      assert.strictEqual(agents[2].status, 'cancelled');
    });
  });

  describe('requiresConfirmation', () => {
    it('returns true without force', () => {
      assert.strictEqual(requiresConfirmation({}), true);
    });

    it('returns false with force', () => {
      assert.strictEqual(requiresConfirmation({ force: true }), false);
    });
  });
});
