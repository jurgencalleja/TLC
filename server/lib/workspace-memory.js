/**
 * Workspace Memory - Share memory across workspace repos
 *
 * Provides shared memory storage at the workspace level (.tlc-workspace/memory)
 * while supporting repo-specific memory (.tlc/memory/team)
 */

const fs = require('fs');
const path = require('path');
const { WorkspaceConfig } = require('./workspace-config.js');

const WORKSPACE_MEMORY_DIR = '.tlc-workspace/memory';
const WORKSPACE_DECISIONS_DIR = '.tlc-workspace/memory/decisions';
const WORKSPACE_GOTCHAS_DIR = '.tlc-workspace/memory/gotchas';

const REPO_MEMORY_PATHS = {
  TEAM: '.tlc/memory/team',
  DECISIONS: '.tlc/memory/team/decisions',
  GOTCHAS: '.tlc/memory/team/gotchas',
};

/**
 * Convert title to URL-friendly slug
 * @param {string} title - The title to slugify
 * @returns {string} - URL-friendly slug
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Get next ID by counting existing files
 * @param {string} dir - Directory to count files in
 * @returns {string} - Zero-padded ID (e.g., "001")
 */
function getNextId(dir) {
  if (!fs.existsSync(dir)) {
    return '001';
  }
  const files = fs.readdirSync(dir).filter(f => f.match(/^\d{3}-/));
  const nextNum = files.length + 1;
  return String(nextNum).padStart(3, '0');
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a decision markdown file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} level - Memory level ('workspace' or 'repo')
 * @returns {Object} Parsed decision
 */
