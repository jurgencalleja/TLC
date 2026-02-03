/**
 * Secrets Management Validator Module
 */

const SECRET_PATTERNS = [
  /password\s*[=:]\s*[^$\s{}\n][^\s\n]*/i,
  /secret\s*[=:]\s*[^$\s{}\n][^\s\n]*/i,
  /api[_-]?key\s*[=:]\s*[^$\s{}\n][^\s\n]*/i,
  /token\s*[=:]\s*[^$\s{}\n][^\s\n]*/i,
  /sk_live_\w+/,
  /sk_test_\w+/,
  /AKIA[0-9A-Z]{16}/,
];

const SENSITIVE_FILES = ['.env', '.env.local', 'id_rsa', '*.pem', '*.key', 'credentials'];

function matchesSecretPattern(value, patterns = SECRET_PATTERNS) {
  if (typeof value !== 'string') return false;
  if (value.includes('${') || value.startsWith('$')) return false;
  return patterns.some(p => p.test(value));
}

export function detectSecretsInCompose(compose, options = {}) {
  const findings = [];
  const patterns = options.patterns || SECRET_PATTERNS;
  const services = compose.services || {};
  const secrets = compose.secrets || {};
  const hasDockerSecrets = Object.keys(secrets).length > 0;

  for (const [name, service] of Object.entries(services)) {
    const env = service.environment || {};
    const envList = Array.isArray(env) ? env : Object.entries(env).map(([k, v]) => `${k}=${v}`);

    for (const envVar of envList) {
      if (matchesSecretPattern(envVar, patterns)) {
        findings.push({
          rule: 'hardcoded-secret',
          severity: 'critical',
          service: name,
          message: `Hardcoded secret in environment for '${name}'.`,
          fix: 'Use Docker secrets or external secret management.',
        });
      }
    }

    // Check for password-like vars without Docker secrets
    const hasPasswordEnv = envList.some(e => /password|secret|key|token/i.test(e));
    if (hasPasswordEnv && !hasDockerSecrets && !service.secrets) {
      findings.push({
        rule: 'prefer-docker-secrets',
        severity: 'medium',
        service: name,
        message: `Service '${name}' uses env vars for secrets instead of Docker secrets.`,
        fix: 'Define secrets in compose and mount them in services.',
      });
    }
  }

  return { findings, score: Math.max(0, 100 - findings.filter(f => f.severity === 'critical').length * 30) };
}

export function detectSecretsInDockerfile(dockerfile, options = {}) {
  const findings = [];
  const lines = dockerfile.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Check ENV and ARG for secrets
    if (/^(ENV|ARG)\s+\w+=/i.test(line)) {
      if (matchesSecretPattern(line)) {
        findings.push({
          rule: 'secret-in-dockerfile',
          severity: 'critical',
          line: lineNum,
          message: `Secret in Dockerfile at line ${lineNum}.`,
          fix: 'Use build secrets or runtime injection.',
        });
      }
    }

    // Check COPY for sensitive files
    if (/^(COPY|ADD)\s+/i.test(line)) {
      const isSensitive = SENSITIVE_FILES.some(f => line.includes(f.replace('*', '')));
      if (isSensitive) {
        findings.push({
          rule: 'secret-file-copied',
          severity: 'critical',
          line: lineNum,
          message: `Sensitive file copied at line ${lineNum}.`,
          fix: 'Add to .dockerignore and use runtime mounting.',
        });
      }
    }
  }

  return { findings, score: Math.max(0, 100 - findings.length * 25) };
}

export function validateSecrets(options = {}) {
  const findings = [];

  if (options.compose) {
    const composeResult = detectSecretsInCompose(options.compose);
    findings.push(...composeResult.findings);
  }

  if (options.dockerfile) {
    const dockerfileResult = detectSecretsInDockerfile(options.dockerfile);
    findings.push(...dockerfileResult.findings);
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'critical').length * 25);

  return { findings, score };
}

export function createSecretsValidator(config = {}) {
  const patterns = config.patterns ? [...SECRET_PATTERNS, ...config.patterns] : SECRET_PATTERNS;

  return {
    validateCompose(compose) {
      const result = detectSecretsInCompose(compose, { patterns });
      return {
        ...result,
        recommendations: result.findings.map(f => ({ rule: f.rule, fix: f.fix })),
      };
    },
    validateDockerfile(dockerfile) {
      return detectSecretsInDockerfile(dockerfile, { patterns });
    },
    validate(options) {
      return validateSecrets({ ...options, patterns });
    },
  };
}
