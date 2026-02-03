/**
 * Container Runtime Security Validator Module
 *
 * Validates docker-compose and container runtime configurations.
 * Based on CIS Docker Benchmark and OWASP Docker Security guidelines.
 */

import yaml from 'js-yaml';

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
 * Dangerous Linux capabilities
 */
const DANGEROUS_CAPABILITIES = [
  'SYS_ADMIN',
  'NET_ADMIN',
  'SYS_PTRACE',
  'SYS_MODULE',
  'DAC_READ_SEARCH',
  'SYS_RAWIO',
  'SYS_BOOT',
  'SYS_TIME',
  'MKNOD',
];

/**
 * Safe capabilities that can be added
 */
const SAFE_CAPABILITIES = [
  'NET_BIND_SERVICE',
  'CHOWN',
  'SETUID',
  'SETGID',
  'FOWNER',
  'DAC_OVERRIDE',
];

/**
 * Database image patterns
 */
const DATABASE_IMAGES = [
  /postgres/i,
  /mysql/i,
  /mariadb/i,
  /mongo/i,
  /redis/i,
  /elasticsearch/i,
  /memcached/i,
];

/**
 * Patterns for secrets in environment values
 */
const SECRET_PATTERNS = [
  /password\s*[=:]\s*[^$\s{][^\s]*/i,
  /secret\s*[=:]\s*[^$\s{][^\s]*/i,
  /api[_-]?key\s*[=:]\s*[^$\s{][^\s]*/i,
  /token\s*[=:]\s*[^$\s{][^\s]*/i,
];

/**
 * Check if a service is a database
 * @param {string} name - Service name
 * @param {Object} service - Service config
 * @returns {boolean} True if database
 */
function isDatabase(name, service) {
  if (DATABASE_IMAGES.some(p => p.test(service.image || ''))) return true;
  if (/db|database|postgres|mysql|mongo|redis/i.test(name)) return true;
  return false;
}

/**
 * Parse docker-compose YAML content
 * @param {string} content - YAML content
 * @returns {Object} Parsed compose config
 */
export function parseCompose(content) {
  try {
    const parsed = yaml.load(content);
    return {
      version: parsed.version || null,
      services: parsed.services || {},
      networks: parsed.networks || {},
      volumes: parsed.volumes || {},
      secrets: parsed.secrets || {},
    };
  } catch (e) {
    throw new Error(`Failed to parse docker-compose: ${e.message}`);
  }
}

/**
 * Validate a single service configuration
 * @param {string} name - Service name
 * @param {Object} service - Service configuration
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateService(name, service, options = {}) {
  const findings = [];
  const isDb = isDatabase(name, service);

  // Check privileged mode
  if (service.privileged === true) {
    findings.push({
      rule: 'no-privileged',
      severity: SEVERITY.CRITICAL,
      service: name,
      message: `Service '${name}' uses privileged mode. This grants full root access.`,
      fix: 'Remove privileged: true. Use specific capabilities instead.',
    });
  }

  // Check capabilities
  const capDrop = service.cap_drop || [];
  const capAdd = service.cap_add || [];

  if (!capDrop.includes('ALL')) {
    findings.push({
      rule: 'require-cap-drop-all',
      severity: SEVERITY.HIGH,
      service: name,
      message: `Service '${name}' should drop all capabilities and add only required ones.`,
      fix: "Add 'cap_drop: [ALL]' to the service.",
    });
  }

  // Check for dangerous capabilities
  const dangerousCaps = capAdd.filter(cap => DANGEROUS_CAPABILITIES.includes(cap));
  if (dangerousCaps.length > 0) {
    findings.push({
      rule: 'dangerous-capabilities',
      severity: SEVERITY.HIGH,
      service: name,
      message: `Service '${name}' adds dangerous capabilities: ${dangerousCaps.join(', ')}`,
      fix: 'Remove dangerous capabilities or document why they are required.',
    });
  }

  // Check network mode
  if (service.network_mode === 'host') {
    findings.push({
      rule: 'no-host-network',
      severity: SEVERITY.HIGH,
      service: name,
      message: `Service '${name}' uses host network mode. This bypasses network isolation.`,
      fix: 'Use custom bridge networks instead of host network.',
    });
  }

  // Check read-only filesystem
  if (!isDb && service.read_only !== true) {
    findings.push({
      rule: 'recommend-read-only',
      severity: SEVERITY.MEDIUM,
      service: name,
      message: `Service '${name}' should use read-only root filesystem.`,
      fix: "Add 'read_only: true' and mount writable volumes for needed paths.",
    });
  }

  // Check user
  if (!service.user) {
    findings.push({
      rule: 'recommend-user',
      severity: SEVERITY.MEDIUM,
      service: name,
      message: `Service '${name}' should specify a non-root user.`,
      fix: "Add 'user: \"1000:1000\"' or similar non-root user.",
    });
  } else if (service.user === 'root' || service.user === '0' || service.user === '0:0') {
    findings.push({
      rule: 'no-root-user',
      severity: SEVERITY.HIGH,
      service: name,
      message: `Service '${name}' runs as root user.`,
      fix: 'Change to a non-root user.',
    });
  }

  // Check security_opt
  const securityOpt = service.security_opt || [];
  const hasNoNewPrivileges = securityOpt.some(opt =>
    opt.includes('no-new-privileges')
  );
  const hasSeccomp = securityOpt.some(opt =>
    opt.includes('seccomp')
  );

  if (!hasNoNewPrivileges) {
    findings.push({
      rule: 'recommend-no-new-privileges',
      severity: SEVERITY.MEDIUM,
      service: name,
      message: `Service '${name}' should prevent privilege escalation.`,
      fix: "Add 'security_opt: [no-new-privileges:true]'.",
    });
  }

  if (!hasSeccomp) {
    findings.push({
      rule: 'recommend-seccomp',
      severity: SEVERITY.LOW,
      service: name,
      message: `Service '${name}' should use seccomp profile.`,
      fix: "Add 'security_opt: [seccomp:default]' or custom profile.",
    });
  }

  // Check resource limits
  const hasDeployLimits = service.deploy?.resources?.limits;
  const hasMemLimit = service.mem_limit || service.memory;
  if (!hasDeployLimits && !hasMemLimit) {
    findings.push({
      rule: 'recommend-resource-limits',
      severity: SEVERITY.MEDIUM,
      service: name,
      message: `Service '${name}' should have resource limits.`,
      fix: 'Add deploy.resources.limits or mem_limit to prevent resource exhaustion.',
    });
  }

  return { findings };
}

/**
 * Validate a full docker-compose configuration
 * @param {string} content - YAML content
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateCompose(content, options = {}) {
  const parsed = parseCompose(content);
  const findings = [];
  const recommendations = [];

  // Validate each service
  for (const [name, service] of Object.entries(parsed.services)) {
    const serviceResult = validateService(name, service, options);
    findings.push(...serviceResult.findings);
  }

  // Check for custom networks
  const hasCustomNetworks = Object.keys(parsed.networks).length > 0;
  const servicesUseNetworks = Object.values(parsed.services).some(s => s.networks);

  if (!hasCustomNetworks && !servicesUseNetworks) {
    findings.push({
      rule: 'use-custom-networks',
      severity: SEVERITY.MEDIUM,
      message: 'No custom networks defined. Services will use default bridge network.',
      fix: 'Define custom networks for network segmentation.',
    });
  }

  // Check database network isolation
  for (const [name, service] of Object.entries(parsed.services)) {
    if (isDatabase(name, service)) {
      const serviceNetworks = service.networks || [];
      let hasInternalNetwork = false;

      for (const netName of serviceNetworks) {
        const netConfig = parsed.networks[netName];
        if (netConfig?.internal === true) {
          hasInternalNetwork = true;
          break;
        }
      }

      if (serviceNetworks.length > 0 && !hasInternalNetwork) {
        findings.push({
          rule: 'database-internal-network',
          severity: SEVERITY.MEDIUM,
          service: name,
          message: `Database '${name}' should use internal network (not externally accessible).`,
          fix: 'Add "internal: true" to database network configuration.',
        });
      }
    }
  }

  // Check for secrets in environment
  for (const [name, service] of Object.entries(parsed.services)) {
    const env = service.environment || {};
    const envList = Array.isArray(env) ? env : Object.entries(env).map(([k, v]) => `${k}=${v}`);

    for (const envVar of envList) {
      // Check for hardcoded secrets
      if (SECRET_PATTERNS.some(p => p.test(envVar))) {
        findings.push({
          rule: 'no-secrets-in-env',
          severity: SEVERITY.CRITICAL,
          service: name,
          message: `Service '${name}' has possible hardcoded secret in environment.`,
          fix: 'Use Docker secrets or external secret management.',
        });
      }
    }

    // Recommend Docker secrets for password-like vars
    const hasPasswordEnv = envList.some(e =>
      /password|secret|key|token/i.test(e)
    );
    const hasSecretsDefined = Object.keys(parsed.secrets || {}).length > 0;
    if (hasPasswordEnv && !hasSecretsDefined) {
      const existingRec = recommendations.find(r => r.rule === 'recommend-docker-secrets');
      if (!existingRec) {
        findings.push({
          rule: 'recommend-docker-secrets',
          severity: SEVERITY.LOW,
          message: 'Sensitive environment variables detected. Consider using Docker secrets.',
          fix: 'Define secrets in docker-compose and mount them in services.',
        });
        recommendations.push({ rule: 'recommend-docker-secrets' });
      }
    }
  }

  // Calculate score
  const score = calculateScore(findings);

  // Generate recommendations
  const allRecommendations = generateRecommendations(findings);

  return {
    findings,
    parsed,
    score,
    recommendations: allRecommendations,
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
 * @param {Array} findings - Validation findings
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
 * Generate recommendations from findings
 * @param {Array} findings - Validation findings
 * @returns {Array} Recommendations
 */
function generateRecommendations(findings) {
  const recommendations = [];
  const seenRules = new Set();

  for (const finding of findings) {
    if (!seenRules.has(finding.rule) && finding.fix) {
      recommendations.push({
        rule: finding.rule,
        severity: finding.severity,
        message: finding.message,
        fix: finding.fix,
      });
      seenRules.add(finding.rule);
    }
  }

  return recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Create a configurable runtime validator
 * @param {Object} config - Validator configuration
 * @returns {Object} Validator instance
 */
export function createRuntimeValidator(config = {}) {
  const { rules = {} } = config;

  return {
    /**
     * Validate docker-compose content
     * @param {string} content - YAML content
     * @returns {Object} Validation result
     */
    validate(content) {
      const result = validateCompose(content);

      // Filter findings based on rule configuration
      result.findings = result.findings.filter(finding => {
        const ruleConfig = rules[finding.rule];
        if (ruleConfig === 'off' || ruleConfig === false) {
          return false;
        }
        return true;
      });

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
     * Validate from file path
     * @param {string} filePath - Path to docker-compose.yml
     * @param {Function} readFile - File reader function
     * @returns {Promise<Object>} Validation result
     */
    async validateFile(filePath, readFile) {
      const content = await readFile(filePath, 'utf8');
      return this.validate(content);
    },
  };
}
