/**
 * Compliance Command - CLI command for compliance operations
 *
 * Features:
 * - tlc compliance status - show compliance status
 * - tlc compliance checklist - show SOC 2 checklist
 * - tlc compliance evidence - collect evidence
 * - tlc compliance report - generate report
 * - tlc compliance policies - generate policies
 * - tlc compliance gaps - show gaps
 */

import {
  createComplianceChecklist,
  getSOC2Checklist,
  getCompliancePercentage,
  getComplianceGaps,
  getControlsByCategory,
  TSC_CATEGORIES,
} from './compliance-checklist.js';

import {
  createReporter,
  generateReadinessReport,
  formatReportMarkdown,
  formatReportHTML,
  calculateCategoryScores,
} from './compliance-reporter.js';

import {
  createEvidenceCollector,
  collectPolicyDocuments,
  collectConfigSnapshot,
  collectAuditLogs,
} from './evidence-collector.js';

import {
  generateAccessControlPolicy,
  generateDataProtectionPolicy,
  generateIncidentResponsePolicy,
  generateAuthPolicy,
  generateAcceptableUsePolicy,
  exportAsMarkdown,
} from './security-policy-generator.js';

const VALID_SUBCOMMANDS = ['status', 'checklist', 'evidence', 'report', 'policies', 'gaps'];
const VALID_FORMATS = ['text', 'markdown', 'html', 'json'];

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
export function parseArgs(args) {
  const result = {
    subcommand: null,
    category: null,
    format: 'text',
    output: null,
    unknownSubcommand: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check for subcommands first (non-flag arguments)
    if (!arg.startsWith('--') && !arg.startsWith('-') && result.subcommand === null && result.unknownSubcommand === null) {
      if (VALID_SUBCOMMANDS.includes(arg)) {
        result.subcommand = arg;
      } else {
        result.unknownSubcommand = arg;
      }
      continue;
    }

    // Parse flags
    if (arg === '--category') {
      result.category = args[i + 1];
      i++;
    } else if (arg.startsWith('--category=')) {
      result.category = arg.split('=')[1];
    } else if (arg === '--format') {
      result.format = args[i + 1];
      i++;
    } else if (arg.startsWith('--format=')) {
      result.format = arg.split('=')[1];
    } else if (arg === '--output') {
      result.output = args[i + 1];
      i++;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.split('=')[1];
    }
  }

  return result;
}

/**
 * ComplianceCommand class - handles tlc compliance command
 */
export class ComplianceCommand {
  /**
   * Create a ComplianceCommand instance
   * @param {Object} options - Configuration options
   * @param {Object} options.checklist - Compliance checklist instance
   * @param {Object} options.reporter - Compliance reporter instance
   * @param {Object} options.evidenceCollector - Evidence collector instance
   * @param {Object} options.policyGenerator - Policy generator (optional)
   * @param {string} options.projectDir - Project directory
   */
  constructor(options = {}) {
    this.checklist = options.checklist || createComplianceChecklist();
    this.reporter = options.reporter || createReporter({ checklist: this.checklist });
    this.evidenceCollector = options.evidenceCollector || createEvidenceCollector();
    this.policyGenerator = options.policyGenerator || {
      generateAccessControlPolicy,
      generateDataProtectionPolicy,
      generateIncidentResponsePolicy,
      generateAuthPolicy,
      generateAcceptableUsePolicy,
    };
    this.projectDir = options.projectDir || process.cwd();
  }

