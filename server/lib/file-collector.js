/**
 * File Collector - Collect files for review respecting .tlcignore
 */

const fs = require('fs');
const path = require('path');

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib',
  '.pyc', '.pyo', '.class',
  '.db', '.sqlite', '.sqlite3',
  '.lock', '.lockb',
]);

// Default ignore patterns
const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.env',
  '*.min.js',
  '*.min.css',
  '*.map',
  '.DS_Store',
  'Thumbs.db',
];

/**
 * Parse .tlcignore file into patterns
 * @param {string} content - File content
 * @returns {string[]} Ignore patterns
 */
function parseIgnoreFile(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

/**
 * Check if a path matches an ignore pattern
 * @param {string} filePath - Path to check
 * @param {string} pattern - Ignore pattern
 * @returns {boolean} Whether path matches
 */
function matchesPattern(filePath, pattern) {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Exact match
  if (normalizedPath === normalizedPattern) return true;

  // Directory match (pattern ends with /)
  if (normalizedPattern.endsWith('/')) {
    const dir = normalizedPattern.slice(0, -1);
    // Match directory at start, middle, or end of path
    if (normalizedPath === dir ||
        normalizedPath.startsWith(dir + '/') ||
        normalizedPath.includes('/' + dir + '/') ||
        normalizedPath.endsWith('/' + dir)) {
      return true;
    }
  }

  // Glob patterns
  if (normalizedPattern.includes('*')) {
    const regex = globToRegex(normalizedPattern);
    if (regex.test(normalizedPath)) return true;
  }

  // Contains match (for directory names)
  if (normalizedPath.includes('/' + normalizedPattern + '/') ||
      normalizedPath.startsWith(normalizedPattern + '/') ||
      normalizedPath.endsWith('/' + normalizedPattern)) {
    return true;
  }

  // Basename match
  const basename = path.basename(normalizedPath);
  if (basename === normalizedPattern) return true;

  // Glob pattern against basename
  if (normalizedPattern.includes('*')) {
    const regex = globToRegex(normalizedPattern);
    if (regex.test(basename)) return true;
  }

  return false;
}

/**
 * Convert glob pattern to regex
 * @param {string} pattern - Glob pattern
 * @returns {RegExp} Regular expression
 */
function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*');
  return new RegExp('^' + escaped + '$');
}

/**
 * Check if file should be ignored
 * @param {string} filePath - File path relative to root
 * @param {string[]} patterns - Ignore patterns
 * @returns {boolean} Whether to ignore
 */
function shouldIgnore(filePath, patterns) {
  for (const pattern of patterns) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if file is binary based on extension
 * @param {string} filePath - File path
 * @returns {boolean} Whether file is binary
 */
function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if file matches extension filter
 * @param {string} filePath - File path
 * @param {string[]} extensions - Allowed extensions (e.g., ['.js', '.ts'])
 * @returns {boolean} Whether file matches
 */
function matchesExtension(filePath, extensions) {
  if (!extensions || extensions.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return extensions.some(e => e.toLowerCase() === ext || ('.' + e.toLowerCase()) === ext);
}

/**
 * Collect files from a directory
 * @param {string} dir - Directory path
 * @param {Object} options - Collection options
 * @returns {string[]} Array of file paths
 */
function collectFromDirectory(dir, options = {}) {
  const {
    extensions = [],
    ignorePatterns = [],
    includeHidden = false,
    maxDepth = Infinity,
  } = options;

  const allPatterns = [...DEFAULT_IGNORES, ...ignorePatterns];
  const files = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      return; // Skip unreadable directories
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      // Skip hidden files unless explicitly included
      if (!includeHidden && entry.name.startsWith('.')) continue;

      // Check ignore patterns
      if (shouldIgnore(relativePath, allPatterns)) continue;

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        // Skip binary files
        if (isBinaryFile(fullPath)) continue;

        // Check extension filter
        if (!matchesExtension(fullPath, extensions)) continue;

        files.push(fullPath);
      }
    }
  }

  walk(dir, 0);
  return files;
}

/**
 * Load ignore patterns from .tlcignore file
 * @param {string} dir - Directory to search
 * @returns {string[]} Ignore patterns
 */
function loadIgnorePatterns(dir) {
  const tlcIgnorePath = path.join(dir, '.tlcignore');
  const gitIgnorePath = path.join(dir, '.gitignore');

  const patterns = [];

  // Load .tlcignore if exists
  if (fs.existsSync(tlcIgnorePath)) {
    const content = fs.readFileSync(tlcIgnorePath, 'utf-8');
    patterns.push(...parseIgnoreFile(content));
  }

  // Fall back to .gitignore if no .tlcignore
  if (patterns.length === 0 && fs.existsSync(gitIgnorePath)) {
    const content = fs.readFileSync(gitIgnorePath, 'utf-8');
    patterns.push(...parseIgnoreFile(content));
  }

  return patterns;
}

/**
 * Collect files for review
 * @param {string} target - File or directory path
 * @param {Object} options - Collection options
 * @returns {Object} Collection result { files, stats }
 */
function collectFiles(target, options = {}) {
  const resolvedTarget = path.resolve(target);

  if (!fs.existsSync(resolvedTarget)) {
    return {
      files: [],
      stats: { total: 0, skipped: 0, error: `Path not found: ${target}` },
    };
  }

  const stat = fs.statSync(resolvedTarget);

  if (stat.isFile()) {
    // Single file
    if (isBinaryFile(resolvedTarget)) {
      return {
        files: [],
        stats: { total: 0, skipped: 1, reason: 'Binary file' },
      };
    }
    return {
      files: [resolvedTarget],
      stats: { total: 1, skipped: 0 },
    };
  }

  if (stat.isDirectory()) {
    // Load ignore patterns from directory
    const loadedPatterns = loadIgnorePatterns(resolvedTarget);
    const allOptions = {
      ...options,
      ignorePatterns: [...(options.ignorePatterns || []), ...loadedPatterns],
    };

    const files = collectFromDirectory(resolvedTarget, allOptions);

    return {
      files,
      stats: { total: files.length, skipped: 0 },
    };
  }

  return {
    files: [],
    stats: { total: 0, skipped: 0, error: 'Unknown file type' },
  };
}

/**
 * Read file content safely
 * @param {string} filePath - File path
 * @returns {Object} { content, error }
 */
function readFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, error: null };
  } catch (err) {
    return { content: null, error: err.message };
  }
}

module.exports = {
  collectFiles,
  collectFromDirectory,
  loadIgnorePatterns,
  parseIgnoreFile,
  shouldIgnore,
  matchesPattern,
  isBinaryFile,
  matchesExtension,
  readFileContent,
  DEFAULT_IGNORES,
  BINARY_EXTENSIONS,
};
