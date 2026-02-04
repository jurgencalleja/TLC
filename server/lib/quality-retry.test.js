/**
 * Quality Retry Tests
 *
 * Tests for auto-retry logic with better models on quality failure
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createRetryManager,
  shouldRetry,
  selectBetterModel,
  buildRetryPrompt,
  trackRetryCost,
  getRetryHistory,
  retryWithFeedback,
} = require('./quality-retry.js');

describe('Quality Retry', () => {
  describe('createRetryManager', () => {
    it('creates manager with default options', () => {
      const manager = createRetryManager();
      assert.ok(manager);
      assert.ok(manager.options);
    });

    it('accepts custom max retries', () => {
      const manager = createRetryManager({ maxRetries: 5 });
      assert.strictEqual(manager.options.maxRetries, 5);
    });

    it('accepts budget limit', () => {
      const manager = createRetryManager({ budgetLimit: 1.0 });
      assert.strictEqual(manager.options.budgetLimit, 1.0);
    });

    it('initializes empty history', () => {
      const manager = createRetryManager();
      assert.deepStrictEqual(manager.history, []);
    });
  });

  describe('shouldRetry', () => {
    it('returns true on quality failure', () => {
      const evaluation = { pass: false };
      const result = shouldRetry(evaluation);
      assert.strictEqual(result, true);
    });

    it('returns false on quality pass', () => {
      const evaluation = { pass: true };
      const result = shouldRetry(evaluation);
      assert.strictEqual(result, false);
    });

    it('returns false when max retries reached', () => {
      const evaluation = { pass: false };
      const options = { maxRetries: 3, currentRetry: 3 };
      const result = shouldRetry(evaluation, options);
      assert.strictEqual(result, false);
    });

    it('returns false when budget exceeded', () => {
      const evaluation = { pass: false };
      const options = { budgetLimit: 1.0, spentBudget: 1.5 };
      const result = shouldRetry(evaluation, options);
      assert.strictEqual(result, false);
    });

    it('respects specific dimension failures', () => {
      const evaluation = { pass: false, failed: ['style'] };
      const options = { retryOnDimensions: ['correctness'] };
      const result = shouldRetry(evaluation, options);
      assert.strictEqual(result, false);
    });

    it('returns reason for not retrying', () => {
      const evaluation = { pass: false };
      const options = { maxRetries: 3, currentRetry: 3 };
      const result = shouldRetry(evaluation, options, { reason: true });
      assert.ok(result.reason);
      assert.ok(result.reason.includes('max'));
    });
  });

  describe('selectBetterModel', () => {
    it('escalates to better model', () => {
      const currentModel = 'gpt-3.5-turbo';
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
      const better = selectBetterModel(currentModel, models);
      assert.strictEqual(better, 'gpt-4');
    });

    it('returns null when at best model', () => {
      const currentModel = 'gpt-4-turbo';
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
      const better = selectBetterModel(currentModel, models);
      assert.strictEqual(better, null);
    });

    it('respects budget constraints', () => {
      const currentModel = 'gpt-3.5-turbo';
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
      const costs = { 'gpt-3.5-turbo': 0.01, 'gpt-4': 0.10, 'gpt-4-turbo': 0.15 };
      const options = { remainingBudget: 0.05, costs };
      const better = selectBetterModel(currentModel, models, options);
      assert.strictEqual(better, null);
    });

    it('considers model capabilities', () => {
      const currentModel = 'basic';
      const models = ['basic', 'advanced', 'premium'];
      const capabilities = {
        basic: ['text'],
        advanced: ['text', 'code'],
        premium: ['text', 'code', 'reasoning'],
      };
      const options = { requiredCapability: 'code', capabilities };
      const better = selectBetterModel(currentModel, models, options);
      assert.strictEqual(better, 'advanced');
    });

    it('returns model tier info', () => {
      const currentModel = 'gpt-3.5-turbo';
      const models = ['gpt-3.5-turbo', 'gpt-4'];
      const result = selectBetterModel(currentModel, models, { details: true });
      assert.ok(result.model);
      assert.ok(result.tier !== undefined);
    });
  });

  describe('buildRetryPrompt', () => {
    it('includes original prompt', () => {
      const original = 'Write a function to add numbers';
      const prompt = buildRetryPrompt(original, {});
      assert.ok(prompt.includes('add numbers'));
    });

    it('includes failure context', () => {
      const original = 'Write a function';
      const context = { failedDimensions: ['style'] };
      const prompt = buildRetryPrompt(original, context);
      assert.ok(prompt.includes('style'));
    });

    it('includes specific failure reasons', () => {
      const original = 'Write a function';
      const context = {
        failedDimensions: ['style'],
        failures: {
          style: { score: 60, threshold: 80, reason: 'inconsistent indentation' },
        },
      };
      const prompt = buildRetryPrompt(original, context);
      assert.ok(prompt.includes('indentation'));
    });

    it('includes improvement suggestions', () => {
      const original = 'Write tests';
      const context = {
        suggestions: ['Add edge case tests', 'Test error handling'],
      };
      const prompt = buildRetryPrompt(original, context);
      assert.ok(prompt.includes('edge case') || prompt.includes('error handling'));
    });

    it('formats prompt for model comprehension', () => {
      const original = 'Write code';
      const context = { failedDimensions: ['correctness'] };
      const prompt = buildRetryPrompt(original, context);
      assert.ok(prompt.includes('improve') || prompt.includes('fix'));
    });
  });

  describe('trackRetryCost', () => {
    it('accumulates cost across retries', () => {
      const manager = createRetryManager();
      trackRetryCost(manager, 0.05);
      trackRetryCost(manager, 0.10);
      // Use approximate comparison for floating point
      assert.ok(Math.abs(manager.totalCost - 0.15) < 0.0001);
    });

    it('records cost per attempt', () => {
      const manager = createRetryManager();
      trackRetryCost(manager, 0.05, { attempt: 1 });
      trackRetryCost(manager, 0.10, { attempt: 2 });
      assert.ok(manager.costPerAttempt);
      assert.strictEqual(manager.costPerAttempt[1], 0.05);
      assert.strictEqual(manager.costPerAttempt[2], 0.10);
    });

    it('returns remaining budget', () => {
      const manager = createRetryManager({ budgetLimit: 1.0 });
      trackRetryCost(manager, 0.30);
      const remaining = manager.budgetLimit - manager.totalCost;
      assert.strictEqual(remaining, 0.70);
    });

    it('tracks model used per attempt', () => {
      const manager = createRetryManager();
      trackRetryCost(manager, 0.05, { attempt: 1, model: 'gpt-3.5-turbo' });
      trackRetryCost(manager, 0.10, { attempt: 2, model: 'gpt-4' });
      assert.strictEqual(manager.modelPerAttempt[1], 'gpt-3.5-turbo');
      assert.strictEqual(manager.modelPerAttempt[2], 'gpt-4');
    });
  });

  describe('getRetryHistory', () => {
    it('returns all retry attempts', () => {
      const manager = createRetryManager();
      manager.history = [
        { attempt: 1, model: 'gpt-3.5', score: 60, pass: false },
        { attempt: 2, model: 'gpt-4', score: 85, pass: true },
      ];
      const history = getRetryHistory(manager);
      assert.strictEqual(history.length, 2);
    });

    it('includes scores per attempt', () => {
      const manager = createRetryManager();
      manager.history = [
        { attempt: 1, scores: { style: 60, correctness: 70 } },
      ];
      const history = getRetryHistory(manager);
      assert.ok(history[0].scores);
    });

    it('includes model escalation path', () => {
      const manager = createRetryManager();
      manager.history = [
        { attempt: 1, model: 'gpt-3.5-turbo' },
        { attempt: 2, model: 'gpt-4' },
        { attempt: 3, model: 'gpt-4-turbo' },
      ];
      const history = getRetryHistory(manager, { escalationPath: true });
      assert.ok(history.escalationPath);
      assert.deepStrictEqual(history.escalationPath, ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    });

    it('calculates improvement between attempts', () => {
      const manager = createRetryManager();
      manager.history = [
        { attempt: 1, composite: 60 },
        { attempt: 2, composite: 75 },
      ];
      const history = getRetryHistory(manager, { improvements: true });
      assert.ok(history.improvements);
      assert.strictEqual(history.improvements[1], 15);
    });
  });

  describe('retryWithFeedback', () => {
    it('improves results with feedback', async () => {
      let callCount = 0;
      const mockExecute = async (prompt, model) => {
        callCount++;
        return callCount === 1 ? 'bad code' : 'good code';
      };
      const mockEvaluate = async (output) => {
        return output === 'good code'
          ? { pass: true, composite: 90 }
          : { pass: false, composite: 60, failed: ['correctness'] };
      };
      const result = await retryWithFeedback(
        'Write code',
        { execute: mockExecute, evaluate: mockEvaluate, maxRetries: 3 }
      );
      assert.strictEqual(result.pass, true);
      assert.ok(callCount >= 2);
    });

    it('returns final result after max retries', async () => {
      let callCount = 0;
      const mockExecute = async () => {
        callCount++;
        return 'bad code';
      };
      const mockEvaluate = async () => ({ pass: false, composite: 50 });
      const result = await retryWithFeedback(
        'Write code',
        { execute: mockExecute, evaluate: mockEvaluate, maxRetries: 2 }
      );
      assert.strictEqual(result.pass, false);
      assert.strictEqual(callCount, 2);
    });

    it('escalates model on failure', async () => {
      const modelsUsed = [];
      const mockExecute = async (prompt, model) => {
        modelsUsed.push(model);
        return 'code';
      };
      let evalCount = 0;
      const mockEvaluate = async () => {
        evalCount++;
        return evalCount < 3
          ? { pass: false, composite: 60 }
          : { pass: true, composite: 90 };
      };
      await retryWithFeedback(
        'Write code',
        {
          execute: mockExecute,
          evaluate: mockEvaluate,
          models: ['basic', 'advanced', 'premium'],
          initialModel: 'basic',
          maxRetries: 5,
        }
      );
      assert.ok(modelsUsed.includes('advanced') || modelsUsed.includes('premium'));
    });

    it('includes retry history in result', async () => {
      const mockExecute = async () => 'code';
      const mockEvaluate = async () => ({ pass: true, composite: 90 });
      const result = await retryWithFeedback(
        'Write code',
        { execute: mockExecute, evaluate: mockEvaluate }
      );
      assert.ok(result.history);
    });
  });
});
