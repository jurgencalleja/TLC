/**
 * Compliance Reporter
 *
 * Generates SOC 2 readiness reports, executive summaries,
 * detailed findings, and tracks compliance progress over time.
 */

import {
  getSOC2Checklist,
  getCompliancePercentage,
  getComplianceGaps,
  getControlsByCategory,
  TSC_CATEGORIES,
} from './compliance-checklist.js';

/**
 * Severity weights for risk calculation
 * Critical = 3x, High = 2x, Medium = 1x, Low = 0.5x
 */
const SEVERITY_WEIGHTS = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

/**
 * Risk level thresholds
 */
const RISK_THRESHOLDS = {
  low: 15,
  medium: 40,
  high: 70,
};

/**
 * Create a compliance reporter instance
 * @param {Object} options - Reporter options
 * @param {Object} options.checklist - Compliance checklist instance
 * @param {Object} options.evidenceCollector - Evidence collector instance (optional)
 * @returns {Object} Reporter instance
 */
export function createReporter(options) {
  return {
    checklist: options.checklist,
    evidenceCollector: options.evidenceCollector || null,
    _reportHistory: [],
  };
}

/**
 * Generate a full SOC 2 Type II readiness report
 * @param {Object} reporter - Reporter instance
 * @param {Object} options - Report options
 * @returns {Object} Full readiness report
 */
export function generateReadinessReport(reporter, options = {}) {
  const { checklist, evidenceCollector } = reporter;
  const now = new Date();

  // Default period to last 30 days if not specified
  const period = options.period || {
    start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };

  const compliance = getCompliancePercentage(checklist);
  const gaps = getComplianceGaps(checklist);
  const riskScore = calculateRiskScoreFromGaps(gaps, checklist.controls.length);
  const riskLevel = getRiskLevelFromScore(riskScore);
  const categoryScores = calculateCategoryScoresInternal(checklist);

  // Get all controls with their details
  const controls = getSOC2Checklist(checklist);

  // Build findings array
  const findings = controls.map((control) => ({
    controlId: control.id,
    category: control.category,
    name: control.name,
    description: control.description,
    status: control.status,
    evidence: control.evidence || [],
    gapSeverity: control.gapSeverity,
    estimatedEffort: control.estimatedEffort,
    implementationDate: control.implementationDate,
  }));

  // Collect evidence references
  const evidence = [];
  if (evidenceCollector && typeof evidenceCollector.getEvidenceInventory === 'function') {
    const inventory = evidenceCollector.getEvidenceInventory();
    evidence.push(...inventory);
  }

  // Generate recommendations from gaps
  const recommendations = gaps.slice(0, 10).map((gap) => ({
    controlId: gap.id,
    priority: gap.gapSeverity,
    action: `Implement ${gap.name}`,
    description: gap.description,
    estimatedEffort: gap.estimatedEffort,
  }));

  return {
    title: 'SOC 2 Type II Readiness Report',
    generatedAt: now.toISOString(),
    period,
    summary: {
      overallScore: Math.round(compliance.percentage * 100) / 100,
      riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      totalControls: compliance.total,
      implemented: compliance.implemented,
      partial: compliance.partial,
      gaps: compliance.notImplemented + compliance.partial,
    },
    categories: categoryScores,
    findings,
    evidence,
    recommendations,
  };
}

/**
 * Generate executive summary with key metrics
 * @param {Object} reporter - Reporter instance
 * @returns {Object} Executive summary
 */
export function generateExecutiveSummary(reporter) {
  const { checklist } = reporter;
  const compliance = getCompliancePercentage(checklist);
  const gaps = getComplianceGaps(checklist);
  const riskScore = calculateRiskScoreFromGaps(gaps, checklist.controls.length);
  const riskLevel = getRiskLevelFromScore(riskScore);

  // Sort gaps by severity for key findings
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedGaps = [...gaps].sort(
    (a, b) => severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity]
  );

  // Key findings - top 5 most critical gaps
  const keyFindings = sortedGaps.slice(0, 5).map((gap) => ({
    controlId: gap.id,
    category: gap.category,
    name: gap.name,
    severity: gap.gapSeverity,
    status: gap.status,
  }));

  // Top priorities - high/critical gaps only
  const topPriorities = sortedGaps
    .filter((g) => g.gapSeverity === 'critical' || g.gapSeverity === 'high')
    .slice(0, 5)
    .map((gap) => ({
      controlId: gap.id,
      name: gap.name,
      severity: gap.gapSeverity,
      category: gap.category,
      estimatedEffort: gap.estimatedEffort,
    }));

  // Generate headline
  let headline;
  if (compliance.percentage >= 90) {
    headline = 'Strong compliance posture with minor gaps to address';
  } else if (compliance.percentage >= 70) {
    headline = 'Good progress on compliance with significant gaps remaining';
  } else if (compliance.percentage >= 50) {
    headline = 'Moderate compliance - substantial work required';
  } else {
    headline = 'Early stage compliance - comprehensive remediation needed';
  }

  return {
    headline,
    overallScore: Math.round(compliance.percentage * 100) / 100,
    riskLevel,
    keyFindings,
    topPriorities,
  };
}

