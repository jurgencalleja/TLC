/**
 * Dockerfile Security Linter Module
 *
 * Enforces Dockerfile security best practices.
 * Based on CIS Docker Benchmark and OWASP Docker Security guidelines.
 */

/**
 * Severity levels for findings
 */
export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

/**
 * Sensitive file patterns to detect
 */
const SENSITIVE_FILES = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '.ssh/',
  'credentials',
  'secrets',
  '.git/',
  '.gitconfig',
  '.npmrc',
  '.docker/config.json',
  'kubeconfig',
];

/**
 * Patterns that indicate secrets in values
 */
const SECRET_PATTERNS = [
  /password\s*=\s*[^$\s{][^\s]*/i,
  /secret[_-]?\w*\s*=\s*[^$\s{][^\s]*/i,
  /api[_-]?key\s*=\s*[^$\s{][^\s]*/i,
  /token\s*=\s*[^$\s{][^\s]*/i,
  /db_password\s*=\s*[^$\s{][^\s]*/i,
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
];

/**
 * Minimal base image patterns
 */
const MINIMAL_IMAGE_PATTERNS = [
  /alpine/i,
  /distroless/i,
  /slim/i,
  /scratch/,
  /busybox/i,
];

/**
 * Parse a Dockerfile into structured format
 * @param {string} content - Dockerfile content
 * @returns {Object} Parsed Dockerfile
 */
export function parseDockerfile(content) {
  const lines = content.split('\n');
  const instructions = [];
  const comments = [];
  const baseImages = [];
  const stages = [];

  let currentInstruction = null;
  let instructionStartLine = 0;
  let inContinuation = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (but not during continuation)
    if (!trimmed && !inContinuation) continue;

    // Handle comments
    if (trimmed.startsWith('#') && !inContinuation) {
      comments.push({ line: i + 1, text: trimmed.slice(1).trim() });
      continue;
    }

    // Check if previous line ended with continuation
    if (inContinuation) {
      // Append to current instruction
      const cleanLine = trimmed.replace(/\\$/, '').trim();
      if (cleanLine) {
        currentInstruction.arguments += ' ' + cleanLine;
      }
      // Check if this line also continues
      inContinuation = trimmed.endsWith('\\');
      continue;
    }

    // Parse new instruction
    const match = trimmed.match(/^([A-Z]+)\s*(.*)/);
    if (match) {
      const [, instruction, args] = match;
      instructionStartLine = i + 1;

      // Check for line continuation
      inContinuation = args.endsWith('\\');

      currentInstruction = {
        instruction,
        arguments: args.replace(/\\$/, '').trim(),
        line: instructionStartLine,
      };

      // Track FROM instructions
      if (instruction === 'FROM') {
        const fromMatch = args.match(/^(\S+?)(?:\s+AS\s+(\S+))?$/i);
        if (fromMatch) {
          const [, image, stageName] = fromMatch;
          baseImages.push(image);
          stages.push({
            name: stageName || null,
            image,
            line: instructionStartLine,
          });
        }
      }

      instructions.push(currentInstruction);
    }
  }

  return {
    instructions,
    comments,
    baseImages,
    stages,
    isMultiStage: stages.length > 1,
  };
}

/**
 * Check if a value appears to contain a hardcoded secret
 * @param {string} value - Value to check
 * @returns {boolean} True if value looks like a secret
 */
function looksLikeSecret(value) {
  // Skip variable references
  if (value.includes('${') || value.includes('$')) return false;
  if (!value.includes('=')) return false;

  return SECRET_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if a file path is sensitive
 * @param {string} path - File path to check
 * @returns {boolean} True if path is sensitive
 */
function isSensitiveFile(path) {
  const normalized = path.toLowerCase();
  return SENSITIVE_FILES.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(normalized);
    }
    return normalized.includes(pattern.toLowerCase());
  });
}

/**
 * Check if an image tag is minimal/secure
 * @param {string} image - Image name with tag
 * @returns {boolean} True if minimal image
 */
function isMinimalImage(image) {
  return MINIMAL_IMAGE_PATTERNS.some(pattern => pattern.test(image));
}

/**
 * Lint a Dockerfile for security issues
 * @param {string} content - Dockerfile content
 * @param {Object} options - Linting options
 * @returns {Object} Lint results
 */
export function lintDockerfile(content, options = {}) {
  const parsed = parseDockerfile(content);
  const findings = [];

  // Track state
  let hasUser = false;
  let userIsRoot = false;
  let hasHealthcheck = false;
  let hasBuildInstructions = false;

  // Analyze instructions
  for (const inst of parsed.instructions) {
    const { instruction, arguments: args, line } = inst;

    // Check USER directive
    if (instruction === 'USER') {
      hasUser = true;
      if (args.trim() === 'root' || args.trim() === '0') {
        userIsRoot = true;
      } else {
        userIsRoot = false;
      }
    }

    // Check FROM for latest tag and minimal base
    if (instruction === 'FROM') {
      const image = args.split(/\s+/)[0];

      // Check for latest tag
      if (image.endsWith(':latest') || !image.includes(':')) {
        findings.push({
          rule: 'no-latest-tag',
          severity: SEVERITY.MEDIUM,
          line,
          message: `Avoid using 'latest' tag. Pin to a specific version.`,
          fix: `Use a specific version tag (e.g., ${image.split(':')[0]}:20-alpine)`,
        });
      }

      // Check for minimal base image (only for final stage)
      const isLastStage = parsed.stages[parsed.stages.length - 1]?.line === line;
      if (isLastStage && !isMinimalImage(image)) {
        findings.push({
          rule: 'prefer-minimal-base',
          severity: SEVERITY.LOW,
          line,
          message: `Consider using a minimal base image (alpine, distroless, slim).`,
          fix: `Use alpine variant (e.g., node:20-alpine) or distroless`,
        });
      }
    }

    // Check ENV/ARG for secrets
    if (instruction === 'ENV' || instruction === 'ARG') {
      if (looksLikeSecret(args)) {
        findings.push({
          rule: 'no-secrets-in-env',
          severity: SEVERITY.CRITICAL,
          line,
          message: `Possible hardcoded secret in ${instruction}. Use build-time secrets or runtime injection.`,
          fix: `Remove hardcoded value. Use Docker secrets or environment injection at runtime.`,
        });
      }
    }

    // Check RUN for secrets
    if (instruction === 'RUN') {
      if (looksLikeSecret(args)) {
        findings.push({
          rule: 'no-secrets-in-run',
          severity: SEVERITY.CRITICAL,
          line,
          message: `Possible hardcoded secret in RUN command.`,
          fix: `Use Docker build secrets (--mount=type=secret) instead.`,
        });
      }

      // Track if this looks like a build step
      if (args.includes('npm') || args.includes('build') || args.includes('compile')) {
        hasBuildInstructions = true;
      }
    }

    // Check COPY/ADD for sensitive files
    if (instruction === 'COPY' || instruction === 'ADD') {
      const sources = args.split(/\s+/).slice(0, -1);
      for (const src of sources) {
        if (isSensitiveFile(src)) {
          findings.push({
            rule: 'no-sensitive-files',
            severity: SEVERITY.CRITICAL,
            line,
            message: `Copying sensitive file: ${src}`,
            fix: `Add ${src} to .dockerignore and use Docker secrets or runtime mounting.`,
          });
        }
      }

      // Warn about ADD with URL
      if (instruction === 'ADD' && args.match(/https?:\/\//)) {
        findings.push({
          rule: 'prefer-copy-over-add',
          severity: SEVERITY.MEDIUM,
          line,
          message: `Prefer COPY over ADD. ADD with URLs can be unpredictable.`,
          fix: `Use RUN curl/wget to download files, or COPY local files.`,
        });
      }
    }

    // Check HEALTHCHECK
    if (instruction === 'HEALTHCHECK') {
      hasHealthcheck = true;
    }
  }

  // Post-analysis checks

  // Check for missing USER directive
  if (!hasUser || userIsRoot) {
    findings.push({
      rule: 'no-root-user',
      severity: SEVERITY.HIGH,
      line: parsed.instructions.length > 0 ? parsed.instructions[parsed.instructions.length - 1].line : 1,
      message: 'Container will run as root. Add a non-root USER directive.',
      fix: `Add 'RUN adduser -D appuser' and 'USER appuser' before CMD/ENTRYPOINT.`,
    });
  }

  // Check for missing HEALTHCHECK
  if (!hasHealthcheck) {
    findings.push({
      rule: 'recommend-healthcheck',
      severity: SEVERITY.LOW,
      line: parsed.instructions.length > 0 ? parsed.instructions[parsed.instructions.length - 1].line : 1,
      message: 'No HEALTHCHECK defined. Container orchestrators benefit from health checks.',
      fix: `Add HEALTHCHECK --interval=30s CMD curl -f http://localhost:PORT/health || exit 1`,
    });
  }

  // Recommend multi-stage build if build deps detected without multi-stage
  if (hasBuildInstructions && !parsed.isMultiStage) {
    findings.push({
      rule: 'recommend-multi-stage',
      severity: SEVERITY.MEDIUM,
      line: 1,
      message: 'Build instructions detected but no multi-stage build. Build dependencies may be in final image.',
      fix: `Use multi-stage build: separate builder stage from production stage.`,
    });
  }

  // Calculate security score
  const score = calculateScore(findings);

  return {
    findings,
    parsed,
    score,
    summary: {
      total: findings.length,
      critical: findings.filter(f => f.severity === SEVERITY.CRITICAL).length,
      high: findings.filter(f => f.severity === SEVERITY.HIGH).length,
      medium: findings.filter(f => f.severity === SEVERITY.MEDIUM).length,
      low: findings.filter(f => f.severity === SEVERITY.LOW).length,
    },
  };
}

/**
 * Calculate security score (0-100)
 * @param {Array} findings - Lint findings
 * @returns {number} Security score
 */
function calculateScore(findings) {
  let score = 100;

  for (const finding of findings) {
    switch (finding.severity) {
      case SEVERITY.CRITICAL:
        score -= 25;
        break;
      case SEVERITY.HIGH:
        score -= 15;
        break;
      case SEVERITY.MEDIUM:
        score -= 10;
        break;
      case SEVERITY.LOW:
        score -= 5;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Create a configurable Dockerfile linter
 * @param {Object} config - Linter configuration
 * @returns {Object} Linter instance
 */
export function createDockerfileLinter(config = {}) {
  const {
    rules = {},
    customPatterns = [],
  } = config;

  return {
    /**
     * Lint a Dockerfile
     * @param {string} content - Dockerfile content
     * @returns {Object} Lint results
     */
    lint(content) {
      const result = lintDockerfile(content);

      // Filter findings based on rule configuration
      result.findings = result.findings.filter(finding => {
        const ruleConfig = rules[finding.rule];
        if (ruleConfig === 'off' || ruleConfig === false) {
          return false;
        }
        return true;
      });

      // Apply custom patterns
      const parsed = result.parsed;
      for (const pattern of customPatterns) {
        for (const inst of parsed.instructions) {
          if (pattern.pattern.test(inst.arguments)) {
            result.findings.push({
              rule: pattern.name,
              severity: pattern.severity || SEVERITY.MEDIUM,
              line: inst.line,
              message: pattern.message,
              fix: pattern.fix,
            });
          }
        }
      }

      // Recalculate score
      result.score = calculateScore(result.findings);
      result.summary = {
        total: result.findings.length,
        critical: result.findings.filter(f => f.severity === SEVERITY.CRITICAL).length,
        high: result.findings.filter(f => f.severity === SEVERITY.HIGH).length,
        medium: result.findings.filter(f => f.severity === SEVERITY.MEDIUM).length,
        low: result.findings.filter(f => f.severity === SEVERITY.LOW).length,
      };

      return result;
    },

    /**
     * Lint a Dockerfile from file path
     * @param {string} filePath - Path to Dockerfile
     * @param {Function} readFile - File reader function
     * @returns {Promise<Object>} Lint results
     */
    async lintFile(filePath, readFile) {
      const content = await readFile(filePath, 'utf8');
      return this.lint(content);
    },
  };
}
