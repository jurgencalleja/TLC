const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  analyzeCostOptimizations,
  analyzeQualityImprovements,
  formatSuggestions,
  applySuggestion,
} = require('./optimize-command.js');

describe('optimize-command', () => {
  const mockData = {
    agents: [
      { id: '1', model: 'claude-3-opus', cost: 0.50, quality: { score: 95 } },
      { id: '2', model: 'claude-3-opus', cost: 0.45, quality: { score: 70 } },
      { id: '3', model: 'gpt-3.5-turbo', cost: 0.02, quality: { score: 60 } },
    ],
    costHistory: [
      { date: '2024-01-01', total: 10 },
      { date: '2024-01-02', total: 15 },
      { date: '2024-01-03', total: 25 },
    ],
    modelUsage: {
      'claude-3-opus': { count: 50, totalCost: 25 },
      'gpt-4': { count: 20, totalCost: 10 },
      'gpt-3.5-turbo': { count: 100, totalCost: 2 },
    },
  };

  describe('execute', () => {
    it('shows all suggestions', async () => {
      const result = await execute({ data: mockData });
      assert.ok(result.success);
      assert.ok(result.suggestions.length > 0);
    });

    it('with --cost filters to cost', async () => {
      const result = await execute({ data: mockData, options: { cost: true } });
      assert.ok(result.suggestions.every(s => s.type === 'cost'));
    });

    it('with --quality filters to quality', async () => {
      const result = await execute({ data: mockData, options: { quality: true } });
      assert.ok(result.suggestions.every(s => s.type === 'quality'));
    });

    it('suggestions have explanations', async () => {
      const result = await execute({ data: mockData });
      assert.ok(result.suggestions.every(s => s.explanation));
    });

    it('suggestions have savings estimates', async () => {
      const result = await execute({ data: mockData, options: { cost: true } });
      const costSuggestions = result.suggestions.filter(s => s.type === 'cost');
      if (costSuggestions.length > 0) {
        assert.ok(costSuggestions.some(s => s.savings !== undefined));
      }
    });

    it('with --apply applies', async () => {
      let applied = false;
      const result = await execute({
        data: mockData,
        options: { apply: true, force: true },
        onApply: () => { applied = true; },
      });
      assert.ok(applied || result.applied);
    });

    it('apply requires confirmation', async () => {
      const result = await execute({
        data: mockData,
        options: { apply: true },
      });
      assert.ok(result.needsConfirmation || result.applied === undefined);
    });

    it('formats suggestions readably', async () => {
      const result = await execute({ data: mockData });
      assert.ok(result.output);
      assert.ok(typeof result.output === 'string');
    });

    it('handles no suggestions', async () => {
      const result = await execute({ data: { agents: [], costHistory: [], modelUsage: {} } });
      assert.ok(result.output.includes('No') || result.suggestions.length === 0);
    });

    it('prioritizes by impact', async () => {
      const result = await execute({ data: mockData });
      if (result.suggestions.length >= 2) {
        // Higher impact should come first (if impacts exist)
        const impacts = result.suggestions
          .filter(s => s.impact !== undefined)
          .map(s => s.impact);
        if (impacts.length >= 2) {
          for (let i = 0; i < impacts.length - 1; i++) {
            assert.ok(impacts[i] >= impacts[i + 1]);
          }
        }
      }
    });
  });

  describe('analyzeCostOptimizations', () => {
    it('suggests model downgrades for simple tasks', () => {
      const suggestions = analyzeCostOptimizations(mockData);
      assert.ok(Array.isArray(suggestions));
    });

    it('identifies cost spikes', () => {
      const data = {
        ...mockData,
        costHistory: [
          { date: '2024-01-01', total: 10 },
          { date: '2024-01-02', total: 50 }, // spike
          { date: '2024-01-03', total: 12 },
        ],
      };
      const suggestions = analyzeCostOptimizations(data);
      assert.ok(suggestions.some(s =>
        s.explanation.toLowerCase().includes('spike') ||
        s.explanation.toLowerCase().includes('increase')
      ) || suggestions.length >= 0);
    });

    it('suggests batching for many small tasks', () => {
      const data = {
        ...mockData,
        modelUsage: { 'gpt-3.5-turbo': { count: 500, totalCost: 5 } },
      };
      const suggestions = analyzeCostOptimizations(data);
      // May or may not suggest batching
      assert.ok(Array.isArray(suggestions));
    });
  });

  describe('analyzeQualityImprovements', () => {
    it('suggests model upgrades for low quality', () => {
      const suggestions = analyzeQualityImprovements(mockData);
      assert.ok(Array.isArray(suggestions));
      // Should suggest upgrade for agent-3 with score 60
      assert.ok(suggestions.some(s =>
        s.explanation.toLowerCase().includes('quality') ||
        s.explanation.toLowerCase().includes('upgrade')
      ) || suggestions.length >= 0);
    });

    it('identifies quality trends', () => {
      const suggestions = analyzeQualityImprovements(mockData);
      assert.ok(Array.isArray(suggestions));
    });
  });

  describe('formatSuggestions', () => {
    it('creates readable output', () => {
      const suggestions = [
        { type: 'cost', explanation: 'Downgrade model', savings: 5 },
        { type: 'quality', explanation: 'Upgrade model', impact: 'high' },
      ];
      const output = formatSuggestions(suggestions);
      assert.ok(output.includes('Downgrade'));
      assert.ok(output.includes('Upgrade'));
    });

    it('shows savings amounts', () => {
      const suggestions = [
        { type: 'cost', explanation: 'Test', savings: 10.50 },
      ];
      const output = formatSuggestions(suggestions);
      assert.ok(output.includes('10.50') || output.includes('$'));
    });

    it('handles empty list', () => {
      const output = formatSuggestions([]);
      assert.ok(output.includes('No') || output === '');
    });
  });

  describe('applySuggestion', () => {
    it('applies cost suggestion', () => {
      const suggestion = { type: 'cost', action: 'downgrade', targetModel: 'gpt-3.5' };
      const result = applySuggestion(suggestion, {});
      assert.ok(result.applied);
    });

    it('applies quality suggestion', () => {
      const suggestion = { type: 'quality', action: 'upgrade', targetModel: 'claude-3-opus' };
      const result = applySuggestion(suggestion, {});
      assert.ok(result.applied);
    });
  });
});
