/**
 * ISO 27001:2022 Compliance Checklist
 * Information Security Management System controls
 */

// ISO 27001:2022 Annex A Controls
const CONTROLS = [
  // Organizational controls (A.5)
  { id: 'A.5.1', name: 'Policies for information security', theme: 'organizational', purpose: 'To provide management direction and support for information security' },
  { id: 'A.5.2', name: 'Information security roles and responsibilities', theme: 'organizational', purpose: 'To establish a defined and approved information security organizational structure' },
  { id: 'A.5.3', name: 'Segregation of duties', theme: 'organizational', purpose: 'To reduce the risk of fraud and error' },
  { id: 'A.5.4', name: 'Management responsibilities', theme: 'organizational', purpose: 'To ensure all personnel support information security' },
  { id: 'A.5.5', name: 'Contact with authorities', theme: 'organizational', purpose: 'To maintain appropriate contacts with relevant authorities' },
  { id: 'A.5.6', name: 'Contact with special interest groups', theme: 'organizational', purpose: 'To maintain appropriate contacts with special interest groups' },
  { id: 'A.5.7', name: 'Threat intelligence', theme: 'organizational', purpose: 'To provide awareness of the threat environment' },
  { id: 'A.5.8', name: 'Information security in project management', theme: 'organizational', purpose: 'To ensure information security is integrated into project management' },
  { id: 'A.5.9', name: 'Inventory of information and other associated assets', theme: 'organizational', purpose: 'To identify and manage information assets' },
  { id: 'A.5.10', name: 'Acceptable use of information and other associated assets', theme: 'organizational', purpose: 'To ensure information assets are appropriately used' },
  { id: 'A.5.11', name: 'Return of assets', theme: 'organizational', purpose: 'To protect assets when employment ends' },
  { id: 'A.5.12', name: 'Classification of information', theme: 'organizational', purpose: 'To ensure information is classified appropriately' },
  { id: 'A.5.13', name: 'Labelling of information', theme: 'organizational', purpose: 'To facilitate information classification' },
  { id: 'A.5.14', name: 'Information transfer', theme: 'organizational', purpose: 'To maintain security during information transfer' },
  { id: 'A.5.15', name: 'Access control', theme: 'organizational', purpose: 'To ensure authorized access to information' },
  { id: 'A.5.16', name: 'Identity management', theme: 'organizational', purpose: 'To enable unique identification of individuals' },
  { id: 'A.5.17', name: 'Authentication information', theme: 'organizational', purpose: 'To prevent unauthorized disclosure of authentication information' },
  { id: 'A.5.18', name: 'Access rights', theme: 'organizational', purpose: 'To ensure access rights are authorized, reviewed, and removed' },

  // People controls (A.6)
  { id: 'A.6.1', name: 'Screening', theme: 'people', purpose: 'To ensure personnel are suitable and trustworthy' },
  { id: 'A.6.2', name: 'Terms and conditions of employment', theme: 'people', purpose: 'To ensure personnel understand their responsibilities' },
  { id: 'A.6.3', name: 'Information security awareness, education and training', theme: 'people', purpose: 'To ensure personnel are aware of security requirements' },
  { id: 'A.6.4', name: 'Disciplinary process', theme: 'people', purpose: 'To ensure there are consequences for security violations' },
  { id: 'A.6.5', name: 'Responsibilities after termination or change of employment', theme: 'people', purpose: 'To protect organizational interests during employment changes' },
  { id: 'A.6.6', name: 'Confidentiality or non-disclosure agreements', theme: 'people', purpose: 'To protect confidential information' },
  { id: 'A.6.7', name: 'Remote working', theme: 'people', purpose: 'To protect information when working remotely' },
  { id: 'A.6.8', name: 'Information security event reporting', theme: 'people', purpose: 'To provide timely reporting of security events' },

  // Physical controls (A.7)
  { id: 'A.7.1', name: 'Physical security perimeters', theme: 'physical', purpose: 'To prevent unauthorized physical access' },
  { id: 'A.7.2', name: 'Physical entry', theme: 'physical', purpose: 'To protect areas by appropriate entry controls' },
  { id: 'A.7.3', name: 'Securing offices, rooms and facilities', theme: 'physical', purpose: 'To prevent unauthorized physical access' },
  { id: 'A.7.4', name: 'Physical security monitoring', theme: 'physical', purpose: 'To detect and deter unauthorized access' },
  { id: 'A.7.5', name: 'Protecting against physical and environmental threats', theme: 'physical', purpose: 'To protect against environmental damage' },
  { id: 'A.7.6', name: 'Working in secure areas', theme: 'physical', purpose: 'To protect information in secure areas' },
  { id: 'A.7.7', name: 'Clear desk and clear screen', theme: 'physical', purpose: 'To reduce risks from unattended workspaces' },
  { id: 'A.7.8', name: 'Equipment siting and protection', theme: 'physical', purpose: 'To protect equipment from environmental threats' },
  { id: 'A.7.9', name: 'Security of assets off-premises', theme: 'physical', purpose: 'To protect assets outside organizational premises' },
  { id: 'A.7.10', name: 'Storage media', theme: 'physical', purpose: 'To prevent unauthorized disclosure from storage media' },
  { id: 'A.7.11', name: 'Supporting utilities', theme: 'physical', purpose: 'To prevent loss or damage from utility failures' },
  { id: 'A.7.12', name: 'Cabling security', theme: 'physical', purpose: 'To protect cabling from interception or damage' },
  { id: 'A.7.13', name: 'Equipment maintenance', theme: 'physical', purpose: 'To ensure continued availability and integrity' },
  { id: 'A.7.14', name: 'Secure disposal or re-use of equipment', theme: 'physical', purpose: 'To prevent information leakage from disposed equipment' },

  // Technological controls (A.8)
  { id: 'A.8.1', name: 'User endpoint devices', theme: 'technological', purpose: 'To protect information on endpoint devices' },
  { id: 'A.8.2', name: 'Privileged access rights', theme: 'technological', purpose: 'To restrict and manage privileged access' },
  { id: 'A.8.3', name: 'Information access restriction', theme: 'technological', purpose: 'To prevent unauthorized access to information' },
  { id: 'A.8.4', name: 'Access to source code', theme: 'technological', purpose: 'To prevent unauthorized access to source code' },
  { id: 'A.8.5', name: 'Secure authentication', theme: 'technological', purpose: 'To implement secure authentication mechanisms' },
  { id: 'A.8.6', name: 'Capacity management', theme: 'technological', purpose: 'To ensure adequate resource capacity' },
  { id: 'A.8.7', name: 'Protection against malware', theme: 'technological', purpose: 'To protect against malware' },
  { id: 'A.8.8', name: 'Management of technical vulnerabilities', theme: 'technological', purpose: 'To prevent exploitation of vulnerabilities' },
  { id: 'A.8.9', name: 'Configuration management', theme: 'technological', purpose: 'To ensure secure configurations' },
  { id: 'A.8.10', name: 'Information deletion', theme: 'technological', purpose: 'To ensure secure deletion of information' },
  { id: 'A.8.11', name: 'Data masking', theme: 'technological', purpose: 'To limit exposure of sensitive data' },
  { id: 'A.8.12', name: 'Data leakage prevention', theme: 'technological', purpose: 'To prevent unauthorized data disclosure' },
  { id: 'A.8.13', name: 'Information backup', theme: 'technological', purpose: 'To maintain backup copies of information' },
  { id: 'A.8.14', name: 'Redundancy of information processing facilities', theme: 'technological', purpose: 'To ensure availability of processing facilities' },
  { id: 'A.8.15', name: 'Logging', theme: 'technological', purpose: 'To record events for investigation' },
  { id: 'A.8.16', name: 'Monitoring activities', theme: 'technological', purpose: 'To detect anomalous behavior' },
  { id: 'A.8.17', name: 'Clock synchronization', theme: 'technological', purpose: 'To ensure consistent timestamps' },
  { id: 'A.8.18', name: 'Use of privileged utility programs', theme: 'technological', purpose: 'To restrict use of privileged utilities' },
  { id: 'A.8.19', name: 'Installation of software on operational systems', theme: 'technological', purpose: 'To control software installation' },
  { id: 'A.8.20', name: 'Networks security', theme: 'technological', purpose: 'To protect network infrastructure' },
  { id: 'A.8.21', name: 'Security of network services', theme: 'technological', purpose: 'To ensure security of network services' },
  { id: 'A.8.22', name: 'Segregation of networks', theme: 'technological', purpose: 'To segregate network segments' },
  { id: 'A.8.23', name: 'Web filtering', theme: 'technological', purpose: 'To restrict access to external websites' },
  { id: 'A.8.24', name: 'Use of cryptography', theme: 'technological', purpose: 'To ensure proper use of cryptography' },
  { id: 'A.8.25', name: 'Secure development life cycle', theme: 'technological', purpose: 'To establish secure development practices' },
  { id: 'A.8.26', name: 'Application security requirements', theme: 'technological', purpose: 'To identify security requirements' },
  { id: 'A.8.27', name: 'Secure system architecture and engineering principles', theme: 'technological', purpose: 'To establish secure design principles' },
  { id: 'A.8.28', name: 'Secure coding', theme: 'technological', purpose: 'To apply secure coding practices' },
  { id: 'A.8.29', name: 'Security testing in development and acceptance', theme: 'technological', purpose: 'To test security during development' },
  { id: 'A.8.30', name: 'Outsourced development', theme: 'technological', purpose: 'To manage security of outsourced development' },
  { id: 'A.8.31', name: 'Separation of development, test and production environments', theme: 'technological', purpose: 'To separate environments' },
  { id: 'A.8.32', name: 'Change management', theme: 'technological', purpose: 'To control changes' },
  { id: 'A.8.33', name: 'Test information', theme: 'technological', purpose: 'To protect test information' },
  { id: 'A.8.34', name: 'Protection of information systems during audit testing', theme: 'technological', purpose: 'To minimize impact of audit testing' }
];

