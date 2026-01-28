/**
 * Issue Command Module
 * Handles /tlc:issue command for importing and syncing issues
 */

const fs = require('fs');
const path = require('path');
const {
  TRACKER_TYPES,
  parseIssue,
  generateTestSpec,
  formatTestSpecMarkdown,
  mapStatusToTracker,
  createIssueTracker,
} = require('./issue-tracker.js');

/**
 * Parse issue command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseIssueArgs(args = '') {
  const options = {
    action: 'import', // import, sync, status, list
    issueId: null,
    tracker: null,
    output: null,
    format: 'markdown', // markdown, json
    dryRun: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === 'import' || part === 'sync' || part === 'status' || part === 'list') {
      options.action = part;
    } else if (part === '--tracker' && parts[i + 1]) {
      options.tracker = parts[++i];
    } else if (part === '--output' && parts[i + 1]) {
      options.output = parts[++i];
    } else if (part === '--format' && parts[i + 1]) {
      options.format = parts[++i];
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (part === '--json') {
      options.format = 'json';
    } else if (!part.startsWith('-') && !options.issueId) {
      options.issueId = part;
    }
  }

  return options;
}

/**
 * Load TLC config
 * @param {string} projectDir - Project directory
 * @returns {Object} Config or defaults
 */
function loadConfig(projectDir) {
  const configPath = path.join(projectDir, '.tlc.json');

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors
  }

  return {};
}

/**
 * Save TLC config
 * @param {string} projectDir - Project directory
 * @param {Object} config - Config to save
 */
