/**
 * Messaging Patterns Tests
 */

import { describe, it, expect } from 'vitest';

describe('MessagingPatterns', () => {
  describe('generate', () => {
    it('generates complete messaging setup', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generate({
        events: ['UserCreated', 'OrderPlaced'],
        broker: 'redis',
      });

      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('handles empty events array', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generate({
        events: [],
        broker: 'redis',
      });

      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('handles single event', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generate({
        events: ['UserCreated'],
        broker: 'redis',
      });

      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('generateEventBusConfig', () => {
    it('generates event bus config for redis', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventBusConfig('redis');

      expect(result).toContain('redis');
    });

    it('config has connection URL', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventBusConfig('redis');

      expect(result).toContain('REDIS_URL');
    });

    it('config has retry settings', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventBusConfig('redis');

      expect(result).toContain('retry');
    });
  });

  describe('generatePublisher', () => {
    it('publisher has publish function', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generatePublisher();

      expect(result).toContain('publish');
      expect(result).toContain('function');
    });

    it('publisher adds metadata (id, timestamp)', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generatePublisher();

      expect(result).toContain('id');
      expect(result).toContain('timestamp');
    });

    it('publisher serializes to JSON', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generatePublisher();

      expect(result).toContain('JSON.stringify');
    });
  });

  describe('generateSubscriber', () => {
    it('subscriber has subscribe function', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateSubscriber();

      expect(result).toContain('subscribe');
      expect(result).toContain('function');
    });

    it('subscriber deserializes messages', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateSubscriber();

      expect(result).toContain('JSON.parse');
    });

    it('subscriber has error handler', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateSubscriber();

      expect(result).toContain('error');
      expect(result).toContain('catch');
    });
  });

  describe('generateDeadLetterConfig', () => {
    it('dead letter queue config included', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateDeadLetterConfig();

      expect(result).toContain('dead');
      expect(result).toContain('letter');
    });

    it('dead letter tracks retry count', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateDeadLetterConfig();

      expect(result).toContain('retry');
      expect(result).toContain('count');
    });
  });

  describe('generateEventCatalog', () => {
    it('event catalog lists all events', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventCatalog(['UserCreated', 'OrderPlaced']);

      expect(result).toContain('UserCreated');
      expect(result).toContain('OrderPlaced');
    });

    it('event catalog has schemas', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventCatalog(['UserCreated']);

      expect(result).toContain('schema');
    });

    it('event catalog has example payload', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventCatalog(['UserCreated']);

      expect(result).toContain('example');
    });

    it('handles empty events array for catalog', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventCatalog([]);

      expect(result).toBeDefined();
      expect(result).toContain('catalog');
    });
  });

  describe('channel naming', () => {
    it('channel names follow convention', async () => {
      const { MessagingPatterns } = await import('./messaging-patterns.js');
      const patterns = new MessagingPatterns();

      const result = patterns.generateEventBusConfig('redis');

      expect(result).toContain('channel');
    });
  });
});
