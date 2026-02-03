/**
 * Trust Centre Command - CLI command for trust centre
 */

// Framework display names
const FRAMEWORK_NAMES = {
  'pci-dss': 'PCI DSS',
  'iso27001': 'ISO 27001',
  'hipaa': 'HIPAA',
  'gdpr': 'GDPR',
  'soc2': 'SOC 2'
};

/**
 * Create the trust-centre command
 */
export function createTrustCentreCommand() {
  return {
    name: 'trust-centre',
    description: 'Manage trust centre compliance and evidence',
    subcommands: ['status', 'scan', 'report', 'gaps'],
    execute: async (subcommand, options = {}) => {
      switch (subcommand) {
        case 'status':
          return runComplianceCheck(options);
        case 'scan':
          return scanEvidence(options);
        case 'report':
          return generateComplianceReport(options.status || {}, options);
        case 'gaps':
          return findGaps(options);
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }
    }
  };
}

/**
 * Run compliance check for one or all frameworks
 */
export async function runComplianceCheck(options = {}) {
  const { framework, checklist, checklists } = options;

  // Single framework check
  if (framework !== 'all' && checklist) {
    const evaluation = await checklist.evaluate();
    return {
      framework,
      score: evaluation.score,
      gaps: evaluation.gaps || []
    };
  }

  // All frameworks check
  if (framework === 'all' && checklists) {
    const results = {};
    for (const [fw, cl] of Object.entries(checklists)) {
      const evaluation = await cl.evaluate();
      results[fw] = {
        score: evaluation.score,
        gaps: evaluation.gaps || []
      };
    }
    return results;
  }

  // Default response
  return {
    framework: framework || 'unknown',
    score: 0,
    gaps: []
  };
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(status, options = {}) {
  let report = `# Compliance Report\n\n`;
  report += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;

  // Framework-specific report
  if (options.framework && status.framework) {
    const name = FRAMEWORK_NAMES[status.framework] || status.framework;
    report += `## ${name}\n\n`;
    report += `**Score:** ${status.score || 0}%\n\n`;

    if (status.controls && status.controls.length > 0) {
      report += `### Controls\n\n`;
      report += `| Control | Status |\n`;
      report += `|---------|--------|\n`;
      for (const control of status.controls) {
        report += `| ${control.id} | ${control.status || '-'} |\n`;
      }
      report += '\n';
    }
  } else {
    // Multi-framework report
    report += `## Framework Status\n\n`;
    report += `| Framework | Score | Status |\n`;
    report += `|-----------|-------|--------|\n`;

    for (const [framework, data] of Object.entries(status)) {
      if (data && typeof data === 'object') {
        const name = FRAMEWORK_NAMES[framework] || framework;
        const score = data.score || 0;
        const compliant = data.compliant ? 'Compliant' : 'Non-compliant';
        report += `| ${name} | ${score}% | ${compliant} |\n`;
      }
    }
    report += '\n';
  }

  // Include remediation plan if requested
  if (options.includeRemediation) {
    report += `## Remediation Plan\n\n`;

    for (const [framework, data] of Object.entries(status)) {
      if (data?.gaps && Array.isArray(data.gaps) && data.gaps.length > 0) {
        const name = FRAMEWORK_NAMES[framework] || framework;
        report += `### ${name}\n\n`;

        for (const gap of data.gaps) {
          report += `- **${gap.control || 'Unknown'}**: ${gap.remediation || 'Remediation needed'}\n`;
        }
        report += '\n';
      }
    }
  }

  return report;
}

/**
 * Scan codebase for compliance evidence
 */
export async function scanEvidence(options = {}) {
  const { scanner, linker, format } = options;

  // If summary format requested with no scanner results
  if (format === 'summary') {
    const scanResults = scanner ? await scanner.scan() : [];

    return {
      totalEvidence: scanResults.length,
      linkedControls: new Set(scanResults.map(r => r.controlId || r.control)).size,
      byType: groupByType(scanResults),
      scanDate: new Date().toISOString()
    };
  }

  // Scan if scanner provided
  if (!scanner) {
    return [];
  }

  const results = await scanner.scan();

  // Link evidence if linker provided
  if (linker) {
    for (const result of results) {
      linker.link({
        controlId: result.control || result.controlId,
        type: result.type,
        file: result.file,
        pattern: result.pattern
      });
    }
  }

  return results;
}

/**
 * Find compliance gaps
 */
async function findGaps(options = {}) {
  const { framework, checklist } = options;

  if (checklist) {
    const evaluation = await checklist.evaluate();
    return {
      framework,
      gaps: evaluation.gaps || []
    };
  }

  return { framework, gaps: [] };
}

/**
 * Group evidence by type
 */
function groupByType(evidence) {
  const groups = {};
  for (const e of evidence) {
    const type = e.type || 'unknown';
    if (!groups[type]) {
      groups[type] = 0;
    }
    groups[type]++;
  }
  return groups;
}

export default {
  createTrustCentreCommand,
  runComplianceCheck,
  generateComplianceReport,
  scanEvidence
};
