/**
 * Health API - Returns system metrics for health monitoring
 *
 * Response format:
 * {
 *   status: "healthy" | "degraded" | "unhealthy",
 *   memory: number (bytes),
 *   cpu: number | null (percentage),
 *   disk: number | null (percentage),
 *   uptime: number (seconds),
 *   services: Array<{ name: string, state: string, port: number }>
 * }
 */

import { createServer } from 'net';
import os from 'os';

/**
 * Check if a port is in use by attempting to connect to it
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is in use (service running)
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Detect running services by checking known ports
 * @returns {Promise<Array<{ name: string, state: string, port: number }>>}
 */
export async function detectServices() {
  const knownServices = [
    { name: 'tlc-server', port: 3147 },
    { name: 'app', port: 5001 },
  ];

  const services = await Promise.all(
    knownServices.map(async ({ name, port }) => {
      try {
        const inUse = await isPortInUse(port);
        return {
          name,
          state: inUse ? 'running' : 'stopped',
          port,
        };
      } catch (error) {
        return {
          name,
          state: 'unknown',
          port,
        };
      }
    })
  );

  return services;
}

/**
 * Calculate overall health status based on service states
 * @param {Array<{ name: string, state: string, port: number }>} services
 * @returns {'healthy' | 'degraded' | 'unhealthy'}
 */
function calculateStatus(services) {
  if (services.length === 0) {
    return 'healthy';
  }

  const runningCount = services.filter(s => s.state === 'running').length;
  const totalCount = services.length;

  if (runningCount === totalCount) {
    return 'healthy';
  } else if (runningCount > 0) {
    return 'degraded';
  } else {
    return 'unhealthy';
  }
}

/**
 * Get CPU usage percentage (optional, may return null)
 * @returns {number | null}
 */
function getCpuUsage() {
  try {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) {
      return null;
    }

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.round((idle / total) * 100);

    return usage;
  } catch (error) {
    return null;
  }
}

/**
 * Get disk usage percentage (optional, may return null)
 * Note: This is a simplified implementation that returns null
 * as cross-platform disk usage detection requires external libraries
 * @returns {number | null}
 */
function getDiskUsage() {
  // Disk usage detection requires platform-specific code or external libraries
  // Returning null as it's marked optional in the spec
  return null;
}

/**
 * Get system health metrics
 * @returns {Promise<{
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   memory: number | null,
 *   cpu: number | null,
 *   disk: number | null,
 *   uptime: number | null,
 *   services: Array<{ name: string, state: string, port: number }>
 * }>}
 */
export async function getHealth() {
  let memory = null;
  let uptime = null;
  let cpu = null;
  let disk = null;
  let services = [];

  // Get memory usage
  try {
    const memUsage = process.memoryUsage();
    memory = memUsage.heapUsed;
  } catch (error) {
    memory = null;
  }

  // Get uptime
  try {
    uptime = process.uptime();
  } catch (error) {
    uptime = null;
  }

  // Get CPU usage (optional)
  try {
    cpu = getCpuUsage();
  } catch (error) {
    cpu = null;
  }

  // Get disk usage (optional)
  try {
    disk = getDiskUsage();
  } catch (error) {
    disk = null;
  }

  // Detect services
  try {
    services = await detectServices();
  } catch (error) {
    services = [];
  }

  // Calculate overall status
  const status = calculateStatus(services);

  return {
    status,
    memory,
    cpu,
    disk,
    uptime,
    services,
  };
}

export default { getHealth, detectServices };
