/**
 * Review Reporter - Generate review reports in multiple formats
 */

/**
 * Generate markdown report from review results
 * @param {Object} results - Review results from orchestrator
 * @returns {string} Markdown report
 */
function generateMarkdown(results) {
  const lines = [];

  // Header
  lines.push('# Code Review Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Files Reviewed:** ${results.files?.length || 0}`);
  lines.push(`**Models Used:** ${results.models?.join(', ') || 'none'}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Issues | ${results.totalIssues || 0} |`);
  lines.push(`| High Severity | ${countBySeverity(results, 'high')} |`);
  lines.push(`| Medium Severity | ${countBySeverity(results, 'medium')} |`);
  lines.push(`| Low Severity | ${countBySeverity(results, 'low')} |`);
  lines.push(`| Average Confidence | ${formatPercent(results.averageConfidence)} |`);
  lines.push(`| Total Cost | $${formatCost(results.totalCost)} |`);
  lines.push('');

  // Model Agreement
  if (results.modelAgreement) {
    lines.push('## Model Agreement');
    lines.push('');
    lines.push(`| Issue | Models Agreed | Confidence |`);
    lines.push(`|-------|---------------|------------|`);
    for (const issue of results.consensusIssues || []) {
      const voters = issue.voters?.join(', ') || '';
      lines.push(`| ${escapeMarkdown(issue.message || issue.id)} | ${voters} | ${formatPercent(issue.confidence)} |`);
    }
    lines.push('');
  }

  // Issues by File
  if (results.fileResults && results.fileResults.length > 0) {
    lines.push('## Issues by File');
    lines.push('');

    for (const fileResult of results.fileResults) {
      if (fileResult.issues && fileResult.issues.length > 0) {
        lines.push(`### ${fileResult.file}`);
        lines.push('');
        lines.push(`| Line | Severity | Message | Confidence |`);
        lines.push(`|------|----------|---------|------------|`);
        for (const issue of fileResult.issues) {
          lines.push(`| ${issue.line || '-'} | ${issue.severity || 'unknown'} | ${escapeMarkdown(issue.message)} | ${formatPercent(issue.confidence)} |`);
        }
        lines.push('');
      }
    }
  }

  // Cost Breakdown
  if (results.costs) {
    lines.push('## Cost Breakdown');
    lines.push('');
    lines.push(`| Model | Cost |`);
    lines.push(`|-------|------|`);
    for (const [model, cost] of Object.entries(results.costs.byModel || {})) {
      lines.push(`| ${model} | $${formatCost(cost)} |`);
    }
    lines.push(`| **Total** | **$${formatCost(results.costs.total)}** |`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate JSON report from review results
 * @param {Object} results - Review results from orchestrator
 * @returns {string} JSON report
 */
function generateJSON(results) {
  const report = {
    meta: {
      generated: new Date().toISOString(),
      filesReviewed: results.files?.length || 0,
      modelsUsed: results.models || [],
    },
    summary: {
      totalIssues: results.totalIssues || 0,
      bySeverity: {
        high: countBySeverity(results, 'high'),
        medium: countBySeverity(results, 'medium'),
        low: countBySeverity(results, 'low'),
      },
      averageConfidence: results.averageConfidence || 0,
      totalCost: results.totalCost || 0,
    },
    consensusIssues: results.consensusIssues || [],
    fileResults: results.fileResults || [],
    costs: results.costs || { byModel: {}, total: 0 },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generate HTML report from review results
 * @param {Object} results - Review results from orchestrator
 * @returns {string} HTML report
 */
function generateHTML(results) {
  const severityColors = {
    high: '#dc3545',
    medium: '#ffc107',
    low: '#28a745',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Review Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem; }
    h2 { color: #555; margin-top: 2rem; }
    h3 { color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .severity-high { color: ${severityColors.high}; font-weight: bold; }
    .severity-medium { color: ${severityColors.medium}; font-weight: bold; }
    .severity-low { color: ${severityColors.low}; font-weight: bold; }
    .confidence { color: #6c757d; }
    .meta { color: #6c757d; font-size: 0.9rem; margin-bottom: 1rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .summary-card { background: #f8f9fa; padding: 1rem; border-radius: 4px; text-align: center; }
    .summary-card .value { font-size: 2rem; font-weight: bold; color: #007bff; }
    .summary-card .label { color: #6c757d; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Code Review Report</h1>
    <div class="meta">
      <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
      <p><strong>Files Reviewed:</strong> ${results.files?.length || 0}</p>
      <p><strong>Models:</strong> ${results.models?.join(', ') || 'none'}</p>
    </div>

    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${results.totalIssues || 0}</div>
        <div class="label">Total Issues</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${severityColors.high}">${countBySeverity(results, 'high')}</div>
        <div class="label">High Severity</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${severityColors.medium}">${countBySeverity(results, 'medium')}</div>
        <div class="label">Medium Severity</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${severityColors.low}">${countBySeverity(results, 'low')}</div>
        <div class="label">Low Severity</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatPercent(results.averageConfidence)}</div>
        <div class="label">Avg Confidence</div>
      </div>
      <div class="summary-card">
        <div class="value">$${formatCost(results.totalCost)}</div>
        <div class="label">Total Cost</div>
      </div>
    </div>

    ${results.fileResults && results.fileResults.length > 0 ? `
    <h2>Issues by File</h2>
    ${results.fileResults.map(fileResult => fileResult.issues?.length > 0 ? `
    <h3>${escapeHTML(fileResult.file)}</h3>
    <table>
      <thead>
        <tr><th>Line</th><th>Severity</th><th>Message</th><th>Confidence</th></tr>
      </thead>
      <tbody>
        ${fileResult.issues.map(issue => `
        <tr>
          <td>${issue.line || '-'}</td>
          <td class="severity-${issue.severity || 'low'}">${issue.severity || 'unknown'}</td>
          <td>${escapeHTML(issue.message)}</td>
          <td class="confidence">${formatPercent(issue.confidence)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '').join('')}
    ` : ''}

    ${results.costs ? `
    <h2>Cost Breakdown</h2>
    <table>
      <thead>
        <tr><th>Model</th><th>Cost</th></tr>
      </thead>
      <tbody>
        ${Object.entries(results.costs.byModel || {}).map(([model, cost]) => `
        <tr><td>${model}</td><td>$${formatCost(cost)}</td></tr>
        `).join('')}
        <tr style="font-weight: bold;"><td>Total</td><td>$${formatCost(results.costs.total)}</td></tr>
      </tbody>
    </table>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generate report in specified format
 * @param {Object} results - Review results
 * @param {string} format - Output format (md, json, html)
 * @returns {string} Formatted report
 */
function generateReport(results, format = 'md') {
  switch (format.toLowerCase()) {
    case 'json':
      return generateJSON(results);
    case 'html':
      return generateHTML(results);
    case 'md':
    case 'markdown':
    default:
      return generateMarkdown(results);
  }
}

// Helper functions
function countBySeverity(results, severity) {
  let count = 0;
  for (const fileResult of results.fileResults || []) {
    for (const issue of fileResult.issues || []) {
      if (issue.severity === severity) count++;
    }
  }
  return count;
}

function formatPercent(value) {
  if (value === undefined || value === null) return '0%';
  return `${Math.round(value * 100)}%`;
}

function formatCost(value) {
  if (value === undefined || value === null) return '0.00';
  return value.toFixed(4);
}

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function escapeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  generateReport,
  generateMarkdown,
  generateJSON,
  generateHTML,
};
