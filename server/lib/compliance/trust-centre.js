/**
 * Trust Centre Core Functionality
 * Central hub for compliance framework management
 */

// Available frameworks with metadata
const FRAMEWORKS = [
  { id: 'pci-dss', name: 'PCI DSS', version: '4.0', controlCount: 12, description: 'Payment Card Industry Data Security Standard' },
  { id: 'hipaa', name: 'HIPAA', version: '2013', controlCount: 54, description: 'Health Insurance Portability and Accountability Act' },
  { id: 'iso27001', name: 'ISO 27001', version: '2022', controlCount: 93, description: 'Information Security Management System' },
  { id: 'gdpr', name: 'GDPR', version: '2018', controlCount: 99, description: 'General Data Protection Regulation' },
  { id: 'soc2', name: 'SOC 2', version: 'Type II', controlCount: 64, description: 'Service Organization Control 2' }
];

// Framework control details
const FRAMEWORK_DETAILS = {
  'pci-dss': {
    id: 'pci-dss',
    name: 'Payment Card Industry Data Security Standard',
    version: '4.0',
    controls: [
      { id: 'req-1', name: 'Install and maintain network security controls' },
      { id: 'req-2', name: 'Apply secure configurations' },
      { id: 'req-3', name: 'Protect stored account data' },
      { id: 'req-4', name: 'Protect cardholder data with strong cryptography' },
      { id: 'req-5', name: 'Protect systems from malicious software' },
      { id: 'req-6', name: 'Develop and maintain secure systems' },
      { id: 'req-7', name: 'Restrict access to cardholder data' },
      { id: 'req-8', name: 'Identify users and authenticate access' },
      { id: 'req-9', name: 'Restrict physical access to cardholder data' },
      { id: 'req-10', name: 'Log and monitor all access' },
      { id: 'req-11', name: 'Test security of systems regularly' },
      { id: 'req-12', name: 'Support information security with policies' }
    ]
  },
  'hipaa': {
    id: 'hipaa',
    name: 'Health Insurance Portability and Accountability Act',
    version: '2013',
    controls: [
      { id: 'admin-1', name: 'Security Management Process' },
      { id: 'admin-2', name: 'Assigned Security Responsibility' },
      { id: 'physical-1', name: 'Facility Access Controls' },
      { id: 'technical-1', name: 'Access Control' },
      { id: 'technical-2', name: 'Audit Controls' },
      { id: 'technical-3', name: 'Integrity Controls' },
      { id: 'technical-4', name: 'Transmission Security' }
    ]
  },
  'iso27001': {
    id: 'iso27001',
    name: 'ISO/IEC 27001:2022',
    version: '2022',
    controls: [
      { id: 'A.5.1', name: 'Policies for information security' },
      { id: 'A.5.2', name: 'Information security roles and responsibilities' },
      { id: 'A.6.1', name: 'Screening' },
      { id: 'A.7.1', name: 'Physical security perimeters' },
      { id: 'A.8.1', name: 'User endpoint devices' }
    ]
  },
  'gdpr': {
    id: 'gdpr',
    name: 'General Data Protection Regulation',
    version: '2018',
    controls: [
      { id: 'art-5', name: 'Principles relating to processing' },
      { id: 'art-6', name: 'Lawfulness of processing' },
      { id: 'art-7', name: 'Conditions for consent' }
    ]
  },
  'soc2': {
    id: 'soc2',
    name: 'SOC 2 Type II',
    version: 'Type II',
    controls: [
      { id: 'cc-1', name: 'Control Environment' },
      { id: 'cc-2', name: 'Communication and Information' }
    ]
  }
};

/**
 * Create a trust centre instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.defaults - Whether to initialize with default frameworks
 * @returns {Object} Trust centre instance
 */
export function createTrustCentre(options = {}) {
  const frameworks = options.defaults
    ? ['pci-dss', 'hipaa', 'iso27001', 'gdpr']
    : [];

  return {
    getStatus() {
      return {
        frameworks: frameworks.map(id => {
          const fw = FRAMEWORKS.find(f => f.id === id);
          return { id, name: fw?.name, compliant: false, score: 0 };
        }),
        overallScore: 0
      };
    },

    addFramework(frameworkId) {
      if (!frameworks.includes(frameworkId)) {
        frameworks.push(frameworkId);
      }
    },

    listFrameworks() {
      return [...frameworks];
    },

    generateReport() {
      return {
        generatedAt: new Date().toISOString(),
        frameworks: frameworks.map(id => ({
          id,
          status: 'pending',
          score: 0
        })),
        summary: 'Trust centre compliance report'
      };
    }
  };
}

/**
 * Get compliance status for a framework
 * @param {Object} options - Options including framework and controls
 * @returns {Object} Compliance status
 */
export function getComplianceStatus({ framework, controls }) {
  const compliantCount = controls.filter(c => c.status === 'compliant').length;
  const totalCount = controls.length;
  const score = totalCount > 0 ? (compliantCount / totalCount) * 100 : 0;

  return {
    framework,
    compliant: compliantCount === totalCount && totalCount > 0,
    score,
    controlsAssessed: totalCount,
    controlsCompliant: compliantCount
  };
}

/**
 * List available compliance frameworks
 * @returns {Array} List of framework metadata
 */
export function listFrameworks() {
  return FRAMEWORKS.map(f => ({
    id: f.id,
    name: f.name,
    version: f.version,
    controlCount: f.controlCount,
    description: f.description
  }));
}

/**
 * Get detailed information about a framework
 * @param {string} frameworkId - Framework identifier
 * @returns {Object} Framework details including controls
 */
export function getFrameworkDetails(frameworkId) {
  const details = FRAMEWORK_DETAILS[frameworkId];
  if (!details) {
    throw new Error(`Unknown framework: ${frameworkId}`);
  }
  return details;
}

/**
 * Calculate overall compliance score from multiple frameworks
 * @param {Array} scores - Array of framework scores with optional weights
 * @returns {number} Weighted overall score
 */
export function calculateOverallScore(scores) {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + (s.weight || 1), 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.score * (s.weight || 1), 0);

  return weightedSum / totalWeight;
}
