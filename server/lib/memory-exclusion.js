import fs from 'fs';
import path from 'path';

/**
 * Memory Exclusion Patterns
 *
 * Configures what data to exclude from memory persistence.
 * Supports both file patterns (glob) and content patterns (regex).
 */

export const MODE = {
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
};

export const DEFAULT_FILE_PATTERNS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*credentials*',
  '*secrets*',
];

export const DEFAULT_CONTENT_PATTERNS = [
  'password=',
  'api_key=',
  'secret=',
  'token=',
  'private_key',
];

/**
 * Load exclusion patterns from .tlc.json config file
 * @param {string} projectRoot - The project root directory
 * @returns {object} - Patterns configuration
 */
export function loadPatterns(projectRoot) {
  const configPath = path.join(projectRoot, '.tlc.json');
  const defaults = {
    mode: MODE.BLACKLIST,
    filePatterns: [...DEFAULT_FILE_PATTERNS],
    contentPatterns: [...DEFAULT_CONTENT_PATTERNS],
  };

  try {
    if (!fs.existsSync(configPath)) {
      return defaults;
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    if (!config.memoryExclusion) {
      return defaults;
    }

    const exclusionConfig = config.memoryExclusion;
    const result = {
      mode: exclusionConfig.mode || MODE.BLACKLIST,
      filePatterns: [],
      contentPatterns: [],
    };

    // Handle merging with defaults
    if (exclusionConfig.mergeDefaults) {
      result.filePatterns = [...DEFAULT_FILE_PATTERNS];
      result.contentPatterns = [...DEFAULT_CONTENT_PATTERNS];
    }

    // Add custom file patterns
    if (Array.isArray(exclusionConfig.filePatterns)) {
      for (const pattern of exclusionConfig.filePatterns) {
        if (!result.filePatterns.includes(pattern)) {
          result.filePatterns.push(pattern);
        }
      }
    }

    // Add custom content patterns
    if (Array.isArray(exclusionConfig.contentPatterns)) {
      for (const pattern of exclusionConfig.contentPatterns) {
        if (!result.contentPatterns.includes(pattern)) {
          result.contentPatterns.push(pattern);
        }
      }
    }

    // Use defaults if no custom patterns were provided
    if (result.filePatterns.length === 0) {
      result.filePatterns = [...DEFAULT_FILE_PATTERNS];
    }
    if (result.contentPatterns.length === 0) {
      result.contentPatterns = [...DEFAULT_CONTENT_PATTERNS];
    }

    return result;
  } catch {
    return defaults;
  }
}

/**
 * Convert a glob pattern to a regex
 * @param {string} pattern - Glob pattern
 * @returns {RegExp} - Compiled regex
 */
function globToRegex(pattern) {
  // Use placeholders to protect ** patterns during processing
  let processed = pattern;

  // First, handle single * - convert to placeholder to protect from ** processing
  // But we need to do this carefully - only convert * that aren't part of **
  // We'll process ** first with placeholders, then handle remaining *

  // Handle different ** patterns:
  // 1. **/ at start: matches zero or more directories (including empty)
  // 2. /** at end: matches everything after
  // 3. **/ in middle: matches zero or more directories

  // Replace **/ at start with placeholder (matches zero or more dirs)
  processed = processed.replace(/^\*\*\//, '<<STARSTART>>');

  // Replace /** at end with placeholder (matches rest of path)
  processed = processed.replace(/\/\*\*$/, '<<STAREND>>');

  // Replace remaining **/ with placeholder (matches zero or more dirs)
  processed = processed.replace(/\/\*\*\//g, '<<STARMID>>');

  // Replace remaining ** with placeholder (matches anything)
  processed = processed.replace(/\*\*/g, '<<STARSTAR>>');

  // Now replace remaining single * with placeholder
  processed = processed.replace(/\*/g, '<<SINGLE>>');

  // Replace ? with placeholder
  processed = processed.replace(/\?/g, '<<QUESTION>>');

  // Escape special regex characters
  processed = processed.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Restore and convert placeholders to regex patterns
  // <<STARSTART>> = matches zero or more directories at start (optional)
  processed = processed.replace(/<<STARSTART>>/g, '(?:.*\\/)?');

  // <<STAREND>> = matches rest of path (including slashes)
  processed = processed.replace(/<<STAREND>>/g, '(?:\\/.*)?');

  // <<STARMID>> = matches zero or more directories in middle
  processed = processed.replace(/<<STARMID>>/g, '(?:\\/(?:.*\\/)?)?');

  // <<STARSTAR>> = matches anything including slashes
  processed = processed.replace(/<<STARSTAR>>/g, '.*');

  // <<SINGLE>> = matches anything except path separator
  processed = processed.replace(/<<SINGLE>>/g, '[^/]*');

  // <<QUESTION>> = matches single character
  processed = processed.replace(/<<QUESTION>>/g, '.');

  // Build regex that matches the pattern
  return new RegExp(`^${processed}$`);
}

/**
 * Check if a value matches a pattern
 * @param {string} value - The value to test
 * @param {string|RegExp} pattern - The pattern to match against
 * @param {object} options - Options for matching
 * @param {boolean} options.ignoreCase - Case insensitive matching
 * @param {boolean} options.isContent - Whether this is content matching (uses substring)
 * @returns {boolean} - Whether the value matches the pattern
 */
export function matchesPattern(value, pattern, options = {}) {
  if (!value) {
    return false;
  }

  const { ignoreCase = false, isContent = false } = options;

  // Handle RegExp objects
  if (pattern instanceof RegExp) {
    const flags = ignoreCase && !pattern.flags.includes('i') ? pattern.flags + 'i' : pattern.flags;
    const testPattern = new RegExp(pattern.source, flags);
    return testPattern.test(value);
  }

  // Handle regex: prefix for string patterns
  if (pattern.startsWith('regex:')) {
    const regexStr = pattern.slice(6);
    const regex = ignoreCase ? new RegExp(regexStr, 'i') : new RegExp(regexStr);
    return regex.test(value);
  }

  // For content matching without wildcards, use substring match
  if (isContent && !pattern.includes('*') && !pattern.includes('?')) {
    const testValue = ignoreCase ? value.toLowerCase() : value;
    const testPattern = ignoreCase ? pattern.toLowerCase() : pattern;
    return testValue.includes(testPattern);
  }

  // Handle exact match for file patterns without wildcards
  if (!pattern.includes('*') && !pattern.includes('?')) {
    const testValue = ignoreCase ? value.toLowerCase() : value;
    const testPattern = ignoreCase ? pattern.toLowerCase() : pattern;
    // Only check for exact match - no basename matching for exact patterns
    return testValue === testPattern;
  }

  // Handle glob pattern
  const regex = globToRegex(pattern);
  const testPattern = ignoreCase ? new RegExp(regex.source, 'i') : regex;
  return testPattern.test(value);
}

/**
 * Check if a file path matches a pattern (for use in shouldExclude)
 * This also checks basename for non-glob patterns
 * @param {string} filePath - The file path to check
 * @param {string} pattern - The pattern to match
 * @returns {boolean} - Whether the file matches
 */
function matchesFilePattern(filePath, pattern) {
  // First try direct match
  if (matchesPattern(filePath, pattern)) {
    return true;
  }

  // For patterns without path separators and without wildcards,
  // also check against the basename
  if (!pattern.includes('/') && !pattern.includes('*') && !pattern.includes('?')) {
    const basename = filePath.split('/').pop();
    if (matchesPattern(basename, pattern)) {
      return true;
    }
  }

  // For glob patterns, also try matching the basename
  if (pattern.includes('*') || pattern.includes('?')) {
    const basename = filePath.split('/').pop();
    if (matchesPattern(basename, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a file or content should be excluded from memory
 * @param {string} filePath - The file path to check
 * @param {string|null} content - Optional content to check
 * @param {object|null} config - Optional configuration override
 * @returns {boolean} - Whether to exclude this file/content
 */
export function shouldExclude(filePath, content = null, config = null) {
  const patterns = config || {
    mode: MODE.BLACKLIST,
    filePatterns: DEFAULT_FILE_PATTERNS,
    contentPatterns: DEFAULT_CONTENT_PATTERNS,
    enforceDefaults: true,
  };

  const mode = patterns.mode || MODE.BLACKLIST;
  // Support both 'patterns' (shorthand) and 'filePatterns' (explicit)
  const filePatterns = patterns.filePatterns || patterns.patterns || [];
  const contentPatterns = patterns.contentPatterns || [];
  const enforceDefaults = patterns.enforceDefaults !== false;

  // In whitelist mode, only allow files that match patterns
  if (mode === MODE.WHITELIST) {
    // Always exclude sensitive files if enforceDefaults is true
    if (enforceDefaults) {
      for (const pattern of DEFAULT_FILE_PATTERNS) {
        if (matchesFilePattern(filePath, pattern)) {
          return true;
        }
      }
    }

    // Check if file matches any whitelist pattern
    let allowed = false;
    for (const pattern of filePatterns) {
      if (matchesFilePattern(filePath, pattern)) {
        allowed = true;
        break;
      }
    }

    return !allowed;
  }

  // In blacklist mode, exclude files that match patterns
  // Check default patterns first
  for (const pattern of DEFAULT_FILE_PATTERNS) {
    if (matchesFilePattern(filePath, pattern)) {
      return true;
    }
  }

  // Check custom file patterns
  for (const pattern of filePatterns) {
    if (matchesFilePattern(filePath, pattern)) {
      return true;
    }
  }

  // Check content patterns if content is provided
  if (content) {
    // Check default content patterns
    for (const pattern of DEFAULT_CONTENT_PATTERNS) {
      if (matchesPattern(content, pattern, { isContent: true })) {
        return true;
      }
    }

    // Check custom content patterns
    for (const pattern of contentPatterns) {
      if (matchesPattern(content, pattern, { isContent: true })) {
        return true;
      }
    }
  }

  return false;
}
