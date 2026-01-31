import { describe, it, expect } from 'vitest';
import { BaseAdapter, REVIEW_RESPONSE_SCHEMA } from './base-adapter.js';

describe('BaseAdapter', () => {
  describe('interface', () => {
    it('has required methods', () => {
      const adapter = new BaseAdapter({ name: 'test' });

      expect(typeof adapter.review).toBe('function');
      expect(typeof adapter.analyze).toBe('function');
      expect(typeof adapter.getUsage).toBe('function');
      expect(typeof adapter.estimateCost).toBe('function');
      expect(typeof adapter.canAfford).toBe('function');
    });

    it('has name property', () => {
      const adapter = new BaseAdapter({ name: 'claude' });
      expect(adapter.name).toBe('claude');
    });

    it('throws on unimplemented review', async () => {
      const adapter = new BaseAdapter({ name: 'test' });
      await expect(adapter.review('')).rejects.toThrow('Not implemented');
    });

    it('throws on unimplemented analyze', async () => {
      const adapter = new BaseAdapter({ name: 'test' });
      await expect(adapter.analyze('', '')).rejects.toThrow('Not implemented');
    });
  });

  describe('response validation', () => {
    it('validates correct response', () => {
      const response = {
        issues: [{ id: '1', severity: 'high', message: 'Test' }],
        suggestions: ['Suggestion 1'],
        score: 75,
        model: 'claude',
        tokensUsed: 1000,
        cost: 0.01,
      };

      expect(BaseAdapter.validateResponse(response)).toBe(true);
    });

    it('rejects missing required fields', () => {
      const response = {
        issues: [],
        // missing: suggestions, score, model, tokensUsed, cost
      };

      expect(BaseAdapter.validateResponse(response)).toBe(false);
    });

    it('rejects invalid score', () => {
      const response = {
        issues: [],
        suggestions: [],
        score: 150, // Invalid: > 100
        model: 'test',
        tokensUsed: 0,
        cost: 0,
      };

      expect(BaseAdapter.validateResponse(response)).toBe(false);
    });
  });

  describe('REVIEW_RESPONSE_SCHEMA', () => {
    it('defines all required fields', () => {
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('issues');
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('suggestions');
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('score');
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('model');
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('tokensUsed');
      expect(REVIEW_RESPONSE_SCHEMA).toHaveProperty('cost');
    });
  });

  describe('createEmptyResponse', () => {
    it('creates valid empty response', () => {
      const adapter = new BaseAdapter({ name: 'test' });
      const response = adapter.createEmptyResponse();

      expect(BaseAdapter.validateResponse(response)).toBe(true);
      expect(response.issues).toEqual([]);
      expect(response.model).toBe('test');
    });
  });
});
