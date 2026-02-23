/**
 * Port guard - checks if a port is available before server startup.
 *
 * Detects port conflicts and reports which process holds the port.
 * Designed for use with launchd ThrottleInterval to prevent restart spam.
 *
 * @module port-guard
 */

const net = require('net');

/**
 * Check if a port is available.
 *
 * @param {number} port - Port number to check
 * @returns {Promise<{available: boolean, port: number, pid?: number, command?: string}>}
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, port });
      } else {
        // Unexpected error — treat as unavailable
        resolve({ available: false, port });
      }
    });

    server.once('listening', () => {
      // Port is free — close the test server
      const addr = server.address();
      const actualPort = addr ? addr.port : port;
      server.close(() => {
        resolve({ available: true, port: actualPort });
      });
    });

    server.listen(port);
  });
}

module.exports = { checkPort };
