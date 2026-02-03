/**
 * Control Mapper - Cross-framework control mapping
 */

// Default control mappings between frameworks
const DEFAULT_MAPPINGS = [
  {
    source: { framework: 'pci-dss', control: 'req-1.1' },
    target: { framework: 'iso27001', control: 'A.13.1' },
    theme: 'network-security',
    confidence: 0.85
  },
  {
    source: { framework: 'pci-dss', control: 'req-3.4' },
    target: { framework: 'iso27001', control: 'A.8.24' },
    theme: 'encryption',
    confidence: 0.95
  },
  {
    source: { framework: 'pci-dss', control: 'req-3.4' },
    target: { framework: 'hipaa', control: '164.312(a)(2)(iv)' },
    theme: 'encryption',
    confidence: 0.90
  },
  {
    source: { framework: 'pci-dss', control: 'req-8.1' },
    target: { framework: 'iso27001', control: 'A.5.15' },
    theme: 'access-control',
    confidence: 0.90
  },
  {
    source: { framework: 'pci-dss', control: 'req-8.1' },
    target: { framework: 'hipaa', control: '164.312(d)' },
    theme: 'access-control',
    confidence: 0.85
  },
  {
    source: { framework: 'hipaa', control: '164.312(a)(1)' },
    target: { framework: 'iso27001', control: 'A.5.15' },
    theme: 'access-control',
    confidence: 0.85
  },
  {
    source: { framework: 'hipaa', control: '164.312(e)(1)' },
    target: { framework: 'iso27001', control: 'A.8.24' },
    theme: 'encryption',
    confidence: 0.90
  },
  {
    source: { framework: 'hipaa', control: '164.312(e)(1)' },
    target: { framework: 'pci-dss', control: 'req-3.4' },
    theme: 'encryption',
    confidence: 0.85
  }
];

// Framework-specific control themes and keywords
const FRAMEWORK_THEMES = {
  'pci-dss': {
    encryption: ['req-3.4', 'req-3.5', 'req-4.1'],
    'access-control': ['req-7.1', 'req-7.2', 'req-8.1', 'req-8.2'],
    'network-security': ['req-1.1', 'req-1.2', 'req-1.3'],
    logging: ['req-10.1', 'req-10.2', 'req-10.3']
  },
  'iso27001': {
    encryption: ['A.8.24', 'A.10.1'],
    'access-control': ['A.5.15', 'A.5.16', 'A.5.17', 'A.5.18'],
    'network-security': ['A.13.1', 'A.13.2'],
    logging: ['A.8.15', 'A.8.16']
  },
  'hipaa': {
    encryption: ['164.312(a)(2)(iv)', '164.312(e)(1)', '164.312(e)(2)(ii)'],
    'access-control': ['164.312(a)(1)', '164.312(d)'],
    'network-security': ['164.312(e)(1)'],
    logging: ['164.312(b)']
  }
};

// Unique requirements per framework
const UNIQUE_REQUIREMENTS = {
  'pci-dss': [
    'Payment card industry specific requirements',
    'PAN masking and truncation',
    'Quarterly vulnerability scans'
  ],
  'hipaa': [
    'Protected Health Information (PHI) handling',
    'Business Associate Agreements',
    'Patient rights documentation'
  ],
  'iso27001': [
    'Information Security Management System (ISMS)',
    'Risk assessment methodology',
    'Continuous improvement process'
  ]
};

// Custom frameworks storage
const customFrameworks = new Map();

/**
 * Create a control mapper instance
 */
export function createControlMapper(options = {}) {
  const mappings = options.loadDefaults ? [...DEFAULT_MAPPINGS] : [];

  return {
    map: (source, target) => mapControl({ source, target }),
    findOverlaps: (frameworks) => findOverlaps(frameworks),
    getMappings: () => mappings,
    addMapping: (mapping) => mappings.push(mapping)
  };
}

/**
 * Map a control from one framework to another
 */
export function mapControl({ source, target }) {
  const result = {
    sourceFramework: source.framework,
    sourceControl: source.control,
    targetFramework: target.framework,
    targetControls: [],
    confidence: 0,
    unmapped: false
  };

  // Find direct mappings
  const directMappings = DEFAULT_MAPPINGS.filter(m =>
    m.source.framework === source.framework &&
    m.source.control === source.control &&
    m.target.framework === target.framework
  );

  if (directMappings.length > 0) {
    result.targetControls = directMappings.map(m => m.target.control);
    result.confidence = Math.max(...directMappings.map(m => m.confidence));
    return result;
  }

  // Try reverse mappings
  const reverseMappings = DEFAULT_MAPPINGS.filter(m =>
    m.target.framework === source.framework &&
    m.target.control === source.control &&
    m.source.framework === target.framework
  );

  if (reverseMappings.length > 0) {
    result.targetControls = reverseMappings.map(m => m.source.control);
    result.confidence = Math.max(...reverseMappings.map(m => m.confidence)) * 0.9; // Slightly lower confidence for reverse
    return result;
  }

  // Try theme-based mapping
  const sourceThemes = FRAMEWORK_THEMES[source.framework] || {};
  let sourceTheme = null;

  for (const [theme, controls] of Object.entries(sourceThemes)) {
    if (controls.includes(source.control)) {
      sourceTheme = theme;
      break;
    }
  }

  if (sourceTheme && FRAMEWORK_THEMES[target.framework]) {
    const targetControls = FRAMEWORK_THEMES[target.framework][sourceTheme];
    if (targetControls && targetControls.length > 0) {
      result.targetControls = targetControls;
      result.confidence = 0.6; // Lower confidence for theme-based
      return result;
    }
  }

  // No mapping found
  result.unmapped = true;
  return result;
}

/**
 * Find overlapping controls between frameworks
 */
