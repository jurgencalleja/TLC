/**
 * WebSocket Server Module
 * Handles real-time log streaming and service status updates
 */

/**
 * Message types for WebSocket communication
 */
const MessageTypes = {
  // Client -> Server
  SUBSCRIBE_LOGS: 'subscribe_logs',
  UNSUBSCRIBE_LOGS: 'unsubscribe_logs',
  SUBSCRIBE_STATUS: 'subscribe_status',
  FILTER_LOGS: 'filter_logs',

  // Server -> Client
  LOG_ENTRY: 'log_entry',
  LOG_BATCH: 'log_batch',
  SERVICE_STATUS: 'service_status',
  STACK_STATUS: 'stack_status',
  ERROR: 'error',
};

/**
 * Create a message payload
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {string} JSON string
 */
function createMessage(type, data = {}) {
  return JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Parse incoming message
 * @param {string} raw - Raw message string
 * @returns {Object|null} Parsed message or null if invalid
 */
function parseMessage(raw) {
  try {
    const msg = JSON.parse(raw);
    if (!msg.type) return null;
    return msg;
  } catch {
    return null;
  }
}

/**
 * Create log entry message
 * @param {Object} entry - Log entry
 * @returns {string} JSON message
 */
function createLogMessage(entry) {
  return createMessage(MessageTypes.LOG_ENTRY, { entry });
}

/**
 * Create log batch message
 * @param {Array} entries - Log entries
 * @returns {string} JSON message
 */
function createLogBatchMessage(entries) {
  return createMessage(MessageTypes.LOG_BATCH, { entries });
}

/**
 * Create service status message
 * @param {Object} service - Service status
 * @returns {string} JSON message
 */
function createServiceStatusMessage(service) {
  return createMessage(MessageTypes.SERVICE_STATUS, { service });
}

/**
 * Create stack status message
 * @param {Object} stack - Stack health info
 * @returns {string} JSON message
 */
function createStackStatusMessage(stack) {
  return createMessage(MessageTypes.STACK_STATUS, { stack });
}

/**
 * Create error message
 * @param {string} error - Error message
 * @param {string} code - Error code
 * @returns {string} JSON message
 */
function createErrorMessage(error, code = 'ERROR') {
  return createMessage(MessageTypes.ERROR, { error, code });
}

/**
 * Client subscription state
 */
class ClientState {
  constructor(clientId) {
    this.clientId = clientId;
    this.subscribedServices = new Set();
    this.subscribedToStatus = false;
    this.logFilter = null;
    this.connectedAt = Date.now();
  }

  subscribeToLogs(services = []) {
    if (services.length === 0) {
      this.subscribedServices.add('*'); // All services
    } else {
      services.forEach(s => this.subscribedServices.add(s));
    }
  }

  unsubscribeFromLogs(services = []) {
    if (services.length === 0) {
      this.subscribedServices.clear();
    } else {
      services.forEach(s => this.subscribedServices.delete(s));
    }
  }

  setLogFilter(filter) {
    this.logFilter = filter;
  }

  shouldReceiveLog(entry) {
    if (this.subscribedServices.size === 0) return false;
    if (this.subscribedServices.has('*')) return true;
    return entry.service && this.subscribedServices.has(entry.service);
  }

  subscribeToStatus() {
    this.subscribedToStatus = true;
  }

  toJSON() {
    return {
      clientId: this.clientId,
      subscribedServices: Array.from(this.subscribedServices),
      subscribedToStatus: this.subscribedToStatus,
      logFilter: this.logFilter,
      connectedAt: this.connectedAt,
    };
  }
}

/**
 * Create a connection manager for tracking WebSocket clients
 * @returns {Object} Connection manager
 */
function createConnectionManager() {
  const clients = new Map();
  let nextClientId = 1;

  return {
    /**
     * Register a new client
     * @returns {ClientState} New client state
     */
    addClient() {
      const clientId = `client_${nextClientId++}`;
      const state = new ClientState(clientId);
      clients.set(clientId, state);
      return state;
    },

    /**
     * Remove a client
     * @param {string} clientId - Client ID
     */
    removeClient(clientId) {
      clients.delete(clientId);
    },

    /**
     * Get client state
     * @param {string} clientId - Client ID
     * @returns {ClientState|undefined}
     */
    getClient(clientId) {
      return clients.get(clientId);
    },

    /**
     * Get all clients subscribed to logs for a service
     * @param {string} service - Service name
     * @returns {Array<ClientState>}
     */
    getLogSubscribers(service) {
      return Array.from(clients.values()).filter(
        client => client.subscribedServices.has('*') || client.subscribedServices.has(service)
      );
    },

    /**
     * Get all clients subscribed to status updates
     * @returns {Array<ClientState>}
     */
    getStatusSubscribers() {
      return Array.from(clients.values()).filter(client => client.subscribedToStatus);
    },

    /**
     * Get connection count
     * @returns {number}
     */
    getConnectionCount() {
      return clients.size;
    },

    /**
     * Get all client states
     * @returns {Array<Object>}
     */
    getAllClients() {
      return Array.from(clients.values()).map(c => c.toJSON());
    },
  };
}

/**
 * Handle incoming WebSocket message
 * @param {ClientState} client - Client state
 * @param {Object} message - Parsed message
 * @returns {Object|null} Response message or null
 */
function handleMessage(client, message) {
  switch (message.type) {
    case MessageTypes.SUBSCRIBE_LOGS:
      client.subscribeToLogs(message.services || []);
      return { type: 'subscribed', services: Array.from(client.subscribedServices) };

    case MessageTypes.UNSUBSCRIBE_LOGS:
      client.unsubscribeFromLogs(message.services || []);
      return { type: 'unsubscribed', services: Array.from(client.subscribedServices) };

    case MessageTypes.SUBSCRIBE_STATUS:
      client.subscribeToStatus();
      return { type: 'subscribed_status' };

    case MessageTypes.FILTER_LOGS:
      client.setLogFilter(message.filter || null);
      return { type: 'filter_set', filter: client.logFilter };

    default:
      return { type: 'error', error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Validate WebSocket upgrade request
 * @param {Object} request - HTTP request
 * @returns {Object} Validation result
 */
function validateUpgrade(request) {
  const upgrade = request.headers?.upgrade;
  const connection = request.headers?.connection;

  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return { valid: false, error: 'Missing or invalid Upgrade header' };
  }

  if (!connection || !connection.toLowerCase().includes('upgrade')) {
    return { valid: false, error: 'Missing or invalid Connection header' };
  }

  return { valid: true };
}

module.exports = {
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
};
