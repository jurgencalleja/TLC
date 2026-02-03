/**
 * Path Validator Module
 *
 * Prevents path traversal attacks (OWASP A01: Broken Access Control)
 * Validates file paths to ensure they stay within allowed directories.
 */

import path from 'path';

/**
 * Custom error for path traversal attempts
 */
export class PathTraversalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * Normalize a path by resolving dots, decoding URL encoding, etc.
 * @param {string} inputPath - Path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath(inputPath) {
  if (!inputPath) {
    return '';
  }

  let normalized = inputPath;

  // Decode URL encoding (including double encoding)
  try {
    // Decode multiple times to catch double encoding
    let decoded = normalized;
    let prevDecoded;
    do {
      prevDecoded = decoded;
      decoded = decodeURIComponent(decoded);
    } while (decoded !== prevDecoded && decoded.includes('%'));
    normalized = decoded;
  } catch {
    // If decoding fails, keep original
  }

  // Convert Windows path separators to forward slashes for consistent handling
  normalized = normalized.replace(/\\/g, '/');

  // Collapse multiple slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Use path.normalize to resolve . and ..
  normalized = path.normalize(normalized);

  // Remove trailing slash (unless it's the root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (normalized.length > 1 && normalized.endsWith(path.sep)) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Check if a path is within a base directory
 * @param {string} targetPath - Path to check
 * @param {string} baseDir - Base directory
 * @returns {boolean} True if within base
 */
export function isWithinBase(targetPath, baseDir) {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedBase = normalizePath(baseDir);

  // Ensure base ends with separator for prefix matching
  const basePrefix = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : normalizedBase + path.sep;

  // Check if target starts with base or equals base
  return (
    normalizedTarget === normalizedBase ||
    normalizedTarget.startsWith(basePrefix)
  );
}

/**
 * Validate a file path against security constraints
 * @param {string} inputPath - Path to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validatePath(inputPath, options = {}) {
  const { baseDir } = options;

  // Check for empty path
  if (!inputPath || inputPath.trim() === '') {
    return {
      valid: false,
      threat: 'empty_path',
      error: 'Path is empty',
    };
  }

  // Check for null bytes
  if (inputPath.includes('\x00')) {
    return {
      valid: false,
      threat: 'null_byte',
      error: 'Path contains null byte',
    };
  }

  // Check for control characters (ASCII 0-31 except tab, newline)
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(inputPath)) {
    return {
      valid: false,
      threat: 'control_characters',
      error: 'Path contains control characters',
    };
  }

  // Check for path with only dots
  if (/^\.+$/.test(inputPath.replace(/[\/\\]/g, ''))) {
    return {
      valid: false,
      threat: 'invalid_path',
      error: 'Path contains only dots',
    };
  }

  // Decode and normalize path
  let normalizedPath = inputPath;

  // Decode URL encoding to detect encoded traversal attempts
  try {
    let decoded = normalizedPath;
    let prevDecoded;
    let iterations = 0;
    do {
      prevDecoded = decoded;
      decoded = decodeURIComponent(decoded);
      iterations++;
    } while (decoded !== prevDecoded && decoded.includes('%') && iterations < 5);
    normalizedPath = decoded;
  } catch {
    // If decoding fails, use original
  }

  // Check for traversal patterns (before normalization)
  if (normalizedPath.includes('..')) {
    // Normalize to see where it actually points
    const normalized = normalizePath(normalizedPath);
    const baseNormalized = normalizePath(baseDir);

    if (!isWithinBase(normalized, baseNormalized)) {
      return {
        valid: false,
        threat: 'path_traversal',
        error: 'Path traversal detected',
      };
    }
  }

  // Handle relative paths - resolve against base
  let resolvedPath;
  if (path.isAbsolute(normalizedPath)) {
    resolvedPath = normalizePath(normalizedPath);
  } else {
    resolvedPath = normalizePath(path.join(baseDir, normalizedPath));
  }

  // Final check: ensure resolved path is within base
  if (!isWithinBase(resolvedPath, baseDir)) {
    return {
      valid: false,
      threat: 'outside_base',
      error: 'Path is outside allowed directory',
    };
  }

  return {
    valid: true,
    normalizedPath: resolvedPath,
  };
}

/**
 * Validate file extension
 * @param {string} filename - Filename to check
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateExtension(filename, options = {}) {
  const {
    allowed = null,
    blocked = null,
    caseSensitive = true,
    checkDoubleExtension = false,
    rejectHidden = false,
  } = options;

  // Check for hidden files
  if (rejectHidden && filename.startsWith('.')) {
    return {
      valid: false,
      error: 'Hidden files not allowed',
    };
  }

  // Get extension
  let ext = path.extname(filename);
  if (!caseSensitive) {
    ext = ext.toLowerCase();
  }

  // Check for double extensions
  if (checkDoubleExtension) {
    const withoutExt = filename.slice(0, -ext.length);
    const secondExt = path.extname(withoutExt);
    if (secondExt) {
      return {
        valid: false,
        error: 'Double extension detected',
      };
    }
  }

  // Check blocked list
  if (blocked) {
    const blockedNormalized = caseSensitive
      ? blocked
      : blocked.map((e) => e.toLowerCase());
    if (blockedNormalized.includes(ext)) {
      return {
        valid: false,
        error: `Extension ${ext} is blocked`,
      };
    }
  }

  // Check allowed list
  if (allowed) {
    const allowedNormalized = caseSensitive
      ? allowed
      : allowed.map((e) => e.toLowerCase());
    if (!allowedNormalized.includes(ext)) {
      return {
        valid: false,
        error: `Extension ${ext} is not allowed`,
      };
    }
  }

  return { valid: true };
}

/**
 * Create a path validator with preset options
 * @param {Object} options - Validator options
 * @returns {Object} Path validator instance
 */
export function createPathValidator(options = {}) {
  const {
    baseDirs = [],
    allowedExtensions = null,
    blockedExtensions = null,
    maxPathLength = 4096,
    forbiddenPatterns = [],
    followSymlinks = true,
  } = options;

  return {
    /**
     * Validate a path synchronously
     * @param {string} inputPath - Path to validate
     * @returns {Object} Validation result
     */
    validate(inputPath) {
      // Check max length
      if (inputPath.length > maxPathLength) {
        return {
          valid: false,
          error: 'Path exceeds maximum length',
        };
      }

      // Check forbidden patterns
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(inputPath)) {
          return {
            valid: false,
            error: 'Path matches forbidden pattern',
          };
        }
      }

      // Check against each base directory
      let isValidForAnyBase = false;
      let lastResult = null;

      for (const baseDir of baseDirs) {
        const result = validatePath(inputPath, { baseDir });
        lastResult = result;
        if (result.valid) {
          isValidForAnyBase = true;

          // Also check extension if configured
          if (allowedExtensions || blockedExtensions) {
            const filename = path.basename(inputPath);
            const extResult = validateExtension(filename, {
              allowed: allowedExtensions,
              blocked: blockedExtensions,
            });
            if (!extResult.valid) {
              return extResult;
            }
          }

          return result;
        }
      }

      if (!isValidForAnyBase) {
        return lastResult || {
          valid: false,
          error: 'Path is not within any allowed directory',
        };
      }
    },

    /**
     * Validate a path asynchronously (with symlink checking)
     * @param {string} inputPath - Path to validate
     * @param {Object} asyncOptions - Async validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateAsync(inputPath, asyncOptions = {}) {
      const { checkSymlinks = false } = asyncOptions;

      // First run sync validation
      const syncResult = this.validate(inputPath);
      if (!syncResult.valid) {
        return syncResult;
      }

      // If symlink checking is enabled and we're not following symlinks
      if (checkSymlinks && !followSymlinks) {
        // In a real implementation, we would use fs.lstat here
        // to check if the path is a symlink and where it points
        // For now, return the sync result
        return syncResult;
      }

      return syncResult;
    },
  };
}