  /**
   * Execute the compliance command
   * @param {string[]} args - Command arguments
   * @returns {Promise<Object>} Result { success, output, error? }
   */
  async execute(args) {
    const options = parseArgs(args);

    try {
      // Check for unknown subcommand first
      if (options.unknownSubcommand) {
        return {
          success: false,
          output: '',
          error: `Unknown subcommand: ${options.unknownSubcommand}. Valid commands: ${VALID_SUBCOMMANDS.join(', ')}`,
        };
      }

      // Default to status if no subcommand
      const subcommand = options.subcommand || 'status';

      switch (subcommand) {
        case 'status':
          return await this.handleStatus(options);
        case 'checklist':
          return await this.handleChecklist(options);
        case 'evidence':
          return await this.handleEvidence(options);
        case 'report':
          return await this.handleReport(options);
        case 'policies':
          return await this.handlePolicies(options);
        case 'gaps':
          return await this.handleGaps(options);
        default:
          return {
            success: false,
            output: '',
            error: `Unknown subcommand: ${subcommand}. Valid commands: ${VALID_SUBCOMMANDS.join(', ')}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Handle status subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleStatus(options) {
    const compliance = getCompliancePercentage(this.checklist);
    const gaps = getComplianceGaps(this.checklist);
    const output = this.formatStatus(compliance, gaps);

    return {
      success: true,
      output,
    };
  }

  /**
   * Handle checklist subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleChecklist(options) {
    let controls;

    if (options.category) {
      const byCategory = getControlsByCategory(this.checklist, options.category);
      controls = byCategory[options.category] || [];
    } else {
      controls = getSOC2Checklist(this.checklist);
    }

    const output = this.formatChecklist(controls, options);

    return {
      success: true,
      output,
    };
  }

  /**
   * Handle evidence subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleEvidence(options) {
    // Collect various evidence types
    const evidenceItems = this.evidenceCollector.getAll ? this.evidenceCollector.getAll() : [];

    const output = this.formatEvidence(evidenceItems);

    return {
      success: true,
      output,
    };
  }

  /**
   * Handle report subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleReport(options) {
    const report = this.reporter.generateReadinessReport
      ? this.reporter.generateReadinessReport()
      : generateReadinessReport(this.reporter);

    let output;
    switch (options.format) {
      case 'markdown':
        output = this.reporter.formatReportMarkdown
          ? this.reporter.formatReportMarkdown(report)
          : formatReportMarkdown(report);
        break;
      case 'html':
        output = this.reporter.formatReportHTML
          ? this.reporter.formatReportHTML(report)
          : formatReportHTML(report);
        break;
      case 'json':
        output = JSON.stringify(report, null, 2);
        break;
      default:
        output = this.formatReportText(report);
    }

    return {
      success: true,
      output,
    };
  }

  /**
   * Handle policies subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handlePolicies(options) {
    const policies = [
      { name: 'Access Control', policy: this.policyGenerator.generateAccessControlPolicy() },
      { name: 'Data Protection', policy: this.policyGenerator.generateDataProtectionPolicy() },
      { name: 'Incident Response', policy: this.policyGenerator.generateIncidentResponsePolicy() },
      { name: 'Authentication', policy: this.policyGenerator.generateAuthPolicy() },
      { name: 'Acceptable Use', policy: this.policyGenerator.generateAcceptableUsePolicy() },
    ];

    const output = this.formatPolicies(policies);

    return {
      success: true,
      output,
    };
  }

  /**
   * Handle gaps subcommand
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleGaps(options) {
    const gaps = getComplianceGaps(this.checklist);
    const output = this.formatGaps(gaps);

    return {
      success: true,
      output,
    };
  }

  /**
   * Format compliance status for display
   * @param {Object} compliance - Compliance metrics
   * @param {Array} gaps - List of gaps
   * @returns {string} Formatted output
   */
  formatStatus(compliance, gaps = []) {
    const lines = [];

    lines.push('Compliance Status');
    lines.push('=================');
    lines.push('');

    // Overall score with progress bar
    const percentage = Math.round(compliance.percentage);
    const progressBar = this.createProgressBar(percentage);
    lines.push(`  Overall Score: ${percentage}% ${progressBar}`);

    // Risk level based on compliance
    const riskLevel = this.calculateRiskLevel(percentage);
    lines.push(`  Risk Level: ${riskLevel}`);
    lines.push('');

    // Category breakdown
    lines.push('  Category Breakdown:');

    if (compliance.byCategory) {
      for (const [category, data] of Object.entries(compliance.byCategory)) {
        const catPercentage = Math.round(data.percentage);
        const catBar = this.createProgressBar(catPercentage, 20);
        lines.push(`    ${category.padEnd(22)} ${String(catPercentage).padStart(3)}% ${catBar}`);
      }
    }

    lines.push('');

    // Gap summary
    const gapCount = gaps.length || compliance.notImplemented + (compliance.partial || 0);
    lines.push(`  Gaps: ${gapCount} controls need attention`);
    lines.push("  Run 'tlc compliance gaps' for details");

    return lines.join('\n');
  }

  /**
   * Format checklist for display
   * @param {Array} controls - List of controls
   * @param {Object} options - Display options
   * @returns {string} Formatted output
   */
  formatChecklist(controls, options = {}) {
    const lines = [];

    lines.push('SOC 2 Compliance Checklist');
    lines.push('==========================');
    lines.push('');

    // Group by category if not filtered
    const byCategory = {};
    for (const control of controls) {
      const cat = control.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(control);
    }

    for (const [category, categoryControls] of Object.entries(byCategory)) {
      lines.push(`${category}`);
      lines.push('-'.repeat(category.length));

      for (const control of categoryControls) {
        const statusIcon = this.getStatusIcon(control.status);
        lines.push(`  ${statusIcon} [${control.id}] ${control.name}`);
        if (control.status !== 'implemented') {
          lines.push(`       Status: ${control.status}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format evidence for display
   * @param {Array} evidenceItems - List of evidence items
   * @returns {string} Formatted output
   */
  formatEvidence(evidenceItems) {
    const lines = [];

    lines.push('Evidence Collection');
    lines.push('===================');
    lines.push('');

    if (!evidenceItems || evidenceItems.length === 0) {
      lines.push('  No evidence items collected yet.');
      lines.push('');
      lines.push('  To collect evidence, run:');
      lines.push('    tlc compliance evidence --collect');
      return lines.join('\n');
    }

    // Group by type
    const byType = {};
    for (const item of evidenceItems) {
      const type = item.type || 'other';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(item);
    }

    lines.push(`  Total Items: ${evidenceItems.length}`);
    lines.push('');

    for (const [type, items] of Object.entries(byType)) {
      lines.push(`  ${type.charAt(0).toUpperCase() + type.slice(1)} (${items.length}):`);
      for (const item of items.slice(0, 5)) {
        lines.push(`    - ${item.id}: ${item.title || item.type}`);
      }
      if (items.length > 5) {
        lines.push(`    ... and ${items.length - 5} more`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format report as text
   * @param {Object} report - Generated report
   * @returns {string} Formatted output
   */
  formatReportText(report) {
    const lines = [];

    lines.push(report.title || 'SOC 2 Type II Readiness Report');
    lines.push('='.repeat(40));
    lines.push('');

    if (report.summary) {
      lines.push('Summary');
      lines.push('-------');
      lines.push(`  Overall Score: ${report.summary.overallScore}%`);
      lines.push(`  Risk Level: ${report.summary.riskLevel}`);
      lines.push(`  Total Controls: ${report.summary.totalControls}`);
      lines.push(`  Implemented: ${report.summary.implemented}`);
      lines.push(`  Partial: ${report.summary.partial}`);
      lines.push(`  Gaps: ${report.summary.gaps}`);
      lines.push('');
    }

    if (report.categories) {
      lines.push('Categories');
      lines.push('----------');
      for (const [category, data] of Object.entries(report.categories)) {
        lines.push(`  ${category}: ${data.score}%`);
      }
      lines.push('');
    }

    if (report.recommendations && report.recommendations.length > 0) {
      lines.push('Top Recommendations');
      lines.push('-------------------');
      for (const rec of report.recommendations.slice(0, 5)) {
        lines.push(`  - [${rec.controlId}] ${rec.action}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format policies for display
   * @param {Array} policies - List of policy objects
   * @returns {string} Formatted output
   */
  formatPolicies(policies) {
    const lines = [];

    lines.push('Security Policies');
    lines.push('=================');
    lines.push('');

    lines.push('  Available Policies:');
    lines.push('');

    for (const { name, policy } of policies) {
      lines.push(`  [*] ${name}`);
      if (policy && policy.title) {
        lines.push(`      Title: ${policy.title}`);
      }
      if (policy && policy.sections) {
        lines.push(`      Sections: ${policy.sections.length}`);
      }
    }

    lines.push('');
    lines.push('  To export a policy, run:');
    lines.push('    tlc compliance policies --export <type> --format markdown');

    return lines.join('\n');
  }

  /**
   * Format gaps for display
   * @param {Array} gaps - List of gap controls
   * @returns {string} Formatted output
   */
  formatGaps(gaps) {
    const lines = [];

    lines.push('Compliance Gaps');
    lines.push('===============');
    lines.push('');

    if (!gaps || gaps.length === 0) {
      lines.push('  No gaps found - all controls are implemented!');
      return lines.join('\n');
    }

    // Group by severity
    const bySeverity = {
      high: [],
      medium: [],
      low: [],
    };

    for (const gap of gaps) {
      const severity = gap.gapSeverity || 'medium';
      if (bySeverity[severity]) {
        bySeverity[severity].push(gap);
      } else {
        bySeverity.medium.push(gap);
      }
    }

    // Display high priority first
    if (bySeverity.high.length > 0) {
      lines.push('  High Priority:');
      for (const gap of bySeverity.high) {
        lines.push(`    [${gap.id}] ${gap.name} - ${gap.status}`);
      }
      lines.push('');
    }

    if (bySeverity.medium.length > 0) {
      lines.push('  Medium Priority:');
      for (const gap of bySeverity.medium) {
        lines.push(`    [${gap.id}] ${gap.name} - ${gap.status}`);
      }
      lines.push('');
    }

    if (bySeverity.low.length > 0) {
      lines.push('  Low Priority:');
      for (const gap of bySeverity.low) {
        lines.push(`    [${gap.id}] ${gap.name} - ${gap.status}`);
      }
      lines.push('');
    }

    lines.push(`  Total gaps: ${gaps.length}`);

    return lines.join('\n');
  }

  /**
   * Create a progress bar string
   * @param {number} percentage - Percentage (0-100)
   * @param {number} width - Bar width in characters
   * @returns {string} Progress bar
   */
  createProgressBar(percentage, width = 22) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  }

  /**
   * Calculate risk level from compliance percentage
   * @param {number} percentage - Compliance percentage
   * @returns {string} Risk level
   */
  calculateRiskLevel(percentage) {
    if (percentage >= 90) return 'Low';
    if (percentage >= 70) return 'Medium';
    if (percentage >= 50) return 'High';
    return 'Critical';
  }

  /**
   * Get status icon for a control
   * @param {string} status - Control status
   * @returns {string} Status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'implemented':
        return '[x]';
      case 'partial':
        return '[~]';
      case 'not_implemented':
        return '[ ]';
      case 'not_applicable':
        return '[N/A]';
      default:
        return '[ ]';
    }
  }
}
