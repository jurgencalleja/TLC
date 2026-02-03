/**
 * HIPAA Compliance Checklist
 * Health Insurance Portability and Accountability Act safeguards
 */

// HIPAA Safeguards
const SAFEGUARDS = [
  // Administrative Safeguards
  { id: 'security-management', name: 'Security Management Process', category: 'administrative', type: 'required', section: '164.308(a)(1)' },
  { id: 'assigned-security', name: 'Assigned Security Responsibility', category: 'administrative', type: 'required', section: '164.308(a)(2)' },
  { id: 'workforce-security', name: 'Workforce Security', category: 'administrative', type: 'addressable', section: '164.308(a)(3)' },
  { id: 'info-access-mgmt', name: 'Information Access Management', category: 'administrative', type: 'required', section: '164.308(a)(4)' },
  { id: 'security-training', name: 'Security Awareness and Training', category: 'administrative', type: 'addressable', section: '164.308(a)(5)' },
  { id: 'security-incident', name: 'Security Incident Procedures', category: 'administrative', type: 'required', section: '164.308(a)(6)' },
  { id: 'contingency-plan', name: 'Contingency Plan', category: 'administrative', type: 'required', section: '164.308(a)(7)' },
  { id: 'evaluation', name: 'Evaluation', category: 'administrative', type: 'required', section: '164.308(a)(8)' },
  { id: 'baa', name: 'Business Associate Contracts', category: 'administrative', type: 'required', section: '164.308(b)(1)' },

  // Physical Safeguards
  { id: 'facility-access', name: 'Facility Access Controls', category: 'physical', type: 'addressable', section: '164.310(a)(1)' },
  { id: 'workstation-use', name: 'Workstation Use', category: 'physical', type: 'required', section: '164.310(b)' },
  { id: 'workstation-security', name: 'Workstation Security', category: 'physical', type: 'required', section: '164.310(c)' },
  { id: 'device-media', name: 'Device and Media Controls', category: 'physical', type: 'required', section: '164.310(d)(1)' },

  // Technical Safeguards
  { id: 'access-control', name: 'Access Control', category: 'technical', type: 'required', section: '164.312(a)(1)' },
  { id: 'audit-controls', name: 'Audit Controls', category: 'technical', type: 'required', section: '164.312(b)' },
  { id: 'integrity', name: 'Integrity', category: 'technical', type: 'addressable', section: '164.312(c)(1)' },
  { id: 'person-auth', name: 'Person or Entity Authentication', category: 'technical', type: 'required', section: '164.312(d)' },
  { id: 'transmission-security', name: 'Transmission Security', category: 'technical', type: 'addressable', section: '164.312(e)(1)' },
  { id: 'encryption', name: 'Encryption', category: 'technical', type: 'addressable', section: '164.312(e)(2)' }
];

// PHI data element patterns
const PHI_PATTERNS = {
  ssn: { element: 'ssn', description: 'Social Security Number', sensitivity: 'high' },
  'patient.ssn': { element: 'ssn', description: 'Patient Social Security Number', sensitivity: 'high' },
  dateOfBirth: { element: 'dateOfBirth', description: 'Date of Birth', sensitivity: 'medium' },
  'patient.dateOfBirth': { element: 'dateOfBirth', description: 'Patient Date of Birth', sensitivity: 'medium' },
  medicalRecord: { element: 'medicalRecord', description: 'Medical Record', sensitivity: 'high' },
  diagnosis: { element: 'diagnosis', description: 'Diagnosis Information', sensitivity: 'high' },
  treatment: { element: 'treatment', description: 'Treatment Information', sensitivity: 'high' },
  prescription: { element: 'prescription', description: 'Prescription Information', sensitivity: 'high' },
  healthPlan: { element: 'healthPlan', description: 'Health Plan Information', sensitivity: 'medium' },
  'patient.name': { element: 'name', description: 'Patient Name', sensitivity: 'medium' },
  'patient.address': { element: 'address', description: 'Patient Address', sensitivity: 'medium' },
  'patient.phone': { element: 'phone', description: 'Patient Phone', sensitivity: 'medium' },
  'patient.email': { element: 'email', description: 'Patient Email', sensitivity: 'medium' }
};

// Safeguard check implementations
const SAFEGUARD_CHECKS = {
  'access-control': (evidence) => {
    return evidence.accessControls?.enabled === true;
  },
  'encryption': (evidence) => {
    return evidence.encryption?.atRest === true && evidence.encryption?.inTransit === true;
  },
  'audit-controls': (evidence) => {
    if (!evidence.auditLogs?.enabled) return false;
    // Check retention period (HIPAA requires 6 years)
    const retention = evidence.auditLogs.retention;
    if (retention) {
      const years = parseInt(retention);
      return years >= 6;
    }
    return false;
  }
};

/**
 * Create a HIPAA checklist instance
 * @returns {Object} Checklist instance
 */
export function createHipaaChecklist() {
  return {
    evaluate(evidence) {
      const results = [];
      const safeguards = getSafeguards();

      for (const safeguard of safeguards) {
        const result = checkSafeguard(safeguard.id, evidence);
        results.push(result);
      }

      return {
        results,
        compliant: results.every(r => r.implemented || r.safeguard?.type === 'addressable'),
        score: (results.filter(r => r.implemented).length / results.length) * 100
      };
    },

    getSafeguards() {
      return getSafeguards();
    },

    getCategories() {
      return ['administrative', 'physical', 'technical'];
    }
  };
}