/**
 * Generate detailed findings for all controls
 * @param {Object} reporter - Reporter instance
 * @param {Object} options - Filtering options
 * @returns {Array|Object} Findings list or grouped by category
 */
export function generateDetailedFindings(reporter, options = {}) {
  const { checklist } = reporter;
  const controls = getSOC2Checklist(checklist);

  let findings = controls.map((control) => {
    const finding = {
      controlId: control.id,
      category: control.category,
      name: control.name,
      description: control.description,
      status: control.status,
      evidence: control.evidence || [],
      gapSeverity: control.gapSeverity,
      estimatedEffort: control.estimatedEffort,
      implementationDate: control.implementationDate,
    };

    // Add recommendation for gaps
    if (control.status !== 'implemented' && control.status !== 'not_applicable') {
      finding.recommendation = `Implement control ${control.id}: ${control.name}. ${control.description}`;
    }

    return finding;
  });

  // Filter to gaps only if requested
  if (options.gapsOnly) {
    findings = findings.filter(
      (f) => f.status === 'not_implemented' || f.status === 'partial'
    );
  }

  // Group by category if requested
  if (options.groupByCategory) {
    const grouped = {};
    Object.values(TSC_CATEGORIES).forEach((category) => {
      const categoryFindings = findings.filter((f) => f.category === category);
      if (categoryFindings.length > 0) {
        grouped[category] = categoryFindings;
      }
    });
    return grouped;
  }

  return findings;
}

/**
 * Include evidence references for controls in a report
 * @param {Object} reporter - Reporter instance
 * @param {Object} report - Generated report
 * @returns {Object} Evidence references mapped by control ID
 */
export function includeEvidenceReferences(reporter, report) {
  const { evidenceCollector } = reporter;
  const references = {};

  if (!evidenceCollector || typeof evidenceCollector.getEvidenceById !== 'function') {
    return references;
  }

  // Go through findings and collect evidence details
  report.findings.forEach((finding) => {
    if (finding.evidence && finding.evidence.length > 0) {
      references[finding.controlId] = finding.evidence
        .map((evidenceId) => {
          const evidence = evidenceCollector.getEvidenceById(evidenceId);
          return evidence;
        })
        .filter(Boolean);
    }
  });

  return references;
}

/**
 * Calculate overall risk score
 * @param {Object} reporter - Reporter instance
 * @returns {number} Risk score (0-100)
 */
export function calculateRiskScore(reporter) {
  const { checklist } = reporter;
  const gaps = getComplianceGaps(checklist);
  return calculateRiskScoreFromGaps(gaps, checklist.controls.length);
}

/**
 * Calculate risk score from gaps
 * @param {Array} gaps - List of gaps
 * @param {number} totalControls - Total number of controls
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScoreFromGaps(gaps, totalControls) {
  if (gaps.length === 0) {
    return 0;
  }

  // Calculate weighted gap impact
  let weightedGaps = 0;
  let maxPossibleWeight = 0;

  gaps.forEach((gap) => {
    const weight = SEVERITY_WEIGHTS[gap.gapSeverity] || 1;
    weightedGaps += weight;
  });

  // Max possible weight is if all controls were high severity gaps
  maxPossibleWeight = totalControls * SEVERITY_WEIGHTS.high;

  // Risk score is percentage of weighted gap impact
  const riskScore = (weightedGaps / maxPossibleWeight) * 100;

  return Math.min(100, Math.max(0, riskScore));
}

/**
 * Get risk level from score
 * @param {number} score - Risk score
 * @returns {string} Risk level
 */
