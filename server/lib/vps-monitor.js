/**
 * VPS Monitor — server metrics collection and alerting
 * Phase 80 Task 9
 */

const { isValidDomain } = require('./input-sanitizer.js');

/**
 * Create VPS monitor
 * @param {Object} options
 * @param {Object} options.sshClient - SSH client instance
 * @returns {Object} VPS monitor API
 */
function createVpsMonitor({ sshClient }) {

  /**
   * Collect server metrics via SSH
   * @param {Object} sshConfig
   * @returns {Promise<Object>} metrics
   */
  async function getServerMetrics(sshConfig) {
    const [dfResult, freeResult, cpuResult, uptimeResult, dockerResult] = await Promise.all([
      sshClient.exec(sshConfig, "df -h / | tail -1"),
      sshClient.exec(sshConfig, "free -k | head -2"),
      sshClient.exec(sshConfig, "cat /proc/stat | head -1"),
      sshClient.exec(sshConfig, "uptime"),
      sshClient.exec(sshConfig, "docker ps --format json 2>/dev/null || echo '[]'"),
    ]);

    // Parse disk
    const dfParts = dfResult.stdout.trim().split(/\s+/);
    const diskPercent = parseInt((dfParts[4] || '0').replace('%', ''), 10);

    // Parse memory
    const memLines = freeResult.stdout.trim().split('\n');
    const memParts = (memLines[1] || '').trim().split(/\s+/);
    const totalKb = parseInt(memParts[1] || '0', 10);
    const usedKb = parseInt(memParts[2] || '0', 10);

    // Parse CPU
    const cpuParts = cpuResult.stdout.trim().split(/\s+/).slice(1).map(Number);
    const cpuTotal = cpuParts.reduce((a, b) => a + b, 0);
    const cpuIdle = cpuParts[3] || 0;
    const cpuPercent = cpuTotal > 0 ? Math.round(((cpuTotal - cpuIdle) / cpuTotal) * 100) : 0;

    // Parse containers
    let containers = [];
    try {
      const dockerOut = dockerResult.stdout.trim();
      if (dockerOut.startsWith('[')) {
        containers = JSON.parse(dockerOut);
      } else if (dockerOut.startsWith('{')) {
        containers = dockerOut.split('\n').filter(Boolean).map(l => JSON.parse(l));
      }
    } catch {}

    return {
      disk: { usedPercent: diskPercent, raw: dfResult.stdout.trim() },
      memory: { totalKb, usedKb, usedPercent: totalKb > 0 ? Math.round((usedKb / totalKb) * 100) : 0 },
      cpu: { usedPercent: cpuPercent },
      uptime: uptimeResult.stdout.trim(),
      containers: containers.map(c => ({
        name: c.Names || c.name || '',
        state: c.State || c.state || 'unknown',
        status: c.Status || c.status || '',
      })),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check for alert conditions
   * @param {Object} metrics
   * @returns {Array} alerts
   */
  function checkAlerts(metrics) {
    const alerts = [];

    // Disk alerts
    if (metrics.disk && metrics.disk.usedPercent > 90) {
      alerts.push({ type: 'disk', level: 'critical', message: `Disk ${metrics.disk.usedPercent}% full` });
    } else if (metrics.disk && metrics.disk.usedPercent > 80) {
      alerts.push({ type: 'disk', level: 'warning', message: `Disk ${metrics.disk.usedPercent}% full` });
    }

    // Memory alerts
    if (metrics.memory && metrics.memory.usedPercent > 90) {
      alerts.push({ type: 'memory', level: 'warning', message: `Memory ${metrics.memory.usedPercent}% used` });
    }

    // Container alerts
    if (metrics.containers) {
      for (const c of metrics.containers) {
        if (c.state === 'exited' && c.exitCode !== undefined && c.exitCode !== 0) {
          alerts.push({ type: 'container', level: 'critical', message: `Container ${c.name} crashed (exit code ${c.exitCode})` });
        }
      }
    }

    return alerts;
  }

  /**
   * Check SSL certificate expiry
   * @param {Object} sshConfig
   * @param {string} domain
   * @returns {Promise<Object>}
   */
  async function checkSslExpiry(sshConfig, domain) {
    if (!isValidDomain(domain)) throw new Error(`Invalid domain: ${domain}`);
    const result = await sshClient.exec(
      sshConfig,
      `openssl x509 -enddate -noout -in /etc/letsencrypt/live/${domain}/fullchain.pem 2>/dev/null || echo "not found"`
    );

    const match = result.stdout.match(/notAfter=(.+)/);
    const expiresAt = match ? match[1].trim() : null;
    const daysLeft = expiresAt ? Math.floor((new Date(expiresAt) - new Date()) / 86400000) : null;

    return { domain, expiresAt, daysLeft, warning: daysLeft !== null && daysLeft < 14 };
  }

  return { getServerMetrics, checkAlerts, checkSslExpiry };
}

module.exports = { createVpsMonitor };
