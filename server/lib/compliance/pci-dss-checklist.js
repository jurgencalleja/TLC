/**
 * PCI DSS v4.0 Compliance Checklist
 * Payment Card Industry Data Security Standard requirements
 */

// PCI DSS v4.0 Requirements
const REQUIREMENTS = [
  // 12 main requirements
  { id: 'req-1', name: 'Install and maintain network security controls', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-2', name: 'Apply secure configurations to all system components', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-3', name: 'Protect stored account data', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-4', name: 'Protect cardholder data with strong cryptography during transmission', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-5', name: 'Protect all systems and networks from malicious software', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-6', name: 'Develop and maintain secure systems and software', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-7', name: 'Restrict access to system components and cardholder data', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-8', name: 'Identify users and authenticate access to system components', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-9', name: 'Restrict physical access to cardholder data', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-10', name: 'Log and monitor all access to system components and cardholder data', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-11', name: 'Test security of systems and networks regularly', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },
  { id: 'req-12', name: 'Support information security with organizational policies and programs', level: 'requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: null },

  // Sub-requirements for Requirement 1
  { id: 'req-1.1', name: 'Processes and mechanisms for installing and maintaining network security controls are defined and understood', level: 'sub-requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: 'req-1' },
  { id: 'req-1.2', name: 'Network security controls are configured and maintained', level: 'sub-requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: 'req-1' },
  { id: 'req-1.3', name: 'Network access to and from the cardholder data environment is restricted', level: 'sub-requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'C-VT', 'D', 'P2PE'], parent: 'req-1' },

  // Sub-requirements for Requirement 3
  { id: 'req-3.4', name: 'PAN is rendered unreadable anywhere it is stored', level: 'sub-requirement', saqTypes: ['A', 'A-EP', 'B', 'B-IP', 'C', 'D', 'P2PE'], parent: 'req-3' }
];

// Control mappings for technical implementations
const CONTROL_MAPPINGS = {
  'req-1.1': [
    { type: 'firewall', description: 'Network firewall configuration', patterns: ['firewall', 'iptables', 'security-group'] },
    { type: 'network-segmentation', description: 'Network segmentation controls', patterns: ['vlan', 'subnet', 'network-policy'] },
    { type: 'documentation', description: 'Network security documentation', patterns: ['network-diagram', 'data-flow'] }
  ],
  'req-1.2': [
    { type: 'firewall', description: 'Firewall rule management', patterns: ['firewall-rules', 'ingress', 'egress'] },
    { type: 'configuration', description: 'Secure configuration standards', patterns: ['config', 'settings'] }
  ],
  'req-3.4': [
    { type: 'encryption', description: 'Data encryption at rest', patterns: ['encrypt', 'aes', 'crypto'] },
    { type: 'tokenization', description: 'PAN tokenization', patterns: ['token', 'mask', 'redact'] },
    { type: 'hashing', description: 'One-way hashing', patterns: ['hash', 'sha256'] }
  ]
};

// Requirement check logic
const REQUIREMENT_CHECKS = {
  'req-1.1': (evidence) => {
    const gaps = [];
    if (!evidence.hasFirewall) gaps.push('Firewall not detected');
    if (!evidence.firewallConfig) gaps.push('Firewall configuration not provided');
    return { passed: gaps.length === 0, gaps };
  }
};

/**
 * Create a PCI DSS checklist instance
 * @param {Object} options - Configuration options
 * @param {string} options.version - PCI DSS version (default: '4.0')
 * @returns {Object} Checklist instance
 */
export function createPciDssChecklist(options = {}) {
  const version = options.version || '4.0';

  return {
    evaluate(evidence) {
      const results = [];
      const reqs = getRequirements();

      for (const req of reqs) {
        const result = checkRequirement(req.id, evidence);
        results.push(result);
      }

      return {
        version,
        results,
        compliant: results.every(r => r.status === 'compliant'),
        score: (results.filter(r => r.status === 'compliant').length / results.length) * 100
      };
    },

    getRequirements() {
      return REQUIREMENTS.filter(r => r.id.startsWith('req-'));
    }
  };
}

/**
 * Get PCI DSS requirements
 * @param {Object} options - Filter options
 * @param {boolean} options.includeSubRequirements - Include sub-requirements
 * @param {string} options.saqType - Filter by SAQ type
 * @returns {Array} Requirements list
 */
export function getRequirements(options = {}) {
  let reqs = [...REQUIREMENTS];

  // Filter to main requirements unless sub-requirements requested
  if (!options.includeSubRequirements) {
    reqs = reqs.filter(r => r.level === 'requirement');
  }

  // Filter by SAQ type
  if (options.saqType) {
    reqs = reqs.filter(r => r.saqTypes.includes(options.saqType));
  }

  return reqs;
}

/**
 * Check compliance with a specific requirement
 * @param {string} requirementId - Requirement identifier
 * @param {Object} evidence - Evidence for compliance check
 * @returns {Object} Check result with status, gaps, and remediation
 */
export function checkRequirement(requirementId, evidence) {
  const requirement = REQUIREMENTS.find(r => r.id === requirementId);
  const checkFn = REQUIREMENT_CHECKS[requirementId];

  let status = 'non-compliant';
  let gaps = [];

  if (checkFn) {
    const result = checkFn(evidence);
    status = result.passed ? 'compliant' : 'non-compliant';
    gaps = result.gaps;
  } else {
    // Default check - look for related evidence
    gaps = ['Evidence not provided or check not implemented'];
  }

  const remediation = getRemediationGuidance(requirementId, gaps);

  return {
    requirementId,
    requirementName: requirement?.name || 'Unknown requirement',
    status,
    gaps,
    remediation
  };
}

/**
 * Get remediation guidance for a requirement
 * @param {string} requirementId - Requirement identifier
 * @param {Array} gaps - Identified gaps
 * @returns {string} Remediation guidance
 */
function getRemediationGuidance(requirementId, gaps) {
  const guidanceMap = {
    'req-1.1': 'Implement and document network security controls including firewalls, security groups, and network segmentation.',
    'req-1.2': 'Configure firewall rules to restrict inbound and outbound traffic to only necessary communications.',
    'req-3.4': 'Implement encryption, truncation, masking, or hashing to render PAN unreadable.',
  };

  return guidanceMap[requirementId] || 'Review PCI DSS v4.0 documentation for requirement details and implement appropriate controls.';
}

/**
 * Generate a gap analysis report
 * @param {Array} status - Array of requirement check results
 * @returns {string} Formatted gap report
 */
export function generateGapReport(status) {
  // Sort by priority - critical first
  const sorted = [...status].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    return aPriority - bPriority;
  });

  let report = '# PCI DSS Gap Analysis Report\n\n';
  report += '## Summary\n\n';

  const compliant = sorted.filter(s => s.status === 'compliant').length;
  const nonCompliant = sorted.filter(s => s.status === 'non-compliant').length;

  report += `- Compliant: ${compliant}\n`;
  report += `- Non-Compliant: ${nonCompliant}\n\n`;

  report += '## Gap Analysis\n\n';

  for (const item of sorted) {
    if (item.status === 'non-compliant') {
      report += `### ${item.requirementId}\n\n`;
      report += `**Status:** Non-Compliant\n`;
      report += `**Priority:** ${item.priority || 'medium'}\n`;
      if (item.gaps && item.gaps.length > 0) {
        report += `**Gaps:**\n`;
        for (const gap of item.gaps) {
          report += `- ${gap}\n`;
        }
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * Map PCI DSS requirement to technical controls
 * @param {string} requirementId - Requirement identifier
 * @returns {Array} Technical control mappings
 */
export function mapToControls(requirementId) {
  return CONTROL_MAPPINGS[requirementId] || [];
}
