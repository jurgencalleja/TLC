/**
 * Security Policy Generator
 *
 * Generate security policy documents from configuration.
 * Supports multiple policy types and export formats.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Default policy configuration
 */
export const DEFAULT_POLICY_CONFIG = {
  organization: 'Organization Name',
  version: '1.0',
  effectiveDate: new Date().toISOString().split('T')[0],
  reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  approvedBy: 'Security Team',
};

/**
 * Policy templates with standard sections
 */
export const POLICY_TEMPLATES = {
  accessControl: {
    title: 'Access Control Policy',
    sections: [
      {
        heading: 'Purpose',
        content: 'This policy establishes the requirements for controlling access to organizational information systems, applications, and data. It ensures that access is granted based on business needs and the principle of least privilege.',
      },
      {
        heading: 'Scope',
        content: 'This policy applies to all employees, contractors, consultants, temporary workers, and other personnel who access organizational systems and data.',
      },
      {
        heading: 'Policy',
        content: `Access control shall be implemented using Role-Based Access Control (RBAC) principles:

- Access permissions shall be assigned based on job roles and responsibilities
- Users shall be granted minimum necessary access to perform their duties
- Access rights shall be reviewed quarterly and upon role changes
- Privileged access shall require additional authorization and monitoring
- Shared accounts are prohibited except where technically unavoidable`,
      },
      {
        heading: 'Procedures',
        content: `1. Access Request Process:
   - Submit access request through approved ticketing system
   - Manager approval required for all access requests
   - Security team reviews and approves based on role requirements

2. Access Provisioning:
   - Identity verified before account creation
   - Accounts provisioned within 48 hours of approval
   - Users notified of granted permissions

3. Access Review:
   - Quarterly access reviews by system owners
   - Annual comprehensive access audit
   - Immediate revocation upon termination or role change`,
      },
      {
        heading: 'Enforcement',
        content: 'Violations of this policy may result in disciplinary action, up to and including termination of employment or contract, and may result in legal action where applicable.',
      },
    ],
  },

  dataProtection: {
    title: 'Data Protection Policy',
    sections: [
      {
        heading: 'Purpose',
        content: 'This policy establishes requirements for protecting organizational data throughout its lifecycle, ensuring confidentiality, integrity, and availability.',
      },
      {
        heading: 'Scope',
        content: 'This policy applies to all data created, received, maintained, or transmitted by the organization, regardless of format or storage location.',
      },
      {
        heading: 'Data Classification',
        content: `Data shall be classified into the following categories:

- **Public**: Information intended for public disclosure
- **Internal**: Information for internal use only
- **Confidential**: Sensitive business information requiring protection
- **Restricted**: Highly sensitive data requiring strict access controls

Classification determines handling, storage, and transmission requirements.`,
      },
      {
        heading: 'Policy',
        content: `Data protection requirements:

1. Encryption:
   - Data at rest must be encrypted using AES-256 or equivalent
   - Data in transit must use TLS 1.2 or higher
   - Encryption keys must be managed securely and rotated annually

2. Data Handling:
   - Handle data according to its classification level
   - Do not store classified data on personal devices
   - Secure disposal required for all classified data

3. Data Retention:
   - Retain data only as long as business or legal requirements dictate
   - Delete or anonymize data when retention period expires
   - Document retention schedules for all data types`,
      },
      {
        heading: 'Enforcement',
        content: 'Violations of this policy may result in disciplinary action, up to and including termination. Data breaches will be handled according to the Incident Response Policy.',
      },
    ],
  },

  incidentResponse: {
    title: 'Incident Response Policy',
    sections: [
      {
        heading: 'Purpose',
        content: 'This policy establishes the framework for detecting, responding to, and recovering from security incidents to minimize impact and prevent recurrence.',
      },
      {
        heading: 'Scope',
        content: 'This policy applies to all security incidents affecting organizational systems, data, or personnel, including but not limited to data breaches, malware infections, unauthorized access, and denial of service attacks.',
      },
      {
        heading: 'Incident Classification',
        content: `Incidents shall be classified by severity:

- **Critical (P1)**: Business-critical system unavailable, active data breach, or imminent threat
- **High (P2)**: Significant impact to operations or confirmed security compromise
- **Medium (P3)**: Limited impact, potential security issue requiring investigation
- **Low (P4)**: Minor issue with no immediate security impact

Classification determines response priority and escalation path.`,
      },
      {
        heading: 'Response Procedures',
        content: `1. Detection and Reporting:
   - Report suspected incidents immediately to security team
   - Use designated incident reporting channels
   - Preserve evidence and document observations

2. Triage and Assessment:
   - Security team assesses and classifies incident
   - Determine scope and potential impact
   - Activate response team as appropriate

3. Containment:
   - Isolate affected systems
   - Prevent further damage or data loss
   - Preserve forensic evidence

4. Eradication and Recovery:
   - Remove threat from environment
   - Restore systems from known-good backups
   - Verify security before returning to production

5. Post-Incident:
   - Conduct root cause analysis
   - Document lessons learned
   - Update procedures to prevent recurrence`,
      },
      {
        heading: 'Escalation Matrix',
        content: `Escalation and notification requirements:

| Severity | Response Time | Notification |
|----------|--------------|--------------|
| Critical | 15 minutes | CISO, Executive Team, Legal |
| High | 1 hour | Security Manager, IT Director |
| Medium | 4 hours | Security Team Lead |
| Low | 24 hours | Security Team |

External notification (regulators, customers) per legal requirements.`,
      },
      {
        heading: 'Enforcement',
        content: 'All personnel must report suspected incidents. Failure to report or cooperate with incident response may result in disciplinary action.',
      },
    ],
  },

  auth: {
    title: 'Authentication and Authorization Policy',
    sections: [
      {
        heading: 'Purpose',
        content: 'This policy establishes requirements for user authentication and authorization to ensure only authorized individuals access organizational resources.',
      },
      {
        heading: 'Scope',
        content: 'This policy applies to all authentication mechanisms and systems used to access organizational resources, including applications, networks, and physical facilities.',
      },
      {
        heading: 'Password Requirements',
        content: `Password standards:

- Minimum length: 12 characters
- Must include: uppercase, lowercase, numbers, and special characters
- Cannot contain username or common words
- Cannot reuse last 10 passwords
- Maximum age: 90 days
- Account lockout after 5 failed attempts`,
      },
      {
        heading: 'Multi-Factor Authentication',
        content: `MFA (Multi-Factor Authentication) requirements:

- MFA is required for:
  - All remote access
  - Administrative and privileged accounts
  - Access to sensitive systems and data
  - Cloud service administration

- Acceptable MFA methods:
  - Hardware security keys (preferred)
  - Authenticator applications (TOTP)
  - Push notifications from approved apps

- SMS-based 2FA is not permitted for sensitive access`,
      },
      {
        heading: 'Session Management',
        content: `Session security requirements:

- Session timeout: 15 minutes of inactivity for sensitive systems
- Session timeout: 8 hours maximum duration
- Concurrent session limits as appropriate per system
- Sessions must be invalidated upon logout
- Session tokens must be securely generated and transmitted`,
      },
      {
        heading: 'Enforcement',
        content: 'Systems must enforce these authentication requirements. Exceptions require security team approval and compensating controls.',
      },
    ],
  },

  acceptableUse: {
    title: 'Acceptable Use Policy',
    sections: [
      {
        heading: 'Purpose',
        content: 'This policy defines acceptable and unacceptable use of organizational information technology resources to protect the organization and its users.',
      },
      {
        heading: 'Scope',
        content: 'This policy applies to all users of organizational IT resources, including employees, contractors, and guests, and covers all devices, networks, and services.',
      },
      {
        heading: 'Acceptable Use',
        content: `Permitted activities include:

- Business-related communications and research
- Reasonable personal use that does not interfere with work
- Use of approved software and services
- Accessing authorized systems and data
- Following security procedures and reporting incidents`,
      },
      {
        heading: 'Prohibited Activities',
        content: `The following activities are strictly prohibited and not allowed:

- Unauthorized access to systems or data
- Installing unapproved software or hardware
- Sharing credentials or access with unauthorized persons
- Circumventing security controls
- Using resources for illegal activities
- Harassment, discrimination, or threatening communications
- Excessive personal use that impacts productivity
- Accessing or distributing inappropriate content
- Unauthorized data exfiltration or disclosure
- Cryptocurrency mining on organizational resources`,
      },
      {
        heading: 'Monitoring',
        content: 'The organization reserves the right to monitor use of IT resources. Users should have no expectation of privacy when using organizational systems.',
      },
      {
        heading: 'Enforcement',
        content: 'Violations may result in disciplinary action, including termination. Illegal activities will be reported to appropriate authorities.',
      },
    ],
  },
};

