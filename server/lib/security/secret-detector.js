/**
 * Secret Detector Module
 *
 * Detects hardcoded secrets, API keys, and credentials in code.
 * Helps prevent OWASP A02: Cryptographic Failures and A07: Auth Failures
 */

/**
 * Built-in secret detection patterns
 * All patterns use simple, non-backtracking regex
 */
const BUILT_IN_PATTERNS = [
  // AWS Access Key (always starts with AKIA, exactly 20 chars)
  {
    name: 'aws_access_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  // AWS Secret Key (40 char base64-like, starts with wJalrX typically)
  {
    name: 'aws_secret_key',
    pattern: /(?:secret(?:Access)?Key|aws_secret)\s*[=:]\s*["']([A-Za-z0-9/+=]{40})["']/gi,
    severity: 'critical',
  },

  // GitHub tokens (prefixed with ghp_, gho_, ghu_, ghr_, ghs_)
  {
    name: 'github_token',
    pattern: /gh[pousr]_[A-Za-z0-9]{36}/g,
    severity: 'critical',
  },

  // Stripe secret key (sk_live_ or sk_test_, 4-32 chars after prefix for tests)
  {
    name: 'stripe_secret_key',
    pattern: /sk_live_[A-Za-z0-9]{4,32}/g,
    severity: 'critical',
  },
  {
    name: 'stripe_test_key',
    pattern: /sk_test_[A-Za-z0-9]{4,32}/g,
    severity: 'high',
  },

  // Private keys (PEM format headers)
  {
    name: 'private_key',
    pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
    severity: 'critical',
  },

  // JWT tokens - detect by eyJ prefix (Base64 for {"alg" or {"typ")
  {
    name: 'jwt_token',
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    severity: 'high',
  },

  // Database connection strings with embedded credentials
  {
    name: 'connection_string',
    pattern: /(?:postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/\w+:\w+@[^\s"']+/gi,
    severity: 'critical',
  },

  // Password assignments (simple detection)
  {
    name: 'password',
    pattern: /(?:password|passwd|pass|db_password|secret)\s*[:=]\s*["'][^"']{4,30}["']/gi,
    severity: 'high',
    excludePatterns: [/process\.env/i, /\$\{/],
  },
];

/**
 * Patterns that indicate false positives
 * These are checked against the LINE, not just the matched value
 */
const FALSE_POSITIVE_PATTERNS = [
  /process\.env/i,
  /\$\{[^}]+\}/,
  /YOUR_[A-Z_]+_HERE/i,
  /PLACEHOLDER/i,
  /-----BEGIN\s+PUBLIC\s+KEY-----/,
  /-----BEGIN\s+CERTIFICATE-----/,
];

/**
 * Patterns checked only against the matched value (not the full line)
 */
const VALUE_FALSE_POSITIVE_PATTERNS = [
  /^x{4,}$/i,  // Only if the entire value is just x's
];

/**
 * Detect secrets in code content
 * @param {string} content - Code content to scan
 * @param {Object} options - Detection options
 * @returns {Object} Detection results
 */
export function detectSecrets(content, options = {}) {
  const {
    patterns = BUILT_IN_PATTERNS,
    ignoreTestValues = false,
  } = options;

  const findings = [];
  const lines = content.split('\n');

  for (const patternDef of patterns) {
    const { name, pattern, severity, excludePatterns } = patternDef;

    // Create a fresh regex instance with global flag
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const regex = new RegExp(pattern.source, flags);

    let match;
    while ((match = regex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchValue = match[0];

      // Find line number
      let lineNumber = 1;
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= matchStart) {
          lineNumber = i + 1;
          break;
        }
        charCount += lines[i].length + 1;
      }

      const line = lines[lineNumber - 1] || '';

      // Check for false positives
      let isFalsePositive = false;

      // Check pattern-specific exclusions
      if (excludePatterns) {
        for (const excl of excludePatterns) {
          if (excl.test(line)) {
            isFalsePositive = true;
            break;
          }
        }
      }

      // Check global false positive patterns (against line)
      if (!isFalsePositive) {
        for (const fp of FALSE_POSITIVE_PATTERNS) {
          if (fp.test(line)) {
            isFalsePositive = true;
            break;
          }
        }
      }

      // Check value-specific false positive patterns
      if (!isFalsePositive) {
        for (const fp of VALUE_FALSE_POSITIVE_PATTERNS) {
          if (fp.test(matchValue)) {
            isFalsePositive = true;
            break;
          }
        }
      }

      // Skip test values if configured
      if (!isFalsePositive && ignoreTestValues) {
        if (/test|example|sample|demo/i.test(matchValue)) {
          isFalsePositive = true;
        }
      }

      if (!isFalsePositive) {
        findings.push({
          type: name,
          line: lineNumber,
          column: matchStart - content.lastIndexOf('\n', matchStart - 1),
          severity: severity || 'medium',
          snippet: line.trim().substring(0, 100),
        });
      }
    }
  }

  return {
    findings,
    hasSecrets: findings.length > 0,
  };
}

/**
 * Scan a file for secrets
 */
export async function scanFile(filePath, options = {}) {
  const { content } = options;

  if (!content) {
    throw new Error('Content must be provided');
  }

  const result = detectSecrets(content, options);

  return {
    file: filePath,
    findings: result.findings.map((f) => ({ ...f, file: filePath })),
    hasSecrets: result.hasSecrets,
  };
}

/**
 * Scan a directory for secrets
 */
export async function scanDirectory(dirPath, options = {}) {
  const { files = {}, ignore = [] } = options;

  const allFindings = [];
  let filesWithSecrets = 0;
  let totalFiles = 0;

  for (const [filePath, content] of Object.entries(files)) {
    const relativePath = filePath.replace(dirPath, '').replace(/^\//, '');

    // Check ignore patterns
    let shouldIgnore = false;
    for (const pattern of ignore) {
      if (relativePath.includes(pattern.replace('/**', '').replace('/*', ''))) {
        shouldIgnore = true;
        break;
      }
    }

    if (shouldIgnore) continue;

    totalFiles++;
    const result = await scanFile(filePath, { content, ...options });

    if (result.hasSecrets) {
      filesWithSecrets++;
      allFindings.push(...result.findings);
    }
  }

  return {
    directory: dirPath,
    totalFiles,
    filesWithSecrets,
    findings: allFindings,
    hasSecrets: allFindings.length > 0,
  };
}

/**
 * Create a custom secret detector
 */
export function createSecretDetector(options = {}) {
  const { patterns = [], builtInPatterns = true } = options;

  const activePatterns = builtInPatterns
    ? [...BUILT_IN_PATTERNS, ...patterns]
    : patterns;

  return {
    patterns: activePatterns,

    detect(content, detectOptions = {}) {
      return detectSecrets(content, { ...detectOptions, patterns: this.patterns });
    },

    addPattern(pattern) {
      this.patterns.push(pattern);
    },
  };
}

/**
 * Add a custom pattern to an existing detector
 */
export function addCustomPattern(detector, pattern) {
  if (!detector || !detector.patterns) {
    throw new Error('Invalid detector');
  }

  detector.patterns.push({
    name: pattern.name,
    pattern: pattern.pattern,
    severity: pattern.severity || 'medium',
  });
}
