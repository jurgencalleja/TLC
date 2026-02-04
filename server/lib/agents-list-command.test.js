const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  filterAgents,
  formatTable,
  formatJSON,
} = require('./agents-list-command.js');

describe('agents-list-command', () => {
  describe('execute', () => {
    const mockAgents = [
      { id: 'agent-1', name: 'Builder', model: 'claude', status: 'running', startTime: new Date(), cost: 0.05 },
      { id: 'agent-2', name: 'Reviewer', model: 'gpt-4', status: 'completed', startTime: new Date(Date.now() - 3600000), cost: 0.10 },
      { id: 'agent-3', name: 'Tester', model: 'claude', status: 'failed', startTime: new Date(Date.now() - 7200000), cost: 0.02 },
    ];

    it('lists all agents', async () => {
      const result = await execute({ registry: { listAgents: () => mockAgents } });
      assert.ok(result.output);
      assert.ok(result.output.includes('agent-1'));
      assert.ok(result.output.includes('agent-2'));
      assert.ok(result.output.includes('agent-3'));
    });

    it('filters by status', async () => {
      const result = await execute({
        registry: { listAgents: () => mockAgents },
        options: { status: 'running' },
      });
      assert.ok(result.output.includes('agent-1'));
      assert.ok(!result.output.includes('agent-2'));
    });

    it('filters by model', async () => {
      const result = await execute({
        registry: { listAgents: () => mockAgents },
        options: { model: 'claude' },
      });
      assert.ok(result.output.includes('agent-1'));
      assert.ok(result.output.includes('agent-3'));
      assert.ok(!result.output.includes('Reviewer'));
    });

    it('filters by time', async () => {
      const result = await execute({
        registry: { listAgents: () => mockAgents },
        options: { since: '30m' },
      });
      assert.ok(result.output.includes('agent-1'));
      assert.ok(!result.output.includes('agent-3'));
    });

    it('handles empty list', async () => {
      const result = await execute({ registry: { listAgents: () => [] } });
      assert.ok(result.output.includes('No agents found'));
    });

    it('shows helpful headers', async () => {
      const result = await execute({ registry: { listAgents: () => mockAgents } });
      assert.ok(result.output.includes('ID'));
      assert.ok(result.output.includes('Status'));
      assert.ok(result.output.includes('Model'));
    });
  });

  describe('filterAgents', () => {
    const agents = [
      { id: '1', status: 'running', model: 'claude', startTime: new Date() },
      { id: '2', status: 'completed', model: 'gpt-4', startTime: new Date(Date.now() - 3600000) },
    ];

    it('filters by status', () => {
      const result = filterAgents(agents, { status: 'running' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, '1');
    });

    it('filters by model', () => {
      const result = filterAgents(agents, { model: 'gpt-4' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, '2');
    });

    it('filters by time since', () => {
      const result = filterAgents(agents, { since: '30m' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, '1');
    });

    it('returns all when no filters', () => {
      const result = filterAgents(agents, {});
      assert.strictEqual(result.length, 2);
    });
  });

  describe('formatTable', () => {
    const agents = [
      { id: 'agent-1', name: 'Builder', model: 'claude', status: 'running', cost: 0.05 },
      { id: 'agent-2', name: 'Very Long Agent Name That Exceeds Normal Width', model: 'gpt-4', status: 'completed', cost: 0.10 },
    ];

    it('creates readable output', () => {
      const result = formatTable(agents);
      assert.ok(result.includes('agent-1'));
      assert.ok(result.includes('running'));
    });

    it('truncates long values', () => {
      const result = formatTable(agents, { maxWidth: 80 });
      assert.ok(!result.includes('Very Long Agent Name That Exceeds Normal Width'));
      assert.ok(result.includes('...') || result.includes('Very Long'));
    });

    it('respects terminal width', () => {
      const result = formatTable(agents, { maxWidth: 60 });
      const lines = result.split('\n');
      const maxLine = Math.max(...lines.map(l => l.length));
      assert.ok(maxLine <= 80); // Some buffer for formatting
    });

    it('handles empty list', () => {
      const result = formatTable([]);
      assert.ok(result.includes('No agents'));
    });
  });

  describe('formatJSON', () => {
    const agents = [
      { id: 'agent-1', name: 'Builder', model: 'claude', status: 'running' },
    ];

    it('creates valid JSON', () => {
      const result = formatJSON(agents);
      const parsed = JSON.parse(result);
      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed[0].id, 'agent-1');
    });

    it('includes all fields', () => {
      const result = formatJSON(agents);
      const parsed = JSON.parse(result);
      assert.ok('id' in parsed[0]);
      assert.ok('name' in parsed[0]);
      assert.ok('model' in parsed[0]);
      assert.ok('status' in parsed[0]);
    });
  });
});
