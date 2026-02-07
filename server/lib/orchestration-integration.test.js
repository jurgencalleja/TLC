import { describe, it, beforeEach, vi } from 'vitest';
const assert = require('node:assert');
const {
  wrapWithOrchestration,
  createAgentForCommand,
  trackCommandCost,
  applyQualityGate,
  OrchestrationIntegration,
} = require('./orchestration-integration.js');

describe('orchestration-integration', () => {
  describe('OrchestrationIntegration', () => {
    let integration;
    let mockRegistry;
    let mockCostTracker;
    let mockQualityGate;

    beforeEach(() => {
      mockRegistry = {
        agents: [],
        createAgent: (data) => {
          const agent = { id: `agent-${Date.now()}`, ...data };
          mockRegistry.agents.push(agent);
          return agent;
        },
        getAgent: (id) => mockRegistry.agents.find(a => a.id === id),
        updateAgent: (id, updates) => {
          const agent = mockRegistry.agents.find(a => a.id === id);
          if (agent) Object.assign(agent, updates);
          return agent;
        },
      };

      mockCostTracker = {
        costs: [],
        track: (cost) => mockCostTracker.costs.push(cost),
        getTotal: () => mockCostTracker.costs.reduce((s, c) => s + c.amount, 0),
      };

      mockQualityGate = {
        evaluate: async (output) => ({ pass: output.quality > 70, score: output.quality }),
      };

      integration = new OrchestrationIntegration({
        registry: mockRegistry,
        costTracker: mockCostTracker,
        qualityGate: mockQualityGate,
      });
    });

    describe('build command', () => {
      it('creates agents', async () => {
        const result = await integration.wrapCommand('build', async () => ({
          success: true,
          output: 'Built successfully',
          quality: 85,
        }));

        assert.ok(mockRegistry.agents.length > 0);
      });

      it('tracks cost', async () => {
        await integration.wrapCommand('build', async () => ({
          success: true,
          cost: 0.15,
          quality: 85,
        }));

        assert.ok(mockCostTracker.costs.length > 0);
      });
    });

    describe('review command', () => {
      it('uses multi-model', async () => {
        let modelsUsed = [];
        const result = await integration.wrapCommand('review', async (ctx) => {
          modelsUsed.push(ctx.model || 'default');
          return { success: true, quality: 90 };
        }, { multiModel: true, models: ['claude', 'gpt-4'] });

        assert.ok(result.success);
      });

      it('applies consensus', async () => {
        const results = [
          { score: 80, issues: ['a', 'b'] },
          { score: 85, issues: ['b', 'c'] },
        ];
        const consensus = integration.applyConsensus(results);
        assert.ok(consensus.score >= 80);
        assert.ok(consensus.issues.includes('b')); // Common issue
      });
    });

    describe('refactor command', () => {
      it('uses quality gate', async () => {
        let qualityChecked = false;
        const customQuality = {
          evaluate: async (output) => {
            qualityChecked = true;
            return { pass: true, score: 90 };
          },
        };

        const int = new OrchestrationIntegration({
          registry: mockRegistry,
          costTracker: mockCostTracker,
          qualityGate: customQuality,
        });

        await int.wrapCommand('refactor', async () => ({
          success: true,
          quality: 90,
        }), { useQualityGate: true });

        assert.ok(qualityChecked);
      });
    });

    it('agents appear in registry', async () => {
      await integration.wrapCommand('test', async () => ({ success: true, quality: 85 }));
      assert.ok(mockRegistry.agents.length > 0);
    });

    it('costs appear in tracker', async () => {
      await integration.wrapCommand('test', async () => ({
        success: true,
        cost: 0.25,
        quality: 85,
      }));
      assert.ok(mockCostTracker.costs.some(c => c.amount === 0.25));
    });

    it('quality scores recorded', async () => {
      await integration.wrapCommand('test', async () => ({
        success: true,
        quality: 92,
      }));
      const agent = mockRegistry.agents[0];
      assert.ok(agent.quality?.score === 92 || agent.qualityScore === 92);
    });

    it('existing behavior preserved', async () => {
      const original = async () => ({ custom: 'data', success: true, quality: 85 });
      const result = await integration.wrapCommand('test', original);
      assert.strictEqual(result.custom, 'data');
    });

    it('graceful fallback on error', async () => {
      const brokenRegistry = {
        createAgent: () => { throw new Error('Registry error'); },
      };

      const int = new OrchestrationIntegration({
        registry: brokenRegistry,
        costTracker: mockCostTracker,
        qualityGate: mockQualityGate,
        fallbackOnError: true,
      });

      // Should not throw, should fall back
      const result = await int.wrapCommand('test', async () => ({
        success: true,
        quality: 85,
      }));
      assert.ok(result.success);
    });
  });

  describe('wrapWithOrchestration', () => {
    it('wraps function with tracking', async () => {
      let tracked = false;
      const wrapped = wrapWithOrchestration(
        async () => ({ result: 'ok' }),
        { onComplete: () => { tracked = true; } }
      );

      const result = await wrapped();
      assert.strictEqual(result.result, 'ok');
      assert.ok(tracked);
    });

    it('passes context through', async () => {
      const wrapped = wrapWithOrchestration(
        async (ctx) => ({ model: ctx.model }),
        {}
      );

      const result = await wrapped({ model: 'claude' });
      assert.strictEqual(result.model, 'claude');
    });
  });

  describe('createAgentForCommand', () => {
    it('creates agent with command name', () => {
      const agent = createAgentForCommand('build', { model: 'claude' });
      assert.strictEqual(agent.command, 'build');
      assert.strictEqual(agent.model, 'claude');
    });

    it('sets initial status', () => {
      const agent = createAgentForCommand('test', {});
      assert.strictEqual(agent.status, 'queued');
    });
  });

  describe('trackCommandCost', () => {
    it('records cost with command', () => {
      const tracker = { costs: [], track: (c) => tracker.costs.push(c) };
      trackCommandCost(tracker, 'build', 0.15);
      assert.strictEqual(tracker.costs[0].command, 'build');
      assert.strictEqual(tracker.costs[0].amount, 0.15);
    });
  });

  describe('applyQualityGate', () => {
    it('passes for high quality', async () => {
      const gate = { evaluate: async () => ({ pass: true, score: 90 }) };
      const result = await applyQualityGate(gate, { output: 'test' });
      assert.ok(result.pass);
    });

    it('fails for low quality', async () => {
      const gate = { evaluate: async () => ({ pass: false, score: 50 }) };
      const result = await applyQualityGate(gate, { output: 'test' });
      assert.strictEqual(result.pass, false);
    });

    it('returns score', async () => {
      const gate = { evaluate: async () => ({ pass: true, score: 85 }) };
      const result = await applyQualityGate(gate, { output: 'test' });
      assert.strictEqual(result.score, 85);
    });
  });
});