/**
 * Get HIPAA safeguards
 * @param {Object} options - Filter options
 * @param {string} options.category - Filter by category
 * @returns {Array} Safeguards list
 */
export function getSafeguards(options = {}) {
  let safeguards = [...SAFEGUARDS];

  if (options.category) {
    safeguards = safeguards.filter(s => s.category === options.category);
  }

  return safeguards;
}

/**
 * Check implementation of a specific safeguard
 * @param {string} safeguardId - Safeguard identifier
 * @param {Object} evidence - Evidence for compliance check
 * @returns {Object} Check result
 */
export function checkSafeguard(safeguardId, evidence) {
  const safeguard = SAFEGUARDS.find(s => s.id === safeguardId);
  const checkFn = SAFEGUARD_CHECKS[safeguardId];

  let implemented = false;

  if (checkFn) {
    implemented = checkFn(evidence);
  }

  return {
    safeguardId,
    safeguardName: safeguard?.name || 'Unknown safeguard',
    category: safeguard?.category,
    type: safeguard?.type,
    implemented,
    safeguard
  };
}

/**
 * Generate Business Associate Agreement template
 * @param {Object} options - BAA options
 * @param {string} options.coveredEntity - Covered entity name
 * @param {string} options.businessAssociate - Business associate name
 * @returns {string} BAA template
 */
export function generateBaaTemplate(options = {}) {
  const coveredEntity = options.coveredEntity || '[COVERED ENTITY]';
  const businessAssociate = options.businessAssociate || '[BUSINESS ASSOCIATE]';
  const date = new Date().toISOString().split('T')[0];

  return `# Business Associate Agreement

**Effective Date:** ${date}

**Between:**
- Covered Entity: ${coveredEntity}
- Business Associate: ${businessAssociate}

## Recitals

This Business Associate Agreement ("BAA") is entered into by and between ${coveredEntity} ("Covered Entity") and ${businessAssociate} ("Business Associate") to ensure compliance with the Health Insurance Portability and Accountability Act of 1996 ("HIPAA").

## Article I: Definitions

Terms used herein shall have the same meaning as defined in 45 CFR Parts 160 and 164.

## Article II: Obligations of Business Associate

### 2.1 Permitted Uses and Disclosures

Business Associate agrees to not use or disclose PHI other than as permitted or required by this Agreement or as Required by Law.

The permitted uses and disclosures of PHI are limited to:
- Treatment, payment, and health care operations
- Functions, activities, or services specified in the underlying agreement
- As required by law

### 2.2 Safeguards

Business Associate agrees to use appropriate safeguards to prevent use or disclosure of PHI other than as provided for by this Agreement.

Required safeguards include:
- Administrative safeguards (policies and procedures)
- Physical safeguards (facility access controls)
- Technical safeguards (access controls, encryption)

### 2.3 Breach Notification

Business Associate agrees to report to Covered Entity any breach notification requirements under 45 CFR 164.410.

In the event of a breach:
- Notification within 60 days of discovery
- Description of PHI involved
- Recommended mitigation steps

## Article III: Termination

This Agreement may be terminated:
- Upon termination of the underlying agreement
- Upon breach of material terms
- As required by law

## Signatures

_________________________
${coveredEntity}
Covered Entity

_________________________
${businessAssociate}
Business Associate
`;
}

/**
 * Assess PHI handling in code patterns
 * @param {Array} codePatterns - Array of code patterns to analyze
 * @returns {Object} Assessment result
 */
export function assessPhiHandling(codePatterns) {
  const dataElements = new Set();
  const findings = [];
  const recommendations = [];

  for (const pattern of codePatterns) {
    const patternStr = pattern.pattern || '';

    // Check against known PHI patterns
    for (const [key, info] of Object.entries(PHI_PATTERNS)) {
      if (patternStr.toLowerCase().includes(key.toLowerCase())) {
        dataElements.add(info.element);
        findings.push({
          file: pattern.file,
          pattern: patternStr,
          element: info.element,
          description: info.description,
          sensitivity: info.sensitivity
        });
      }
    }
  }

  // Generate recommendations based on findings
  if (findings.some(f => f.sensitivity === 'high')) {
    recommendations.push('Implement encryption at rest for high-sensitivity PHI data');
    recommendations.push('Use encryption in transit (TLS 1.2+) for all PHI transmissions');
    recommendations.push('Implement access controls with role-based permissions');
  }

  if (dataElements.has('ssn')) {
    recommendations.push('Consider tokenization for SSN storage');
    recommendations.push('Implement audit logging for SSN access');
  }

  if (dataElements.has('medicalRecord')) {
    recommendations.push('Implement audit logging for medical record access');
    recommendations.push('Ensure minimum necessary access principle');
  }

  if (recommendations.length === 0 && findings.length > 0) {
    recommendations.push('Review data handling practices for HIPAA compliance');
    recommendations.push('Document PHI data flows');
  }

  return {
    phiIdentified: dataElements.size > 0,
    dataElements: Array.from(dataElements),
    findings,
    recommendations
  };
}
