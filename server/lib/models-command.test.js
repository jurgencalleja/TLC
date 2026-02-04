const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const {
  execute,
  listModels,
  testConnectivity,
  formatModels,
  formatPricing,
  formatCapabilities,
  detectLocalCLI,
} = require('./models-command.js');

describe('models-command', () => {
  const mockModels = [
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      available: true,
      local: true,
      health: 'healthy',
      pricing: { input: 0.015, output: 0.075 },
      capabilities: ['code', 'reasoning', 'vision'],
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      available: true,
      local: false,
      health: 'healthy',
      pricing: { input: 0.01, output: 0.03 },
      capabilities: ['code', 'reasoning'],
    },
    {
      id: 'codex',
      name: 'Codex',
      provider: 'openai',
      available: false,
      local: false,
      health: 'offline',
      pricing: { input: 0.002, output: 0.002 },
      capabilities: ['code'],
    },
  ];

  describe('execute', () => {
    it('lists all models', async () => {
      const result = await execute({ models: mockModels });
      assert.ok(result.success);
      assert.ok(result.output.includes('claude-3-opus') || result.output.includes('Claude'));
    });

    it('shows local/devserver', async () => {
      const result = await execute({ models: mockModels });
      assert.ok(result.output.includes('local') || result.output.includes('Local'));
    });

    it('test checks connectivity', async () => {
      const result = await execute({
        models: mockModels,
        command: 'test',
        modelId: 'claude-3-opus',
        testFn: async () => ({ success: true, latency: 100 }),
      });
      assert.ok(result.success);
      assert.ok(result.output.includes('success') || result.output.includes('OK') || result.output.includes('100'));
    });

    it('pricing shows costs', async () => {
      const result = await execute({ models: mockModels, command: 'pricing' });
      assert.ok(result.output.includes('0.015') || result.output.includes('$'));
    });

    it('capabilities shows features', async () => {
      const result = await execute({ models: mockModels, command: 'capabilities' });
      assert.ok(result.output.includes('code') || result.output.includes('reasoning'));
    });

    it('health status color coded', async () => {
      const result = await execute({ models: mockModels, options: { color: true } });
      // Should include health indicators
      assert.ok(
        result.output.includes('healthy') ||
        result.output.includes('offline') ||
        result.output.includes('✓') ||
        result.output.includes('✗')
      );
    });

    it('handles offline models', async () => {
      const result = await execute({ models: mockModels });
      assert.ok(result.output.includes('offline') || result.output.includes('unavailable'));
    });
  });

  describe('listModels', () => {
    it('returns all models', () => {
      const result = listModels(mockModels);
      assert.strictEqual(result.length, 3);
    });

    it('filters by provider', () => {
      const result = listModels(mockModels, { provider: 'openai' });
      assert.strictEqual(result.length, 2);
    });

    it('filters by availability', () => {
      const result = listModels(mockModels, { available: true });
      assert.strictEqual(result.length, 2);
    });
  });

  describe('testConnectivity', () => {
    it('returns success for available model', async () => {
      const result = await testConnectivity(mockModels[0], async () => ({ ok: true }));
      assert.ok(result.success);
    });

    it('returns latency', async () => {
      const result = await testConnectivity(mockModels[0], async () => ({ ok: true }));
      assert.ok(result.latency !== undefined);
    });

    it('handles timeout', async () => {
      const result = await testConnectivity(mockModels[0], async () => {
        throw new Error('Timeout');
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe('formatModels', () => {
    it('creates table', () => {
      const result = formatModels(mockModels);
      assert.ok(result.includes('claude') || result.includes('Claude'));
      assert.ok(result.includes('gpt') || result.includes('GPT'));
    });

    it('shows availability', () => {
      const result = formatModels(mockModels);
      assert.ok(result.includes('✓') || result.includes('available') || result.includes('yes'));
    });

    it('handles empty list', () => {
      const result = formatModels([]);
      assert.ok(result.includes('No models') || result === '');
    });
  });

  describe('formatPricing', () => {
    it('shows input/output prices', () => {
      const result = formatPricing(mockModels);
      assert.ok(result.includes('input') || result.includes('Input'));
      assert.ok(result.includes('output') || result.includes('Output'));
    });

    it('shows per 1K tokens', () => {
      const result = formatPricing(mockModels);
      assert.ok(result.includes('1K') || result.includes('1000') || result.includes('$'));
    });
  });

  describe('formatCapabilities', () => {
    it('lists capabilities per model', () => {
      const result = formatCapabilities(mockModels);
      assert.ok(result.includes('code'));
      assert.ok(result.includes('reasoning'));
    });

    it('shows vision capability', () => {
      const result = formatCapabilities(mockModels);
      assert.ok(result.includes('vision'));
    });
  });

  describe('detectLocalCLI', () => {
    it('detects claude CLI', async () => {
      const result = await detectLocalCLI('claude', async () => true);
      assert.ok(result.available);
    });

    it('handles missing CLI', async () => {
      const result = await detectLocalCLI('nonexistent', async () => false);
      assert.strictEqual(result.available, false);
    });

    it('returns version if available', async () => {
      const result = await detectLocalCLI('claude', async () => '1.0.0');
      assert.ok(result.version || result.available);
    });
  });
});
