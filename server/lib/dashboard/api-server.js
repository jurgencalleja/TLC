/**
 * Dashboard API Server
 * Express server mounting all dashboard APIs
 */

import express from 'express';

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
export function createErrorResponse(message, statusCode = 500) {
  return {
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * CORS middleware for handling cross-origin requests
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {Object} options - CORS options
 */
export function corsMiddleware(req, res, next, options = {}) {
  const origin = options.origin || '*';

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

/**
 * Request logger middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {Object} options - Logger options
 */
export function requestLogger(req, res, next, options = {}) {
  const logger = options.logger || console;
  const startTime = Date.now();

  logger.info(`${req.method} ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });

  next();
}

/**
 * Error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {Object} options - Error handler options
 */
export function handleError(error, req, res, next, options = {}) {
  const statusCode = error.statusCode || 500;
  const response = {
    error: error.message || 'Internal server error'
  };

  if (options.env !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Mounts all API routes on the Express app
 * @param {Object} app - Express app or router
 * @param {Object} options - Route options
 */
export function mountRoutes(app, options = {}) {
  // Tasks API
  app.get('/api/tasks', (req, res) => {
    res.json({ tasks: [] });
  });

  app.post('/api/tasks', (req, res) => {
    res.status(201).json({ task: {} });
  });

  if (app.patch) {
    app.patch('/api/tasks/:id', (req, res) => {
      res.json({ task: {} });
    });
  }

  if (app.delete) {
    app.delete('/api/tasks/:id', (req, res) => {
      res.status(204).send();
    });
  }

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Notes API
  app.get('/api/notes', (req, res) => {
    res.json({ notes: [] });
  });

  if (app.put) {
    app.put('/api/notes', (req, res) => {
      res.json({ note: {} });
    });
  }

  // Router API
  app.get('/api/router/status', (req, res) => {
    res.json({ status: 'running' });
  });
}

/**
 * Creates the Express API server
 * @param {Object} options - Server options
 * @param {string} options.basePath - Base path for serving files
 * @returns {Object} Express app
 */
export function createApiServer(options = {}) {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use((req, res, next) => corsMiddleware(req, res, next));

  // Mount routes
  mountRoutes(app, options);

  // Error handler
  app.use((err, req, res, next) => handleError(err, req, res, next, options));

  return app;
}
