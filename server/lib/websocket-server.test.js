import { describe, it, expect } from 'vitest';
import {
  MessageTypes,
  createMessage,
  parseMessage,
  createLogMessage,
  createLogBatchMessage,
  createServiceStatusMessage,
  createStackStatusMessage,
  createErrorMessage,
  ClientState,
  createConnectionManager,
  handleMessage,
  validateUpgrade,
} from './websocket-server.js';

describe('websocket-server', () => {
  describe('createMessage', () => {
    it('creates message with type and timestamp', () => {
      const msg = createMessage('test_type', { data: 'hello' });
      const parsed = JSON.parse(msg);

      expect(parsed.type).toBe('test_type');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.data).toBe('hello');
    });

    it('creates message with just type', () => {
      const msg = createMessage('ping');
      const parsed = JSON.parse(msg);

      expect(parsed.type).toBe('ping');
    });
  });

  describe('parseMessage', () => {
    it('parses valid JSON message', () => {
      const raw = JSON.stringify({ type: 'test', data: 123 });
      const msg = parseMessage(raw);

      expect(msg.type).toBe('test');
      expect(msg.data).toBe(123);
    });

    it('returns null for invalid JSON', () => {
      expect(parseMessage('not json')).toBeNull();
    });

    it('returns null for message without type', () => {
      expect(parseMessage(JSON.stringify({ data: 'no type' }))).toBeNull();
    });
  });

  describe('createLogMessage', () => {
    it('creates log entry message', () => {
      const entry = { service: 'api', message: 'Hello', level: 'info' };
      const msg = JSON.parse(createLogMessage(entry));

      expect(msg.type).toBe(MessageTypes.LOG_ENTRY);
      expect(msg.entry).toEqual(entry);
    });
  });

  describe('createLogBatchMessage', () => {
    it('creates batch message with multiple entries', () => {
      const entries = [
        { service: 'api', message: 'Log 1' },
        { service: 'api', message: 'Log 2' },
      ];
      const msg = JSON.parse(createLogBatchMessage(entries));

      expect(msg.type).toBe(MessageTypes.LOG_BATCH);
      expect(msg.entries).toHaveLength(2);
    });
  });

  describe('createServiceStatusMessage', () => {
    it('creates service status message', () => {
      const service = { name: 'api', state: 'running', port: 3000 };
      const msg = JSON.parse(createServiceStatusMessage(service));

      expect(msg.type).toBe(MessageTypes.SERVICE_STATUS);
      expect(msg.service.name).toBe('api');
    });
  });

  describe('createStackStatusMessage', () => {
    it('creates stack status message', () => {
      const stack = { status: 'healthy', running: 2, total: 2 };
      const msg = JSON.parse(createStackStatusMessage(stack));

      expect(msg.type).toBe(MessageTypes.STACK_STATUS);
      expect(msg.stack.status).toBe('healthy');
    });
  });

  describe('createErrorMessage', () => {
    it('creates error message with code', () => {
      const msg = JSON.parse(createErrorMessage('Something failed', 'CONN_ERROR'));

      expect(msg.type).toBe(MessageTypes.ERROR);
      expect(msg.error).toBe('Something failed');
      expect(msg.code).toBe('CONN_ERROR');
    });

    it('uses default code when not provided', () => {
      const msg = JSON.parse(createErrorMessage('Failed'));

      expect(msg.code).toBe('ERROR');
    });
  });

  describe('ClientState', () => {
    it('initializes with client ID', () => {
      const client = new ClientState('client_1');

      expect(client.clientId).toBe('client_1');
      expect(client.subscribedServices.size).toBe(0);
      expect(client.subscribedToStatus).toBe(false);
    });

    it('subscribes to all services with empty array', () => {
      const client = new ClientState('client_1');

      client.subscribeToLogs([]);

      expect(client.subscribedServices.has('*')).toBe(true);
    });

    it('subscribes to specific services', () => {
      const client = new ClientState('client_1');

      client.subscribeToLogs(['api', 'web']);

      expect(client.subscribedServices.has('api')).toBe(true);
      expect(client.subscribedServices.has('web')).toBe(true);
      expect(client.subscribedServices.has('*')).toBe(false);
    });

    it('unsubscribes from all services', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs(['api', 'web']);

      client.unsubscribeFromLogs([]);

      expect(client.subscribedServices.size).toBe(0);
    });

    it('unsubscribes from specific service', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs(['api', 'web']);

      client.unsubscribeFromLogs(['api']);

      expect(client.subscribedServices.has('api')).toBe(false);
      expect(client.subscribedServices.has('web')).toBe(true);
    });

    it('shouldReceiveLog returns false when not subscribed', () => {
      const client = new ClientState('client_1');

      expect(client.shouldReceiveLog({ service: 'api', message: 'test' })).toBe(false);
    });

    it('shouldReceiveLog returns true for wildcard subscription', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs([]);

      expect(client.shouldReceiveLog({ service: 'api', message: 'test' })).toBe(true);
      expect(client.shouldReceiveLog({ service: 'web', message: 'test' })).toBe(true);
    });

    it('shouldReceiveLog returns true for matching service', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs(['api']);

      expect(client.shouldReceiveLog({ service: 'api', message: 'test' })).toBe(true);
      expect(client.shouldReceiveLog({ service: 'web', message: 'test' })).toBe(false);
    });

    it('sets log filter', () => {
      const client = new ClientState('client_1');

      client.setLogFilter({ level: 'error' });

      expect(client.logFilter).toEqual({ level: 'error' });
    });

    it('serializes to JSON', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs(['api']);
      client.subscribeToStatus();

      const json = client.toJSON();

      expect(json.clientId).toBe('client_1');
      expect(json.subscribedServices).toContain('api');
      expect(json.subscribedToStatus).toBe(true);
    });
  });

  describe('createConnectionManager', () => {
    it('adds and retrieves clients', () => {
      const manager = createConnectionManager();

      const client = manager.addClient();

      expect(client.clientId).toBe('client_1');
      expect(manager.getClient('client_1')).toBe(client);
    });

    it('removes clients', () => {
      const manager = createConnectionManager();
      const client = manager.addClient();

      manager.removeClient(client.clientId);

      expect(manager.getClient(client.clientId)).toBeUndefined();
    });

    it('tracks connection count', () => {
      const manager = createConnectionManager();

      manager.addClient();
      manager.addClient();

      expect(manager.getConnectionCount()).toBe(2);

      manager.removeClient('client_1');

      expect(manager.getConnectionCount()).toBe(1);
    });

    it('gets log subscribers for service', () => {
      const manager = createConnectionManager();
      const client1 = manager.addClient();
      const client2 = manager.addClient();
      const client3 = manager.addClient();

      client1.subscribeToLogs(['api']);
      client2.subscribeToLogs([]); // wildcard
      // client3 not subscribed

      const subscribers = manager.getLogSubscribers('api');

      expect(subscribers).toHaveLength(2);
      expect(subscribers).toContain(client1);
      expect(subscribers).toContain(client2);
    });

    it('gets status subscribers', () => {
      const manager = createConnectionManager();
      const client1 = manager.addClient();
      const client2 = manager.addClient();

      client1.subscribeToStatus();

      const subscribers = manager.getStatusSubscribers();

      expect(subscribers).toHaveLength(1);
      expect(subscribers[0]).toBe(client1);
    });

    it('gets all clients as JSON', () => {
      const manager = createConnectionManager();
      manager.addClient();
      manager.addClient();

      const all = manager.getAllClients();

      expect(all).toHaveLength(2);
      expect(all[0].clientId).toBe('client_1');
    });
  });

  describe('handleMessage', () => {
    it('handles subscribe_logs message', () => {
      const client = new ClientState('client_1');
      const message = { type: MessageTypes.SUBSCRIBE_LOGS, services: ['api'] };

      const response = handleMessage(client, message);

      expect(response.type).toBe('subscribed');
      expect(response.services).toContain('api');
    });

    it('handles unsubscribe_logs message', () => {
      const client = new ClientState('client_1');
      client.subscribeToLogs(['api', 'web']);
      const message = { type: MessageTypes.UNSUBSCRIBE_LOGS, services: ['api'] };

      const response = handleMessage(client, message);

      expect(response.type).toBe('unsubscribed');
      expect(response.services).not.toContain('api');
      expect(response.services).toContain('web');
    });

    it('handles subscribe_status message', () => {
      const client = new ClientState('client_1');
      const message = { type: MessageTypes.SUBSCRIBE_STATUS };

      const response = handleMessage(client, message);

      expect(response.type).toBe('subscribed_status');
      expect(client.subscribedToStatus).toBe(true);
    });

    it('handles filter_logs message', () => {
      const client = new ClientState('client_1');
      const message = { type: MessageTypes.FILTER_LOGS, filter: { level: 'error' } };

      const response = handleMessage(client, message);

      expect(response.type).toBe('filter_set');
      expect(response.filter.level).toBe('error');
    });

    it('returns error for unknown message type', () => {
      const client = new ClientState('client_1');
      const message = { type: 'unknown_type' };

      const response = handleMessage(client, message);

      expect(response.type).toBe('error');
      expect(response.error).toContain('Unknown message type');
    });
  });

  describe('validateUpgrade', () => {
    it('validates correct upgrade request', () => {
      const request = {
        headers: {
          upgrade: 'websocket',
          connection: 'Upgrade',
        },
      };

      const result = validateUpgrade(request);

      expect(result.valid).toBe(true);
    });

    it('rejects missing upgrade header', () => {
      const request = {
        headers: {
          connection: 'Upgrade',
        },
      };

      const result = validateUpgrade(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Upgrade');
    });

    it('rejects missing connection header', () => {
      const request = {
        headers: {
          upgrade: 'websocket',
        },
      };

      const result = validateUpgrade(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Connection');
    });

    it('rejects wrong upgrade value', () => {
      const request = {
        headers: {
          upgrade: 'http/2',
          connection: 'Upgrade',
        },
      };

      const result = validateUpgrade(request);

      expect(result.valid).toBe(false);
    });
  });
});
