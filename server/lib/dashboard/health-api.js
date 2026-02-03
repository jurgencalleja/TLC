/**
 * Health API Module
 * Health check endpoint
 */
import { promises as defaultFs } from 'fs';
import os from 'os';
import path from 'path';

const startTime = Date.now();

/**
 * Get health status
 * @param {Object} options - Options
 * @returns {Promise<Object>} Health status
 */
export async function getHealthStatus(options = {}) {
  const checkDeps = options.checkDeps || (() => Promise.resolve({ healthy: true }));

  const depsResult = await checkDeps();

  const status = depsResult.healthy ? 'healthy' : 'degraded';
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const result = {
    status,
    timestamp: new Date().toISOString(),
    uptime
  };

  if (!depsResult.healthy && depsResult.issues) {
    result.issues = depsResult.issues;
  }

  return result;
}

/**
 * Get system metrics
 * @returns {Object} System metrics
 */
export function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();

  // Calculate CPU usage (simple average of all cores)
  let cpuUsage = 0;
  if (cpus.length > 0) {
    const totalCpuTime = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0);
    cpuUsage = totalCpuTime / cpus.length;
  }

  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      systemUsed: totalMem - freeMem,
      systemTotal: totalMem
    },
    cpu: {
      usage: cpuUsage,
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown'
    },
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime()
  };
}

/**
 * Check dependencies
 * @param {Object} options - Options
 * @returns {Promise<Object>} Dependency status
 */
export async function checkDependencies(options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();

  const result = {
    filesystem: false,
    issues: []
  };

  // Check filesystem access
  try {
    await fs.access(basePath);
    result.filesystem = true;
  } catch {
    result.filesystem = false;
    result.issues.push('Filesystem not accessible');
  }

  // Aggregate health status
  result.healthy = result.filesystem;

  return result;
}

/**
 * Run test suite
 * @param {Object} options - Options
 * @returns {Promise<Object>} Test results
 */
export async function runTestSuite(options = {}) {
  const exec = options.exec;

  if (!exec) {
    return { error: 'No exec function provided' };
  }

  try {
    const { stdout, stderr } = await exec('npm test');

    // Parse test output
    let passed = 0;
    let failed = 0;
    let total = 0;

    // Try to parse different test output formats
    // Format: "Tests: X passed | Y failed"
    const testMatch = stdout.match(/Tests?:\s*(\d+)\s*passed(?:\s*\|\s*(\d+)\s*failed)?/i);
    if (testMatch) {
      passed = parseInt(testMatch[1], 10);
      failed = testMatch[2] ? parseInt(testMatch[2], 10) : 0;
      total = passed + failed;
    } else {
      // Format: "X passed"
      const passedMatch = stdout.match(/(\d+)\s*passed/i);
      if (passedMatch) {
        passed = parseInt(passedMatch[1], 10);
        total = passed;
      }

      const failedMatch = stdout.match(/(\d+)\s*failed/i);
      if (failedMatch) {
        failed = parseInt(failedMatch[1], 10);
        total = passed + failed;
      }
    }

    return {
      passed,
      failed,
      total,
      stdout,
      stderr
    };
  } catch (error) {
    return {
      error: error.message,
      passed: 0,
      failed: 0,
      total: 0
    };
  }
}

/**
 * Create Health API handler
 * @param {Object} options - Options
 * @returns {Object} API handler
 */
export function createHealthApi(options = {}) {
  const { basePath = process.cwd(), fs: fileSystem = defaultFs, cacheMs = 5000 } = options;
  const checkDeps = options.checkDeps || (() => checkDependencies({ fs: fileSystem, basePath }));

  let cachedStatus = null;
  let cacheTime = 0;

  return {
    async get() {
      const now = Date.now();

      if (cachedStatus && (now - cacheTime) < cacheMs) {
        return cachedStatus;
      }

      cachedStatus = await getHealthStatus({ checkDeps });
      cacheTime = now;

      return cachedStatus;
    },

    getMetrics() {
      return getSystemMetrics();
    },

    async runTests(execFn) {
      return runTestSuite({ exec: execFn });
    }
  };
}
