/**
 * Multi-Framework Reporter - Multi-framework compliance reporting
 */

// Framework display names
const FRAMEWORK_NAMES = {
  'pci-dss': 'PCI DSS',
  'iso27001': 'ISO 27001',
  'hipaa': 'HIPAA',
  'gdpr': 'GDPR',
  'soc2': 'SOC 2'
};

// Unique requirements per framework
const UNIQUE_REQUIREMENTS = {
  'pci-dss': [
    'Payment card data handling',
    'PAN masking requirements',
    'Quarterly vulnerability scans',
    'Annual penetration testing'
  ],
  'hipaa': [
    'Protected Health Information (PHI) handling',
    'Business Associate Agreements',
    'Patient access rights',
    'Breach notification within 60 days'
  ],
  'iso27001': [
    'Information Security Management System (ISMS)',
    'Statement of Applicability',
    'Risk treatment plan',
    'Management review'
  ]
};

/**
 * Create a multi-framework reporter instance
 */
export function createMultiFrameworkReporter() {
  const frameworks = [];

  return {
    generate: (status, options) => generateConsolidatedReport(status, options),
    compare: (status, options) => compareFrameworks(status, options),
    addFramework: (framework) => {
      if (!frameworks.includes(framework)) {
        frameworks.push(framework);
      }
    },
    getFrameworks: () => [...frameworks]
  };
}

/**
 * Generate a consolidated compliance report across frameworks
 */
export function generateConsolidatedReport(status, options = {}) {
  let report = `# Compliance Dashboard\n\n`;

  // Executive summary if requested
  if (options.includeSummary) {
    report += `## Executive Summary\n\n`;
    const frameworks = Object.keys(status);
    const scores = frameworks.map(f => status[f]?.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    report += `- **Frameworks assessed:** ${frameworks.length}\n`;
    report += `- **Average compliance score:** ${avgScore}%\n`;
    report += `- **Assessment date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  }

  // Framework scores table
  report += `## Framework Compliance Status\n\n`;
  report += `| Framework | Score | Gaps | Status |\n`;
  report += `|-----------|-------|------|--------|\n`;

  for (const [framework, data] of Object.entries(status)) {
    if (data && typeof data === 'object') {
      const name = FRAMEWORK_NAMES[framework] || framework;
      const score = data.score || 0;
      const gaps = Array.isArray(data.gaps) ? data.gaps.length : (data.gaps || 0);
      const statusIcon = score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-compliant';
      report += `| ${name} | ${score}% | ${gaps} | ${statusIcon} |\n`;
    }
  }
  report += '\n';

  // Common gaps if requested
  if (options.highlightCommon) {
    report += `## Common Gaps\n\n`;

    const gapAreas = {};
    for (const [framework, data] of Object.entries(status)) {
      if (data?.gaps && Array.isArray(data.gaps)) {
        for (const gap of data.gaps) {
          const area = gap.area || gap.control || 'unknown';
          if (!gapAreas[area]) {
            gapAreas[area] = [];
          }
          gapAreas[area].push(framework);
        }
      }
    }

    const commonGaps = Object.entries(gapAreas).filter(([, frameworks]) => frameworks.length > 1);

    if (commonGaps.length > 0) {
      report += `The following gaps appear across multiple frameworks:\n\n`;
      for (const [area, frameworks] of commonGaps) {
        report += `- **${area}**: Affects ${frameworks.map(f => FRAMEWORK_NAMES[f] || f).join(', ')}\n`;
      }
    } else {
      report += `No common gaps identified across frameworks.\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Generate a report for a single framework
 */
export function generateFrameworkReport(status, options = {}) {
  const framework = status.framework;
  const name = FRAMEWORK_NAMES[framework] || framework;
  const score = status.score || 0;

  let report = `# ${name} Compliance Report\n\n`;
  report += `**Compliance Score:** ${score}%\n\n`;

  // Group controls if requested
  if (options.groupBy === 'category' && status.controls) {
    const groups = {};

    for (const control of status.controls) {
      const category = control.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(control);
    }

    for (const [category, controls] of Object.entries(groups)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      report += `## ${categoryName}\n\n`;
      report += `| Control | Status |\n`;
      report += `|---------|--------|\n`;
      for (const control of controls) {
        report += `| ${control.id} | ${control.status || '-'} |\n`;
      }
      report += '\n';
    }
  } else if (status.controls) {
    report += `## Controls\n\n`;
    report += `| Control | Status |\n`;
    report += `|---------|--------|\n`;
    for (const control of status.controls) {
      report += `| ${control.id} | ${control.status || '-'} |\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Compare compliance across frameworks
 */
export function compareFrameworks(status, options = {}) {
  const result = {
    highest: null,
    lowest: null,
    uniqueRequirements: {}
  };

  // Find highest and lowest scores
  let highestScore = -1;
  let lowestScore = 101;

  for (const [framework, data] of Object.entries(status)) {
    const score = data?.score || 0;
    if (score > highestScore) {
      highestScore = score;
      result.highest = framework;
    }
    if (score < lowestScore) {
      lowestScore = score;
      result.lowest = framework;
    }
  }

  // Get unique requirements for specified frameworks
  const frameworks = options.frameworks || Object.keys(status);
  for (const framework of frameworks) {
    result.uniqueRequirements[framework] = UNIQUE_REQUIREMENTS[framework] || [];
  }

  return result;
}

/**
 * Export report in various formats
 * Returns a Promise for PDF (async), synchronous result for other formats
 */
export function exportReport(report, options = {}) {
  const format = options.format || 'json';

  switch (format) {
    case 'pdf':
      if (options.pdfGenerator) {
        // PDF generation is async
        return options.pdfGenerator(report).then(pdfContent => ({
          format: 'pdf',
          content: pdfContent
        }));
      }
      throw new Error('PDF generator function required');

    case 'html':
      return {
        format: 'html',
        content: generateHtml(report)
      };

    case 'json':
      return {
        format: 'json',
        content: JSON.stringify(report)
      };

    case 'markdown':
      return {
        format: 'markdown',
        content: generateMarkdown(report)
      };

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate HTML from report
 */
function generateHtml(report) {
  const title = report.title || 'Compliance Report';
  const content = report.content || JSON.stringify(report);

  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content}</div>
</body>
</html>`;
}

/**
 * Generate Markdown from report
 */
function generateMarkdown(report) {
  const title = report.title || 'Compliance Report';
  const content = report.content || JSON.stringify(report, null, 2);

  return `# ${title}\n\n${content}`;
}

export default {
  createMultiFrameworkReporter,
  generateConsolidatedReport,
  generateFrameworkReport,
  compareFrameworks,
  exportReport
};
