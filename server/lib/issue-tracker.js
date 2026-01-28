/**
 * Issue Tracker Module
 * Core interface for integrating with issue tracking systems
 */

/**
 * Supported issue tracker types
 */
const TRACKER_TYPES = {
  LINEAR: 'linear',
  GITHUB: 'github',
  JIRA: 'jira',
  GITLAB: 'gitlab',
};

/**
 * Issue status mappings
 */
const STATUS_MAP = {
  todo: ['todo', 'backlog', 'open', 'new', 'to do'],
  in_progress: ['in progress', 'in_progress', 'doing', 'started', 'active'],
  done: ['done', 'closed', 'completed', 'resolved', 'fixed'],
  cancelled: ['cancelled', 'canceled', 'wontfix', "won't fix", 'duplicate'],
};

/**
 * Issue priority mappings
 */
const PRIORITY_MAP = {
  urgent: ['urgent', 'critical', 'p0', 'highest', 'blocker'],
  high: ['high', 'p1', 'important'],
  medium: ['medium', 'normal', 'p2', 'default'],
  low: ['low', 'p3', 'minor', 'trivial'],
};

/**
 * Normalize status to TLC status
 * @param {string} status - Issue tracker status
 * @returns {string} Normalized status
 */
function normalizeStatus(status) {
  if (!status) return 'todo';

  const lower = status.toLowerCase();

  for (const [normalized, values] of Object.entries(STATUS_MAP)) {
    if (values.some(v => lower.includes(v))) {
      return normalized;
    }
  }

  return 'todo';
}

/**
 * Normalize priority to TLC priority
 * @param {string} priority - Issue tracker priority
 * @returns {string} Normalized priority
 */
function normalizePriority(priority) {
  if (!priority) return 'medium';

  const lower = priority.toLowerCase();

  for (const [normalized, values] of Object.entries(PRIORITY_MAP)) {
    if (values.some(v => lower.includes(v))) {
      return normalized;
    }
  }

  return 'medium';
}

/**
 * Parse issue from Linear format
 * @param {Object} issue - Linear issue object
 * @returns {Object} Normalized issue
 */
function parseLinearIssue(issue) {
  return {
    id: issue.identifier || issue.id,
    title: issue.title,
    description: issue.description || '',
    status: normalizeStatus(issue.state?.name),
    priority: normalizePriority(issue.priority?.toString()),
    labels: issue.labels?.nodes?.map(l => l.name) || [],
    assignee: issue.assignee?.name || issue.assignee?.email || null,
    url: issue.url,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    source: 'linear',
    raw: issue,
  };
}

/**
 * Parse issue from GitHub format
 * @param {Object} issue - GitHub issue object
 * @returns {Object} Normalized issue
 */
function parseGitHubIssue(issue) {
  return {
    id: `#${issue.number}`,
    title: issue.title,
    description: issue.body || '',
    status: normalizeStatus(issue.state),
    priority: normalizePriority(
      issue.labels?.find(l => PRIORITY_MAP.urgent.concat(PRIORITY_MAP.high, PRIORITY_MAP.medium, PRIORITY_MAP.low)
        .some(p => l.name?.toLowerCase().includes(p)))?.name
    ),
    labels: issue.labels?.map(l => l.name) || [],
    assignee: issue.assignee?.login || issue.assignees?.[0]?.login || null,
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    source: 'github',
    raw: issue,
  };
}

/**
 * Parse issue from Jira format
 * @param {Object} issue - Jira issue object
 * @returns {Object} Normalized issue
 */
function parseJiraIssue(issue) {
  const fields = issue.fields || {};

  return {
    id: issue.key,
    title: fields.summary,
    description: fields.description || '',
    status: normalizeStatus(fields.status?.name),
    priority: normalizePriority(fields.priority?.name),
    labels: fields.labels || [],
    assignee: fields.assignee?.displayName || fields.assignee?.emailAddress || null,
    url: issue.self?.replace('/rest/api/2/issue/', '/browse/'),
    createdAt: fields.created,
    updatedAt: fields.updated,
    source: 'jira',
    raw: issue,
  };
}

/**
 * Parse issue from GitLab format
 * @param {Object} issue - GitLab issue object
 * @returns {Object} Normalized issue
 */
