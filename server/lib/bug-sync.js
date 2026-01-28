/**
 * Bug Sync Module
 * Handles bi-directional sync between TLC bugs and issue trackers
 */

const fs = require('fs');
const path = require('path');
const { parseIssue, normalizeStatus, normalizePriority } = require('./issue-tracker.js');

/**
 * Bug status mappings
 */
const BUG_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  WONTFIX: 'wontfix',
};

/**
 * Parse TLC bug from BUGS.md format
 * @param {string} bugText - Bug text block
 * @returns {Object} Parsed bug
 */
function parseBugFromMarkdown(bugText) {
  const bug = {
    id: null,
    title: '',
    description: '',
    status: BUG_STATUS.OPEN,
    priority: 'medium',
    reporter: null,
    assignee: null,
    issueId: null,
    createdAt: null,
    labels: [],
  };

  // Extract ID from header: ## BUG-001: Title
  const headerMatch = /^##\s+(BUG-\d+):\s*(.+)$/m.exec(bugText);
  if (headerMatch) {
    bug.id = headerMatch[1];
    bug.title = headerMatch[2].trim();
  }

  // Extract status: **Status:** open
  const statusMatch = /\*\*Status:\*\*\s*(\w+)/i.exec(bugText);
  if (statusMatch) {
    bug.status = statusMatch[1].toLowerCase();
  }

  // Extract priority: **Priority:** high
  const priorityMatch = /\*\*Priority:\*\*\s*(\w+)/i.exec(bugText);
  if (priorityMatch) {
    bug.priority = normalizePriority(priorityMatch[1]);
  }

  // Extract reporter: **Reporter:** @alice
  const reporterMatch = /\*\*Reporter:\*\*\s*@?(\S+)/i.exec(bugText);
  if (reporterMatch) {
    bug.reporter = reporterMatch[1];
  }

  // Extract assignee: **Assignee:** @bob
  const assigneeMatch = /\*\*Assignee:\*\*\s*@?(\S+)/i.exec(bugText);
  if (assigneeMatch) {
    bug.assignee = assigneeMatch[1];
  }

  // Extract linked issue: **Issue:** TLC-123 or **Issue:** #123
  const issueMatch = /\*\*Issue:\*\*\s*([#\w-]+)/i.exec(bugText);
  if (issueMatch) {
    bug.issueId = issueMatch[1];
  }

  // Extract created date: **Created:** 2024-01-15
  const createdMatch = /\*\*Created:\*\*\s*(\S+)/i.exec(bugText);
  if (createdMatch) {
    bug.createdAt = createdMatch[1];
  }

  // Extract labels: **Labels:** bug, critical
  const labelsMatch = /\*\*Labels:\*\*\s*(.+)$/im.exec(bugText);
  if (labelsMatch) {
    bug.labels = labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean);
  }

  // Extract description (everything after metadata)
  const descStart = bugText.indexOf('### Description');
  if (descStart !== -1) {
    const descEnd = bugText.indexOf('###', descStart + 1);
    bug.description = descEnd !== -1
      ? bugText.slice(descStart + 15, descEnd).trim()
      : bugText.slice(descStart + 15).trim();
  }

  return bug;
}

/**
 * Parse all bugs from BUGS.md
 * @param {string} content - BUGS.md content
 * @returns {Array} Parsed bugs
 */
function parseBugsFile(content) {
  if (!content) return [];

  const bugs = [];
  const bugBlocks = content.split(/(?=^## BUG-)/m);

  for (const block of bugBlocks) {
    if (block.trim().startsWith('## BUG-')) {
      bugs.push(parseBugFromMarkdown(block));
    }
  }

  return bugs;
}

/**
 * Format bug as markdown
 * @param {Object} bug - Bug object
 * @returns {string} Markdown formatted bug
 */
function formatBugMarkdown(bug) {
  const lines = [];

  lines.push(`## ${bug.id}: ${bug.title}`);
  lines.push('');
  lines.push(`**Status:** ${bug.status}`);
  lines.push(`**Priority:** ${bug.priority}`);

  if (bug.reporter) {
    lines.push(`**Reporter:** @${bug.reporter}`);
  }

  if (bug.assignee) {
    lines.push(`**Assignee:** @${bug.assignee}`);
  }

  if (bug.issueId) {
    lines.push(`**Issue:** ${bug.issueId}`);
  }

  if (bug.createdAt) {
    lines.push(`**Created:** ${bug.createdAt}`);
  }

  if (bug.labels.length > 0) {
    lines.push(`**Labels:** ${bug.labels.join(', ')}`);
  }

  lines.push('');

  if (bug.description) {
    lines.push('### Description');
    lines.push('');
    lines.push(bug.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Convert bug to issue format for creating in tracker
 * @param {Object} bug - TLC bug
 * @param {string} trackerType - Target tracker type
 * @returns {Object} Issue format for tracker
 */
function bugToIssue(bug, trackerType) {
  const issue = {
    title: `[BUG] ${bug.title}`,
    body: formatBugDescription(bug),
    labels: ['bug', ...bug.labels],
  };

  // Add priority label
  if (bug.priority === 'urgent' || bug.priority === 'high') {
    issue.labels.push(`priority:${bug.priority}`);
  }

  // Tracker-specific formatting
  switch (trackerType) {
    case 'linear':
      issue.description = issue.body;
      delete issue.body;
      break;
    case 'jira':
      issue.fields = {
        summary: issue.title,
        description: issue.body,
        issuetype: { name: 'Bug' },
        labels: issue.labels,
      };
      break;
    default:
      // GitHub/GitLab format is default
      break;
  }

  return issue;
}

/**
 * Format bug description for issue tracker
 * @param {Object} bug - TLC bug
 * @returns {string} Formatted description
 */
function formatBugDescription(bug) {
  const lines = [];

  lines.push('## Bug Report');
  lines.push('');
  lines.push(`**TLC Bug ID:** ${bug.id}`);
  lines.push(`**Priority:** ${bug.priority}`);

  if (bug.reporter) {
    lines.push(`**Reporter:** ${bug.reporter}`);
  }

  if (bug.createdAt) {
    lines.push(`**Created:** ${bug.createdAt}`);
  }

  lines.push('');
  lines.push('### Description');
  lines.push('');
  lines.push(bug.description || 'No description provided.');
  lines.push('');
  lines.push('---');
  lines.push('*Created from TLC Bug Tracker*');

  return lines.join('\n');
}

/**
 * Convert issue to bug format
 * @param {Object} issue - Normalized issue
 * @returns {Object} Bug format
 */
function issueToBug(issue) {
  // Check if this is a bug-type issue
  const isBug = issue.labels?.some(l =>
    ['bug', 'defect', 'error', 'issue'].includes(l.toLowerCase())
  );

  return {
    id: null, // Will be assigned when added to BUGS.md
    title: issue.title.replace(/^\[BUG\]\s*/i, ''),
    description: issue.description,
    status: mapIssueStatusToBugStatus(issue.status),
    priority: issue.priority,
    reporter: null,
    assignee: issue.assignee,
    issueId: issue.id,
    createdAt: issue.createdAt,
    labels: issue.labels.filter(l => !['bug', 'defect'].includes(l.toLowerCase())),
    isBug,
  };
}

/**
 * Map issue status to bug status
 * @param {string} issueStatus - Issue status
 * @returns {string} Bug status
 */
function mapIssueStatusToBugStatus(issueStatus) {
  const statusMap = {
    todo: BUG_STATUS.OPEN,
    in_progress: BUG_STATUS.IN_PROGRESS,
    done: BUG_STATUS.FIXED,
    cancelled: BUG_STATUS.WONTFIX,
  };

  return statusMap[issueStatus] || BUG_STATUS.OPEN;
}

/**
 * Map bug status to issue status
 * @param {string} bugStatus - Bug status
 * @returns {string} Issue status (normalized)
 */
function mapBugStatusToIssueStatus(bugStatus) {
  const statusMap = {
    [BUG_STATUS.OPEN]: 'todo',
    [BUG_STATUS.IN_PROGRESS]: 'in_progress',
    [BUG_STATUS.FIXED]: 'done',
    [BUG_STATUS.VERIFIED]: 'done',
    [BUG_STATUS.CLOSED]: 'done',
    [BUG_STATUS.WONTFIX]: 'cancelled',
  };

  return statusMap[bugStatus] || 'todo';
}

/**
 * Find bugs that need to be synced to issue tracker
 * @param {Array} bugs - TLC bugs
 * @returns {Array} Bugs to sync (no issueId)
 */
function findBugsToSync(bugs) {
  return bugs.filter(bug => !bug.issueId && bug.status !== BUG_STATUS.CLOSED);
}

/**
 * Find bugs that have linked issues and need status sync
 * @param {Array} bugs - TLC bugs
 * @param {Array} issues - Issues from tracker
 * @returns {Array} Sync updates
 */
function findStatusUpdates(bugs, issues) {
  const updates = [];
  const issueMap = new Map(issues.map(i => [i.id, i]));

  for (const bug of bugs) {
    if (!bug.issueId) continue;

    const issue = issueMap.get(bug.issueId);
    if (!issue) continue;

    const expectedBugStatus = mapIssueStatusToBugStatus(issue.status);

    if (bug.status !== expectedBugStatus) {
      updates.push({
        bugId: bug.id,
        issueId: bug.issueId,
        currentStatus: bug.status,
        newStatus: expectedBugStatus,
        issueStatus: issue.status,
      });
    }
  }

  return updates;
}

/**
 * Generate next bug ID
 * @param {Array} bugs - Existing bugs
 * @returns {string} Next bug ID
 */
function generateBugId(bugs) {
  let maxNum = 0;

  for (const bug of bugs) {
    const match = /BUG-(\d+)/.exec(bug.id);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `BUG-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generate sync report
 * @param {Object} syncResult - Sync operation result
 * @returns {string} Sync report markdown
 */
function generateSyncReport(syncResult) {
  const lines = [];

  lines.push('# Bug Sync Report');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  if (syncResult.created.length > 0) {
    lines.push('## Created Issues');
    lines.push('');
    for (const item of syncResult.created) {
      lines.push(`- ${item.bugId} → ${item.issueId}`);
    }
    lines.push('');
  }

  if (syncResult.updated.length > 0) {
    lines.push('## Status Updates');
    lines.push('');
    lines.push('| Bug | Issue | Old Status | New Status |');
    lines.push('|-----|-------|------------|------------|');
    for (const item of syncResult.updated) {
      lines.push(`| ${item.bugId} | ${item.issueId} | ${item.currentStatus} | ${item.newStatus} |`);
    }
    lines.push('');
  }

  if (syncResult.imported.length > 0) {
    lines.push('## Imported Bugs');
    lines.push('');
    for (const item of syncResult.imported) {
      lines.push(`- ${item.issueId} → ${item.bugId}`);
    }
    lines.push('');
  }

  if (syncResult.created.length === 0 &&
      syncResult.updated.length === 0 &&
      syncResult.imported.length === 0) {
    lines.push('No changes to sync.');
  }

  return lines.join('\n');
}

/**
 * Create bug sync handler
 * @param {Object} options - Handler options
 * @returns {Object} Bug sync handler
 */
function createBugSync(options = {}) {
  return {
    parseBugFromMarkdown,
    parseBugsFile,
    formatBugMarkdown,
    bugToIssue,
    issueToBug,
    mapIssueStatusToBugStatus,
    mapBugStatusToIssueStatus,
    findBugsToSync,
    findStatusUpdates,
    generateBugId,
    generateSyncReport,
    formatBugDescription,
  };
}

module.exports = {
  BUG_STATUS,
  parseBugFromMarkdown,
  parseBugsFile,
  formatBugMarkdown,
  bugToIssue,
  formatBugDescription,
  issueToBug,
  mapIssueStatusToBugStatus,
  mapBugStatusToIssueStatus,
  findBugsToSync,
  findStatusUpdates,
  generateBugId,
  generateSyncReport,
  createBugSync,
};