function saveConfig(projectDir, config) {
  const configPath = path.join(projectDir, '.tlc.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get tracker type from config or detection
 * @param {Object} config - TLC config
 * @param {string} override - Explicit tracker override
 * @returns {string} Tracker type
 */
function getTrackerType(config, override) {
  if (override) {
    return override;
  }

  if (config.issueTracker?.type) {
    return config.issueTracker.type;
  }

  // Default to GitHub
  return TRACKER_TYPES.GITHUB;
}

/**
 * Format issue for display
 * @param {Object} issue - Normalized issue
 * @returns {string} Formatted issue
 */
function formatIssueDisplay(issue) {
  const lines = [];

  lines.push(`## ${issue.id}: ${issue.title}`);
  lines.push('');
  lines.push(`**Status:** ${issue.status}`);
  lines.push(`**Priority:** ${issue.priority}`);

  if (issue.assignee) {
    lines.push(`**Assignee:** ${issue.assignee}`);
  }

  if (issue.labels.length > 0) {
    lines.push(`**Labels:** ${issue.labels.join(', ')}`);
  }

  if (issue.url) {
    lines.push(`**URL:** ${issue.url}`);
  }

  lines.push('');

  if (issue.description) {
    lines.push('### Description');
    lines.push('');
    lines.push(issue.description.slice(0, 500));
    if (issue.description.length > 500) {
      lines.push('...');
    }
  }

  return lines.join('\n');
}

/**
 * Format issues list for display
 * @param {Array} issues - Normalized issues
 * @returns {string} Formatted list
 */
function formatIssuesList(issues) {
  const lines = [];

  lines.push('# Issues');
  lines.push('');
  lines.push('| ID | Title | Status | Priority | Assignee |');
  lines.push('|----|-------|--------|----------|----------|');

  for (const issue of issues) {
    const title = issue.title.length > 40
      ? issue.title.slice(0, 37) + '...'
      : issue.title;
    const assignee = issue.assignee || '-';

    lines.push(`| ${issue.id} | ${title} | ${issue.status} | ${issue.priority} | ${assignee} |`);
  }

  return lines.join('\n');
}

/**
 * Import issue and generate test spec
 * @param {Object} issue - Raw issue data
 * @param {string} trackerType - Tracker type
 * @param {Object} options - Import options
 * @returns {Object} Import result
 */
function importIssue(issue, trackerType, options = {}) {
  const normalized = parseIssue(issue, trackerType);
  const testSpec = generateTestSpec(normalized);

  const result = {
    issue: normalized,
    testSpec,
  };

  if (options.format === 'markdown') {
    result.markdown = formatTestSpecMarkdown(testSpec);
  }

  if (options.format === 'json') {
    result.json = JSON.stringify(testSpec, null, 2);
  }

  return result;
}

/**
 * Write test spec to file
 * @param {Object} result - Import result
 * @param {string} outputPath - Output path
 * @param {string} format - Output format
 */
function writeTestSpec(result, outputPath, format = 'markdown') {
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = format === 'json' ? result.json : result.markdown;
  fs.writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Map TLC task status to issue status update
 * @param {Object} task - TLC task
 * @param {string} trackerType - Tracker type
 * @returns {Object} Status update
 */
function mapTaskToIssueUpdate(task, trackerType) {
  let tlcStatus = 'todo';

  if (task.status === 'completed' || task.status === 'done') {
    tlcStatus = 'done';
  } else if (task.status === 'in_progress' || task.status === 'active') {
    tlcStatus = 'in_progress';
  }

  return {
    status: mapStatusToTracker(tlcStatus, trackerType),
    tlcStatus,
    taskId: task.id,
    issueId: task.issueId,
  };
}

/**
 * Generate sync summary
 * @param {Array} updates - Status updates
 * @returns {string} Sync summary
 */
function generateSyncSummary(updates) {
  const lines = [];

  lines.push('# Issue Sync Summary');
  lines.push('');

  if (updates.length === 0) {
    lines.push('No updates to sync.');
    return lines.join('\n');
  }

  lines.push('| Issue | TLC Status | Tracker Status |');
  lines.push('|-------|------------|----------------|');

  for (const update of updates) {
    lines.push(`| ${update.issueId} | ${update.tlcStatus} | ${update.status} |`);
  }

  return lines.join('\n');
}

/**
 * Execute issue command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Object} Command result
 */
async function executeIssueCommand(args = '', context = {}) {
  const { projectDir = process.cwd(), issueData = null } = context;
  const options = parseIssueArgs(args);

  try {
    const config = loadConfig(projectDir);
    const trackerType = getTrackerType(config, options.tracker);

    const result = {
      success: true,
      action: options.action,
      trackerType,
    };

    switch (options.action) {
      case 'import': {
        if (!issueData && !options.issueId) {
          return {
            success: false,
            error: 'No issue ID or data provided. Usage: /tlc:issue import <issue-id>',
          };
        }

        // If we have issue data, import it
        if (issueData) {
          const importResult = importIssue(issueData, trackerType, options);
          result.issue = importResult.issue;
          result.testSpec = importResult.testSpec;

          if (options.output && !options.dryRun) {
            writeTestSpec(importResult, options.output, options.format);
            result.outputPath = options.output;
          }

          if (options.format === 'markdown') {
            result.output = importResult.markdown;
          } else if (options.format === 'json') {
            result.output = importResult.json;
          }
        } else {
          // Just return the issue ID - actual API call would be handled elsewhere
          result.issueId = options.issueId;
          result.message = `Import issue ${options.issueId} from ${trackerType}`;
        }

        break;
      }

      case 'list': {
        if (context.issues) {
          const normalized = context.issues.map(i => parseIssue(i, trackerType));
          result.issues = normalized;
          result.output = formatIssuesList(normalized);
        } else {
          result.message = `List issues from ${trackerType}`;
        }
        break;
      }

      case 'status': {
        if (options.issueId && issueData) {
          const normalized = parseIssue(issueData, trackerType);
          result.issue = normalized;
          result.output = formatIssueDisplay(normalized);
        } else if (options.issueId) {
          result.issueId = options.issueId;
          result.message = `Get status of ${options.issueId} from ${trackerType}`;
        } else {
          return {
            success: false,
            error: 'No issue ID provided. Usage: /tlc:issue status <issue-id>',
          };
        }
        break;
      }

      case 'sync': {
        if (context.tasks) {
          const updates = context.tasks
            .filter(t => t.issueId)
            .map(t => mapTaskToIssueUpdate(t, trackerType));

          result.updates = updates;
          result.output = generateSyncSummary(updates);

          if (!options.dryRun) {
            result.message = `Synced ${updates.length} task statuses to ${trackerType}`;
          } else {
            result.message = `Would sync ${updates.length} task statuses to ${trackerType}`;
          }
        } else {
          result.message = `Sync task statuses to ${trackerType}`;
        }
        break;
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${options.action}`,
        };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create issue command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createIssueCommand(options = {}) {
  return {
    execute: (args, ctx) => executeIssueCommand(args, { ...options, ...ctx }),
    parseArgs: parseIssueArgs,
    importIssue,
    formatIssueDisplay,
    formatIssuesList,
    mapTaskToIssueUpdate,
    generateSyncSummary,
    loadConfig,
    getTrackerType,
  };
}

module.exports = {
  parseIssueArgs,
  loadConfig,
  saveConfig,
  getTrackerType,
  formatIssueDisplay,
  formatIssuesList,
  importIssue,
  writeTestSpec,
  mapTaskToIssueUpdate,
  generateSyncSummary,
  executeIssueCommand,
  createIssueCommand,
};
