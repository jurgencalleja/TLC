/**
 * GDPR Checklist - GDPR articles checklist for compliance
 */

// GDPR Articles data
const GDPR_ARTICLES = [
  {
    number: 5,
    chapter: 2,
    title: 'Principles relating to processing of personal data',
    requirements: [
      'lawfulness, fairness and transparency',
      'purpose limitation',
      'data minimization',
      'accuracy',
      'storage limitation',
      'integrity and confidentiality',
      'accountability'
    ]
  },
  {
    number: 6,
    chapter: 2,
    title: 'Lawfulness of processing',
    requirements: [
      'consent',
      'contract',
      'legal obligation',
      'vital interests',
      'public task',
      'legitimate interests'
    ]
  },
  {
    number: 7,
    chapter: 2,
    title: 'Conditions for consent',
    requirements: ['demonstrable consent', 'clear and plain language', 'right to withdraw']
  },
  {
    number: 12,
    chapter: 3,
    title: 'Transparent information',
    requirements: ['concise', 'transparent', 'intelligible', 'easily accessible']
  },
  {
    number: 13,
    chapter: 3,
    title: 'Information to be provided',
    requirements: ['controller identity', 'purposes', 'recipients', 'retention period', 'rights']
  },
  {
    number: 15,
    chapter: 3,
    title: 'Right of access',
    requirements: ['confirmation of processing', 'copy of data', 'supplementary information']
  },
  {
    number: 16,
    chapter: 3,
    title: 'Right to rectification',
    requirements: ['correct inaccurate data', 'complete incomplete data']
  },
  {
    number: 17,
    chapter: 3,
    title: 'Right to erasure',
    requirements: ['erasure without undue delay', 'grounds for erasure']
  },
  {
    number: 18,
    chapter: 3,
    title: 'Right to restriction of processing',
    requirements: ['restrict processing in certain circumstances']
  },
  {
    number: 20,
    chapter: 3,
    title: 'Right to data portability',
    requirements: ['receive data in structured format', 'transmit to another controller']
  },
  {
    number: 25,
    chapter: 4,
    title: 'Data protection by design and default',
    requirements: ['appropriate technical measures', 'data minimization by default']
  },
  {
    number: 30,
    chapter: 4,
    title: 'Records of processing activities',
    requirements: ['maintain records', 'document processing activities']
  },
  {
    number: 32,
    chapter: 4,
    title: 'Security of processing',
    requirements: ['pseudonymisation', 'encryption', 'confidentiality', 'integrity', 'availability', 'resilience']
  },
  {
    number: 33,
    chapter: 4,
    title: 'Notification of personal data breach',
    requirements: ['notify within 72 hours', 'document breaches', 'describe nature of breach']
  },
  {
    number: 34,
    chapter: 4,
    title: 'Communication of personal data breach to data subject',
    requirements: ['notify data subjects of high risk breaches']
  },
  {
    number: 35,
    chapter: 4,
    title: 'Data protection impact assessment',
    requirements: ['assess impact of high-risk processing', 'seek views of data subjects']
  },
  {
    number: 37,
    chapter: 4,
    title: 'Designation of data protection officer',
    requirements: ['appoint DPO when required', 'ensure expertise']
  },
  {
    number: 44,
    chapter: 5,
    title: 'General principle for transfers',
    requirements: ['adequate safeguards for international transfers']
  }
];

const GDPR_PRINCIPLES = [
  'lawfulness',
  'purpose-limitation',
  'data-minimization',
  'accuracy',
  'storage-limitation',
  'integrity-confidentiality'
];

// Special category data patterns
const SPECIAL_CATEGORY_PATTERNS = [
  /health/i,
  /medical/i,
  /genetic/i,
  /biometric/i,
  /racial/i,
  /ethnic/i,
  /political/i,
  /religious/i,
  /sexual/i,
  /trade.?union/i
];

// Personal data patterns
const PERSONAL_DATA_PATTERNS = [
  /email/i,
  /name/i,
  /address/i,
  /phone/i,
  /ip.?address/i,
  /location/i,
  /user/i,
  /customer/i,
  /employee/i
];

/**
 * Create a GDPR checklist instance
 */
export function createGdprChecklist() {
  return {
    evaluate: async (evidence) => {
      let compliantCount = 0;
      const totalArticles = GDPR_ARTICLES.length;
      const gaps = [];

      for (const article of GDPR_ARTICLES) {
        const result = checkArticle(article.number, evidence || {});
        if (result.compliant) {
          compliantCount++;
        } else {
          gaps.push({ article: article.number, issues: result.issues });
        }
      }

      return {
        score: Math.round((compliantCount / totalArticles) * 100),
        gaps
      };
    },
    getArticles: () => GDPR_ARTICLES,
    getPrinciples: () => GDPR_PRINCIPLES
  };
}

/**
 * Get GDPR articles, optionally filtered
 */
export function getArticles(options = {}) {
  let articles = [...GDPR_ARTICLES];

  if (options.chapter !== undefined) {
    articles = articles.filter(a => a.chapter === options.chapter);
  }

  return articles;
}

/**
 * Check compliance for a specific article
 */