function parseDecisionFile(content, filename, level) {
  const idMatch = filename.match(/^(\d{3})-/);
  const id = idMatch ? idMatch[1] : '000';

  const titleMatch = content.match(/^# Decision:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : null;

  const reasoningMatch = content.match(/## Reasoning\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

  const contextMatch = content.match(/\*\*Context:\*\*\s*(.+)$/m);
  const context = contextMatch ? contextMatch[1].trim() : null;

  return {
    id,
    filename,
    title,
    date,
    reasoning,
    context,
    level,
    raw: content,
  };
}

/**
 * Parse a gotcha markdown file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} level - Memory level ('workspace' or 'repo')
 * @returns {Object} Parsed gotcha
 */
function parseGotchaFile(content, filename, level) {
  const titleMatch = content.match(/^# Gotcha:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const severityMatch = content.match(/\*\*Severity:\*\*\s*(.+)$/m);
  const severity = severityMatch ? severityMatch[1].trim() : 'medium';

  const issueMatch = content.match(/## Issue\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const issue = issueMatch ? issueMatch[1].trim() : '';

  const workaroundMatch = content.match(/## Workaround\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const workaround = workaroundMatch ? workaroundMatch[1].trim() : null;

  return {
    filename,
    title,
    severity,
    issue,
    workaround,
    level,
    raw: content,
  };
}

class WorkspaceMemory {
  /**
   * Create a WorkspaceMemory instance
   * @param {string} workspaceRoot - Root directory of the workspace
   */
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.workspaceConfig = new WorkspaceConfig(workspaceRoot);
  }

  /**
   * Initialize workspace memory directories
   */
  init() {
    // Create workspace-level memory directories
    const decisionsDir = path.join(this.workspaceRoot, WORKSPACE_DECISIONS_DIR);
    const gotchasDir = path.join(this.workspaceRoot, WORKSPACE_GOTCHAS_DIR);

    fs.mkdirSync(decisionsDir, { recursive: true });
    fs.mkdirSync(gotchasDir, { recursive: true });
  }

  /**
   * Get workspace configuration
   * @returns {Object} Workspace config
   */
  getWorkspaceConfig() {
    return this.workspaceConfig.getConfig();
  }

  /**
   * Write a decision to memory
   * @param {Object} decision - Decision object
   * @param {string} decision.title - Decision title
   * @param {string} decision.reasoning - Why this decision was made
   * @param {string} decision.level - 'workspace' or 'repo'
   * @param {string} [decision.repoPath] - Repo path (required if level is 'repo')
   * @param {string} [decision.context] - Context for the decision
   * @returns {Promise<string>} - Path to created file
   */
  async writeDecision(decision) {
    let decisionsDir;

    if (decision.level === 'workspace') {
      decisionsDir = path.join(this.workspaceRoot, WORKSPACE_DECISIONS_DIR);
    } else if (decision.level === 'repo') {
      if (!decision.repoPath) {
        throw new Error('repoPath is required for repo-level decisions');
      }
      decisionsDir = path.join(decision.repoPath, REPO_MEMORY_PATHS.DECISIONS);
    } else {
      throw new Error('Invalid level. Must be "workspace" or "repo"');
    }

    fs.mkdirSync(decisionsDir, { recursive: true });

    const id = getNextId(decisionsDir);
    const slug = slugify(decision.title);
    const filename = `${id}-${slug}.md`;
    const filepath = path.join(decisionsDir, filename);

    const content = `# Decision: ${decision.title}

**Date:** ${getToday()}
**Status:** Active
${decision.context ? `**Context:** ${decision.context}` : ''}

## Decision

${decision.title}

## Reasoning

${decision.reasoning}
`;

    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  /**
   * Write a gotcha to memory
   * @param {Object} gotcha - Gotcha object
   * @param {string} gotcha.title - Gotcha title
   * @param {string} gotcha.issue - The issue description
   * @param {string} gotcha.level - 'workspace' or 'repo'
   * @param {string} [gotcha.repoPath] - Repo path (required if level is 'repo')
   * @param {string} [gotcha.workaround] - Workaround
   * @param {string} [gotcha.severity] - Severity level
   * @returns {Promise<string>} - Path to created file
   */
  async writeGotcha(gotcha) {
    let gotchasDir;

    if (gotcha.level === 'workspace') {
      gotchasDir = path.join(this.workspaceRoot, WORKSPACE_GOTCHAS_DIR);
    } else if (gotcha.level === 'repo') {
      if (!gotcha.repoPath) {
        throw new Error('repoPath is required for repo-level gotchas');
      }
      gotchasDir = path.join(gotcha.repoPath, REPO_MEMORY_PATHS.GOTCHAS);
    } else {
      throw new Error('Invalid level. Must be "workspace" or "repo"');
    }

    fs.mkdirSync(gotchasDir, { recursive: true });

    const slug = slugify(gotcha.title);
    const filename = `${slug}.md`;
    const filepath = path.join(gotchasDir, filename);

    const content = `# Gotcha: ${gotcha.title}

**Date:** ${getToday()}
**Severity:** ${gotcha.severity || 'medium'}

## Issue

${gotcha.issue}
${gotcha.workaround ? `
## Workaround

${gotcha.workaround}
` : ''}`;

    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  /**
   * Get decisions from memory
   * @param {string} level - 'workspace', 'repo', or 'all'
   * @param {string} [repoPath] - Repo path (required if level is 'repo' or 'all')
   * @returns {Promise<Object[]>} Array of decisions
   */
  async getDecisions(level, repoPath) {
    const decisions = [];

    // Get workspace decisions
    if (level === 'workspace' || level === 'all') {
      const workspaceDir = path.join(this.workspaceRoot, WORKSPACE_DECISIONS_DIR);
      if (fs.existsSync(workspaceDir)) {
        const files = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.md')).sort();
        for (const filename of files) {
          const filepath = path.join(workspaceDir, filename);
          const content = fs.readFileSync(filepath, 'utf8');
          decisions.push(parseDecisionFile(content, filename, 'workspace'));
        }
      }
    }

    // Get repo decisions
    if ((level === 'repo' || level === 'all') && repoPath) {
      const repoDir = path.join(repoPath, REPO_MEMORY_PATHS.DECISIONS);
      if (fs.existsSync(repoDir)) {
        const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.md')).sort();
        for (const filename of files) {
          const filepath = path.join(repoDir, filename);
          const content = fs.readFileSync(filepath, 'utf8');
          decisions.push(parseDecisionFile(content, filename, 'repo'));
        }
      }
    }

    return decisions;
  }

  /**
   * Get gotchas from memory
   * @param {string} level - 'workspace', 'repo', or 'all'
   * @param {string} [repoPath] - Repo path (required if level is 'repo' or 'all')
   * @returns {Promise<Object[]>} Array of gotchas
   */
  async getGotchas(level, repoPath) {
    const gotchas = [];

    // Get workspace gotchas
    if (level === 'workspace' || level === 'all') {
      const workspaceDir = path.join(this.workspaceRoot, WORKSPACE_GOTCHAS_DIR);
      if (fs.existsSync(workspaceDir)) {
        const files = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.md')).sort();
        for (const filename of files) {
          const filepath = path.join(workspaceDir, filename);
          const content = fs.readFileSync(filepath, 'utf8');
          gotchas.push(parseGotchaFile(content, filename, 'workspace'));
        }
      }
    }

    // Get repo gotchas
    if ((level === 'repo' || level === 'all') && repoPath) {
      const repoDir = path.join(repoPath, REPO_MEMORY_PATHS.GOTCHAS);
      if (fs.existsSync(repoDir)) {
        const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.md')).sort();
        for (const filename of files) {
          const filepath = path.join(repoDir, filename);
          const content = fs.readFileSync(filepath, 'utf8');
          gotchas.push(parseGotchaFile(content, filename, 'repo'));
        }
      }
    }

    return gotchas;
  }

  /**
   * Get resolved decisions for a repo (repo overrides workspace)
   * @param {string} repoPath - Repo path
   * @returns {Promise<Object[]>} Array of resolved decisions
   */
  async getResolvedDecisions(repoPath) {
    const allDecisions = await this.getDecisions('all', repoPath);

    // Group by title
    const decisionsByTitle = new Map();
    for (const decision of allDecisions) {
      const existing = decisionsByTitle.get(decision.title);
      if (!existing) {
        decisionsByTitle.set(decision.title, decision);
      } else {
        // Repo-level overrides workspace-level
        if (decision.level === 'repo') {
          decisionsByTitle.set(decision.title, decision);
        }
      }
    }

    return Array.from(decisionsByTitle.values());
  }

  /**
   * Search across all memory (workspace + all repos)
   * @param {string} query - Search query
   * @returns {Promise<Object[]>} Array of search results
   */
  async search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search workspace decisions
    const workspaceDecisions = await this.getDecisions('workspace');
    for (const decision of workspaceDecisions) {
      if (decision.raw.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'decision',
          title: decision.title,
          content: decision.raw.substring(0, 200),
          source: 'workspace',
          level: 'workspace',
        });
      }
    }

    // Search workspace gotchas
    const workspaceGotchas = await this.getGotchas('workspace');
    for (const gotcha of workspaceGotchas) {
      if (gotcha.raw.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'gotcha',
          title: gotcha.title,
          content: gotcha.raw.substring(0, 200),
          source: 'workspace',
          level: 'workspace',
        });
      }
    }

    // Search each repo
    const config = this.getWorkspaceConfig();
    if (config && config.repos) {
      for (const repoRelPath of config.repos) {
        const repoPath = path.join(this.workspaceRoot, repoRelPath);

        // Search repo decisions
        const repoDecisions = await this.getDecisions('repo', repoPath);
        for (const decision of repoDecisions) {
          if (decision.raw.toLowerCase().includes(lowerQuery)) {
            results.push({
              type: 'decision',
              title: decision.title,
              content: decision.raw.substring(0, 200),
              source: repoRelPath,
              level: 'repo',
            });
          }
        }

        // Search repo gotchas
        const repoGotchas = await this.getGotchas('repo', repoPath);
        for (const gotcha of repoGotchas) {
          if (gotcha.raw.toLowerCase().includes(lowerQuery)) {
            results.push({
              type: 'gotcha',
              title: gotcha.title,
              content: gotcha.raw.substring(0, 200),
              source: repoRelPath,
              level: 'repo',
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Sync workspace memory to a specific repo
   * This makes workspace decisions available in the repo context
   * @param {string} repoPath - Repo path to sync to
   * @returns {Promise<void>}
   */
  async syncToRepo(repoPath) {
    // Currently, syncing is implicit through getDecisions('all', repoPath)
    // This method exists for future explicit sync functionality
    // For now, it's a no-op since workspace memory is always visible to repos
  }
}

module.exports = {
  WorkspaceMemory,
  WORKSPACE_MEMORY_DIR,
  WORKSPACE_DECISIONS_DIR,
  WORKSPACE_GOTCHAS_DIR,
  REPO_MEMORY_PATHS,
  slugify,
  getNextId,
};
