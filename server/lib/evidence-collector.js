/**
 * Evidence Collector
 *
 * Collects and organizes compliance evidence for SOC 2 audits.
 * Supports audit logs, access snapshots, policy documents, and config snapshots.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import {
  generateAccessControlPolicy,
  generateDataProtectionPolicy,
  generateIncidentResponsePolicy,
  generateAuthPolicy,
  generateAcceptableUsePolicy,
} from './security-policy-generator.js';

import {
  exportAsEvidence as exportAccessEvidence,
  listUsers,
  listRoles,
} from './access-control-doc.js';

/**
 * SOC 2 Common Criteria Controls
 */
export const SOC2_CONTROLS = {
  // Security
  'CC1.1': {
    description: 'COSO Principle 1: The entity demonstrates a commitment to integrity and ethical values',
    category: 'Control Environment',
  },
  'CC1.2': {
    description: 'COSO Principle 2: The board of directors demonstrates independence from management and exercises oversight',
    category: 'Control Environment',
  },
  'CC1.3': {
    description: 'COSO Principle 3: Management establishes structures, reporting lines, and appropriate authorities',
    category: 'Control Environment',
  },
  'CC1.4': {
    description: 'COSO Principle 4: The entity demonstrates a commitment to attract, develop, and retain competent individuals',
    category: 'Control Environment',
  },
  'CC1.5': {
    description: 'COSO Principle 5: The entity holds individuals accountable for their internal control responsibilities',
    category: 'Control Environment',
  },
  'CC2.1': {
    description: 'COSO Principle 13: The entity obtains or generates and uses relevant, quality information',
    category: 'Communication and Information',
  },
  'CC2.2': {
    description: 'COSO Principle 14: The entity internally communicates information necessary to support functioning',
    category: 'Communication and Information',
  },
  'CC2.3': {
    description: 'COSO Principle 15: The entity communicates with external parties regarding internal control matters',
    category: 'Communication and Information',
  },
  'CC3.1': {
    description: 'COSO Principle 6: The entity specifies objectives to identify and assess risks',
    category: 'Risk Assessment',
  },
  'CC3.2': {
    description: 'COSO Principle 7: The entity identifies risks to achieving objectives and analyzes risks',
    category: 'Risk Assessment',
  },
  'CC3.3': {
    description: 'COSO Principle 8: The entity considers the potential for fraud in assessing risks',
    category: 'Risk Assessment',
  },
  'CC3.4': {
    description: 'COSO Principle 9: The entity identifies and assesses changes that could significantly impact internal control',
    category: 'Risk Assessment',
  },
  'CC4.1': {
    description: 'COSO Principle 16: The entity selects, develops, and performs ongoing evaluations',
    category: 'Monitoring Activities',
  },
  'CC4.2': {
    description: 'COSO Principle 17: The entity evaluates and communicates internal control deficiencies',
    category: 'Monitoring Activities',
  },
  'CC5.1': {
    description: 'COSO Principle 10: The entity selects and develops control activities that mitigate risks',
    category: 'Control Activities',
  },
  'CC5.2': {
    description: 'COSO Principle 11: The entity selects and develops general control activities over technology',
    category: 'Control Activities',
  },
  'CC5.3': {
    description: 'COSO Principle 12: The entity deploys control activities through policies and procedures',
    category: 'Control Activities',
  },
  'CC6.1': {
    description: 'The entity implements logical access security software, infrastructure, and architectures',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.2': {
    description: 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new users',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.3': {
    description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.4': {
    description: 'The entity restricts physical access to facilities and protected information assets',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.5': {
    description: 'The entity discontinues logical and physical protections over physical assets only after control transfer',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.6': {
    description: 'The entity implements logical access security measures to protect against threats from outside its system boundaries',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.7': {
    description: 'The entity restricts transmission, movement, and removal of information to authorized users and processes',
    category: 'Logical and Physical Access Controls',
  },
  'CC6.8': {
    description: 'The entity implements controls to prevent or detect and act upon introduction of unauthorized or malicious software',
    category: 'Logical and Physical Access Controls',
  },
  'CC7.1': {
    description: 'To meet its objectives, the entity uses detection and monitoring procedures to identify changes',
    category: 'System Operations',
  },
  'CC7.2': {
    description: 'The entity monitors system components and operation for anomalies and security events',
    category: 'System Operations',
  },
  'CC7.3': {
    description: 'The entity evaluates security events to determine whether they could or have resulted in a failure',
    category: 'System Operations',
  },
  'CC7.4': {
    description: 'The entity responds to identified security incidents by executing a defined incident response program',
    category: 'System Operations',
  },
  'CC7.5': {
    description: 'The entity identifies, develops, and implements activities to recover from identified security incidents',
    category: 'System Operations',
  },
  'CC8.1': {
    description: 'The entity authorizes, designs, develops, configures, documents, tests, approves changes to infrastructure',
    category: 'Change Management',
  },
  'CC9.1': {
    description: 'The entity identifies, selects, and develops risk mitigation activities for risks arising from business disruption',
    category: 'Risk Mitigation',
  },
  'CC9.2': {
    description: 'The entity assesses and manages risks associated with vendors and business partners',
    category: 'Risk Mitigation',
  },
};

/**
 * Sensitive field patterns for config sanitization
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /apikey/i,
  /api_key/i,
  /token/i,
  /credential/i,
  /private_key/i,
  /privatekey/i,
];

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName) {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Deep sanitize an object by redacting sensitive fields
 */
function sanitizeConfig(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeConfig);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeConfig(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Generate unique evidence ID
 */
function generateEvidenceId() {
  return `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Collect audit logs from log file
 * @param {string} logPath - Path to audit log file
 * @param {Object} options - Collection options
 * @returns {Promise<Object>} Evidence item with audit entries
 */
export async function collectAuditLogs(logPath, options = {}) {
  const { from, to, actions, userId } = options;

  try {
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    let entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filter by date range
    if (from) {
      const fromDate = new Date(from);
      entries = entries.filter(e => new Date(e.timestamp) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      entries = entries.filter(e => new Date(e.timestamp) <= toDate);
    }

    // Filter by action
    if (actions && Array.isArray(actions)) {
      entries = entries.filter(e => actions.includes(e.action));
    }

    // Filter by user
    if (userId) {
      entries = entries.filter(e => e.userId === userId);
    }

    return {
      type: 'audit_log',
      content: {
        entries,
      },
      collectedAt: new Date().toISOString(),
      collectedBy: 'system',
      metadata: {
        source: logPath,
        totalEntries: entries.length,
        period: {
          start: from || (entries.length > 0 ? entries[0].timestamp.split('T')[0] : null),
          end: to || (entries.length > 0 ? entries[entries.length - 1].timestamp.split('T')[0] : null),
        },
      },
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        type: 'audit_log',
        content: {
          entries: [],
          error: 'Audit log not found',
        },
        collectedAt: new Date().toISOString(),
        collectedBy: 'system',
        metadata: {
          source: logPath,
          totalEntries: 0,
        },
      };
    }
    throw error;
  }
}

/**
 * Collect access control snapshot
 * @param {Array} users - Array of user objects
 * @param {Object} options - Collection options
 * @returns {Promise<Object>} Evidence item with access snapshot
 */
export async function collectAccessSnapshot(users, options = {}) {
  const { config } = options;

  const accessEvidence = exportAccessEvidence(users, config || {}, {});

  return {
    type: 'access_snapshot',
    content: {
      users: listUsers(users),
      roles: listRoles(),
      accessMatrix: accessEvidence.accessMatrix || {},
      ssoMappings: config?.sso?.roleMappings ? accessEvidence.ssoMappings : undefined,
    },
    collectedAt: new Date().toISOString(),
    collectedBy: 'system',
    metadata: {
      userCount: users.length,
    },
  };
}

/**
 * Collect policy documents
 * @param {Object} options - Collection options
 * @returns {Promise<Object>} Evidence item with policy documents
 */
export async function collectPolicyDocuments(options = {}) {
  const { types, organization } = options;

  const policyGenerators = {
    accessControl: generateAccessControlPolicy,
    dataProtection: generateDataProtectionPolicy,
    incidentResponse: generateIncidentResponsePolicy,
    auth: generateAuthPolicy,
    acceptableUse: generateAcceptableUsePolicy,
  };

  const policyTypes = types || Object.keys(policyGenerators);
  const policies = [];

  for (const type of policyTypes) {
    const generator = policyGenerators[type];
    if (generator) {
      const policyOptions = organization ? { organization } : {};
      policies.push({
        type,
        document: generator(policyOptions),
      });
    }
  }

  return {
    type: 'policy',
    content: {
      policies,
    },
    collectedAt: new Date().toISOString(),
    collectedBy: 'system',
    metadata: {
      organization: organization || 'Organization Name',
      policyCount: policies.length,
    },
  };
}

/**
 * Collect configuration snapshot
 * @param {string} projectDir - Project directory path
 * @returns {Promise<Object>} Evidence item with config snapshot
 */
export async function collectConfigSnapshot(projectDir) {
  const tlcJsonPath = path.join(projectDir, '.tlc.json');

  try {
    const content = await fs.readFile(tlcJsonPath, 'utf8');
    const config = JSON.parse(content);
    const stats = await fs.stat(tlcJsonPath);

    const sanitizedConfig = sanitizeConfig(config);

    return {
      type: 'config',
      content: sanitizedConfig,
      collectedAt: new Date().toISOString(),
      collectedBy: 'system',
      metadata: {
        path: tlcJsonPath,
        lastModified: stats.mtime.toISOString(),
      },
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        type: 'config',
        content: {
          error: 'Configuration not found',
        },
        collectedAt: new Date().toISOString(),
        collectedBy: 'system',
        metadata: {
          path: tlcJsonPath,
        },
      };
    }
    throw error;
  }
}

/**
 * Add timestamp to evidence
 * @param {Object} evidence - Evidence item
 * @param {Object} options - Options
 * @returns {Object} Evidence with timestamp
 */
export function timestampEvidence(evidence, options = {}) {
  const { collectedBy = 'system' } = options;

  return {
    ...evidence,
    collectedAt: new Date().toISOString(),
    collectedBy,
  };
}

/**
 * Generate SHA-256 hash of evidence content
 * @param {Object} evidence - Evidence item
 * @returns {Object} Evidence with hash
 */
export function hashEvidence(evidence) {
  // Handle missing content - hash entire evidence if no content property
  const contentToHash = evidence.content !== undefined ? evidence.content : evidence;
  const contentString = JSON.stringify(contentToHash);
  const hash = crypto.createHash('sha256').update(contentString).digest('hex');

  return {
    ...evidence,
    hash: `sha256:${hash}`,
  };
}

/**
 * Verify evidence hash integrity
 * @param {Object} evidence - Evidence item with hash
 * @returns {Object} Verification result
 */
export function verifyEvidence(evidence) {
  if (!evidence.hash) {
    return {
      valid: false,
      reason: 'No hash present',
    };
  }

  const contentString = JSON.stringify(evidence.content);
  const computedHash = `sha256:${crypto.createHash('sha256').update(contentString).digest('hex')}`;

  if (computedHash === evidence.hash) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: 'Hash mismatch',
    storedHash: evidence.hash,
    computedHash,
  };
}

/**
 * Package evidence items into a ZIP archive
 * @param {Array} items - Array of evidence items
 * @param {Object} options - Package options
 * @returns {Promise<Object>} Package info with path and manifest
 */
export async function packageEvidence(items, options = {}) {
  const { outputDir, name } = options;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const packageName = name || `evidence-${timestamp}-${randomSuffix}`;
  const packagePath = path.join(outputDir, `${packageName}.zip`);

  // Create manifest
  const manifest = {
    packageId: generateEvidenceId(),
    createdAt: new Date().toISOString(),
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      collectedAt: item.collectedAt,
      hash: item.hash,
      controls: item.controls,
    })),
    totalItems: items.length,
  };

  // Create a simple zip-like structure (for testing, we'll create a JSON file)
  // In production, this would use archiver or similar
  const packageContent = {
    manifest,
    items,
  };

  await fs.writeFile(packagePath, JSON.stringify(packageContent, null, 2));

  // Calculate package hash
  const packageHash = `sha256:${crypto.createHash('sha256').update(JSON.stringify(packageContent)).digest('hex')}`;

  return {
    path: packagePath,
    manifest,
    hash: packageHash,
    size: JSON.stringify(packageContent).length,
  };
}

/**
 * Get inventory of evidence items
 * @param {Object} collector - Evidence collector instance
 * @param {Object} filters - Filter options
 * @returns {Array} Array of evidence metadata
 */
export function getEvidenceInventory(collector, filters = {}) {
  const { type, control } = filters;

  let items = collector.getAll();

  if (type) {
    items = items.filter(item => item.type === type);
  }

  if (control) {
    items = items.filter(item => item.controls && item.controls.includes(control));
  }

  return items.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    collectedAt: item.collectedAt,
    hash: item.hash,
    controls: item.controls,
  }));
}

/**
 * Link evidence to SOC 2 control(s)
 * @param {Object} evidence - Evidence item
 * @param {string|Array} controls - Control ID(s) to link
 * @returns {Object} Evidence with linked controls
 */
export function linkEvidenceToControl(evidence, controls) {
  const controlIds = Array.isArray(controls) ? controls : [controls];

  // Validate control IDs
  for (const controlId of controlIds) {
    if (!SOC2_CONTROLS[controlId]) {
      throw new Error(`Invalid SOC 2 control: ${controlId}`);
    }
  }

  const existingControls = evidence.controls || [];
  const newControls = [...new Set([...existingControls, ...controlIds])];

  return {
    ...evidence,
    controls: newControls,
  };
}

/**
 * Create an evidence collector instance
 * @returns {Object} Evidence collector
 */
export function createEvidenceCollector() {
  const items = new Map();

  return {
    /**
     * Add evidence item
     * @param {Object} item - Evidence item to add
     * @returns {Object} Added evidence with id, timestamp, and hash
     */
    add(item) {
      const id = item.id || generateEvidenceId();
      const timestamped = item.collectedAt ? item : timestampEvidence(item);
      const hashed = item.hash ? { ...timestamped, id } : hashEvidence({ ...timestamped, id });

      items.set(id, hashed);
      return hashed;
    },

    /**
     * Get evidence item by ID
     * @param {string} id - Evidence ID
     * @returns {Object|null} Evidence item or null
     */
    get(id) {
      return items.get(id) || null;
    },

    /**
     * Get all evidence items
     * @returns {Array} Array of all evidence items
     */
    getAll() {
      return Array.from(items.values());
    },

    /**
     * Remove evidence item by ID
     * @param {string} id - Evidence ID
     */
    remove(id) {
      items.delete(id);
    },

    /**
     * Clear all evidence items
     */
    clear() {
      items.clear();
    },
  };
}