export function checkArticle(articleNumber, evidence = {}) {
  const article = GDPR_ARTICLES.find(a => a.number === articleNumber);

  const result = {
    articleNumber,
    compliant: false,
    issues: []
  };

  if (!article) {
    result.issues.push(`Unknown article: ${articleNumber}`);
    return result;
  }

  // Article-specific compliance checks
  switch (articleNumber) {
    case 5: // Principles
      result.compliant = evidence.principles !== false;
      break;
    case 6: // Lawful basis
      result.compliant = !!(evidence.lawfulBasis && evidence.consentRecords);
      if (!evidence.lawfulBasis) result.issues.push('No lawful basis documented');
      if (!evidence.consentRecords) result.issues.push('No consent records');
      break;
    case 15: // Right of access and other data subject rights
    case 16:
    case 17:
    case 18:
    case 20:
      result.compliant = !!(
        evidence.rightToAccess &&
        evidence.rightToRectification &&
        evidence.rightToErasure &&
        evidence.rightToPortability
      );
      break;
    case 33: // Breach notification
      result.compliant = !!(evidence.breachProcedure && evidence.notificationTemplate);
      if (!evidence.breachProcedure) result.issues.push('No breach procedure');
      if (!evidence.notificationTemplate) result.issues.push('No notification template');
      break;
    default:
      // For other articles, assume compliant if any evidence provided
      result.compliant = Object.keys(evidence).length > 0;
  }

  return result;
}

/**
 * Generate a Data Protection Impact Assessment
 */
export function generateDpia(processing) {
  const riskLevel = assessRiskLevel(processing);

  let dpia = `# Data Protection Impact Assessment\n\n`;
  dpia += `## Processing Activity\n\n`;
  dpia += `**Purpose:** ${processing.purpose || 'Not specified'}\n\n`;

  if (processing.dataTypes) {
    dpia += `**Data Types:** ${processing.dataTypes.join(', ')}\n\n`;
  }

  if (processing.recipients) {
    dpia += `**Recipients:** ${processing.recipients.join(', ')}\n\n`;
  }

  if (processing.retention) {
    dpia += `**Retention Period:** ${processing.retention}\n\n`;
  }

  dpia += `## Risk Assessment\n\n`;
  dpia += `**Risk Level:** ${riskLevel}\n\n`;

  if (processing.specialCategories) {
    dpia += `**Note:** This processing involves special category data requiring additional safeguards.\n\n`;
  }

  dpia += `## Necessity and Proportionality\n\n`;
  dpia += `[To be completed]\n\n`;

  dpia += `## Measures to Address Risks\n\n`;
  dpia += `[To be completed]\n`;

  return dpia;
}

/**
 * Assess risk level for DPIA
 */
function assessRiskLevel(processing) {
  if (processing.specialCategories) {
    return 'HIGH';
  }

  if (processing.dataTypes) {
    const hasSpecialData = processing.dataTypes.some(dt =>
      SPECIAL_CATEGORY_PATTERNS.some(p => p.test(dt))
    );
    if (hasSpecialData) {
      return 'HIGH';
    }
  }

  if (processing.largeScale || processing.systematicMonitoring) {
    return 'HIGH';
  }

  return 'MEDIUM';
}

/**
 * Assess data processing patterns in code
 */
export function assessDataProcessing(codePatterns) {
  const result = {
    personalDataIdentified: false,
    specialCategories: false,
    patterns: []
  };

  for (const pattern of codePatterns) {
    const patternStr = pattern.pattern || '';

    // Check for personal data
    if (PERSONAL_DATA_PATTERNS.some(p => p.test(patternStr))) {
      result.personalDataIdentified = true;
      result.patterns.push({
        file: pattern.file,
        type: 'personal-data',
        pattern: patternStr
      });
    }

    // Check for special categories
    if (SPECIAL_CATEGORY_PATTERNS.some(p => p.test(patternStr))) {
      result.specialCategories = true;
      result.personalDataIdentified = true;
      result.patterns.push({
        file: pattern.file,
        type: 'special-category',
        pattern: patternStr
      });
    }
  }

  return result;
}

/**
 * Generate a privacy notice template
 */
export function generatePrivacyNotice(config = {}) {
  let notice = `# Privacy Notice\n\n`;

  notice += `## Who we are\n\n`;
  notice += `The data controller for your personal data is ${config.controller || '[Controller Name]'}.\n\n`;

  notice += `## What data we collect\n\n`;
  notice += `We collect and process the following personal data:\n`;
  notice += `[List of data categories]\n\n`;

  notice += `## Why we process your data\n\n`;
  if (config.purposes && config.purposes.length > 0) {
    notice += `We process your data for the following purposes:\n`;
    config.purposes.forEach(p => {
      notice += `- ${p}\n`;
    });
  } else {
    notice += `[Processing purposes]\n`;
  }
  notice += `\n`;

  notice += `## Legal basis for processing\n\n`;
  notice += `Our lawful basis for processing is: ${config.lawfulBasis || '[Lawful basis]'}\n\n`;

  notice += `## Data retention\n\n`;
  notice += `We keep your data for the period necessary to fulfill the purposes for which it was collected. `;
  notice += `Our retention policy ensures data is not kept longer than necessary.\n\n`;

  notice += `## Your rights\n\n`;
  notice += `Under data protection law, you have the following rights (your rights as a data subject):\n`;
  notice += `- Right of access to your data\n`;
  notice += `- Right to rectification of inaccurate data\n`;
  notice += `- Right to erasure (right to be forgotten)\n`;
  notice += `- Right to restrict processing\n`;
  notice += `- Right to data portability\n`;
  notice += `- Right to object to processing\n`;
  notice += `- Rights related to automated decision making\n\n`;

  notice += `## Contact us\n\n`;
  notice += `If you have any questions about this privacy notice or how we handle your data, please contact us.\n`;

  return notice;
}

export default {
  createGdprChecklist,
  getArticles,
  checkArticle,
  generateDpia,
  assessDataProcessing,
  generatePrivacyNotice
};
