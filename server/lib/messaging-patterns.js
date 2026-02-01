/**
 * Messaging Patterns Module
 * Inter-service communication setup generator
 */

/**
 * Generate UUID v4
 * @returns {string} UUID string
 */
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * MessagingPatterns class for generating inter-service communication setup
 */
class MessagingPatterns {
  /**
   * Create a MessagingPatterns instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate complete messaging setup
   * @param {Object} config - Configuration
   * @param {Array<string>} config.events - Event names
   * @param {string} config.broker - Broker type (e.g., 'redis')
   * @returns {Object} Generated files
   */
  generate(config) {
    const { events = [], broker = 'redis' } = config;

    const files = [];

    // Event bus config
    files.push({
      path: 'messaging/event-bus.js',
      content: this.generateEventBusConfig(broker),
    });

    // Publisher utility
    files.push({
      path: 'messaging/publisher.js',
      content: this.generatePublisher(),
    });

    // Subscriber utility
    files.push({
      path: 'messaging/subscriber.js',
      content: this.generateSubscriber(),
    });

    // Dead letter config
    files.push({
      path: 'messaging/dead-letter.js',
      content: this.generateDeadLetterConfig(),
    });

    // Event catalog
    files.push({
      path: 'messaging/event-catalog.js',
      content: this.generateEventCatalog(events),
    });

    // Index file
    files.push({
      path: 'messaging/index.js',
      content: this._generateIndex(),
    });

    return { files };
  }

  /**
   * Generate event bus configuration
   * @param {string} broker - Broker type
   * @returns {string} Event bus configuration code
   */
  generateEventBusConfig(broker) {
    return `/**
 * Event Bus Configuration
 * Broker: ${broker}
 */

const Redis = require('ioredis');

// Connection configuration
const config = {
  broker: '${broker}',
  connectionUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  options: {
    // Retry configuration
    retry: {
      maxAttempts: 10,
      initialDelay: 100,
      maxDelay: 30000,
      factor: 2,
    },
    // Connection options
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  },
  // Channel naming convention
  channel: {
    prefix: 'events',
    separator: ':',
  },
};

// Create Redis client with retry logic
function createClient() {
  const client = new Redis(config.connectionUrl, {
    retryStrategy: (times) => {
      if (times > config.options.retry.maxAttempts) {
        return null; // Stop retrying
      }
      const delay = Math.min(
        config.options.retry.initialDelay * Math.pow(config.options.retry.factor, times - 1),
        config.options.retry.maxDelay
      );
      return delay;
    },
    lazyConnect: config.options.lazyConnect,
    enableReadyCheck: config.options.enableReadyCheck,
    maxRetriesPerRequest: config.options.maxRetriesPerRequest,
  });

  client.on('error', (err) => {
    console.error('[EventBus] Redis connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('[EventBus] Connected to Redis');
  });

  client.on('reconnecting', () => {
    console.log('[EventBus] Reconnecting to Redis...');
  });

  return client;
}

// Get channel name for an event
function getChannelName(eventName) {
  return \`\${config.channel.prefix}\${config.channel.separator}\${eventName}\`;
}

module.exports = {
  config,
  createClient,
  getChannelName,
};
`;
  }

  /**
   * Generate publisher utility code
   * @returns {string} Publisher utility code
   */
  generatePublisher() {
    return `/**
 * Message Publisher Utility
 */

const { createClient, getChannelName } = require('./event-bus');
const { v4: uuidv4 } = require('uuid');

let publisherClient = null;

/**
 * Get or create publisher client
 * @returns {Object} Redis client for publishing
 */
function getPublisherClient() {
  if (!publisherClient) {
    publisherClient = createClient();
  }
  return publisherClient;
}

/**
 * Publish an event to the message broker
 * @param {string} eventName - Name of the event
 * @param {Object} payload - Event payload
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
async function publish(eventName, payload, options = {}) {
  const client = getPublisherClient();

  // Add metadata to message
  const message = {
    id: options.id || uuidv4(),
    timestamp: options.timestamp || new Date().toISOString(),
    source: options.source || process.env.SERVICE_NAME || 'unknown',
    type: eventName,
    payload,
    metadata: options.metadata || {},
  };

  try {
    const channel = getChannelName(eventName);
    const serialized = JSON.stringify(message);

    await client.publish(channel, serialized);

    console.log(\`[Publisher] Published \${eventName} to \${channel}\`);

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error(\`[Publisher] Failed to publish \${eventName}:\`, error.message);
    throw error;
  }
}

/**
 * Publish multiple events in batch
 * @param {Array<{eventName: string, payload: Object}>} events - Events to publish
 * @returns {Promise<Array>}
 */
async function publishBatch(events) {
  const results = [];
  for (const event of events) {
    try {
      const result = await publish(event.eventName, event.payload, event.options);
      results.push({ ...result, eventName: event.eventName });
    } catch (error) {
      results.push({ success: false, eventName: event.eventName, error: error.message });
    }
  }
  return results;
}

/**
 * Close publisher connection
 * @returns {Promise<void>}
 */
async function closePublisher() {
  if (publisherClient) {
    await publisherClient.quit();
    publisherClient = null;
  }
}

module.exports = {
  publish,
  publishBatch,
  closePublisher,
  getPublisherClient,
};
`;
  }