// Control check implementations
const CONTROL_CHECKS = {
  'A.5.1': (evidence) => {
    const implemented = evidence.policies?.informationSecurity === true;
    return {
      implemented,
      effectiveness: implemented ? 'full' : 'none',
      missingEvidence: implemented ? [] : ['Information security policy document']
    };
  },
  'A.5.15': (evidence) => {
    const ac = evidence.accessControl;
    const implemented = ac?.implemented === true;
    const tested = ac?.tested === true;
    const documented = ac?.documented === true;

    let effectiveness = 'none';
    if (implemented && tested && documented) effectiveness = 'full';
    else if (implemented && (tested || documented)) effectiveness = 'partial';
    else if (implemented) effectiveness = 'limited';

    const missing = [];
    if (!implemented) missing.push('Access control implementation');
    if (!tested) missing.push('Access control testing evidence');
    if (!documented) missing.push('Access control documentation');

    return {
      implemented,
      effectiveness,
      missingEvidence: missing
    };
  }
};

// Control to technical implementation mappings
const CONTROL_MAPPINGS = {
  'A.8.24': [
    { type: 'encryption', description: 'Data encryption implementation', patterns: ['encrypt', 'aes', 'crypto', 'tls'] },
    { type: 'key-management', description: 'Cryptographic key management', patterns: ['key-vault', 'kms', 'secret'] }
  ],
  'A.8.3': [
    { type: 'access-control', description: 'Information access restriction', patterns: ['rbac', 'acl', 'permission', 'authorize'] },
    { type: 'authentication', description: 'User authentication', patterns: ['auth', 'login', 'session'] }
  ]
};

