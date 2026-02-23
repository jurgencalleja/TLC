/**
 * Secrets Runner
 *
 * Scans project files for hardcoded secrets using regex patterns.
 * No external tools required — pure pattern matching.
 */

import { readdir, readFile as fsReadFile } from 'node:fs/promises';
import path from 'node:path';

/** Secret detection patterns */
const SECRET_PATTERNS = [
  {
    name: 'hardcoded-password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/i,
    severity: 'high',
  },
  {
    name: 'aws-access-key',
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: 'critical',
  },
  {
    name: 'private-key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'generic-api-key',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']{8,}["']/i,
    severity: 'high',
  },
  {
    name: 'generic-secret',
    pattern: /(?:secret|token)\s*[:=]\s*["'](?:sk_live_|sk_test_|ghp_|gho_|ghs_)[^"']+["']/i,
    severity: 'high',
  },
];

/** File extensions to scan */
const SCAN_EXTENSIONS = new Set([
  '.js', '.ts', '.json', '.env', '.yml', '.yaml', '.jsx', '.tsx', '.mjs', '.cjs',
]);

/** Default file glob pattern (used with injected glob) */
const DEFAULT_GLOB = '**/*.{js,ts,json,env,yml,yaml,jsx,tsx,mjs,cjs}';

/** Default exclusion patterns */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
];

/** Directory names to skip during recursive walk */
const SKIP_DIRS = new Set(['node_modules', '.git', '__tests__']);

/** File patterns to skip */
const SKIP_FILE_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

/**
 * Recursively find files matching scan extensions
 * @param {string} dir - Directory to walk
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Promise<string[]>} Relative file paths
 */
async function walkDir(dir, baseDir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const subResults = await walkDir(path.join(dir, entry.name), baseDir);
      results.push(...subResults);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!SCAN_EXTENSIONS.has(ext)) continue;

      const relPath = path.relative(baseDir, path.join(dir, entry.name));
      if (SKIP_FILE_PATTERNS.some((p) => p.test(relPath))) continue;

      results.push(relPath);
    }
  }

  return results;
}

/**
 * Create a secrets scanning runner
 * @param {Object} [deps] - Injectable dependencies for testing
 * @param {Function} [deps.glob] - Glob function (pattern, options) => string[]
 * @param {Function} [deps.readFile] - File reader (path) => string
 * @param {string[]} [deps.extraIgnore] - Additional exclusion patterns
 * @returns {Function} Runner function: (projectPath, options) => { passed, findings }
 */
export function createSecretsRunner(deps = {}) {
  const {
    glob: globFn,
    readFile: readFileFn,
    extraIgnore = [],
  } = deps;

  const ignorePatterns = [...DEFAULT_IGNORE, ...extraIgnore];

  return async (projectPath, options = {}) => {
    let files;

    if (globFn) {
      // Use injected glob (testing)
      files = await globFn(DEFAULT_GLOB, {
        cwd: projectPath,
        ignore: ignorePatterns,
      });
    } else {
      // Use built-in recursive walker (production)
      try {
        files = await walkDir(projectPath, projectPath);
      } catch {
        files = [];
      }
    }

    if (files.length === 0) {
      return { passed: true, findings: [] };
    }

    const findings = [];

    for (const file of files) {
      let content;
      if (readFileFn) {
        content = await readFileFn(file);
      } else {
        content = await fsReadFile(path.join(projectPath, file), 'utf-8');
      }

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const secretPattern of SECRET_PATTERNS) {
          if (secretPattern.pattern.test(line)) {
            findings.push({
              severity: secretPattern.severity,
              file,
              line: i + 1,
              pattern: secretPattern.name,
              match: line.trim().substring(0, 80),
            });
          }
        }
      }
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  };
}