export function findOverlaps(frameworks) {
  const overlaps = [];
  const themes = ['encryption', 'access-control', 'network-security', 'logging'];

  for (const theme of themes) {
    const frameworkControls = {};
    let count = 0;

    for (const framework of frameworks) {
      const controls = FRAMEWORK_THEMES[framework]?.[theme];
      if (controls && controls.length > 0) {
        frameworkControls[framework] = controls;
        count++;
      }
    }

    if (count >= 2) {
      const totalControls = Object.values(frameworkControls).reduce((sum, c) => sum + c.length, 0);
      const avgControlsPerFramework = totalControls / count;

      overlaps.push({
        theme,
        frameworks: Object.keys(frameworkControls),
        controls: frameworkControls,
        overlapPercentage: Math.round((count / frameworks.length) * 100)
      });
    }
  }

  return overlaps;
}

/**
 * Generate a cross-reference matrix between frameworks
 */
export function generateCrossReference(frameworks, options = {}) {
  if (options.format === 'markdown') {
    return generateMarkdownMatrix(frameworks);
  }

  if (options.format === 'csv') {
    return generateCsvMatrix(frameworks);
  }

  // Return object matrix by default
  const matrix = {};

  for (const source of frameworks) {
    matrix[source] = {};
    for (const target of frameworks) {
      if (source !== target) {
        const mappings = DEFAULT_MAPPINGS.filter(m =>
          (m.source.framework === source && m.target.framework === target) ||
          (m.target.framework === source && m.source.framework === target)
        );
        matrix[source][target] = mappings.length;
      }
    }
  }

  return matrix;
}

/**
 * Generate markdown cross-reference matrix
 */
function generateMarkdownMatrix(frameworks) {
  const frameworkNames = {
    'pci-dss': 'PCI DSS',
    'iso27001': 'ISO 27001',
    'hipaa': 'HIPAA'
  };

  let md = '| Framework |';
  for (const f of frameworks) {
    md += ` ${frameworkNames[f] || f} |`;
  }
  md += '\n|---|';
  for (let i = 0; i < frameworks.length; i++) {
    md += '---|';
  }
  md += '\n';

  for (const source of frameworks) {
    md += `| ${frameworkNames[source] || source} |`;
    for (const target of frameworks) {
      if (source === target) {
        md += ' - |';
      } else {
        const count = DEFAULT_MAPPINGS.filter(m =>
          (m.source.framework === source && m.target.framework === target) ||
          (m.target.framework === source && m.source.framework === target)
        ).length;
        md += ` ${count} |`;
      }
    }
    md += '\n';
  }

  return md;
}

/**
 * Generate CSV cross-reference matrix
 */
function generateCsvMatrix(frameworks) {
  const frameworkNames = {
    'pci-dss': 'PCI DSS',
    'iso27001': 'ISO 27001',
    'hipaa': 'HIPAA'
  };

  let csv = 'Framework,' + frameworks.map(f => frameworkNames[f] || f).join(',') + '\n';

  for (const source of frameworks) {
    csv += frameworkNames[source] || source;
    for (const target of frameworks) {
      if (source === target) {
        csv += ',-';
      } else {
        const count = DEFAULT_MAPPINGS.filter(m =>
          (m.source.framework === source && m.target.framework === target) ||
          (m.target.framework === source && m.source.framework === target)
        ).length;
        csv += `,${count}`;
      }
    }
    csv += '\n';
  }

  return csv;
}

/**
 * Import a custom framework
 */
export function importFramework(framework, options = {}) {
  // Validate required fields
  if (!framework.id) {
    throw new Error('Framework id is required');
  }

  if (!framework.name) {
    throw new Error('Framework name is required');
  }

  const result = {
    imported: true,
    frameworkId: framework.id,
    controlCount: framework.controls?.length || 0,
    mappingsCreated: 0
  };

  // Store the framework
  customFrameworks.set(framework.id, framework);

  // Auto-map to existing frameworks if requested
  if (options.autoMap && framework.controls) {
    for (const control of framework.controls) {
      // Check for explicit mappings
      if (control.mappings) {
        for (const mapping of control.mappings) {
          const [targetFramework, targetControl] = mapping.split(':');
          DEFAULT_MAPPINGS.push({
            source: { framework: framework.id, control: control.id },
            target: { framework: targetFramework, control: targetControl },
            theme: 'custom',
            confidence: 0.9
          });
          result.mappingsCreated++;
        }
      }

      // Check for keyword-based mappings
      if (control.keywords) {
        for (const keyword of control.keywords) {
          const keywordLower = keyword.toLowerCase();
          // Map to encryption controls
          if (keywordLower.includes('encrypt') || keywordLower.includes('data protection')) {
            for (const [fw, themes] of Object.entries(FRAMEWORK_THEMES)) {
              if (themes.encryption) {
                DEFAULT_MAPPINGS.push({
                  source: { framework: framework.id, control: control.id },
                  target: { framework: fw, control: themes.encryption[0] },
                  theme: 'encryption',
                  confidence: 0.7
                });
                result.mappingsCreated++;
              }
            }
          }
          // Map to access control
          if (keywordLower.includes('access')) {
            for (const [fw, themes] of Object.entries(FRAMEWORK_THEMES)) {
              if (themes['access-control']) {
                DEFAULT_MAPPINGS.push({
                  source: { framework: framework.id, control: control.id },
                  target: { framework: fw, control: themes['access-control'][0] },
                  theme: 'access-control',
                  confidence: 0.7
                });
                result.mappingsCreated++;
              }
            }
          }
        }
      }
    }
  }

  return result;
}

export default {
  createControlMapper,
  mapControl,
  findOverlaps,
  generateCrossReference,
  importFramework
};
