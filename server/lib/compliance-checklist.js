/**
 * SOC 2 Type II Compliance Checklist
 *
 * Tracks control implementation status, links evidence,
 * calculates compliance percentage, and generates remediation tasks.
 */

/**
 * SOC 2 Trust Service Categories
 */
export const TSC_CATEGORIES = {
  SECURITY: 'Security',
  AVAILABILITY: 'Availability',
  PROCESSING_INTEGRITY: 'Processing Integrity',
  CONFIDENTIALITY: 'Confidentiality',
  PRIVACY: 'Privacy',
};

/**
 * Valid control statuses
 */
const VALID_STATUSES = ['implemented', 'not_implemented', 'partial', 'not_applicable'];

/**
 * Default SOC 2 Common Criteria controls
 */
const DEFAULT_CONTROLS = [
  // CC1 - Control Environment (Security)
  {
    id: 'CC1.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Control Environment',
    description:
      'The entity demonstrates commitment to integrity and ethical values.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC1.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Board Oversight',
    description:
      'The board of directors demonstrates independence from management and exercises oversight.',
    gapSeverity: 'high',
    estimatedEffort: '1 week',
  },
  {
    id: 'CC1.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Management Structure',
    description:
      'Management establishes structures, reporting lines, and appropriate authorities.',
    gapSeverity: 'medium',
    estimatedEffort: '1 week',
  },
  {
    id: 'CC1.4',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Competence Commitment',
    description:
      'The entity demonstrates commitment to attract, develop, and retain competent individuals.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC1.5',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Accountability',
    description:
      'The entity holds individuals accountable for their internal control responsibilities.',
    gapSeverity: 'high',
    estimatedEffort: '1 week',
  },
  // CC2 - Communication and Information (Security)
  {
    id: 'CC2.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Information Quality',
    description:
      'The entity obtains or generates relevant, quality information to support internal control.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC2.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Internal Communication',
    description:
      'The entity internally communicates information necessary to support internal control.',
    gapSeverity: 'medium',
    estimatedEffort: '1 week',
  },
  {
    id: 'CC2.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'External Communication',
    description:
      'The entity communicates with external parties regarding internal control matters.',
    gapSeverity: 'low',
    estimatedEffort: '1 week',
  },
  // CC3 - Risk Assessment (Security)
  {
    id: 'CC3.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Objective Specification',
    description:
      'The entity specifies objectives with sufficient clarity to enable risk identification.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC3.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Risk Identification',
    description:
      'The entity identifies risks to the achievement of objectives and analyzes risks.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC3.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Fraud Consideration',
    description: 'The entity considers the potential for fraud in assessing risks.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC3.4',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Change Management',
    description:
      'The entity identifies and assesses changes that could significantly impact internal control.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  // CC4 - Monitoring Activities (Security)
  {
    id: 'CC4.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Ongoing Monitoring',
    description:
      'The entity selects, develops, and performs ongoing evaluations of internal controls.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC4.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Deficiency Remediation',
    description:
      'The entity evaluates and communicates internal control deficiencies.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  // CC5 - Control Activities (Security)
  {
    id: 'CC5.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Control Selection',
    description:
      'The entity selects and develops control activities that mitigate risks.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC5.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Technology Controls',
    description:
      'The entity selects and develops general control activities over technology.',
    gapSeverity: 'high',
    estimatedEffort: '4 weeks',
  },
  {
    id: 'CC5.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Policy Implementation',
    description:
      'The entity deploys control activities through policies and procedures.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  // CC6 - Logical and Physical Access (Security)
  {
    id: 'CC6.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Access Control',
    description:
      'The entity implements logical access security software and infrastructure.',
    gapSeverity: 'high',
    estimatedEffort: '4 weeks',
  },
  {
    id: 'CC6.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'User Registration',
    description:
      'Prior to issuing credentials, the entity registers and authorizes new users.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'CC6.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Credential Management',
    description:
      'The entity authorizes, modifies, or removes access based on roles.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  // CC7 - System Operations (Security)
  {
    id: 'CC7.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Vulnerability Management',
    description:
      'The entity detects and monitors security vulnerabilities in system components.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC7.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Anomaly Detection',
    description:
      'The entity monitors system components for anomalies and security events.',
    gapSeverity: 'high',
    estimatedEffort: '4 weeks',
  },
  {
    id: 'CC7.3',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Incident Response',
    description:
      'The entity evaluates security events and determines if they are incidents.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC7.4',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Incident Recovery',
    description:
      'The entity responds to identified security incidents by executing procedures.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  // CC8 - Change Management (Security)
  {
    id: 'CC8.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Infrastructure Changes',
    description:
      'The entity authorizes, designs, and implements changes to infrastructure.',
    gapSeverity: 'high',
    estimatedEffort: '4 weeks',
  },
  // CC9 - Risk Mitigation (Security)
  {
    id: 'CC9.1',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Risk Mitigation',
    description: 'The entity identifies, selects, and develops risk mitigation activities.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'CC9.2',
    category: TSC_CATEGORIES.SECURITY,
    name: 'Vendor Management',
    description:
      'The entity assesses and manages risks associated with vendors and business partners.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  // A1 - Availability
  {
    id: 'A1.1',
    category: TSC_CATEGORIES.AVAILABILITY,
    name: 'Capacity Planning',
    description:
      'The entity maintains, monitors, and evaluates current capacity requirements.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'A1.2',
    category: TSC_CATEGORIES.AVAILABILITY,
    name: 'Environmental Protections',
    description:
      'The entity authorizes, designs, and manages environmental protections.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'A1.3',
    category: TSC_CATEGORIES.AVAILABILITY,
    name: 'Recovery Procedures',
    description:
      'The entity tests recovery plan procedures supporting system recovery.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  // PI1 - Processing Integrity
  {
    id: 'PI1.1',
    category: TSC_CATEGORIES.PROCESSING_INTEGRITY,
    name: 'Processing Accuracy',
    description:
      'The entity obtains or generates information that is accurate and complete.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'PI1.2',
    category: TSC_CATEGORIES.PROCESSING_INTEGRITY,
    name: 'Input Validation',
    description:
      'The entity implements policies for accurate and complete system input.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'PI1.3',
    category: TSC_CATEGORIES.PROCESSING_INTEGRITY,
    name: 'Processing Completeness',
    description: 'The entity implements procedures to ensure processing is complete.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  // C1 - Confidentiality
  {
    id: 'C1.1',
    category: TSC_CATEGORIES.CONFIDENTIALITY,
    name: 'Information Classification',
    description:
      'The entity identifies and maintains confidential information classifications.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'C1.2',
    category: TSC_CATEGORIES.CONFIDENTIALITY,
    name: 'Confidential Data Protection',
    description: 'The entity disposes of confidential information per retention policies.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  // P1-P8 - Privacy
  {
    id: 'P1.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Privacy Notice',
    description:
      'The entity provides notice about its privacy practices to data subjects.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'P2.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Consent Management',
    description:
      'The entity obtains consent for collection and use of personal information.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
  {
    id: 'P3.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Data Minimization',
    description:
      'The entity collects only the minimum personal information for its purposes.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'P4.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Use Limitation',
    description:
      'The entity limits use of personal information to disclosed purposes.',
    gapSeverity: 'high',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'P5.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Data Subject Rights',
    description:
      'The entity provides mechanisms for data subjects to access and correct data.',
    gapSeverity: 'high',
    estimatedEffort: '4 weeks',
  },
  {
    id: 'P6.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Third Party Disclosure',
    description:
      'The entity discloses personal information to third parties with consent.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'P7.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Data Quality',
    description:
      'The entity maintains accurate, complete, and relevant personal information.',
    gapSeverity: 'medium',
    estimatedEffort: '2 weeks',
  },
  {
    id: 'P8.1',
    category: TSC_CATEGORIES.PRIVACY,
    name: 'Privacy Incident Management',
    description:
      'The entity implements processes for handling privacy incidents and breaches.',
    gapSeverity: 'high',
    estimatedEffort: '3 weeks',
  },
];

/**
 * Create a new compliance checklist instance
 * @returns {Object} Checklist instance
 */
export function createComplianceChecklist() {
  const controls = DEFAULT_CONTROLS.map((control) => ({
    ...control,
    status: 'not_implemented',
    evidence: [],
    implementationDate: null,
    notes: '',
    history: [
      {
        status: 'not_implemented',
        timestamp: new Date().toISOString(),
        notes: 'Initial state',
      },
    ],
  }));

  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    controls,
  };
}

/**
 * Get all SOC 2 checklist controls
 * @param {Object} checklist - Checklist instance
 * @returns {Array} All controls
 */
export function getSOC2Checklist(checklist) {
  return checklist.controls.map((control) => ({
    id: control.id,
    category: control.category,
    name: control.name,
    description: control.description,
    status: control.status,
    evidence: [...control.evidence],
    implementationDate: control.implementationDate,
    notes: control.notes,
    gapSeverity: control.gapSeverity,
    estimatedEffort: control.estimatedEffort,
    history: [...control.history],
  }));
}

/**
 * Get status of a specific control
 * @param {Object} checklist - Checklist instance
 * @param {string} controlId - Control ID
 * @returns {Object|null} Control status or null if not found
 */
export function getControlStatus(checklist, controlId) {
  const control = checklist.controls.find((c) => c.id === controlId);
  if (!control) {
    return null;
  }
  return {
    id: control.id,
    category: control.category,
    name: control.name,
    description: control.description,
    status: control.status,
    evidence: [...control.evidence],
    implementationDate: control.implementationDate,
    notes: control.notes,
    gapSeverity: control.gapSeverity,
    estimatedEffort: control.estimatedEffort,
    history: [...control.history],
  };
}

/**
 * Link evidence to a control
 * @param {Object} checklist - Checklist instance
 * @param {string} controlId - Control ID
 * @param {string} evidenceId - Evidence identifier
 * @param {Object} options - Optional settings
 * @returns {Object} Result with success status
 */
export function linkControlToEvidence(checklist, controlId, evidenceId, options = {}) {
  const control = checklist.controls.find((c) => c.id === controlId);
  if (!control) {
    return { success: false, error: `Control ${controlId} not found` };
  }

  if (!control.evidence.includes(evidenceId)) {
    control.evidence.push(evidenceId);
  }

  if (options.notes) {
    control.notes = options.notes;
  }

  return { success: true };
}

/**
 * Calculate overall compliance percentage
 * @param {Object} checklist - Checklist instance
 * @returns {Object} Compliance metrics
 */
export function getCompliancePercentage(checklist) {
  const applicableControls = checklist.controls.filter(
    (c) => c.status !== 'not_applicable'
  );

  if (applicableControls.length === 0) {
    return {
      percentage: 100,
      implemented: 0,
      partial: 0,
      notImplemented: 0,
      notApplicable: checklist.controls.length,
      total: checklist.controls.length,
      byCategory: {},
    };
  }

  let score = 0;
  applicableControls.forEach((control) => {
    if (control.status === 'implemented') {
      score += 1;
    } else if (control.status === 'partial') {
      score += 0.5;
    }
  });

  const percentage = (score / applicableControls.length) * 100;

  // Calculate by category
  const byCategory = {};
  Object.values(TSC_CATEGORIES).forEach((category) => {
    const categoryControls = checklist.controls.filter(
      (c) => c.category === category && c.status !== 'not_applicable'
    );
    if (categoryControls.length > 0) {
      let categoryScore = 0;
      categoryControls.forEach((control) => {
        if (control.status === 'implemented') {
          categoryScore += 1;
        } else if (control.status === 'partial') {
          categoryScore += 0.5;
        }
      });
      byCategory[category] = {
        percentage: (categoryScore / categoryControls.length) * 100,
        implemented: categoryControls.filter((c) => c.status === 'implemented').length,
        total: categoryControls.length,
      };
    }
  });

  return {
    percentage,
    implemented: checklist.controls.filter((c) => c.status === 'implemented').length,
    partial: checklist.controls.filter((c) => c.status === 'partial').length,
    notImplemented: checklist.controls.filter((c) => c.status === 'not_implemented')
      .length,
    notApplicable: checklist.controls.filter((c) => c.status === 'not_applicable').length,
    total: checklist.controls.length,
    byCategory,
  };
}

/**
 * Get compliance gaps (unimplemented or partial controls)
 * @param {Object} checklist - Checklist instance
 * @param {Object} options - Filter options
 * @returns {Array} Gap controls
 */
export function getComplianceGaps(checklist, options = {}) {
  let gaps = checklist.controls.filter(
    (c) => c.status === 'not_implemented' || c.status === 'partial'
  );

  if (options.category) {
    gaps = gaps.filter((c) => c.category === options.category);
  }

  return gaps.map((control) => ({
    id: control.id,
    category: control.category,
    name: control.name,
    description: control.description,
    status: control.status,
    gapSeverity: control.gapSeverity,
    estimatedEffort: control.estimatedEffort,
    evidence: [...control.evidence],
  }));
}

/**
 * Generate remediation plan from gaps
 * @param {Object} checklist - Checklist instance
 * @param {Object} options - Plan options
 * @returns {Object} Remediation plan with tasks
 */
export function generateRemediationPlan(checklist, options = {}) {
  const gaps = getComplianceGaps(checklist);

  const severityOrder = { high: 0, medium: 1, low: 2 };

  const tasks = gaps
    .map((gap) => ({
      controlId: gap.id,
      name: gap.name,
      priority: gap.gapSeverity,
      description: `Implement control ${gap.id}: ${gap.name}. ${gap.description}`,
      estimatedEffort: gap.estimatedEffort,
      category: gap.category,
      currentStatus: gap.status,
    }))
    .sort((a, b) => severityOrder[a.priority] - severityOrder[b.priority]);

  // Calculate total effort (rough approximation)
  const effortMap = {
    '1 week': 40,
    '2 weeks': 80,
    '3 weeks': 120,
    '4 weeks': 160,
  };
  const totalHours = tasks.reduce((sum, task) => {
    return sum + (effortMap[task.estimatedEffort] || 40);
  }, 0);

  const result = {
    tasks,
    totalEstimatedEffort: `${Math.round(totalHours / 40)} weeks`,
    totalTasks: tasks.length,
    generatedAt: new Date().toISOString(),
  };

  if (options.groupByCategory) {
    result.byCategory = {};
    Object.values(TSC_CATEGORIES).forEach((category) => {
      const categoryTasks = tasks.filter((t) => t.category === category);
      if (categoryTasks.length > 0) {
        result.byCategory[category] = categoryTasks;
      }
    });
  }

  return result;
}

/**
 * Update control implementation status
 * @param {Object} checklist - Checklist instance
 * @param {string} controlId - Control ID
 * @param {string} status - New status
 * @param {Object} options - Additional options (notes)
 * @returns {Object} Result with success status
 */
export function updateControlStatus(checklist, controlId, status, options = {}) {
  if (!VALID_STATUSES.includes(status)) {
    return {
      success: false,
      error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
    };
  }

  const control = checklist.controls.find((c) => c.id === controlId);
  if (!control) {
    return { success: false, error: `Control ${controlId} not found` };
  }

  const previousStatus = control.status;
  control.status = status;

  if (status === 'implemented' && !control.implementationDate) {
    control.implementationDate = new Date().toISOString().split('T')[0];
  }

  if (options.notes) {
    control.notes = options.notes;
  }

  control.history.push({
    status,
    timestamp: new Date().toISOString(),
    previousStatus,
    notes: options.notes || '',
  });

  return { success: true };
}

/**
 * Get controls grouped by category
 * @param {Object} checklist - Checklist instance
 * @param {string} filterCategory - Optional single category filter
 * @returns {Object} Controls grouped by category
 */
export function getControlsByCategory(checklist, filterCategory = null) {
  const result = {};

  Object.values(TSC_CATEGORIES).forEach((category) => {
    if (filterCategory && filterCategory !== category) {
      return;
    }
    const categoryControls = checklist.controls
      .filter((c) => c.category === category)
      .map((control) => ({
        id: control.id,
        category: control.category,
        name: control.name,
        description: control.description,
        status: control.status,
        evidence: [...control.evidence],
        implementationDate: control.implementationDate,
        notes: control.notes,
        gapSeverity: control.gapSeverity,
        estimatedEffort: control.estimatedEffort,
      }));

    if (categoryControls.length > 0) {
      result[category] = categoryControls;
    }
  });

  return result;
}

/**
 * Export checklist to audit-ready format
 * @param {Object} checklist - Checklist instance
 * @param {Object} options - Export options
 * @returns {string} Exported checklist
 */
export function exportChecklist(checklist, options = {}) {
  const format = options.format || 'json';
  const compliance = getCompliancePercentage(checklist);

  const exportData = {
    version: checklist.version,
    exportDate: new Date().toISOString(),
    summary: {
      totalControls: checklist.controls.length,
      implemented: compliance.implemented,
      partial: compliance.partial,
      notImplemented: compliance.notImplemented,
      notApplicable: compliance.notApplicable,
      compliancePercentage: compliance.percentage,
    },
    controls: checklist.controls.map((control) => ({
      id: control.id,
      category: control.category,
      name: control.name,
      description: control.description,
      status: control.status,
      evidence: [...control.evidence],
      implementationDate: control.implementationDate,
      notes: control.notes,
      history: [...control.history],
    })),
  };

  if (format === 'csv') {
    const headers = [
      'id',
      'category',
      'name',
      'description',
      'status',
      'evidence',
      'implementationDate',
      'notes',
    ];
    const rows = [headers.join(',')];

    checklist.controls.forEach((control) => {
      const row = [
        control.id,
        `"${control.category}"`,
        `"${control.name}"`,
        `"${control.description.replace(/"/g, '""')}"`,
        control.status,
        `"${control.evidence.join('; ')}"`,
        control.implementationDate || '',
        `"${(control.notes || '').replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import checklist from saved progress
 * @param {Object} checklist - Target checklist instance
 * @param {string} data - Exported data string
 * @param {Object} options - Import options
 * @returns {Object} Result with success status
 */
export function importChecklist(checklist, data, options = {}) {
  let importData;

  try {
    importData = JSON.parse(data);
  } catch {
    return { success: false, error: 'Invalid JSON format' };
  }

  if (!importData.controls || !Array.isArray(importData.controls)) {
    return { success: false, error: 'Invalid checklist format: missing controls array' };
  }

  // Handle version differences (for future compatibility)
  if (importData.version && importData.version !== checklist.version) {
    // Log version mismatch but continue with best effort
  }

  const merge = options.merge || false;

  importData.controls.forEach((importedControl) => {
    const existingControl = checklist.controls.find((c) => c.id === importedControl.id);
    if (existingControl) {
      if (merge && existingControl.status === 'implemented') {
        // Keep existing implemented status when merging
        return;
      }

      existingControl.status = importedControl.status || 'not_implemented';
      existingControl.evidence = importedControl.evidence || [];
      existingControl.implementationDate = importedControl.implementationDate || null;
      existingControl.notes = importedControl.notes || '';

      if (importedControl.history && Array.isArray(importedControl.history)) {
        existingControl.history = [...importedControl.history];
      }
    }
  });

  return { success: true, importedControls: importData.controls.length };
}
