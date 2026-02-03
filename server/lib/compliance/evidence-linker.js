/**
 * Evidence Linker - Evidence linking to controls
 */

import { randomUUID } from 'crypto';

// Supported evidence types
const SUPPORTED_TYPES = ['code', 'config', 'test', 'document', 'screenshot', 'log'];

// Compliance annotation patterns
const ANNOTATION_PATTERNS = [
  { regex: /@compliance\s+([^\s]+)/i, group: 1 },
  { regex: /@control\s+([^\s]+)/i, group: 1 },
  { regex: /@evidence\s+(.+)/i, group: 1, isDescription: true }
];

// Implicit evidence patterns
const IMPLICIT_PATTERNS = [
  { pattern: /crypto\.create(?:Cipher|Decipher|Hash)/i, theme: 'encryption' },
  { pattern: /aes-\d+-[a-z]+/i, theme: 'encryption' },
  { pattern: /createCipheriv/i, theme: 'encryption' },
  { pattern: /bcrypt|argon2|scrypt/i, theme: 'encryption' },
  { pattern: /jwt|jsonwebtoken|oauth/i, theme: 'authentication' },
  { pattern: /authenticate|login|session/i, theme: 'authentication' },
  { pattern: /authorize|permission|role/i, theme: 'access-control' },
  { pattern: /audit|log.*event/i, theme: 'logging' },
  { pattern: /firewall|iptables|security.?group/i, theme: 'network-security' }
];

// Evidence storage
const linkedEvidence = new Map();

/**
 * Create an evidence linker instance
 */
export function createEvidenceLinker() {
  return {
    link: (evidence) => linkEvidence(evidence),
    scan: (options) => scanCodebase(options),
    getSupportedTypes: () => [...SUPPORTED_TYPES],
    getLinkedEvidence: () => [...linkedEvidence.values()]
  };
}

/**
 * Link evidence to a control
 */
export function linkEvidence(evidence) {
  const result = {
    linked: false,
    evidenceId: null,
    errors: []
  };

  // Validate required fields
  if (!evidence.controlId) {
    result.errors.push('controlId is required');
  }

  if (!evidence.type && !evidence.file) {
    result.errors.push('type or file is required');
  }

  if (evidence.type && !SUPPORTED_TYPES.includes(evidence.type)) {
    result.errors.push(`Invalid evidence type: ${evidence.type}. Supported: ${SUPPORTED_TYPES.join(', ')}`);
  }

  // If there are validation errors, return early
  if (result.errors.length > 0) {
    return result;
  }

  // Generate evidence ID and store
  const evidenceId = randomUUID();
  const evidenceRecord = {
    id: evidenceId,
    controlId: evidence.controlId,
    type: evidence.type || 'code',
    file: evidence.file,
    lines: evidence.lines,
    description: evidence.description,
    linkedAt: new Date().toISOString()
  };

  linkedEvidence.set(evidenceId, evidenceRecord);

  result.linked = true;
  result.evidenceId = evidenceId;

  return result;
}

/**
 * Scan codebase for compliance evidence
 */
export async function scanCodebase(options = {}) {
  const { glob, readFile, detectPatterns = false } = options;
  const results = [];

  if (!glob || !readFile) {
    return results;
  }

  try {
    const files = await glob('**/*.{js,ts,jsx,tsx,py,go,java}');

    for (const file of files) {
      try {
        const content = await readFile(file);
        const lines = content.split('\n');

        // Scan for explicit annotations
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          for (const annotationPattern of ANNOTATION_PATTERNS) {
            const match = line.match(annotationPattern.regex);
            if (match) {
              if (annotationPattern.isDescription) {
                // @evidence annotation - attach to previous result
                if (results.length > 0) {
                  results[results.length - 1].description = match[annotationPattern.group];
                }
              } else {
                results.push({
                  file,
                  line: i + 1,
                  controlId: match[annotationPattern.group],
                  type: 'annotation'
                });
              }
            }
          }
        }

        // Scan for implicit patterns if requested
        if (detectPatterns) {
          for (const implicitPattern of IMPLICIT_PATTERNS) {
            if (implicitPattern.pattern.test(content)) {
              results.push({
                file,
                pattern: implicitPattern.theme,
                type: 'implicit',
                confidence: 0.7
              });
            }
          }
        }
      } catch (err) {
        // Skip unreadable files
      }
    }
  } catch (err) {
    // Return empty results on glob error
  }

  return results;
}

