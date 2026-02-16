/**
 * File-based memory store adapter.
 *
 * Reads decisions and gotchas from `.tlc/memory/team/` markdown files on disk.
 * No vector DB required — just file-based reading. Returns empty arrays when
 * no files exist.
 *
 * @module memory-store-adapter
 */

const path = require('path');
const realFs = require('fs');

/**
 * Parse a markdown file into a memory entry.
 * Extracts the title from the first `# Heading` line.
 *
 * @param {string} content - Raw markdown content
 * @param {string} filename - Original filename
 * @returns {{ title: string, content: string, filename: string }}
 */
function parseMarkdownEntry(content, filename) {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/, '');
  return { title, content, filename };
}

/**
 * Read markdown files from a directory and parse them into entries.
 *
 * @param {string} dirPath - Directory to read
 * @param {object} fsImpl - fs implementation (for testing)
 * @returns {Array<{ title: string, content: string, filename: string }>}
 */
function readMarkdownDir(dirPath, fsImpl) {
  if (!fsImpl.existsSync(dirPath)) {
    return [];
  }

  const files = fsImpl.readdirSync(dirPath);
  const entries = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    try {
      const content = fsImpl.readFileSync(path.join(dirPath, file), 'utf-8');
      entries.push(parseMarkdownEntry(content, file));
    } catch {
      // Skip files that can't be read
    }
  }

  return entries;
}

/**
 * Create a file-based memory store adapter for a project.
 *
 * @param {string} projectPath - Absolute path to the project root
 * @param {object} [options]
 * @param {object} [options.fs] - fs implementation (for testing)
 * @returns {{ listDecisions: Function, listGotchas: Function, getStats: Function }}
 */
function createMemoryStoreAdapter(projectPath, options = {}) {
  const fsImpl = options.fs || realFs;
  const decisionsDir = path.join(projectPath, '.tlc', 'memory', 'team', 'decisions');
  const gotchasDir = path.join(projectPath, '.tlc', 'memory', 'team', 'gotchas');

  /**
   * List all decisions from the project's memory directory.
   * @param {object} [options] - Filter options (unused for file-based)
   * @returns {Promise<Array>}
   */
  async function listDecisions() {
    return readMarkdownDir(decisionsDir, fsImpl);
  }

  /**
   * List all gotchas from the project's memory directory.
   * @param {object} [options] - Filter options (unused for file-based)
   * @returns {Promise<Array>}
   */
  async function listGotchas() {
    return readMarkdownDir(gotchasDir, fsImpl);
  }

  /**
   * Get basic stats about the memory store.
   * @returns {Promise<{ decisions: number, gotchas: number, total: number }>}
   */
  async function getStats() {
    const dCount = fsImpl.existsSync(decisionsDir)
      ? fsImpl.readdirSync(decisionsDir).filter(f => f.endsWith('.md')).length
      : 0;
    const gCount = fsImpl.existsSync(gotchasDir)
      ? fsImpl.readdirSync(gotchasDir).filter(f => f.endsWith('.md')).length
      : 0;

    return { decisions: dCount, gotchas: gCount, total: dCount + gCount };
  }

  return { listDecisions, listGotchas, getStats };
}

module.exports = { createMemoryStoreAdapter };
