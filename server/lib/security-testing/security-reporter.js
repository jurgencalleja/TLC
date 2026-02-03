/**
 * Security Reporter
 * Generates security reports in multiple formats (SARIF, HTML, JSON)
 */

/**
 * Generate a comprehensive security report from findings
 * @param {Object} findings - Findings from different sources (sast, dast, dependencies, secrets)
 * @returns {Object} Comprehensive report with summary, findings, and risk score
 */
export function generateSecurityReport(findings) {
  const allFindings = aggregateFindings(findings);
  const riskScore = calculateRiskScore(allFindings);

  const summary = {
    total: allFindings.length,
    bySeverity: countBySeverity(allFindings),
    bySource: countBySource(allFindings),
    generatedAt: new Date().toISOString()
  };

  return {
    summary,
    findings: allFindings,
    riskScore
  };
}

/**
 * Format findings as SARIF (Static Analysis Results Interchange Format)
 * @param {Array} findings - Array of findings
 * @returns {Object} SARIF formatted report
 */
export function formatSarif(findings) {
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'security-scanner',
            version: '1.0.0',
            rules: findings.map(f => ({
              id: f.rule || 'unknown',
              shortDescription: { text: f.rule || 'Unknown rule' }
            }))
          }
        },
        results: findings.map(f => ({
          ruleId: f.rule || 'unknown',
          level: mapSeverityToSarif(f.severity),
          message: { text: f.message || f.rule || 'Security finding' },
          locations: f.file ? [{
            physicalLocation: {
              artifactLocation: { uri: f.file },
              region: { startLine: f.line || 1 }
            }
          }] : []
        }))
      }
    ]
  };
}

/**
 * Format findings as HTML report
 * @param {Array} findings - Array of findings
 * @param {Object} options - Options including title
 * @returns {string} HTML formatted report
 */
export function formatHtml(findings, options = {}) {
  const title = options.title || 'Security Report';
  const rows = findings.map(f => `
    <tr>
      <td>${escapeHtml(f.rule || 'N/A')}</td>
      <td>${escapeHtml(f.severity || 'unknown')}</td>
      <td>${escapeHtml(f.file || 'N/A')}</td>
      <td>${escapeHtml(f.message || '')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    .critical { color: #d32f2f; }
    .high { color: #f57c00; }
    .medium { color: #fbc02d; }
    .low { color: #388e3c; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Total findings: ${findings.length}</p>
  <table>
    <thead>
      <tr>
        <th>Rule</th>
        <th>Severity</th>
        <th>File</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Format findings as JSON
 * @param {Array} findings - Array of findings
 * @returns {string} JSON formatted string
 */
export function formatJson(findings) {
  return JSON.stringify(findings);
}

/**
 * Aggregate findings from multiple sources
 * @param {Object} sources - Object with source names as keys and finding arrays as values
 * @param {Object} options - Options including deduplicate flag
 * @returns {Array} Aggregated findings with source information
 */
export function aggregateFindings(sources, options = {}) {
  const allFindings = [];

  for (const [source, findings] of Object.entries(sources)) {
    if (Array.isArray(findings)) {
      for (const finding of findings) {
        allFindings.push({
          ...finding,
          source
        });
      }
    }
  }

  if (options.deduplicate) {
    return deduplicateFindings(allFindings);
  }

  return allFindings;
}

/**
 * Calculate risk score from findings
 * @param {Array} findings - Array of findings
 * @returns {number} Risk score between 0 and 100
 */
export function calculateRiskScore(findings) {
  if (!findings || findings.length === 0) {
    return 0;
  }

  const weights = {
    critical: 25,
    high: 15,
    medium: 5,
    low: 1
  };

  let score = 0;
  for (const finding of findings) {
    const severity = normalizeSeverity(finding.severity || finding.risk);
    score += weights[severity] || 1;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Create a security reporter instance
 * @returns {Object} Reporter with generate, export, and executiveSummary methods
 */
export function createSecurityReporter() {
  return {
    /**
     * Generate a full security report
     * @param {Object} findings - Findings from various sources
     * @returns {Object} Complete report
     */
    generate(findings) {
      return generateSecurityReport(findings);
    },

    /**
     * Export findings in specified format
     * @param {Array} findings - Array of findings
     * @param {Object} options - Options including format (sarif, html, json)
     * @returns {Object|string} Formatted output
     */
    export(findings, options = {}) {
      const format = options.format || 'json';

      switch (format) {
        case 'sarif':
          return formatSarif(findings);
        case 'html':
          return formatHtml(findings, options);
        case 'json':
        default:
          return formatJson(findings);
      }
    },

    /**
     * Generate executive summary of findings
     * @param {Array} findings - Array of findings
     * @returns {Object} Executive summary with counts and metrics
     */
    executiveSummary(findings) {
      const bySeverity = countBySeverity(findings);

      return {
        totalFindings: findings.length,
        bySeverity,
        riskScore: calculateRiskScore(findings),
        generatedAt: new Date().toISOString()
      };
    }
  };
}

// Helper functions

function countBySeverity(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const finding of findings) {
    const severity = normalizeSeverity(finding.severity || finding.risk);
    if (counts.hasOwnProperty(severity)) {
      counts[severity]++;
    }
  }

  return counts;
}

function countBySource(findings) {
  const counts = {};

  for (const finding of findings) {
    const source = finding.source || 'unknown';
    counts[source] = (counts[source] || 0) + 1;
  }

  return counts;
}

function normalizeSeverity(severity) {
  if (!severity) return 'low';
  const lower = severity.toLowerCase();
  if (['critical', 'high', 'medium', 'low'].includes(lower)) {
    return lower;
  }
  return 'low';
}

function mapSeverityToSarif(severity) {
  const mapping = {
    critical: 'error',
    high: 'error',
    medium: 'warning',
    low: 'note'
  };
  return mapping[normalizeSeverity(severity)] || 'note';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function deduplicateFindings(findings) {
  const seen = new Set();
  const unique = [];

  for (const finding of findings) {
    const key = `${finding.file || ''}:${finding.line || ''}:${finding.rule || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(finding);
    }
  }

  return unique;
}
