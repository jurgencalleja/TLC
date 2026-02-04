/**
 * Cost Tracker Tests
 *
 * Real-time cost tracking per agent, session, and day
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const {
  createCostTracker,
  recordCost,
  getAgentCost,
  getSessionCost,
  getDailyCost,
  getWeeklyCost,
  getMonthlyCost,
  getCostByModel,
  getCostByProvider,
  persistCosts,
  loadCosts,
} = require('./cost-tracker.js');

describe('Cost Tracker', () => {
  let tracker;
  let mockFs;

  beforeEach(() => {
    mockFs = {
      writeFileSync: () => {},
      readFileSync: () => '{}',
      existsSync: () => false,
    };
    tracker = createCostTracker({ fs: mockFs });
  });

  describe('recordCost', () => {
    it('adds to agent total', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.05,
      });

      const agentCost = getAgentCost(tracker, 'agent-1');
      assert.strictEqual(agentCost, 0.05);
    });

    it('adds to session total', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.05,
      });

      recordCost(tracker, {
        agentId: 'agent-2',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.03,
      });

      const sessionCost = getSessionCost(tracker, 'session-1');
      assert.strictEqual(sessionCost, 0.08);
    });

    it('adds to daily total', () => {
      const today = new Date().toISOString().split('T')[0];

      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.10,
      });

      const dailyCost = getDailyCost(tracker, today);
      assert.strictEqual(dailyCost, 0.10);
    });
  });

  describe('getAgentCost', () => {
    it('returns agent spend', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'gpt-4',
        provider: 'openai',
        cost: 0.12,
      });

      const cost = getAgentCost(tracker, 'agent-1');
      assert.strictEqual(cost, 0.12);
    });

    it('returns 0 for unknown agent', () => {
      const cost = getAgentCost(tracker, 'unknown-agent');
      assert.strictEqual(cost, 0);
    });
  });

  describe('getSessionCost', () => {
    it('returns session spend', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-123',
        model: 'gpt-4',
        provider: 'openai',
        cost: 0.25,
      });

      const cost = getSessionCost(tracker, 'session-123');
      assert.strictEqual(cost, 0.25);
    });

    it('returns 0 for unknown session', () => {
      const cost = getSessionCost(tracker, 'unknown-session');
      assert.strictEqual(cost, 0);
    });
  });

  describe('getDailyCost', () => {
    it('returns day spend', () => {
      const today = new Date().toISOString().split('T')[0];

      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.50,
      });

      const cost = getDailyCost(tracker, today);
      assert.strictEqual(cost, 0.50);
    });

    it('returns 0 for day with no costs', () => {
      const cost = getDailyCost(tracker, '2020-01-01');
      assert.strictEqual(cost, 0);
    });
  });

  describe('getWeeklyCost', () => {
    it('aggregates days in week', () => {
      // Record costs for multiple days
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 1.00,
        timestamp: now.toISOString(),
      });

      const weeklyCost = getWeeklyCost(tracker);
      assert.ok(weeklyCost >= 1.00);
    });
  });

  describe('getMonthlyCost', () => {
    it('aggregates weeks in month', () => {
      const now = new Date();

      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 5.00,
        timestamp: now.toISOString(),
      });

      const monthlyCost = getMonthlyCost(tracker);
      assert.ok(monthlyCost >= 5.00);
    });
  });

  describe('getCostByModel', () => {
    it('groups by model', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.10,
      });

      recordCost(tracker, {
        agentId: 'agent-2',
        sessionId: 'session-1',
        model: 'gpt-4',
        provider: 'openai',
        cost: 0.20,
      });

      recordCost(tracker, {
        agentId: 'agent-3',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.15,
      });

      const byModel = getCostByModel(tracker);
      assert.strictEqual(byModel['claude-3-opus'], 0.25);
      assert.strictEqual(byModel['gpt-4'], 0.20);
    });
  });

  describe('getCostByProvider', () => {
    it('groups by provider', () => {
      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.10,
      });

      recordCost(tracker, {
        agentId: 'agent-2',
        sessionId: 'session-1',
        model: 'gpt-4',
        provider: 'openai',
        cost: 0.20,
      });

      const byProvider = getCostByProvider(tracker);
      assert.strictEqual(byProvider['anthropic'], 0.10);
      assert.strictEqual(byProvider['openai'], 0.20);
    });
  });

  describe('persistCosts', () => {
    it('saves to disk', () => {
      let savedData = null;
      mockFs.writeFileSync = (path, data) => {
        savedData = JSON.parse(data);
      };

      recordCost(tracker, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        model: 'claude-3-opus',
        provider: 'anthropic',
        cost: 0.10,
      });

      persistCosts(tracker, '/path/to/costs.json');

      assert.ok(savedData !== null);
      assert.ok(savedData.records);
      assert.strictEqual(savedData.records.length, 1);
    });
  });

  describe('loadCosts', () => {
    it('restores from disk', () => {
      const savedState = {
        records: [
          {
            agentId: 'agent-1',
            sessionId: 'session-1',
            model: 'claude-3-opus',
            provider: 'anthropic',
            cost: 0.50,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      mockFs.existsSync = () => true;
      mockFs.readFileSync = () => JSON.stringify(savedState);

      const loadedTracker = loadCosts('/path/to/costs.json', { fs: mockFs });

      const agentCost = getAgentCost(loadedTracker, 'agent-1');
      assert.strictEqual(agentCost, 0.50);
    });

    it('returns empty tracker if file not found', () => {
      mockFs.existsSync = () => false;

      const loadedTracker = loadCosts('/path/to/costs.json', { fs: mockFs });

      const agentCost = getAgentCost(loadedTracker, 'agent-1');
      assert.strictEqual(agentCost, 0);
    });
  });
});