/**
 * Generate an evidence report for a framework
 */
export function generateEvidenceReport(evidence, options = {}) {
  const { framework, showGaps = false } = options;

  let report = `# Evidence Report\n\n`;

  if (framework) {
    const frameworkNames = {
      'pci-dss': 'PCI DSS',
      'iso27001': 'ISO 27001',
      'hipaa': 'HIPAA'
    };
    report += `**Framework:** ${frameworkNames[framework] || framework}\n\n`;
  }

  report += `## Linked Evidence\n\n`;

  if (evidence.length === 0) {
    report += `No evidence linked.\n\n`;
  } else {
    report += `| Control | Type | File | Description |\n`;
    report += `|---------|------|------|-------------|\n`;

    for (const e of evidence) {
      report += `| ${e.controlId} | ${e.type || '-'} | ${e.file || '-'} | ${e.description || '-'} |\n`;
    }
    report += '\n';
  }

  if (showGaps) {
    report += `## Missing Evidence\n\n`;
    report += `The following controls are missing evidence documentation:\n\n`;

    // Get framework controls that don't have evidence
    const coveredControls = new Set(evidence.map(e => e.controlId));
    const frameworkControls = getFrameworkControls(framework);
    const missingControls = frameworkControls.filter(c => !coveredControls.has(c));

    if (missingControls.length > 0) {
      for (const control of missingControls) {
        report += `- ${control}\n`;
      }
    } else {
      report += `All controls have evidence linked.\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Get controls for a framework
 */
function getFrameworkControls(framework) {
  const controls = {
    'pci-dss': [
      'req-1.1', 'req-1.2', 'req-1.3',
      'req-2.1', 'req-2.2',
      'req-3.1', 'req-3.2', 'req-3.4',
      'req-4.1',
      'req-5.1', 'req-5.2',
      'req-6.1', 'req-6.2',
      'req-7.1', 'req-7.2',
      'req-8.1', 'req-8.2',
      'req-9.1',
      'req-10.1', 'req-10.2', 'req-10.3',
      'req-11.1', 'req-11.2',
      'req-12.1'
    ],
    'iso27001': [
      'A.5.1', 'A.5.15', 'A.5.16', 'A.5.17',
      'A.6.1', 'A.6.2',
      'A.7.1', 'A.7.2',
      'A.8.1', 'A.8.15', 'A.8.24',
      'A.9.1',
      'A.10.1',
      'A.11.1',
      'A.12.1',
      'A.13.1', 'A.13.2'
    ],
    'hipaa': [
      '164.312(a)(1)', '164.312(a)(2)(iv)',
      '164.312(b)',
      '164.312(c)(1)',
      '164.312(d)',
      '164.312(e)(1)', '164.312(e)(2)(ii)'
    ]
  };

  return controls[framework] || [];
}

/**
 * Validate evidence
 * Returns a Promise if checkExists is used with an async exists function,
 * otherwise returns the result synchronously
 */
export function validateEvidence(evidence, options = {}) {
  const result = {
    valid: true,
    issues: []
  };

  // Check freshness
  if (options.maxAge && evidence.lastModified) {
    const age = (Date.now() - new Date(evidence.lastModified).getTime()) / (24 * 60 * 60 * 1000);
    if (age > options.maxAge) {
      result.valid = false;
      result.issues.push('stale');
    }
  }

  // Check file exists - this is async
  if (options.checkExists && evidence.file) {
    const existsCheck = options.exists ? options.exists(evidence.file) : Promise.resolve(true);
    return Promise.resolve(existsCheck).then(exists => {
      if (!exists) {
        result.valid = false;
        result.issues.push('file-not-found');
      }
      return result;
    });
  }

  return result;
}

export default {
  createEvidenceLinker,
  linkEvidence,
  scanCodebase,
  generateEvidenceReport,
  validateEvidence
};