function getRiskLevelFromScore(score) {
  if (score <= RISK_THRESHOLDS.low) return 'low';
  if (score <= RISK_THRESHOLDS.medium) return 'medium';
  if (score <= RISK_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Calculate per-category compliance scores
 * @param {Object} reporter - Reporter instance
 * @returns {Object} Category scores
 */
export function calculateCategoryScores(reporter) {
  return calculateCategoryScoresInternal(reporter.checklist);
}

/**
 * Internal category score calculation
 * @param {Object} checklist - Checklist instance
 * @returns {Object} Category scores
 */
function calculateCategoryScoresInternal(checklist) {
  const byCategory = getControlsByCategory(checklist);
  const scores = {};

  Object.entries(byCategory).forEach(([category, controls]) => {
    const implemented = controls.filter((c) => c.status === 'implemented').length;
    const partial = controls.filter((c) => c.status === 'partial').length;
    const notApplicable = controls.filter((c) => c.status === 'not_applicable').length;
    const applicableTotal = controls.length - notApplicable;

    let score = 0;
    if (applicableTotal > 0) {
      score = ((implemented + partial * 0.5) / applicableTotal) * 100;
    }

    const gaps = controls.filter(
      (c) => c.status === 'not_implemented' || c.status === 'partial'
    ).length;

    scores[category] = {
      score: Math.round(score * 100) / 100,
      implemented,
      partial,
      gaps,
      total: controls.length,
    };
  });

  return scores;
}

/**
 * Format report as HTML
 * @param {Object} report - Generated report
 * @returns {string} HTML formatted report
 */
export function formatReportHTML(report) {
  const { title, generatedAt, period, summary, categories, findings, recommendations } = report;

  const categoryRows = Object.entries(categories)
    .map(
      ([cat, data]) =>
        `<tr>
        <td>${cat}</td>
        <td>${data.score.toFixed(1)}%</td>
        <td>${data.implemented}</td>
        <td>${data.gaps}</td>
        <td>${data.total}</td>
      </tr>`
    )
    .join('\n');

  const findingsRows = findings
    .slice(0, 20)
    .map(
      (f) =>
        `<tr class="status-${f.status}">
        <td>${f.controlId}</td>
        <td>${f.category}</td>
        <td>${f.name}</td>
        <td>${f.status.replace('_', ' ')}</td>
        <td>${f.gapSeverity || 'N/A'}</td>
      </tr>`
    )
    .join('\n');

  const recommendationsList = recommendations
    .map((r) => `<li><strong>${r.controlId}:</strong> ${r.action} (${r.priority} priority)</li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 0.5rem; }
    h2 { color: #2d3748; margin-top: 2rem; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .metric-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .metric-value { font-size: 2rem; font-weight: bold; color: #3182ce; }
    .metric-label { color: #718096; font-size: 0.875rem; }
    .risk-low { color: #38a169; }
    .risk-medium { color: #d69e2e; }
    .risk-high { color: #e53e3e; }
    .risk-critical { color: #9b2c2c; background: #fed7d7; padding: 0.25rem 0.5rem; border-radius: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th { background: #edf2f7; font-weight: 600; }
    tr:hover { background: #f7fafc; }
    .status-implemented td:nth-child(4) { color: #38a169; }
    .status-not_implemented td:nth-child(4) { color: #e53e3e; }
    .status-partial td:nth-child(4) { color: #d69e2e; }
    ul { padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #718096; font-size: 0.875rem; }
    @media print {
      body { max-width: none; }
      .no-print { display: none; }
      table { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
      .metric-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p><strong>Report Period:</strong> ${period.start} to ${period.end}</p>
  <p><strong>Generated:</strong> ${new Date(generatedAt).toLocaleString()}</p>

  <h2>Executive Summary</h2>
  <div class="summary-grid">
    <div class="metric-card">
      <div class="metric-value">${summary.overallScore.toFixed(1)}%</div>
      <div class="metric-label">Compliance Score</div>
    </div>
    <div class="metric-card">
      <div class="metric-value risk-${summary.riskLevel}">${summary.riskLevel.toUpperCase()}</div>
      <div class="metric-label">Risk Level</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${summary.implemented}</div>
      <div class="metric-label">Controls Implemented</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${summary.gaps}</div>
      <div class="metric-label">Gaps Identified</div>
    </div>
  </div>

  <h2>Category Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Score</th>
        <th>Implemented</th>
        <th>Gaps</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <h2>Control Findings</h2>
  <table>
    <thead>
      <tr>
        <th>Control ID</th>
        <th>Category</th>
        <th>Name</th>
        <th>Status</th>
        <th>Severity</th>
      </tr>
    </thead>
    <tbody>
      ${findingsRows}
    </tbody>
  </table>

  <h2>Recommendations</h2>
  <ul>
    ${recommendationsList}
  </ul>

  <div class="footer">
    <p>This report was generated automatically by TLC Compliance Reporter.</p>
    <p>Report ID: ${generatedAt.replace(/[^0-9]/g, '').slice(0, 14)}</p>
  </div>
</body>
</html>`;
}

/**
 * Format report as Markdown
 * @param {Object} report - Generated report
 * @returns {string} Markdown formatted report
 */
export function formatReportMarkdown(report) {
  const { title, generatedAt, period, summary, categories, findings, recommendations } = report;

  const categoryTable = Object.entries(categories)
    .map(([cat, data]) => `| ${cat} | ${data.score.toFixed(1)}% | ${data.implemented} | ${data.gaps} | ${data.total} |`)
    .join('\n');

  const findingsTable = findings
    .slice(0, 20)
    .map((f) => `| ${f.controlId} | ${f.category} | ${f.name} | ${f.status.replace('_', ' ')} | ${f.gapSeverity || 'N/A'} |`)
    .join('\n');

  const recommendationsList = recommendations
    .map((r) => `- **${r.controlId}:** ${r.action} (${r.priority} priority)`)
    .join('\n');

  return `# ${title}

**Report Period:** ${period.start} to ${period.end}
**Generated:** ${new Date(generatedAt).toISOString()}

## Executive Summary

| Metric | Value |
|--------|-------|
| Compliance Score | ${summary.overallScore.toFixed(1)}% |
| Risk Level | ${summary.riskLevel.toUpperCase()} |
| Controls Implemented | ${summary.implemented} |
| Gaps Identified | ${summary.gaps} |
| Total Controls | ${summary.totalControls} |

## Category Breakdown

| Category | Score | Implemented | Gaps | Total |
|----------|-------|-------------|------|-------|
${categoryTable}

## Control Findings

| Control ID | Category | Name | Status | Severity |
|------------|----------|------|--------|----------|
${findingsTable}

## Recommendations

${recommendationsList}

---

*This report was generated automatically by TLC Compliance Reporter.*
`;
}

/**
 * Get report history
 * @param {Object} reporter - Reporter instance
 * @param {Object} options - Options
 * @returns {Array} Report history
 */
export function getReportHistory(reporter, options = {}) {
  const history = reporter._reportHistory || [];

  // Sort by date (newest first)
  const sorted = [...history].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  // Apply limit if specified
  if (options.limit && options.limit > 0) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

/**
 * Compare two reports to show progress
 * @param {Object} report1 - Earlier report
 * @param {Object} report2 - Later report
 * @returns {Object} Comparison results
 */
export function compareReports(report1, report2) {
  const scoreChange = report2.summary.overallScore - report1.summary.overallScore;
  const riskChange = (report2.summary.riskScore || 0) - (report1.summary.riskScore || 0);

  // Find newly implemented controls
  const newlyImplemented = [];
  const newGaps = [];

  const findingsMap1 = new Map(report1.findings.map((f) => [f.controlId, f]));
  const findingsMap2 = new Map(report2.findings.map((f) => [f.controlId, f]));

  findingsMap2.forEach((finding2, controlId) => {
    const finding1 = findingsMap1.get(controlId);
    if (finding1) {
      // Check for status changes
      if (
        finding1.status !== 'implemented' &&
        finding2.status === 'implemented'
      ) {
        newlyImplemented.push({
          controlId,
          name: finding2.name,
          category: finding2.category,
        });
      } else if (
        finding1.status === 'implemented' &&
        finding2.status !== 'implemented'
      ) {
        newGaps.push({
          controlId,
          name: finding2.name,
          category: finding2.category,
        });
      }
    }
  });

  // Compare category scores
  const categoryChanges = {};
  Object.keys(report2.categories).forEach((category) => {
    const score1 = report1.categories[category]?.score || 0;
    const score2 = report2.categories[category]?.score || 0;
    categoryChanges[category] = {
      previous: score1,
      current: score2,
      change: score2 - score1,
    };
  });

  // Generate summary
  let summaryText;
  if (scoreChange > 0) {
    summaryText = `Compliance improved by ${scoreChange.toFixed(1)} percentage points. ${newlyImplemented.length} controls were newly implemented.`;
  } else if (scoreChange < 0) {
    summaryText = `Compliance decreased by ${Math.abs(scoreChange).toFixed(1)} percentage points. ${newGaps.length} new gaps identified.`;
  } else {
    summaryText = 'Compliance score unchanged since last report.';
  }

  return {
    scoreChange,
    riskChange,
    newlyImplemented,
    newGaps,
    categoryChanges,
    summary: summaryText,
    period1: report1.period,
    period2: report2.period,
  };
}
