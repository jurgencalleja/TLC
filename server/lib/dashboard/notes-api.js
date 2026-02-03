/**
 * Notes API Module
 * PROJECT.md and BUGS.md management
 */
import { promises as defaultFs } from 'fs';
import path from 'path';

/**
 * Get notes (PROJECT.md) content
 * @param {Object} options - Options
 * @returns {Promise<Object>} Notes data
 */
export async function getNotes(options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();

  const filePath = path.join(basePath, 'PROJECT.md');

  let content = '';
  let exists = true;
  let lastModified = null;

  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    content = '';
    exists = false;
  }

  try {
    if (fs.stat) {
      const stats = await fs.stat(filePath);
      lastModified = stats.mtime;
    }
  } catch {
    // Ignore stat errors
  }

  return {
    content,
    type: 'project',
    exists,
    lastModified
  };
}

/**
 * Update notes (PROJECT.md)
 * @param {string} content - New content
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
export async function updateNotes(content, options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();
  const backup = options.backup || false;
  const validate = options.validate || false;

  if (validate && (!content || !content.trim())) {
    throw new Error('Content cannot be empty');
  }

  const filePath = path.join(basePath, 'PROJECT.md');

  // Create backup if requested
  if (backup) {
    try {
      const oldContent = await fs.readFile(filePath, 'utf-8');
      const backupPath = path.join(basePath, `PROJECT.md.backup.${Date.now()}`);
      await fs.writeFile(backupPath, oldContent);
    } catch {
      // Ignore backup errors for missing files
    }
  }

  await fs.writeFile(filePath, content);
}

/**
 * Get bugs (BUGS.md) content
 * @param {Object} options - Options
 * @returns {Promise<Object>} Bugs data
 */
export async function getBugs(options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();
  const parse = options.parse || false;

  const filePath = path.join(basePath, '.planning', 'BUGS.md');

  let content = '';
  let exists = true;

  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    content = '';
    exists = false;
  }

  const result = {
    content,
    exists
  };

  if (parse) {
    result.entries = parseBugEntries(content);
  }

  return result;
}

/**
 * Parse bug entries from BUGS.md content
 * @param {string} content - BUGS.md content
 * @returns {Array} Bug entries
 */
function parseBugEntries(content) {
  const entries = [];
  const lines = content.split('\n');

  let currentBug = null;

  for (const line of lines) {
    // Match bug header: ## Bug: Title
    const bugMatch = line.match(/^##\s+Bug:\s*(.+)$/);
    if (bugMatch) {
      if (currentBug) {
        entries.push(currentBug);
      }
      currentBug = {
        title: bugMatch[1].trim(),
        severity: null,
        status: null
      };
      continue;
    }

    if (currentBug) {
      // Match severity: **Severity:** Value
      const severityMatch = line.match(/^\*\*Severity:\*\*\s*(.+)$/);
      if (severityMatch) {
        currentBug.severity = severityMatch[1].trim();
      }

      // Match status: **Status:** Value
      const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+)$/);
      if (statusMatch) {
        currentBug.status = statusMatch[1].trim();
      }
    }
  }

  if (currentBug) {
    entries.push(currentBug);
  }

  return entries;
}

/**
 * Add a bug to BUGS.md
 * @param {Object} bugData - Bug data
 * @param {Object} options - Options
 * @returns {Promise<Object>} Created bug
 */
export async function addBug(bugData, options = {}) {
  if (!bugData.title) {
    throw new Error('Title is required');
  }

  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();

  const filePath = path.join(basePath, '.planning', 'BUGS.md');

  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    content = '# Bugs\n\n';
  }

  // Create bug entry
  const timestamp = new Date().toISOString().split('T')[0];
  const severity = bugData.severity || 'Medium';
  const description = bugData.description || '';

  const bugEntry = `
## Bug: ${bugData.title}
**Severity:** ${severity}
**Status:** Open
**Date:** ${timestamp}

${description}
`;

  const newContent = content + bugEntry;
  await fs.writeFile(filePath, newContent);

  return {
    title: bugData.title,
    severity,
    status: 'Open',
    date: timestamp
  };
}

/**
 * Create Notes API handlers
 * @param {Object} options - Options
 * @returns {Object} API handlers
 */
export function createNotesApi(options = {}) {
  const { basePath = process.cwd(), fs: fileSystem = defaultFs } = options;

  return {
    async getNotes(opts = {}) {
      return getNotes({ fs: fileSystem, basePath, ...opts });
    },

    async updateNotes(content, opts = {}) {
      return updateNotes(content, { fs: fileSystem, basePath, ...opts });
    },

    async getBugs(opts = {}) {
      return getBugs({ fs: fileSystem, basePath, ...opts });
    },

    async addBug(bugData, opts = {}) {
      return addBug(bugData, { fs: fileSystem, basePath, ...opts });
    }
  };
}
