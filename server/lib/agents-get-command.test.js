const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  formatDetails,
  formatStateHistory,
  formatTokenBreakdown,
  formatCostBreakdown,
  formatQualityScores,
} = require('./agents-get-command.js');

describe('agents-get-command', () => {
  const mockAgent = {
    id: 'agent-123',
    name: 'Code Builder',
    model: 'claude-3-opus',
    status: 'completed',
    startTime: new Date(Date.now() - 120000),
    endTime: new Date(),
    tokens: { input: 5000, output: 2500 },
    cost: 0.25,
    quality: { score: 85, dimensions: { correctness: 90, completeness: 80 } },
    stateHistory: [
      { state: 'queued', timestamp: new Date(Date.now() - 180000) },
      { state: 'running', timestamp: new Date(Date.now() - 120000) },
      { state: 'completed', timestamp: new Date() },
    ],
  };

  describe('execute', () => {
    it('shows agent details', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output);
      assert.ok(result.output.includes('agent-123'));
    });

    it('shows metadata section', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes('claude-3-opus'));
      assert.ok(result.output.includes('completed'));
    });

    it('shows state history', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes('queued') || result.output.includes('running'));
    });

    it('shows token breakdown', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes('5000') || result.output.includes('5,000') || result.output.includes('Input'));
    });

    it('shows cost breakdown', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes('0.25') || result.output.includes('$'));
    });

    it('shows quality scores', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes('85') || result.output.includes('Quality'));
    });

    it('handles unknown agent ID', async () => {
      const result = await execute({
        registry: { getAgent: () => null },
        agentId: 'unknown',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found') || result.error.includes('Unknown'));
    });

    it('includes timestamps', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
      });
      assert.ok(result.output.includes(':') || result.output.includes('Time'));
    });

    it('JSON output option works', async () => {
      const result = await execute({
        registry: { getAgent: () => mockAgent },
        agentId: 'agent-123',
        options: { json: true },
      });
      const parsed = JSON.parse(result.output);
      assert.strictEqual(parsed.id, 'agent-123');
    });
  });

  describe('formatDetails', () => {
    it('creates sections', () => {
      const result = formatDetails(mockAgent);
      assert.ok(result.includes('Agent:') || result.includes('ID:'));
      assert.ok(result.includes('Model:') || result.includes('claude'));
    });
  });

  describe('formatStateHistory', () => {
    it('shows state transitions', () => {
      const result = formatStateHistory(mockAgent.stateHistory);
      assert.ok(result.includes('queued'));
      assert.ok(result.includes('running'));
      assert.ok(result.includes('completed'));
    });

    it('handles empty history', () => {
      const result = formatStateHistory([]);
      assert.ok(result.includes('No') || result === '');
    });
  });

  describe('formatTokenBreakdown', () => {
    it('shows input and output', () => {
      const result = formatTokenBreakdown({ input: 5000, output: 2500 });
      assert.ok(result.includes('5000') || result.includes('5,000'));
      assert.ok(result.includes('2500') || result.includes('2,500'));
    });

    it('shows total', () => {
      const result = formatTokenBreakdown({ input: 5000, output: 2500 });
      assert.ok(result.includes('7500') || result.includes('7,500') || result.includes('Total'));
    });
  });

  describe('formatCostBreakdown', () => {
    it('shows cost', () => {
      const result = formatCostBreakdown(0.25);
      assert.ok(result.includes('0.25') || result.includes('$'));
    });
  });

  describe('formatQualityScores', () => {
    it('shows main score', () => {
      const result = formatQualityScores({ score: 85, dimensions: {} });
      assert.ok(result.includes('85'));
    });

    it('shows dimensions', () => {
      const result = formatQualityScores({ score: 85, dimensions: { correctness: 90 } });
      assert.ok(result.includes('90') || result.includes('correctness'));
    });

    it('handles no quality data', () => {
      const result = formatQualityScores(null);
      assert.ok(result.includes('No') || result === '');
    });
  });
});
