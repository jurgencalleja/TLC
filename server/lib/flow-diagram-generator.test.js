/**
 * Flow Diagram Generator Tests
 * Generate Mermaid diagrams showing data flow between repos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('FlowDiagramGenerator', () => {
  describe('workspace imports detection', () => {
    it('detects workspace:* imports between repos', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/api-service/src/index.js': `
          import { UserModel } from 'workspace:shared-models';
          import { logger } from 'workspace:common-utils';
        `,
        '/workspace/web-app/src/api.js': `
          import { apiClient } from 'workspace:api-client';
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.crossRepoImports).toHaveLength(3);
      expect(result.crossRepoImports).toContainEqual(
        expect.objectContaining({
          from: 'api-service',
          to: 'shared-models',
          type: 'import',
        })
      );
      expect(result.crossRepoImports).toContainEqual(
        expect.objectContaining({
          from: 'api-service',
          to: 'common-utils',
          type: 'import',
        })
      );
    });

    it('handles repos with no cross-repo imports', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/isolated-service/src/index.js': `
          import { helper } from './utils';
          import express from 'express';
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.crossRepoImports).toHaveLength(0);
    });
  });

  describe('HTTP calls detection', () => {
    it('detects fetch calls to other services', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/frontend/src/api.js': `
          const users = await fetch('http://user-service:3000/api/users');
          const orders = await fetch(\`\${USER_SERVICE_URL}/orders\`);
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.httpCalls).toHaveLength(2);
      expect(result.httpCalls).toContainEqual(
        expect.objectContaining({
          from: 'frontend',
          to: 'user-service',
          type: 'http',
        })
      );
    });

    it('detects axios calls to other services', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/gateway/src/proxy.js': `
          const response = await axios.get('http://inventory-service/items');
          await axios.post('http://payment-service/charge', data);
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.httpCalls).toHaveLength(2);
      expect(result.httpCalls).toContainEqual(
        expect.objectContaining({
          from: 'gateway',
          to: 'inventory-service',
          type: 'http',
        })
      );
      expect(result.httpCalls).toContainEqual(
        expect.objectContaining({
          from: 'gateway',
          to: 'payment-service',
          type: 'http',
        })
      );
    });

    it('detects http/https module calls', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/backend/src/client.js': `
          http.request({ hostname: 'auth-service', port: 3000, path: '/verify' });
          https.get('https://external-api.com/data');
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.httpCalls).toContainEqual(
        expect.objectContaining({
          from: 'backend',
          to: 'auth-service',
          type: 'http',
        })
      );
    });
  });

  describe('message queue detection', () => {
    it('detects publish/emit patterns', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/order-service/src/events.js': `
          eventBus.publish('order.created', orderData);
          queue.emit('payment.requested', { orderId });
          channel.sendToQueue('notifications', Buffer.from(message));
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.messageQueue).toContainEqual(
        expect.objectContaining({
          from: 'order-service',
          event: 'order.created',
          type: 'producer',
        })
      );
      expect(result.messageQueue).toContainEqual(
        expect.objectContaining({
          from: 'order-service',
          event: 'payment.requested',
          type: 'producer',
        })
      );
    });

    it('detects subscribe/consume patterns', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/notification-service/src/handlers.js': `
          eventBus.subscribe('order.created', handleOrderCreated);
          queue.on('payment.completed', handlePayment);
          channel.consume('notifications', processNotification);
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.messageQueue).toContainEqual(
        expect.objectContaining({
          from: 'notification-service',
          event: 'order.created',
          type: 'consumer',
        })
      );
      expect(result.messageQueue).toContainEqual(
        expect.objectContaining({
          from: 'notification-service',
          event: 'payment.completed',
          type: 'consumer',
        })
      );
    });
  });

  describe('database access detection', () => {
    it('detects database access patterns', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/user-service/src/repository.js': `
          const users = await db.collection('users').find({});
          await prisma.user.findMany();
          const result = await sequelize.query('SELECT * FROM users');
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.databaseAccess).toContainEqual(
        expect.objectContaining({
          from: 'user-service',
          resource: 'users',
          type: 'database',
        })
      );
    });

    it('detects Redis cache access', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/cache-service/src/cache.js': `
          await redis.get('session:123');
          await redis.set('user:456', userData);
        `,
      };

      const result = generator.analyzeFiles(files);

      expect(result.databaseAccess).toContainEqual(
        expect.objectContaining({
          from: 'cache-service',
          resource: 'session',
          type: 'cache',
        })
      );
    });
  });

  describe('Mermaid diagram generation', () => {
    it('generates valid Mermaid flowchart syntax', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const analysisResult = {
        crossRepoImports: [
          { from: 'api', to: 'shared', type: 'import' },
        ],
        httpCalls: [
          { from: 'web', to: 'api', type: 'http' },
        ],
        messageQueue: [],
        databaseAccess: [],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('->'); // Any arrow style
      expect(mermaid).toMatch(/api.*-+>.*shared/); // Import uses -->
      expect(mermaid).toMatch(/web.*-+>.*api/); // HTTP uses -.-> or -->
    });

    it('groups nodes by repo', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator({ groupByRepo: true });

      const analysisResult = {
        crossRepoImports: [
          { from: 'service-a', to: 'shared-lib', type: 'import' },
          { from: 'service-b', to: 'shared-lib', type: 'import' },
        ],
        httpCalls: [],
        messageQueue: [],
        databaseAccess: [],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      expect(mermaid).toContain('service_a');
      expect(mermaid).toContain('service_b');
      expect(mermaid).toContain('shared_lib');
    });

    it('shows direction of data flow', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const analysisResult = {
        crossRepoImports: [],
        httpCalls: [
          { from: 'client', to: 'server', type: 'http', method: 'POST' },
        ],
        messageQueue: [
          { from: 'producer', event: 'order.created', type: 'producer' },
          { from: 'consumer', event: 'order.created', type: 'consumer' },
        ],
        databaseAccess: [],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      // HTTP flows from client to server (uses dashed line -.->)
      expect(mermaid).toMatch(/client.*-+\.?-*>.*server/);
      // Message queue: producer to event, event to consumer (uses thick line ==>)
      expect(mermaid).toMatch(/producer.*=+>.*order/i);
      expect(mermaid).toMatch(/order.*=+>.*consumer/i);
    });

    it('handles repos with no cross-repo communication', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const analysisResult = {
        crossRepoImports: [],
        httpCalls: [],
        messageQueue: [],
        databaseAccess: [],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('No cross-repo communication detected');
    });

    it('uses different edge styles for different connection types', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const analysisResult = {
        crossRepoImports: [
          { from: 'a', to: 'b', type: 'import' },
        ],
        httpCalls: [
          { from: 'c', to: 'd', type: 'http' },
        ],
        messageQueue: [
          { from: 'e', event: 'evt', type: 'producer' },
        ],
        databaseAccess: [
          { from: 'f', resource: 'table', type: 'database' },
        ],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      // Should have legend or different line styles
      expect(mermaid).toContain('classDef');
    });
  });

  describe('full integration', () => {
    it('analyzes files and generates complete diagram', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/api-gateway/src/routes.js': `
          import { auth } from 'workspace:auth-service';
          const users = await fetch('http://user-service/api/users');
          eventBus.publish('request.logged', { path });
        `,
        '/workspace/user-service/src/index.js': `
          import { db } from 'workspace:database-utils';
          eventBus.subscribe('user.created', syncCache);
          await prisma.user.findMany();
        `,
      };

      const result = generator.analyzeFiles(files);
      const mermaid = generator.generateMermaid(result);

      // Should detect all types of connections
      expect(result.crossRepoImports.length).toBeGreaterThan(0);
      expect(result.httpCalls.length).toBeGreaterThan(0);
      expect(result.messageQueue.length).toBeGreaterThan(0);
      expect(result.databaseAccess.length).toBeGreaterThan(0);

      // Should generate valid mermaid
      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('api_gateway');
      expect(mermaid).toContain('user_service');
    });
  });

  describe('edge cases', () => {
    it('handles empty file map', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const result = generator.analyzeFiles({});
      const mermaid = generator.generateMermaid(result);

      expect(result.crossRepoImports).toHaveLength(0);
      expect(mermaid).toContain('No cross-repo communication');
    });

    it('handles files with syntax errors gracefully', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const files = {
        '/workspace/broken/src/index.js': `
          import { broken from 'workspace:other';
          const x = {{{
        `,
        '/workspace/working/src/index.js': `
          import { valid } from 'workspace:shared';
        `,
      };

      // Should not throw, should process what it can
      const result = generator.analyzeFiles(files);

      expect(result.crossRepoImports.length).toBeGreaterThanOrEqual(1);
    });

    it('sanitizes repo names for Mermaid IDs', async () => {
      const { FlowDiagramGenerator } = await import('./flow-diagram-generator.js');
      const generator = new FlowDiagramGenerator();

      const analysisResult = {
        crossRepoImports: [
          { from: 'my-service.v2', to: '@scope/package', type: 'import' },
        ],
        httpCalls: [],
        messageQueue: [],
        databaseAccess: [],
      };

      const mermaid = generator.generateMermaid(analysisResult);

      // Should not contain invalid characters
      expect(mermaid).not.toMatch(/@scope\/package/);
      expect(mermaid).not.toMatch(/my-service\.v2/);
      expect(mermaid).toContain('my_service_v2');
    });
  });
});