function parseGitLabIssue(issue) {
  return {
    id: `#${issue.iid}`,
    title: issue.title,
    description: issue.description || '',
    status: normalizeStatus(issue.state),
    priority: normalizePriority(
      issue.labels?.find(l => l.toLowerCase().includes('priority'))
    ),
    labels: issue.labels || [],
    assignee: issue.assignee?.username || issue.assignees?.[0]?.username || null,
    url: issue.web_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    source: 'gitlab',
    raw: issue,
  };
}

/**
 * Parse issue based on source type
 * @param {Object} issue - Raw issue object
 * @param {string} source - Source type
 * @returns {Object} Normalized issue
 */
function parseIssue(issue, source) {
  switch (source) {
    case TRACKER_TYPES.LINEAR:
      return parseLinearIssue(issue);
    case TRACKER_TYPES.GITHUB:
      return parseGitHubIssue(issue);
    case TRACKER_TYPES.JIRA:
      return parseJiraIssue(issue);
    case TRACKER_TYPES.GITLAB:
      return parseGitLabIssue(issue);
    default:
      return {
        id: issue.id || issue.key || issue.number,
        title: issue.title || issue.summary || issue.name,
        description: issue.description || issue.body || '',
        status: normalizeStatus(issue.status || issue.state),
        priority: normalizePriority(issue.priority),
        labels: issue.labels || [],
        assignee: issue.assignee,
        url: issue.url || issue.html_url || issue.web_url,
        source: 'unknown',
        raw: issue,
      };
  }
}

/**
 * Extract acceptance criteria from description
 * @param {string} description - Issue description
 * @returns {Array} Acceptance criteria
 */
function extractAcceptanceCriteria(description) {
  if (!description) return [];

  const criteria = [];

  // Look for common acceptance criteria patterns
  const patterns = [
    // Checkbox lists: - [ ] or * [ ]
    /^[\s]*[-*]\s*\[[\sx]?\]\s*(.+)$/gm,
    // Numbered lists under "Acceptance Criteria" header
    /(?:acceptance criteria|ac|requirements)[\s:]*\n((?:[\s]*\d+\.\s*.+\n?)+)/gi,
    // "Given/When/Then" format
    /given\s+(.+?)\s+when\s+(.+?)\s+then\s+(.+?)(?:\n|$)/gi,
    // "Should" statements
    /(?:^|\n)[\s]*[-*]?\s*(?:it\s+)?should\s+(.+?)(?:\n|$)/gi,
  ];

  // Extract checkbox items
  const checkboxRegex = /^[\s]*[-*]\s*\[[\sx]?\]\s*(.+)$/gm;
  let match;
  while ((match = checkboxRegex.exec(description)) !== null) {
    criteria.push(match[1].trim());
  }

  // Extract "should" statements
  const shouldRegex = /(?:^|\n)[\s]*[-*]?\s*(?:it\s+)?should\s+(.+)/gi;
  while ((match = shouldRegex.exec(description)) !== null) {
    const criterion = match[1].trim();
    if (criterion && !criteria.includes(criterion)) {
      criteria.push(criterion);
    }
  }

  return criteria;
}

/**
 * Extract test cases from description
 * @param {string} description - Issue description
 * @returns {Array} Test cases
 */
function extractTestCases(description) {
  if (!description) return [];

  const testCases = [];

  // Look for test case patterns
  // "Test:" or "Test Case:" sections
  const testSectionRegex = /(?:test cases?|tests?)[\s:]*\n((?:[\s]*[-*\d.]+\s*.+\n?)+)/gi;
  let match;

  while ((match = testSectionRegex.exec(description)) !== null) {
    const section = match[1];
    const items = section.split('\n')
      .map(line => line.replace(/^[\s]*[-*\d.]+\s*/, '').trim())
      .filter(Boolean);
    testCases.push(...items);
  }

  // Look for Given/When/Then format
  const gwtRegex = /given\s+(.+?)\s+when\s+(.+?)\s+then\s+(.+?)(?:\n|$)/gi;
  while ((match = gwtRegex.exec(description)) !== null) {
    testCases.push({
      given: match[1].trim(),
      when: match[2].trim(),
      then: match[3].trim(),
    });
  }

  return testCases;
}

/**
 * Generate test spec from issue
 * @param {Object} issue - Normalized issue
 * @returns {Object} Test specification
 */