  /**
   * Generate subscriber utility code
   * @returns {string} Subscriber utility code
   */
  generateSubscriber() {
    return `/**
 * Message Subscriber Utility
 */

const { createClient, getChannelName } = require('./event-bus');
const { handleDeadLetter } = require('./dead-letter');

let subscriberClient = null;
const handlers = new Map();

/**
 * Get or create subscriber client
 * @returns {Object} Redis client for subscribing
 */
function getSubscriberClient() {
  if (!subscriberClient) {
    subscriberClient = createClient();
    setupMessageHandler();
  }
  return subscriberClient;
}

/**
 * Setup message handler for incoming messages
 */
function setupMessageHandler() {
  subscriberClient.on('message', async (channel, rawMessage) => {
    try {
      // Deserialize message
      const message = JSON.parse(rawMessage);

      const eventHandlers = handlers.get(channel);
      if (eventHandlers && eventHandlers.length > 0) {
        for (const handler of eventHandlers) {
          try {
            await handler(message);
          } catch (handlerError) {
            console.error(\`[Subscriber] Handler error on \${channel}:\`, handlerError.message);
            await handleDeadLetter(message, handlerError);
          }
        }
      }
    } catch (parseError) {
      console.error('[Subscriber] Failed to parse message:', parseError.message);
    }
  });
}

/**
 * Subscribe to an event
 * @param {string} eventName - Name of the event
 * @param {Function} handler - Handler function
 * @returns {Promise<void>}
 */
async function subscribe(eventName, handler) {
  const client = getSubscriberClient();
  const channel = getChannelName(eventName);

  // Register handler
  if (!handlers.has(channel)) {
    handlers.set(channel, []);
  }
  handlers.get(channel).push(handler);

  // Subscribe to channel
  await client.subscribe(channel);

  console.log(\`[Subscriber] Subscribed to \${eventName} on \${channel}\`);
}

/**
 * Unsubscribe from an event
 * @param {string} eventName - Name of the event
 * @returns {Promise<void>}
 */
async function unsubscribe(eventName) {
  const client = getSubscriberClient();
  const channel = getChannelName(eventName);

  await client.unsubscribe(channel);
  handlers.delete(channel);

  console.log(\`[Subscriber] Unsubscribed from \${eventName}\`);
}

/**
 * Close subscriber connection
 * @returns {Promise<void>}
 */
async function closeSubscriber() {
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
    handlers.clear();
  }
}

module.exports = {
  subscribe,
  unsubscribe,
  closeSubscriber,
  getSubscriberClient,
};
`;
  }

