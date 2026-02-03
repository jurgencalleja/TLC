/**
 * WebSocket Server for Real-time Dashboard Updates
 */

import { EventEmitter } from 'events';

// WebSocket ready states
const WS_OPEN = 1;

/**
 * Broadcasts an event to all connected clients
 * @param {Array} clients - Array of WebSocket client connections
 * @param {Object} event - Event object with type and data
 */
export function broadcastEvent(clients, event) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WS_OPEN) {
      client.send(message);
    }
  }
}

/**
 * Handles a new WebSocket connection
 * @param {Object} socket - WebSocket connection
 * @param {Array} clients - Client list to add to
 * @param {Object} options - Connection options
 */
export function handleConnection(socket, clients, options = {}) {
  clients.push(socket);

  socket.on('close', () => {
    handleDisconnection(socket, clients);
  });

  socket.on('error', (err) => {
    // Log error but don't crash
    console.error('WebSocket error:', err.message);
  });

  if (options.sendWelcome) {
    socket.send(JSON.stringify({ type: 'welcome', timestamp: Date.now() }));
  }
}

/**
 * Handles WebSocket disconnection
 * @param {Object} socket - Disconnected socket
 * @param {Array} clients - Client list to remove from
 */
export function handleDisconnection(socket, clients) {
  const index = clients.indexOf(socket);
  if (index !== -1) {
    clients.splice(index, 1);
  }
}

/**
 * Creates an event emitter for dashboard events
 * @returns {EventEmitter} Event emitter instance
 */
export function createEventEmitter() {
  return new EventEmitter();
}

/**
 * Creates a WebSocket server wrapper
 * @param {Object} options - Server options
 * @param {Object} options.server - HTTP server to attach to
 * @returns {Object} WebSocket server interface
 */
export function createWebSocketServer(options = {}) {
  const clients = [];

  const wsServer = {
    /**
     * Broadcasts event to all connected clients
     * @param {Object} event - Event to broadcast
     */
    broadcast(event) {
      broadcastEvent(clients, event);
    },

    /**
     * Gets list of connected clients
     * @returns {Array} Connected clients
     */
    getClients() {
      return clients;
    },

    /**
     * Handles a new connection
     * @param {Object} socket - WebSocket connection
     * @param {Object} connectionOptions - Connection options
     */
    handleConnection(socket, connectionOptions = {}) {
      handleConnection(socket, clients, connectionOptions);
    }
  };

  return wsServer;
}
