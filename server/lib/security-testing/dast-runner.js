/**
 * DAST Runner - OWASP ZAP Dynamic Application Security Testing
 */

/**
 * Run ZAP baseline scan
 * @param {Object} options - Scan options
 * @param {string} options.target - Target URL to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Object>} Scan results
 */
export async function runZapBaseline({ target, exec }) {
  const command = `zap-baseline.py -t ${target} -J report.json`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Run ZAP full scan
 * @param {Object} options - Scan options
 * @param {string} options.target - Target URL to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Object>} Scan results
 */
export async function runZapFullScan({ target, exec }) {
  const command = `zap-full-scan.py -t ${target} -J report.json`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Parse ZAP JSON report into normalized alerts
 * @param {Object} report - Raw ZAP report
 * @returns {Array} Normalized alerts
 */
export function parseZapReport(report) {
  const alerts = [];
  const riskMap = { '0': 'info', '1': 'low', '2': 'medium', '3': 'high' };

  for (const site of report.site || []) {
    for (const alert of site.alerts || []) {
      alerts.push({
        name: alert.alert,
        risk: riskMap[alert.riskcode] || 'info',
        description: alert.desc || alert.description || '',
        instances: alert.instances || []
      });
    }
  }

  return alerts;
}

/**
 * Configure scan policy
 * @param {Object} options - Policy options
 * @param {string} options.strength - Scan strength (low, medium, high)
 * @param {string} options.threshold - Alert threshold
 * @returns {Object} Configured policy
 */
export function configureScanPolicy(options = {}) {
  return {
    strength: options.strength || 'medium',
    threshold: options.threshold || 'medium',
    maxDuration: options.maxDuration || 60,
    maxDepth: options.maxDepth || 5
  };
}

/**
 * Generate HTML report from alerts
 * @param {Array} alerts - List of alerts
 * @returns {string} HTML report
 */
export function generateHtmlReport(alerts) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>DAST Scan Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .alert { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
    .high { border-color: red; background: #ffe0e0; }
    .medium { border-color: orange; background: #fff3e0; }
    .low { border-color: yellow; background: #fffde0; }
    .info { border-color: blue; background: #e0f0ff; }
  </style>
</head>
<body>
  <h1>DAST Scan Report</h1>
  <p>Found ${alerts.length} alert(s)</p>
`;

  for (const alert of alerts) {
    html += `  <div class="alert ${alert.risk}">
    <h3>${alert.name}</h3>
    <p><strong>Risk:</strong> ${alert.risk}</p>
    <p>${alert.description}</p>
  </div>
`;
  }

  html += `</body>
</html>`;

  return html;
}

/**
 * Create a DAST runner instance
 * @param {Object} options - Runner options
 * @returns {Object} DAST runner instance
 */
export function createDastRunner(options = {}) {
  return {
    /**
     * Run baseline scan
     * @param {Object} scanOptions - Scan options
     * @returns {Promise<Object>} Scan results
     */
    async baseline(scanOptions) {
      const { target, auth, mockResults, exec } = scanOptions;

      if (mockResults !== undefined) {
        return mockResults;
      }

      if (exec) {
        return await runZapBaseline({ target, exec });
      }

      return { alerts: [] };
    },

    /**
     * Run full scan
     * @param {Object} scanOptions - Scan options
     * @returns {Promise<Object>} Scan results
     */
    async fullScan(scanOptions) {
      const { target, auth, mockResults, exec } = scanOptions;

      if (mockResults !== undefined) {
        return mockResults;
      }

      if (exec) {
        return await runZapFullScan({ target, exec });
      }

      return { alerts: [] };
    }
  };
}