  /**
   * Generate dead letter queue configuration
   * @returns {string} Dead letter queue configuration code
   */
  generateDeadLetterConfig() {
    return `/**
 * Dead Letter Queue Configuration
 * Handles failed message processing
 */

const { createClient, config } = require('./event-bus');

let deadLetterClient = null;

const DEAD_LETTER_PREFIX = 'dead:letter:queue';
const MAX_RETRY_COUNT = 3;

/**
 * Get or create dead letter client
 * @returns {Object} Redis client for dead letter queue
 */
function getDeadLetterClient() {
  if (!deadLetterClient) {
    deadLetterClient = createClient();
  }
  return deadLetterClient;
}

/**
 * Handle failed message by storing in dead letter queue
 * @param {Object} message - Original message
 * @param {Error} error - Error that occurred
 * @returns {Promise<void>}
 */
async function handleDeadLetter(message, error) {
  const client = getDeadLetterClient();

  // Get current retry count
  const retryCount = (message.metadata?.retryCount || 0) + 1;

  const deadLetterEntry = {
    originalMessage: message,
    error: {
      message: error.message,
      stack: error.stack,
    },
    failedAt: new Date().toISOString(),
    retryCount: retryCount,
    maxRetries: MAX_RETRY_COUNT,
    canRetry: retryCount < MAX_RETRY_COUNT,
  };

  const key = \`\${DEAD_LETTER_PREFIX}:\${message.type}:\${message.id}\`;

  await client.set(key, JSON.stringify(deadLetterEntry));
  await client.lpush(\`\${DEAD_LETTER_PREFIX}:list\`, key);

  console.log(\`[DeadLetter] Stored failed message \${message.id} (retry count: \${retryCount})\`);
}

/**
 * Get all messages in dead letter queue
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getDeadLetterMessages(options = {}) {
  const client = getDeadLetterClient();
  const { limit = 100, offset = 0 } = options;

  const keys = await client.lrange(\`\${DEAD_LETTER_PREFIX}:list\`, offset, offset + limit - 1);

  const messages = [];
  for (const key of keys) {
    const data = await client.get(key);
    if (data) {
      messages.push(JSON.parse(data));
    }
  }

  return messages;
}

/**
 * Retry a dead letter message
 * @param {string} messageId - Message ID to retry
 * @param {string} eventType - Event type
 * @returns {Promise<Object>}
 */
async function retryDeadLetter(messageId, eventType) {
  const client = getDeadLetterClient();
  const key = \`\${DEAD_LETTER_PREFIX}:\${eventType}:\${messageId}\`;

  const data = await client.get(key);
  if (!data) {
    throw new Error(\`Dead letter message not found: \${messageId}\`);
  }

  const entry = JSON.parse(data);

  if (!entry.canRetry) {
    throw new Error(\`Message \${messageId} has exceeded max retry count\`);
  }

  // Update retry count in original message
  const messageToRetry = {
    ...entry.originalMessage,
    metadata: {
      ...entry.originalMessage.metadata,
      retryCount: entry.retryCount,
      retriedAt: new Date().toISOString(),
    },
  };

  // Remove from dead letter queue
  await client.del(key);
  await client.lrem(\`\${DEAD_LETTER_PREFIX}:list\`, 1, key);

  return messageToRetry;
}

/**
 * Purge dead letter queue
 * @param {Object} options - Purge options
 * @returns {Promise<number>} Number of messages purged
 */
async function purgeDeadLetter(options = {}) {
  const client = getDeadLetterClient();
  const { olderThan } = options;

  const keys = await client.lrange(\`\${DEAD_LETTER_PREFIX}:list\`, 0, -1);

  let purged = 0;
  for (const key of keys) {
    const data = await client.get(key);
    if (data) {
      const entry = JSON.parse(data);
      const shouldPurge = !olderThan || new Date(entry.failedAt) < olderThan;

      if (shouldPurge) {
        await client.del(key);
        await client.lrem(\`\${DEAD_LETTER_PREFIX}:list\`, 1, key);
        purged++;
      }
    }
  }

  return purged;
}

/**
 * Close dead letter client
 * @returns {Promise<void>}
 */
async function closeDeadLetterClient() {
  if (deadLetterClient) {
    await deadLetterClient.quit();
    deadLetterClient = null;
  }
}

module.exports = {
  handleDeadLetter,
  getDeadLetterMessages,
  retryDeadLetter,
  purgeDeadLetter,
  closeDeadLetterClient,
  MAX_RETRY_COUNT,
  DEAD_LETTER_PREFIX,
};
`;
  }