/**
 * Create an ISO 27001 checklist instance
 * @param {Object} options - Configuration options
 * @param {string} options.version - ISO 27001 version (default: '2022')
 * @returns {Object} Checklist instance
 */
export function createIso27001Checklist(options = {}) {
  const version = options.version || '2022';

  return {
    evaluate(evidence) {
      const results = [];
      const controls = getControls();

      for (const control of controls) {
        const result = checkControl(control.id, evidence);
        results.push(result);
      }

      return {
        version,
        results,
        compliant: results.every(r => r.implemented),
        score: (results.filter(r => r.implemented).length / results.length) * 100
      };
    },

    getControls() {
      return getControls();
    }
  };
}

/**
 * Get ISO 27001 controls
 * @param {Object} options - Filter options
 * @param {string} options.groupBy - Group by 'theme' or return flat list
 * @returns {Array|Object} Controls list or grouped object
 */
export function getControls(options = {}) {
  if (options.groupBy === 'theme') {
    const grouped = {
      organizational: [],
      people: [],
      physical: [],
      technological: []
    };

    for (const control of CONTROLS) {
      grouped[control.theme].push(control);
    }

    return grouped;
  }

  return [...CONTROLS];
}

/**
 * Check implementation of a specific control
 * @param {string} controlId - Control identifier (e.g., 'A.5.1')
 * @param {Object} evidence - Evidence for compliance check
 * @returns {Object} Check result
 */
