/**
 * WebSocket Server Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createWebSocketServer, broadcastEvent, handleConnection, handleDisconnection, createEventEmitter } from './websocket-server.js';

describe('websocket-server', () => {
  describe('createWebSocketServer', () => {
    it('creates WebSocket server', () => {
      const mockHttpServer = { on: vi.fn() };
      const ws = createWebSocketServer({ server: mockHttpServer });
      expect(ws.broadcast).toBeDefined();
      expect(ws.getClients).toBeDefined();
    });

    it('accepts connections', () => {
      const mockHttpServer = { on: vi.fn() };
      const ws = createWebSocketServer({ server: mockHttpServer });
      const mockSocket = { on: vi.fn(), send: vi.fn() };

      ws.handleConnection(mockSocket);
      expect(ws.getClients().length).toBe(1);
    });
  });

  describe('broadcastEvent', () => {
    it('sends to all clients', () => {
      const clients = [
        { send: vi.fn(), readyState: 1 },
        { send: vi.fn(), readyState: 1 }
      ];
      broadcastEvent(clients, { type: 'task.updated', data: {} });
      expect(clients[0].send).toHaveBeenCalled();
      expect(clients[1].send).toHaveBeenCalled();
    });

    it('skips closed connections', () => {
      const clients = [
        { send: vi.fn(), readyState: 1 },
        { send: vi.fn(), readyState: 3 } // CLOSED
      ];
      broadcastEvent(clients, { type: 'test' });
      expect(clients[0].send).toHaveBeenCalled();
      expect(clients[1].send).not.toHaveBeenCalled();
    });

    it('serializes event data', () => {
      const client = { send: vi.fn(), readyState: 1 };
      broadcastEvent([client], { type: 'test', data: { foo: 'bar' } });
      const sent = JSON.parse(client.send.mock.calls[0][0]);
      expect(sent.type).toBe('test');
      expect(sent.data.foo).toBe('bar');
    });
  });

  describe('handleConnection', () => {
    it('adds client to list', () => {
      const clients = [];
      const socket = { on: vi.fn() };
      handleConnection(socket, clients);
      expect(clients.length).toBe(1);
    });

    it('sets up event handlers', () => {
      const clients = [];
      const socket = { on: vi.fn() };
      handleConnection(socket, clients);
      expect(socket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('sends welcome message', () => {
      const clients = [];
      const socket = { on: vi.fn(), send: vi.fn() };
      handleConnection(socket, clients, { sendWelcome: true });
      expect(socket.send).toHaveBeenCalled();
    });
  });

  describe('handleDisconnection', () => {
    it('removes client from list', () => {
      const socket = { id: '123' };
      const clients = [socket, { id: '456' }];
      handleDisconnection(socket, clients);
      expect(clients.length).toBe(1);
      expect(clients[0].id).toBe('456');
    });
  });

  describe('createEventEmitter', () => {
    it('emits task events', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();
      emitter.on('task.created', handler);
      emitter.emit('task.created', { id: '1' });
      expect(handler).toHaveBeenCalledWith({ id: '1' });
    });

    it('emits test events', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();
      emitter.on('tests.completed', handler);
      emitter.emit('tests.completed', { passed: 100 });
      expect(handler).toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const emitter = createEventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('event', handler1);
      emitter.on('event', handler2);
      emitter.emit('event', {});
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });
});