function generateTestSpec(issue) {
  const acceptanceCriteria = extractAcceptanceCriteria(issue.description);
  const testCases = extractTestCases(issue.description);

  return {
    issueId: issue.id,
    title: issue.title,
    description: issue.description,
    acceptanceCriteria,
    testCases: testCases.length > 0 ? testCases : acceptanceCriteria.map(ac => ({
      description: ac,
      type: 'acceptance',
    })),
    labels: issue.labels,
    priority: issue.priority,
  };
}

/**
 * Format test spec as markdown
 * @param {Object} spec - Test specification
 * @returns {string} Markdown test spec
 */
function formatTestSpecMarkdown(spec) {
  const lines = [];

  lines.push(`# Test Spec: ${spec.title}`);
  lines.push('');
  lines.push(`**Issue:** ${spec.issueId}`);
  lines.push(`**Priority:** ${spec.priority}`);

  if (spec.labels.length > 0) {
    lines.push(`**Labels:** ${spec.labels.join(', ')}`);
  }

  lines.push('');

  if (spec.description) {
    lines.push('## Description');
    lines.push('');
    lines.push(spec.description);
    lines.push('');
  }

  if (spec.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    lines.push('');
    for (const ac of spec.acceptanceCriteria) {
      lines.push(`- [ ] ${ac}`);
    }
    lines.push('');
  }

  if (spec.testCases.length > 0) {
    lines.push('## Test Cases');
    lines.push('');

    for (let i = 0; i < spec.testCases.length; i++) {
      const tc = spec.testCases[i];

      if (typeof tc === 'string') {
        lines.push(`### Test ${i + 1}: ${tc}`);
        lines.push('');
        lines.push('**Steps:**');
        lines.push('1. TBD');
        lines.push('');
        lines.push('**Expected:** TBD');
        lines.push('');
      } else if (tc.given) {
        lines.push(`### Test ${i + 1}`);
        lines.push('');
        lines.push(`**Given:** ${tc.given}`);
        lines.push(`**When:** ${tc.when}`);
        lines.push(`**Then:** ${tc.then}`);
        lines.push('');
      } else {
        lines.push(`### Test ${i + 1}: ${tc.description || 'Test case'}`);
        lines.push('');
        lines.push(`**Type:** ${tc.type || 'functional'}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Map TLC status to issue tracker status
 * @param {string} tlcStatus - TLC status
 * @param {string} tracker - Tracker type
 * @returns {string} Tracker-specific status
 */
function mapStatusToTracker(tlcStatus, tracker) {
  const mappings = {
    [TRACKER_TYPES.LINEAR]: {
      todo: 'Todo',
      in_progress: 'In Progress',
      done: 'Done',
      cancelled: 'Cancelled',
    },
    [TRACKER_TYPES.GITHUB]: {
      todo: 'open',
      in_progress: 'open',
      done: 'closed',
      cancelled: 'closed',
    },
    [TRACKER_TYPES.JIRA]: {
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done',
      cancelled: 'Cancelled',
    },
    [TRACKER_TYPES.GITLAB]: {
      todo: 'opened',
      in_progress: 'opened',
      done: 'closed',
      cancelled: 'closed',
    },
  };

  return mappings[tracker]?.[tlcStatus] || tlcStatus;
}

/**
 * Create issue tracker interface
 * @param {Object} options - Tracker options
 * @returns {Object} Tracker interface
 */
function createIssueTracker(options = {}) {
  const { type = TRACKER_TYPES.GITHUB } = options;

  return {
    type,
    parseIssue: (issue) => parseIssue(issue, type),
    normalizeStatus,
    normalizePriority,
    extractAcceptanceCriteria,
    extractTestCases,
    generateTestSpec,
    formatTestSpecMarkdown,
    mapStatusToTracker: (status) => mapStatusToTracker(status, type),
  };
}

module.exports = {
  TRACKER_TYPES,
  STATUS_MAP,
  PRIORITY_MAP,
  normalizeStatus,
  normalizePriority,
  parseLinearIssue,
  parseGitHubIssue,
  parseJiraIssue,
  parseGitLabIssue,
  parseIssue,
  extractAcceptanceCriteria,
  extractTestCases,
  generateTestSpec,
  formatTestSpecMarkdown,
  mapStatusToTracker,
  createIssueTracker,
};
