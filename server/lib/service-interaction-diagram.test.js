/**
 * Service Interaction Diagram Generator Tests
 * Generate detailed service interaction diagrams (sequence, component, deployment, ER)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ServiceInteractionDiagram', () => {
  describe('sequence diagram generation', () => {
    it('generates sequence diagram for API flow', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const apiFlow = {
        name: 'Create Order',
        steps: [
          { from: 'Client', to: 'API Gateway', action: 'POST /orders', type: 'request' },
          { from: 'API Gateway', to: 'Order Service', action: 'createOrder()', type: 'call' },
          { from: 'Order Service', to: 'Database', action: 'INSERT order', type: 'query' },
          { from: 'Database', to: 'Order Service', action: 'order record', type: 'response' },
          { from: 'Order Service', to: 'Event Bus', action: 'publish order.created', type: 'event' },
          { from: 'Order Service', to: 'API Gateway', action: 'Order object', type: 'response' },
          { from: 'API Gateway', to: 'Client', action: '201 Created', type: 'response' },
        ],
      };

      const mermaid = generator.generateSequenceDiagram(apiFlow);

      expect(mermaid).toContain('sequenceDiagram');
      expect(mermaid).toContain('Client');
      expect(mermaid).toContain('API Gateway');
      expect(mermaid).toContain('Order Service');
      expect(mermaid).toContain('Database');
      expect(mermaid).toContain('POST /orders');
      expect(mermaid).toContain('->>'); // Request arrow
    });

    it('uses different arrow styles for request vs response', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const apiFlow = {
        name: 'Simple Request',
        steps: [
          { from: 'A', to: 'B', action: 'request', type: 'request' },
          { from: 'B', to: 'A', action: 'response', type: 'response' },
        ],
      };

      const mermaid = generator.generateSequenceDiagram(apiFlow);

      expect(mermaid).toContain('A->>B'); // Solid arrow for request
      expect(mermaid).toContain('B-->>A'); // Dashed arrow for response
    });

    it('supports async messages', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const apiFlow = {
        name: 'Async Flow',
        steps: [
          { from: 'Producer', to: 'Queue', action: 'publish event', type: 'async' },
          { from: 'Queue', to: 'Consumer', action: 'deliver event', type: 'async' },
        ],
      };

      const mermaid = generator.generateSequenceDiagram(apiFlow);

      expect(mermaid).toContain('-)'); // Async arrow style
    });

    it('adds notes for complex steps', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const apiFlow = {
        name: 'Flow with Notes',
        steps: [
          { from: 'Service', to: 'Database', action: 'query', type: 'query', note: 'Uses connection pool' },
        ],
      };

      const mermaid = generator.generateSequenceDiagram(apiFlow);

      expect(mermaid).toContain('Note');
      expect(mermaid).toContain('Uses connection pool');
    });

    it('handles empty flow gracefully', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const mermaid = generator.generateSequenceDiagram({ name: 'Empty', steps: [] });

      expect(mermaid).toContain('sequenceDiagram');
      expect(mermaid).toContain('No interactions');
    });
  });

  describe('component diagram generation', () => {
    it('generates component diagram with services', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const services = {
        components: [
          { name: 'API Gateway', type: 'gateway', ports: ['HTTP 80', 'HTTPS 443'] },
          { name: 'User Service', type: 'service', ports: ['gRPC 50051'] },
          { name: 'Order Service', type: 'service', ports: ['HTTP 3001'] },
          { name: 'PostgreSQL', type: 'database', ports: ['5432'] },
          { name: 'Redis', type: 'cache', ports: ['6379'] },
        ],
        connections: [
          { from: 'API Gateway', to: 'User Service', protocol: 'gRPC' },
          { from: 'API Gateway', to: 'Order Service', protocol: 'HTTP' },
          { from: 'User Service', to: 'PostgreSQL', protocol: 'TCP' },
          { from: 'Order Service', to: 'PostgreSQL', protocol: 'TCP' },
          { from: 'Order Service', to: 'Redis', protocol: 'TCP' },
        ],
      };

      const mermaid = generator.generateComponentDiagram(services);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('API Gateway');
      expect(mermaid).toContain('User Service');
      expect(mermaid).toContain('Order Service');
      expect(mermaid).toContain('PostgreSQL');
      expect(mermaid).toContain('Redis');
      expect(mermaid).toContain('gRPC');
      expect(mermaid).toContain('HTTP');
    });

    it('uses different shapes for component types', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const services = {
        components: [
          { name: 'Gateway', type: 'gateway' },
          { name: 'Service', type: 'service' },
          { name: 'Database', type: 'database' },
          { name: 'Cache', type: 'cache' },
          { name: 'Queue', type: 'queue' },
        ],
        connections: [],
      };

      const mermaid = generator.generateComponentDiagram(services);

      // Different node shapes for different types
      expect(mermaid).toContain('{{'); // Gateway uses hexagon
      expect(mermaid).toContain('[('); // Database uses cylinder
      expect(mermaid).toContain('(['); // Cache uses stadium
    });

    it('groups components by layer', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram({ groupByLayer: true });

      const services = {
        components: [
          { name: 'API Gateway', type: 'gateway', layer: 'edge' },
          { name: 'User Service', type: 'service', layer: 'application' },
          { name: 'PostgreSQL', type: 'database', layer: 'data' },
        ],
        connections: [],
      };

      const mermaid = generator.generateComponentDiagram(services);

      expect(mermaid).toContain('subgraph edge');
      expect(mermaid).toContain('subgraph application');
      expect(mermaid).toContain('subgraph data');
    });

    it('handles components with no connections', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const services = {
        components: [
          { name: 'Standalone', type: 'service' },
        ],
        connections: [],
      };

      const mermaid = generator.generateComponentDiagram(services);

      expect(mermaid).toContain('Standalone');
      expect(mermaid).not.toContain('-->');
    });
  });

  describe('deployment diagram generation', () => {
    it('generates deployment diagram from docker-compose', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const dockerCompose = `
version: '3.8'
services:
  api:
    image: myapp/api:latest
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgres://db:5432/app
  db:
    image: postgres:15
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
volumes:
  pgdata:
`;

      const mermaid = generator.generateDeploymentDiagram(dockerCompose);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('api');
      expect(mermaid).toContain('db');
      expect(mermaid).toContain('redis');
      expect(mermaid).toContain('3000'); // Port mapping
      expect(mermaid).toContain('depends_on'); // Shows dependency relationship
    });

    it('shows port mappings in deployment diagram', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const dockerCompose = `
services:
  web:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
`;

      const mermaid = generator.generateDeploymentDiagram(dockerCompose);

      expect(mermaid).toContain('80');
      expect(mermaid).toContain('443');
    });

    it('shows volume mounts', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const dockerCompose = `
services:
  db:
    image: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
volumes:
  pgdata:
`;

      const mermaid = generator.generateDeploymentDiagram(dockerCompose);

      expect(mermaid).toContain('pgdata');
    });

    it('shows network configuration', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const dockerCompose = `
services:
  api:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend
networks:
  frontend:
  backend:
`;

      const mermaid = generator.generateDeploymentDiagram(dockerCompose);

      expect(mermaid).toContain('frontend');
      expect(mermaid).toContain('backend');
    });

    it('handles missing infrastructure config', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      // Empty or invalid YAML
      const mermaid = generator.generateDeploymentDiagram('');

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('No infrastructure');
    });

    it('handles invalid docker-compose YAML', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const invalidYaml = `
services:
  api:
    invalid: yaml: content
    - not valid
`;

      // Should not throw
      const mermaid = generator.generateDeploymentDiagram(invalidYaml);

      expect(mermaid).toContain('flowchart');
    });
  });

  describe('ER diagram generation', () => {
    it('generates ER diagram from schema files', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const schemas = [
        {
          name: 'User',
          tableName: 'users',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'email', type: 'string', unique: true },
            { name: 'name', type: 'string', nullable: true },
            { name: 'created_at', type: 'timestamp' },
          ],
        },
        {
          name: 'Post',
          tableName: 'posts',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'title', type: 'string' },
            { name: 'content', type: 'text' },
            { name: 'user_id', type: 'integer', foreignKey: { table: 'users', column: 'id' } },
          ],
        },
        {
          name: 'Comment',
          tableName: 'comments',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'body', type: 'text' },
            { name: 'post_id', type: 'integer', foreignKey: { table: 'posts', column: 'id' } },
            { name: 'user_id', type: 'integer', foreignKey: { table: 'users', column: 'id' } },
          ],
        },
      ];

      const mermaid = generator.generateERDiagram(schemas);

      expect(mermaid).toContain('erDiagram');
      expect(mermaid).toContain('users');
      expect(mermaid).toContain('posts');
      expect(mermaid).toContain('comments');
      expect(mermaid).toContain('id');
      expect(mermaid).toContain('||'); // Relationship markers
    });

    it('shows primary keys in ER diagram', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const schemas = [
        {
          name: 'User',
          tableName: 'users',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'email', type: 'string' },
          ],
        },
      ];

      const mermaid = generator.generateERDiagram(schemas);

      expect(mermaid).toContain('PK'); // Primary key marker
    });

    it('shows foreign key relationships', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const schemas = [
        {
          name: 'User',
          tableName: 'users',
          columns: [{ name: 'id', type: 'integer', primary: true }],
        },
        {
          name: 'Post',
          tableName: 'posts',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'user_id', type: 'integer', foreignKey: { table: 'users', column: 'id' } },
          ],
        },
      ];

      const mermaid = generator.generateERDiagram(schemas);

      expect(mermaid).toContain('FK'); // Foreign key marker
      expect(mermaid).toContain('users ||--o{ posts'); // One-to-many relationship
    });

    it('shows column types in ER diagram', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const schemas = [
        {
          name: 'User',
          tableName: 'users',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'email', type: 'string' },
            { name: 'is_active', type: 'boolean' },
          ],
        },
      ];

      const mermaid = generator.generateERDiagram(schemas);

      expect(mermaid).toContain('integer');
      expect(mermaid).toContain('string');
      expect(mermaid).toContain('boolean');
    });

    it('handles empty schema list', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const mermaid = generator.generateERDiagram([]);

      expect(mermaid).toContain('erDiagram');
      expect(mermaid).toContain('No entities');
    });

    it('infers relationships from column naming conventions', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const schemas = [
        {
          name: 'User',
          tableName: 'users',
          columns: [{ name: 'id', type: 'integer', primary: true }],
        },
        {
          name: 'Order',
          tableName: 'orders',
          columns: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'user_id', type: 'integer' }, // No explicit FK, but naming implies relationship
          ],
        },
      ];

      const mermaid = generator.generateERDiagram(schemas);

      // Should infer relationship from user_id column name
      expect(mermaid).toContain('users');
      expect(mermaid).toContain('orders');
    });
  });

  describe('API flow extraction', () => {
    it('extracts sequence from route handler code', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const routeCode = `
        async function createOrder(req, res) {
          const user = await userService.getUser(req.userId);
          const order = await orderRepository.create(req.body);
          await eventBus.publish('order.created', order);
          return res.status(201).json(order);
        }
      `;

      const flow = generator.extractAPIFlow('createOrder', routeCode);

      expect(flow.steps.length).toBeGreaterThan(0);
      expect(flow.steps).toContainEqual(
        expect.objectContaining({
          action: expect.stringContaining('userService'),
        })
      );
      expect(flow.steps).toContainEqual(
        expect.objectContaining({
          action: expect.stringContaining('orderRepository'),
        })
      );
    });

    it('detects await calls as service interactions', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const code = `
        async function handler() {
          const result = await externalAPI.fetchData();
          await cache.set('key', result);
        }
      `;

      const flow = generator.extractAPIFlow('handler', code);

      expect(flow.steps.some(s => s.action.includes('externalAPI'))).toBe(true);
      expect(flow.steps.some(s => s.action.includes('cache'))).toBe(true);
    });
  });

  describe('diagram validation', () => {
    it('all diagrams have valid Mermaid syntax', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      // Sequence diagram
      const seq = generator.generateSequenceDiagram({
        name: 'Test',
        steps: [{ from: 'A', to: 'B', action: 'test', type: 'request' }],
      });
      expect(seq).toMatch(/^sequenceDiagram/);
      expect(seq).not.toContain('undefined');
      expect(seq).not.toContain('null');

      // Component diagram
      const comp = generator.generateComponentDiagram({
        components: [{ name: 'Test', type: 'service' }],
        connections: [],
      });
      expect(comp).toMatch(/^flowchart/);
      expect(comp).not.toContain('undefined');

      // ER diagram
      const er = generator.generateERDiagram([
        { name: 'Test', tableName: 'test', columns: [{ name: 'id', type: 'int', primary: true }] },
      ]);
      expect(er).toMatch(/^erDiagram/);
      expect(er).not.toContain('undefined');
    });

    it('escapes special characters in labels', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const flow = {
        name: 'Test with "quotes"',
        steps: [
          { from: 'Service<A>', to: 'Service[B]', action: 'call with {data}', type: 'request' },
        ],
      };

      const mermaid = generator.generateSequenceDiagram(flow);

      // Should not have unescaped special chars
      expect(mermaid).not.toMatch(/<A>/);
      expect(mermaid).not.toMatch(/\[B\]/);
      expect(mermaid).not.toContain('{data}');
    });

    it('sanitizes node IDs for Mermaid compatibility', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const services = {
        components: [
          { name: 'my-service.v2', type: 'service' },
          { name: '@scope/package', type: 'service' },
        ],
        connections: [],
      };

      const mermaid = generator.generateComponentDiagram(services);

      // Should not contain invalid ID characters
      expect(mermaid).not.toContain('@scope/package');
      expect(mermaid).not.toContain('my-service.v2');
      expect(mermaid).toContain('my_service_v2');
      expect(mermaid).toContain('scope_package');
    });
  });

  describe('combined workspace diagram', () => {
    it('generates combined diagram for entire workspace', async () => {
      const { ServiceInteractionDiagram } = await import('./service-interaction-diagram.js');
      const generator = new ServiceInteractionDiagram();

      const workspace = {
        services: [
          { name: 'api-gateway', type: 'gateway' },
          { name: 'user-service', type: 'service' },
          { name: 'order-service', type: 'service' },
        ],
        databases: [
          { name: 'users-db', type: 'postgres' },
          { name: 'orders-db', type: 'postgres' },
        ],
        queues: [
          { name: 'event-bus', type: 'rabbitmq' },
        ],
        connections: [
          { from: 'api-gateway', to: 'user-service', type: 'http' },
          { from: 'api-gateway', to: 'order-service', type: 'http' },
          { from: 'user-service', to: 'users-db', type: 'database' },
          { from: 'order-service', to: 'orders-db', type: 'database' },
          { from: 'order-service', to: 'event-bus', type: 'publish' },
        ],
      };

      const mermaid = generator.generateWorkspaceDiagram(workspace);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('api_gateway');
      expect(mermaid).toContain('user_service');
      expect(mermaid).toContain('users_db');
      expect(mermaid).toContain('event_bus');
    });
  });
});
