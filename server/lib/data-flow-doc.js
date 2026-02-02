/**
 * Data Flow Documenter
 *
 * Documents data flows through the system including:
 * - Data source identification (user input, APIs, databases)
 * - Data transformation tracking
 * - Data destination documentation
 * - Sensitivity classification
 * - Mermaid flow diagram generation
 * - Retention policy documentation
 */

/**
 * Patterns for identifying data sources in code
 */
const SOURCE_PATTERNS = {
  user_input: [
    /new FormData\s*\(/gi,
    /document\.getElementById\s*\(['"]\w+['"]\)\.value/gi,
    /document\.querySelector\s*\([^)]+\)\.value/gi,
    /event\.target\.elements\.\w+\.value/gi,
    /\.(value|files|checked)\s*[;,)]/gi,
    /req\.body/gi,
    /req\.query/gi,
    /req\.params/gi,
  ],
  api: [
    /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /\/api\/\w+/gi,
  ],
  database: [
    /new Database\s*\(/gi,
    /mysql\.createPool/gi,
    /mongoose\.connect/gi,
    /new Pool\s*\(/gi,
    /createConnection/gi,
    /SELECT\s+.+\s+FROM\s+/gi,
    /INSERT\s+INTO\s+/gi,
    /UPDATE\s+\w+\s+SET/gi,
    /DELETE\s+FROM\s+/gi,
    /pg\.connect/gi,
    /knex\s*\(/gi,
    /prisma\./gi,
  ],
};

/**
 * Sensitivity classification rules
 */
const SENSITIVITY_RULES = {
  critical: [
    'password',
    'secret',
    'ssn',
    'social_security',
    'credit_card',
    'card_number',
    'cvv',
    'pin',
    'private_key',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'auth_token',
  ],
  high: [
    'email',
    'phone',
    'address',
    'date_of_birth',
    'dob',
    'ip_address',
    'location',
    'gps',
    'biometric',
  ],
  medium: [
    'name',
    'first_name',
    'last_name',
    'username',
    'user_id',
    'account_id',
    'order_id',
    'transaction_id',
  ],
  low: [
    'timestamp',
    'page_number',
    'sort_order',
    'page_views',
    'count',
    'total',
    'quantity',
    'status',
    'type',
    'category',
  ],
};

/**
 * Default retention policies by sensitivity level
 */
const DEFAULT_RETENTION = {
  critical: '1 year (or until account deletion)',
  high: '3 years',
  medium: '5 years',
  low: '7 years',
  public: 'Indefinite',
};

/**
 * Identify data sources in code
 * @param {string} code - Source code to analyze
 * @returns {Array} Array of identified data sources
 */
export function identifyDataSources(code) {
  const sources = [];
  const seen = new Set();

  for (const [type, patterns] of Object.entries(SOURCE_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(code)) !== null) {
        const name = extractSourceName(match, type);
        const key = `${type}:${name}`;

        if (!seen.has(key)) {
          seen.add(key);
          sources.push({
            type,
            name,
            match: match[0],
            location: match.index,
          });
        }
      }
    }
  }

  return sources;
}

/**
 * Extract a meaningful name from a regex match
 * @param {Array} match - Regex match result
 * @param {string} type - Source type
 * @returns {string} Extracted name
 */
function extractSourceName(match, type) {
  const fullMatch = match[0];

  if (type === 'api') {
    // Extract URL path from API patterns
    const urlMatch = fullMatch.match(/['"`]([^'"`]+)['"`]/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return fullMatch;
  }

  if (type === 'user_input') {
    if (fullMatch.includes('FormData')) {
      return 'FormData';
    }
    if (fullMatch.includes('getElementById')) {
      const idMatch = fullMatch.match(/getElementById\s*\(['"](\w+)['"]\)/);
      return idMatch ? `form_${idMatch[1]}` : 'form_element';
    }
    if (fullMatch.includes('querySelector')) {
      return 'form_selector';
    }
    if (fullMatch.includes('req.body')) {
      return 'request_body';
    }
    if (fullMatch.includes('req.query')) {
      return 'query_params';
    }
    if (fullMatch.includes('req.params')) {
      return 'url_params';
    }
    return 'user_input';
  }

  if (type === 'database') {
    if (fullMatch.includes('SELECT')) {
      const tableMatch = fullMatch.match(/FROM\s+(\w+)/i);
      return tableMatch ? `query:${tableMatch[1]}` : 'sql_query';
    }
    if (fullMatch.includes('INSERT')) {
      const tableMatch = fullMatch.match(/INTO\s+(\w+)/i);
      return tableMatch ? `insert:${tableMatch[1]}` : 'sql_insert';
    }
    if (fullMatch.includes('mongoose')) {
      return 'mongodb';
    }
    if (fullMatch.includes('mysql')) {
      return 'mysql';
    }
    if (fullMatch.includes('Pool') || fullMatch.includes('pg')) {
      return 'postgresql';
    }
    return 'database';
  }

  return fullMatch.substring(0, 50);
}

/**
 * Track a data flow through the system
 * @param {Object} flowDefinition - Flow definition
 * @returns {Object} Tracked flow with metadata
 */
export function trackDataFlow(flowDefinition) {
  const {
    id = generateFlowId(),
    name,
    source,
    steps = [],
    destination,
    dataTypes = [],
    sensitivity,
    retention,
  } = flowDefinition;

  return {
    id,
    name,
    source,
    transformations: steps.map((step, index) => ({
      ...step,
      order: index + 1,
    })),
    destination,
    dataTypes,
    sensitivity: sensitivity || 'unclassified',
    retention: retention || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a unique flow ID
 * @returns {string} Generated ID
 */
function generateFlowId() {
  return `flow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Classify data types by sensitivity level
 * @param {Array} dataTypes - Array of data type objects with name and optional value
 * @returns {Array} Array of classified data types
 */
export function classifyData(dataTypes) {
  return dataTypes.map((dataType) => {
    const name = typeof dataType === 'string' ? dataType : dataType.name;
    const lowerName = name.toLowerCase();

    let sensitivity = 'low';
    let reason = 'No sensitive patterns detected';

    // Check against sensitivity rules
    for (const [level, keywords] of Object.entries(SENSITIVITY_RULES)) {
      if (keywords.some((keyword) => lowerName.includes(keyword))) {
        sensitivity = level;
        reason = `Matches ${level} sensitivity pattern: ${keywords.find((k) => lowerName.includes(k))}`;
        break;
      }
    }

    // Special handling for PII that might have different labels
    if (sensitivity === 'high' && isPII(lowerName)) {
      reason = `Personal Identifiable Information (PII): ${name}`;
    }

    return {
      name,
      value: dataType.value,
      sensitivity,
      reason,
      classification: getSensitivityLabel(sensitivity),
    };
  });
}

/**
 * Check if a data type is PII
 * @param {string} name - Data type name (lowercase)
 * @returns {boolean} True if PII
 */
function isPII(name) {
  const piiPatterns = ['email', 'phone', 'address', 'name', 'dob', 'birth'];
  return piiPatterns.some((pattern) => name.includes(pattern));
}

/**
 * Get a human-readable sensitivity label
 * @param {string} level - Sensitivity level
 * @returns {string} Human-readable label
 */
function getSensitivityLabel(level) {
  const labels = {
    critical: 'Critical - Requires encryption and strict access control',
    high: 'High - Contains PII, requires protection',
    medium: 'Medium - Internal use, standard protection',
    low: 'Low - Non-sensitive data',
    public: 'Public - Can be freely shared',
  };
  return labels[level] || 'Unclassified';
}

/**
 * Generate a Mermaid flow diagram for a data flow
 * @param {Object} flow - Data flow object
 * @returns {string} Mermaid diagram syntax
 */
export function generateFlowDiagram(flow) {
  const lines = ['flowchart LR'];
  const nodeIds = [];

  // Add source node
  const sourceId = 'source';
  const sourceShape = getNodeShape(flow.source.type, flow.source.name);
  lines.push(`    ${sourceId}${sourceShape}`);
  nodeIds.push(sourceId);

  // Add transformation nodes
  if (flow.transformations && flow.transformations.length > 0) {
    flow.transformations.forEach((transform, index) => {
      const nodeId = `step${index + 1}`;
      const label = transform.step || transform.description;
      lines.push(`    ${nodeId}[${label}]`);
      nodeIds.push(nodeId);
    });
  }

  // Add destination node
  const destId = 'dest';
  const destShape = getNodeShape(flow.destination.type, flow.destination.name);
  lines.push(`    ${destId}${destShape}`);
  nodeIds.push(destId);

  // Add connections
  for (let i = 0; i < nodeIds.length - 1; i++) {
    lines.push(`    ${nodeIds[i]} --> ${nodeIds[i + 1]}`);
  }

  return lines.join('\n');
}

/**
 * Get the Mermaid node shape for a given type
 * @param {string} type - Node type (user_input, api, database)
 * @param {string} name - Node name/label
 * @returns {string} Mermaid node syntax
 */
function getNodeShape(type, name) {
  switch (type) {
    case 'database':
      return `[(${name})]`;
    case 'api':
      return `{{${name}}}`;
    case 'user_input':
    default:
      return `[${name}]`;
  }
}

/**
 * Document retention policy for a data flow
 * @param {Object} dataFlow - Data flow object
 * @param {Object} retentionPolicy - Optional custom retention policy
 * @returns {Object} Data flow with retention documentation
 */
export function documentRetention(dataFlow, retentionPolicy = {}) {
  const {
    default: defaultRetention = DEFAULT_RETENTION[dataFlow.sensitivity] || '5 years',
    byType = {},
    legal = null,
    deletionProcedure = 'Standard secure deletion',
  } = retentionPolicy;

  return {
    ...dataFlow,
    retention: {
      default: defaultRetention,
      byType,
      legal,
      deletionProcedure,
      lastReviewed: new Date().toISOString(),
    },
  };
}

/**
 * Get inventory of all data types across flows
 * @param {DataFlowDocumenter} documenter - Documenter instance
 * @returns {Array} Array of unique data types with metadata
 */
export function getDataInventory(documenter) {
  const inventory = new Map();

  for (const flow of documenter.getFlows()) {
    for (const dataType of flow.dataTypes || []) {
      const name = typeof dataType === 'string' ? dataType : dataType.name;

      if (!inventory.has(name)) {
        const classification = classifyData([{ name }])[0];
        inventory.set(name, {
          name,
          sensitivity: classification.sensitivity,
          reason: classification.reason,
          usedInFlows: [],
        });
      }

      inventory.get(name).usedInFlows.push(flow.id);
    }
  }

  return Array.from(inventory.values());
}

/**
 * Get lineage information for a specific data type
 * @param {DataFlowDocumenter} documenter - Documenter instance
 * @param {string} dataTypeName - Name of the data type to trace
 * @returns {Object} Lineage information
 */
export function getDataLineage(documenter, dataTypeName) {
  const flows = documenter.getFlows().filter((flow) => {
    const dataTypes = flow.dataTypes || [];
    return dataTypes.some((dt) => {
      const name = typeof dt === 'string' ? dt : dt.name;
      return name === dataTypeName;
    });
  });

  const path = [];
  if (flows.length > 0) {
    // Build path from flows
    for (const flow of flows) {
      if (!path.includes(flow.source.name)) {
        path.push(flow.source.name);
      }
      for (const transform of flow.transformations || []) {
        const stepName = transform.step || transform.description;
        if (!path.includes(stepName)) {
          path.push(stepName);
        }
      }
      if (!path.includes(flow.destination.name)) {
        path.push(flow.destination.name);
      }
    }
  }

  return {
    dataType: dataTypeName,
    flows,
    path: path.join(' -> '),
    totalFlows: flows.length,
  };
}

/**
 * Export data flow report in various formats
 * @param {DataFlowDocumenter} documenter - Documenter instance
 * @param {Object} options - Export options
 * @returns {Object|string} Report in specified format
 */
export function exportDataFlowReport(documenter, options = {}) {
  const { format = 'json', includeDiagrams = false } = options;

  const flows = documenter.getFlows();
  const inventory = getDataInventory(documenter);

  // Build sensitivity summary
  const sensitivitySummary = {
    critical: inventory.filter((d) => d.sensitivity === 'critical').length,
    high: inventory.filter((d) => d.sensitivity === 'high').length,
    medium: inventory.filter((d) => d.sensitivity === 'medium').length,
    low: inventory.filter((d) => d.sensitivity === 'low').length,
  };

  // Build diagrams if requested
  const diagrams = {};
  if (includeDiagrams) {
    for (const flow of flows) {
      diagrams[flow.id] = generateFlowDiagram(flow);
    }
  }

  const report = {
    title: 'Data Flow Report',
    generatedAt: new Date().toISOString(),
    flows,
    dataInventory: inventory,
    sensitivitySummary,
    diagrams: includeDiagrams ? diagrams : undefined,
    totalFlows: flows.length,
    totalDataTypes: inventory.length,
  };

  if (format === 'markdown') {
    return generateMarkdownReport(report);
  }

  if (format === 'compliance') {
    return {
      ...report,
      complianceInfo: {
        gdprRelevant: inventory.some((d) => d.sensitivity === 'critical' || d.sensitivity === 'high'),
        piiCount: inventory.filter((d) => d.sensitivity === 'high').length,
        sensitiveCount: inventory.filter((d) => d.sensitivity === 'critical').length,
      },
    };
  }

  return report;
}

/**
 * Generate markdown report
 * @param {Object} report - Report object
 * @returns {string} Markdown formatted report
 */
function generateMarkdownReport(report) {
  const lines = [
    '# Data Flow Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Total Flows: ${report.totalFlows}`,
    `- Total Data Types: ${report.totalDataTypes}`,
    '',
    '### Sensitivity Distribution',
    '',
    `- Critical: ${report.sensitivitySummary.critical}`,
    `- High: ${report.sensitivitySummary.high}`,
    `- Medium: ${report.sensitivitySummary.medium}`,
    `- Low: ${report.sensitivitySummary.low}`,
    '',
    '## Flows',
    '',
  ];

  for (const flow of report.flows) {
    lines.push(`### ${flow.name}`);
    lines.push('');
    lines.push(`- **ID:** ${flow.id}`);
    lines.push(`- **Source:** ${flow.source.type} - ${flow.source.name}`);
    lines.push(`- **Destination:** ${flow.destination.type} - ${flow.destination.name}`);
    lines.push(`- **Sensitivity:** ${flow.sensitivity}`);
    if (flow.retention) {
      lines.push(`- **Retention:** ${flow.retention}`);
    }
    lines.push('');

    if (flow.transformations && flow.transformations.length > 0) {
      lines.push('**Transformations:**');
      for (const t of flow.transformations) {
        lines.push(`- ${t.step}: ${t.description}`);
      }
      lines.push('');
    }

    if (report.diagrams && report.diagrams[flow.id]) {
      lines.push('```mermaid');
      lines.push(report.diagrams[flow.id]);
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('## Data Inventory');
  lines.push('');
  lines.push('| Data Type | Sensitivity | Used In Flows |');
  lines.push('|-----------|-------------|---------------|');

  for (const item of report.dataInventory) {
    lines.push(`| ${item.name} | ${item.sensitivity} | ${item.usedInFlows.join(', ')} |`);
  }

  return lines.join('\n');
}

/**
 * DataFlowDocumenter class for managing data flows
 */
export class DataFlowDocumenter {
  constructor() {
    this.flows = new Map();
  }

  /**
   * Add a data flow
   * @param {Object} flow - Flow definition
   */
  addDataFlow(flow) {
    const trackedFlow = trackDataFlow(flow);
    this.flows.set(trackedFlow.id, trackedFlow);
  }

  /**
   * Get all flows
   * @returns {Array} Array of all flows
   */
  getFlows() {
    return Array.from(this.flows.values());
  }

  /**
   * Get a specific flow by ID
   * @param {string} id - Flow ID
   * @returns {Object|undefined} Flow or undefined
   */
  getFlowById(id) {
    return this.flows.get(id);
  }

  /**
   * Remove a data flow
   * @param {string} id - Flow ID to remove
   */
  removeDataFlow(id) {
    this.flows.delete(id);
  }

  /**
   * Update an existing data flow
   * @param {string} id - Flow ID to update
   * @param {Object} updates - Updates to apply
   */
  updateDataFlow(id, updates) {
    const existing = this.flows.get(id);
    if (existing) {
      this.flows.set(id, { ...existing, ...updates });
    }
  }

  /**
   * Get flow count
   * @returns {number} Number of flows
   */
  getFlowCount() {
    return this.flows.size;
  }

  /**
   * Clear all flows
   */
  clear() {
    this.flows.clear();
  }
}