  /**
   * Generate event catalog
   * @param {Array<string>} events - Event names
   * @returns {string} Event catalog code
   */
  generateEventCatalog(events) {
    const eventEntries = events
      .map((event) => {
        const schemaExample = this._generateEventSchema(event);
        return `  ${event}: {
    name: '${event}',
    description: '${this._generateEventDescription(event)}',
    schema: ${JSON.stringify(schemaExample.schema, null, 6).split('\n').join('\n    ')},
    example: ${JSON.stringify(schemaExample.example, null, 6).split('\n').join('\n    ')},
  }`;
      })
      .join(',\n');

    return `/**
 * Event Catalog
 * Lists all event types with schemas and examples
 */

const catalog = {
${eventEntries}
};

/**
 * Get all event types
 * @returns {Array<string>}
 */
function getEventTypes() {
  return Object.keys(catalog);
}

/**
 * Get event schema
 * @param {string} eventName - Event name
 * @returns {Object|null}
 */
function getEventSchema(eventName) {
  const event = catalog[eventName];
  return event ? event.schema : null;
}

/**
 * Get event example
 * @param {string} eventName - Event name
 * @returns {Object|null}
 */
function getEventExample(eventName) {
  const event = catalog[eventName];
  return event ? event.example : null;
}

/**
 * Validate event payload against schema
 * @param {string} eventName - Event name
 * @param {Object} payload - Payload to validate
 * @returns {Object} Validation result
 */
function validateEventPayload(eventName, payload) {
  const schema = getEventSchema(eventName);
  if (!schema) {
    return { valid: false, errors: ['Unknown event type'] };
  }

  const errors = [];
  const required = schema.required || [];

  for (const field of required) {
    if (payload[field] === undefined) {
      errors.push(\`Missing required field: \${field}\`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  catalog,
  getEventTypes,
  getEventSchema,
  getEventExample,
  validateEventPayload,
};
`;
  }

  /**
   * Generate event schema based on event name
   * @private
   */
  _generateEventSchema(eventName) {
    // Parse event name to determine schema
    const parts = eventName.match(/([A-Z][a-z]+)/g) || [eventName];
    const entity = parts[0].toLowerCase();
    const action = parts.slice(1).join('').toLowerCase() || 'action';

    return {
      schema: {
        type: 'object',
        required: ['id', 'timestamp', 'type', 'payload'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          timestamp: { type: 'string', format: 'date-time' },
          type: { type: 'string', const: eventName },
          source: { type: 'string' },
          payload: {
            type: 'object',
            properties: {
              [`${entity}Id`]: { type: 'string' },
              data: { type: 'object' },
            },
          },
          metadata: { type: 'object' },
        },
      },
      example: {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        timestamp: '2024-01-15T10:30:00.000Z',
        type: eventName,
        source: 'service-name',
        payload: {
          [`${entity}Id`]: 'entity-123',
          data: {},
        },
        metadata: {},
      },
    };
  }

  /**
   * Generate event description based on name
   * @private
   */
  _generateEventDescription(eventName) {
    const parts = eventName.match(/([A-Z][a-z]+)/g) || [eventName];
    if (parts.length >= 2) {
      return `Emitted when a ${parts[0].toLowerCase()} is ${parts.slice(1).join(' ').toLowerCase()}`;
    }
    return `Event: ${eventName}`;
  }

  /**
   * Generate index file
   * @private
   */
  _generateIndex() {
    return `/**
 * Messaging Module Index
 */

const eventBus = require('./event-bus');
const publisher = require('./publisher');
const subscriber = require('./subscriber');
const deadLetter = require('./dead-letter');
const eventCatalog = require('./event-catalog');

module.exports = {
  // Event Bus
  ...eventBus,

  // Publisher
  publish: publisher.publish,
  publishBatch: publisher.publishBatch,
  closePublisher: publisher.closePublisher,

  // Subscriber
  subscribe: subscriber.subscribe,
  unsubscribe: subscriber.unsubscribe,
  closeSubscriber: subscriber.closeSubscriber,

  // Dead Letter
  handleDeadLetter: deadLetter.handleDeadLetter,
  getDeadLetterMessages: deadLetter.getDeadLetterMessages,
  retryDeadLetter: deadLetter.retryDeadLetter,
  purgeDeadLetter: deadLetter.purgeDeadLetter,

  // Event Catalog
  catalog: eventCatalog.catalog,
  getEventTypes: eventCatalog.getEventTypes,
  getEventSchema: eventCatalog.getEventSchema,
  getEventExample: eventCatalog.getEventExample,
  validateEventPayload: eventCatalog.validateEventPayload,
};
`;
  }
}

/**
 * Create messaging patterns instance
 * @param {Object} options - Options
 * @returns {MessagingPatterns} Instance
 */
function createMessagingPatterns(options = {}) {
  return new MessagingPatterns(options);
}

module.exports = {
  MessagingPatterns,
  createMessagingPatterns,
};