/**
 * Create a policy document from template with options
 * @param {string} templateKey - Key in POLICY_TEMPLATES
 * @param {Object} options - Customization options
 * @returns {Object} Policy document
 */
function createPolicy(templateKey, options = {}) {
  const template = POLICY_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown policy template: ${templateKey}`);
  }

  const {
    organization = DEFAULT_POLICY_CONFIG.organization,
    version = DEFAULT_POLICY_CONFIG.version,
    effectiveDate = DEFAULT_POLICY_CONFIG.effectiveDate,
    reviewDate = DEFAULT_POLICY_CONFIG.reviewDate,
    approvedBy = DEFAULT_POLICY_CONFIG.approvedBy,
    customSections = [],
    sectionOverrides = {},
    replaceTemplate = false,
    passwordMinLength,
    passwordRequireSpecial,
  } = options;

  // Handle section overrides for auth policy password requirements
  let processedOverrides = { ...sectionOverrides };
  if (templateKey === 'auth' && (passwordMinLength || passwordRequireSpecial)) {
    const passwordSection = template.sections.find(s => s.heading === 'Password Requirements');
    if (passwordSection) {
      let content = passwordSection.content;
      if (passwordMinLength) {
        content = content.replace(/Minimum length: \d+ characters/, `Minimum length: ${passwordMinLength} characters`);
      }
      if (passwordRequireSpecial) {
        if (!content.includes('special characters')) {
          content = content.replace(
            'Must include:',
            'Must include: uppercase, lowercase, numbers, and special characters\n- Must include:'
          );
        }
      }
      processedOverrides['Password Requirements'] = content;
    }
  }

  // Build sections
  let sections;
  if (replaceTemplate && customSections.length > 0) {
    sections = [...customSections];
  } else {
    sections = template.sections.map(section => {
      if (processedOverrides[section.heading]) {
        return {
          heading: section.heading,
          content: processedOverrides[section.heading],
        };
      }
      return { ...section };
    });

    // Append custom sections
    if (customSections.length > 0) {
      sections = [...sections, ...customSections];
    }
  }

  return {
    title: template.title,
    version,
    effectiveDate,
    organization,
    sections,
    approvedBy,
    reviewDate,
  };
}

/**
 * Generate Access Control Policy
 * @param {Object} options - Policy options
 * @returns {Object} Policy document
 */
export function generateAccessControlPolicy(options = {}) {
  return createPolicy('accessControl', options);
}

/**
 * Generate Data Protection Policy
 * @param {Object} options - Policy options
 * @returns {Object} Policy document
 */
export function generateDataProtectionPolicy(options = {}) {
  return createPolicy('dataProtection', options);
}

/**
 * Generate Incident Response Policy
 * @param {Object} options - Policy options
 * @returns {Object} Policy document
 */
export function generateIncidentResponsePolicy(options = {}) {
  return createPolicy('incidentResponse', options);
}

/**
 * Generate Authentication and Authorization Policy
 * @param {Object} options - Policy options
 * @returns {Object} Policy document
 */
export function generateAuthPolicy(options = {}) {
  return createPolicy('auth', options);
}

/**
 * Generate Acceptable Use Policy
 * @param {Object} options - Policy options
 * @returns {Object} Policy document
 */
export function generateAcceptableUsePolicy(options = {}) {
  return createPolicy('acceptableUse', options);
}

/**
 * Load policy configuration from .tlc.json
 * @param {string} projectDir - Project directory path
 * @returns {Promise<Object>} Policy configuration
 */
export async function loadPolicyConfig(projectDir) {
  const tlcJsonPath = path.join(projectDir, '.tlc.json');

  try {
    const content = await fs.readFile(tlcJsonPath, 'utf8');
    const config = JSON.parse(content);

    if (config.security?.policies) {
      return {
        ...DEFAULT_POLICY_CONFIG,
        ...config.security.policies,
      };
    }

    return DEFAULT_POLICY_CONFIG;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return DEFAULT_POLICY_CONFIG;
    }
    throw error;
  }
}

/**
 * Export policy document as Markdown
 * @param {Object} policy - Policy document
 * @returns {string} Markdown formatted policy
 */
export function exportAsMarkdown(policy) {
  const lines = [];

  // Title
  lines.push(`# ${policy.title}`);
  lines.push('');

  // Metadata
  lines.push(`**Organization:** ${policy.organization}`);
  lines.push(`**Version:** ${policy.version}`);
  lines.push(`**Effective Date:** ${policy.effectiveDate}`);
  lines.push(`**Review Date:** ${policy.reviewDate}`);
  lines.push(`**Approved By:** ${policy.approvedBy}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Sections
  for (const section of policy.sections) {
    lines.push(`## ${section.heading}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Document generated on ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Export policy document as HTML (PDF-ready)
 * @param {Object} policy - Policy document
 * @returns {string} HTML formatted policy
 */
export function exportAsHtml(policy) {
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const formatContent = (content) => {
    // Convert markdown-like formatting to HTML
    let html = escapeHtml(content);

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Lists
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${trimmed.slice(2)}</li>`);
      } else if (trimmed.match(/^\d+\.\s/)) {
        if (!inList) {
          result.push('<ol>');
          inList = true;
        }
        result.push(`<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`);
      } else {
        if (inList) {
          result.push(inList === true ? '</ul>' : '</ol>');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('</ul>');
    }

    return result.join('\n').replace(/\n\n+/g, '</p><p>');
  };

  const sections = policy.sections
    .map(
      (section) => `
    <section class="policy-section">
      <h2>${escapeHtml(section.heading)}</h2>
      <div class="content">
        <p>${formatContent(section.content)}</p>
      </div>
    </section>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(policy.title)} - ${escapeHtml(policy.organization)}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }

    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    h2 {
      color: #2c3e50;
      margin-top: 30px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }

    .meta-info {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 5px;
      margin: 20px 0;
    }

    .meta-info p {
      margin: 5px 0;
    }

    .meta-info strong {
      display: inline-block;
      width: 140px;
    }

    .policy-section {
      margin: 30px 0;
    }

    .content {
      text-align: justify;
    }

    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }

    li {
      margin: 5px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }

    th {
      background: #f4f4f4;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 0.9em;
      color: #666;
    }

    @media print {
      body {
        padding: 0;
        font-size: 11pt;
      }

      h1 {
        page-break-after: avoid;
      }

      h2 {
        page-break-after: avoid;
      }

      .policy-section {
        page-break-inside: avoid;
      }

      .meta-info {
        background: none;
        border: 1px solid #ccc;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(policy.title)}</h1>
    <div class="meta-info">
      <p><strong>Organization:</strong> ${escapeHtml(policy.organization)}</p>
      <p><strong>Version:</strong> ${escapeHtml(policy.version)}</p>
      <p><strong>Effective Date:</strong> ${escapeHtml(policy.effectiveDate)}</p>
      <p><strong>Review Date:</strong> ${escapeHtml(policy.reviewDate)}</p>
      <p><strong>Approved By:</strong> ${escapeHtml(policy.approvedBy)}</p>
    </div>
  </header>

  <main>
    ${sections}
  </main>

  <footer class="footer">
    <p>Document generated on ${new Date().toISOString().split('T')[0]}</p>
  </footer>
</body>
</html>`;
}