export function checkControl(controlId, evidence) {
  const control = CONTROLS.find(c => c.id === controlId);
  const checkFn = CONTROL_CHECKS[controlId];

  let implemented = false;
  let effectiveness = 'none';
  let missingEvidence = ['Evidence not provided'];

  if (checkFn) {
    const result = checkFn(evidence);
    implemented = result.implemented;
    effectiveness = result.effectiveness;
    missingEvidence = result.missingEvidence;
  }

  return {
    controlId,
    controlName: control?.name || 'Unknown control',
    theme: control?.theme,
    purpose: control?.purpose,
    implemented,
    effectiveness,
    missingEvidence
  };
}

/**
 * Generate Statement of Applicability
 * @param {Array} assessments - Array of control assessments
 * @returns {string} SoA document
 */
export function generateSoa(assessments) {
  const date = new Date().toISOString().split('T')[0];

  let soa = `# Statement of Applicability

**Document Date:** ${date}
**ISO 27001:2022**

## Purpose

This Statement of Applicability (SoA) documents the applicability and implementation status of ISO 27001:2022 Annex A controls.

## Control Assessment

| Control ID | Control Name | Applicable | Implemented | Justification |
|------------|--------------|------------|-------------|---------------|
`;

  for (const assessment of assessments) {
    const control = CONTROLS.find(c => c.id === assessment.controlId);
    const name = control?.name || 'Unknown';
    const applicable = assessment.applicable ? 'Yes' : 'No';
    const implemented = assessment.implemented ? 'Yes' : 'No';
    const justification = assessment.justification || '-';

    soa += `| ${assessment.controlId} | ${name} | ${applicable} | ${implemented} | ${justification} |\n`;
  }

  soa += `
## Summary

- **Total Controls:** ${assessments.length}
- **Applicable:** ${assessments.filter(a => a.applicable).length}
- **Not Applicable:** ${assessments.filter(a => !a.applicable).length}
- **Implemented:** ${assessments.filter(a => a.implemented).length}

## Approval

_________________________
Information Security Manager

_________________________
Management Representative
`;

  return soa;
}

/**
 * Map Annex A control to technical implementations
 * @param {string} controlId - Control identifier
 * @returns {Array} Technical implementation mappings
 */
export function mapAnnexAControls(controlId) {
  return CONTROL_MAPPINGS[controlId] || [];
}
