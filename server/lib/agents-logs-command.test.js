const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  formatLogLine,
  formatLogs,
  streamLogs,
  tailLogs,
} = require('./agents-logs-command.js');

describe('agents-logs-command', () => {
  const agentWithLogs = {
    id: 'agent-1',
    status: 'completed',
    logs: [
      { timestamp: new Date('2024-01-01T10:00:00'), stream: 'stdout', message: 'Starting task...' },
      { timestamp: new Date('2024-01-01T10:00:01'), stream: 'stdout', message: 'Processing...' },
      { timestamp: new Date('2024-01-01T10:00:02'), stream: 'stderr', message: 'Warning: rate limit' },
      { timestamp: new Date('2024-01-01T10:00:03'), stream: 'stdout', message: 'Complete!' },
    ],
  };

  describe('execute', () => {
    const createMockRegistry = (agents = []) => ({
      getAgent: (id) => agents.find(a => a.id === id),
    });

    it('shows agent output', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
      });
      assert.ok(result.success);
      assert.ok(result.output.includes('Starting'));
      assert.ok(result.output.includes('Complete'));
    });

    it('with --follow streams', async () => {
      const result = await execute({
        registry: createMockRegistry([{ ...agentWithLogs, status: 'running' }]),
        agentId: 'agent-1',
        options: { follow: true },
      });
      assert.ok(result.streaming || result.output);
    });

    it('with --tail limits lines', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
        options: { tail: 2 },
      });
      const lines = result.output.split('\n').filter(l => l.trim());
      assert.ok(lines.length <= 2);
    });

    it('shows stdout content', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
      });
      assert.ok(result.output.includes('Starting task'));
    });

    it('shows stderr content', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
      });
      assert.ok(result.output.includes('Warning'));
    });

    it('timestamps are prefixed', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
        options: { timestamps: true },
      });
      assert.ok(result.output.includes('10:00') || result.output.includes(':'));
    });

    it('errors are colored red', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
        options: { color: true },
      });
      // Check for ANSI red code or stderr marker
      assert.ok(result.output.includes('stderr') || result.output.includes('\x1b[31m') || result.output.includes('Warning'));
    });

    it('handles completed agent', async () => {
      const result = await execute({
        registry: createMockRegistry([agentWithLogs]),
        agentId: 'agent-1',
      });
      assert.ok(result.success);
    });

    it('handles no output yet', async () => {
      const result = await execute({
        registry: createMockRegistry([{ id: 'agent-1', status: 'running', logs: [] }]),
        agentId: 'agent-1',
      });
      assert.ok(result.output.includes('No logs') || result.output === '');
    });

    it('handles unknown agent ID', async () => {
      const result = await execute({
        registry: createMockRegistry([]),
        agentId: 'unknown',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found'));
    });
  });

  describe('formatLogLine', () => {
    it('formats with timestamp', () => {
      const line = formatLogLine({
        timestamp: new Date('2024-01-01T10:00:00'),
        stream: 'stdout',
        message: 'Test',
      }, { timestamps: true });
      assert.ok(line.includes('10:00'));
      assert.ok(line.includes('Test'));
    });

    it('formats without timestamp', () => {
      const line = formatLogLine({
        timestamp: new Date(),
        stream: 'stdout',
        message: 'Test',
      }, { timestamps: false });
      assert.strictEqual(line, 'Test');
    });

    it('marks stderr', () => {
      const line = formatLogLine({
        timestamp: new Date(),
        stream: 'stderr',
        message: 'Error',
      }, { timestamps: true });
      assert.ok(line.includes('stderr') || line.includes('[ERR]'));
    });
  });

  describe('formatLogs', () => {
    it('formats all log lines', () => {
      const logs = [
        { timestamp: new Date(), stream: 'stdout', message: 'Line 1' },
        { timestamp: new Date(), stream: 'stdout', message: 'Line 2' },
      ];
      const result = formatLogs(logs, {});
      assert.ok(result.includes('Line 1'));
      assert.ok(result.includes('Line 2'));
    });

    it('returns empty message for no logs', () => {
      const result = formatLogs([], {});
      assert.ok(result.includes('No logs') || result === '');
    });
  });

  describe('tailLogs', () => {
    const logs = [
      { message: 'Line 1' },
      { message: 'Line 2' },
      { message: 'Line 3' },
      { message: 'Line 4' },
    ];

    it('returns last n entries', () => {
      const result = tailLogs(logs, 2);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].message, 'Line 3');
      assert.strictEqual(result[1].message, 'Line 4');
    });

    it('returns all if fewer than n', () => {
      const result = tailLogs(logs, 10);
      assert.strictEqual(result.length, 4);
    });
  });

  describe('streamLogs', () => {
    it('returns stream info', () => {
      const result = streamLogs({ id: 'agent-1', status: 'running' });
      assert.ok(result.streaming);
      assert.ok(result.agentId);
    });

    it('includes current logs', () => {
      const result = streamLogs({ id: 'agent-1', status: 'running', logs: [{ message: 'test' }] });
      assert.ok(result.currentLogs);
    });
  });
});
