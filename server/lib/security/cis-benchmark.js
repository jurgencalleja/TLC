/**
 * CIS Docker Benchmark Checker
 */

export const CIS_CHECKS = {
  '4.1': { title: 'Ensure a user for the container has been created', level: 1 },
  '4.6': { title: 'Ensure HEALTHCHECK instructions have been added', level: 1 },
  '4.8': { title: 'Ensure setuid and setgid permissions are removed', level: 2 },
  '5.3': { title: 'Ensure Linux kernel capabilities are restricted', level: 1 },
  '5.4': { title: 'Ensure privileged containers are not used', level: 1 },
  '5.10': { title: 'Ensure memory usage for container is limited', level: 1 },
  '5.11': { title: 'Ensure CPU priority is set appropriately', level: 1 },
  '5.12': { title: 'Ensure the container root filesystem is mounted as read only', level: 1 },
  '5.13': { title: 'Ensure incoming container traffic is bound to a specific host interface', level: 1 },
  '5.14': { title: 'Ensure on-failure restart policy is set to 5', level: 1 },
  '5.25': { title: 'Ensure the container is restricted from acquiring new privileges', level: 1 },
};

export function checkDockerfileCompliance(dockerfile) {
  const findings = [];
  const lines = dockerfile.split('\n').map(l => l.trim().toUpperCase());

  // CIS 4.1 - USER directive
  if (!lines.some(l => l.startsWith('USER ') && !l.includes('ROOT'))) {
    findings.push({ cis: '4.1', severity: 'high', message: 'No non-root USER directive found.' });
  }

  // CIS 4.6 - HEALTHCHECK
  if (!lines.some(l => l.startsWith('HEALTHCHECK '))) {
    findings.push({ cis: '4.6', severity: 'medium', message: 'No HEALTHCHECK instruction.' });
  }

  // CIS 4.8 - Content trust / signing labels
  if (!dockerfile.toLowerCase().includes('label') || !dockerfile.toLowerCase().includes('maintainer')) {
    findings.push({ cis: '4.8', severity: 'low', message: 'Missing image labels for content trust.' });
  }

  return { findings, score: Math.max(0, 100 - findings.length * 20) };
}

export function checkComposeCompliance(compose) {
  const findings = [];
  const services = compose.services || {};

  for (const [name, svc] of Object.entries(services)) {
    // CIS 5.4 - No privileged
    if (svc.privileged === true) {
      findings.push({ cis: '5.4', severity: 'critical', service: name, message: `Service '${name}' uses privileged mode.` });
    }

    // CIS 5.3 - Capabilities
    if (!svc.cap_drop?.includes('ALL')) {
      findings.push({ cis: '5.3', severity: 'high', service: name, message: `Service '${name}' should drop ALL capabilities.` });
    }

    // CIS 5.10 - Memory limits
    const hasMemLimit = svc.deploy?.resources?.limits?.memory || svc.mem_limit;
    if (!hasMemLimit) {
      findings.push({ cis: '5.10', severity: 'medium', service: name, message: `Service '${name}' has no memory limit.` });
    }

    // CIS 5.12 - Read-only root
    if (svc.read_only !== true && !/db|postgres|mysql|mongo|redis/i.test(name)) {
      findings.push({ cis: '5.12', severity: 'medium', service: name, message: `Service '${name}' should use read_only filesystem.` });
    }

    // CIS 5.25 - No new privileges
    const hasNoNewPriv = svc.security_opt?.some(o => o.includes('no-new-privileges'));
    if (!hasNoNewPriv) {
      findings.push({ cis: '5.25', severity: 'medium', service: name, message: `Service '${name}' should set no-new-privileges.` });
    }
  }

  return { findings, score: Math.max(0, 100 - findings.filter(f => f.severity === 'critical').length * 30 - findings.filter(f => f.severity === 'high').length * 15) };
}

export function checkRuntimeCompliance(compose) {
  const findings = [];
  const services = compose.services || {};

  for (const [name, svc] of Object.entries(services)) {
    // CIS 5.11 - PID limits
    if (!svc.pids_limit) {
      findings.push({ cis: '5.11', severity: 'low', service: name, message: `Service '${name}' has no PID limit.` });
    }

    // CIS 5.13 - Network mode
    if (svc.network_mode === 'host') {
      findings.push({ cis: '5.13', severity: 'high', service: name, message: `Service '${name}' uses host network.` });
    }

    // CIS 5.14 - Restart policy
    if (svc.restart === 'always') {
      findings.push({ cis: '5.14', severity: 'low', service: name, message: `Service '${name}' uses restart:always instead of on-failure.` });
    }
  }

  return { findings, score: Math.max(0, 100 - findings.length * 10) };
}

export function generateComplianceReport(options = {}) {
  const findings = [];

  if (options.dockerfile) {
    findings.push(...checkDockerfileCompliance(options.dockerfile).findings);
  }
  if (options.compose) {
    findings.push(...checkComposeCompliance(options.compose).findings);
    findings.push(...checkRuntimeCompliance(options.compose).findings);
  }

  const bySection = {};
  for (const f of findings) {
    const section = f.cis.split('.')[0];
    bySection[section] = bySection[section] || [];
    bySection[section].push(f);
  }

  const level1Checks = Object.entries(CIS_CHECKS).filter(([, v]) => v.level === 1).length;
  const level1Fails = findings.filter(f => CIS_CHECKS[f.cis]?.level === 1).length;
  const level1Score = Math.round(((level1Checks - level1Fails) / level1Checks) * 100);

  return {
    findings,
    bySection,
    level1Score,
    summary: {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

export function createCisBenchmark(config = {}) {
  return {
    checkDockerfile: checkDockerfileCompliance,
    checkCompose: checkComposeCompliance,
    checkRuntime: checkRuntimeCompliance,
    generateReport: generateComplianceReport,
    audit(options) {
      const report = generateComplianceReport(options);
      return {
        ...report,
        score: report.level1Score,
        passed: report.level1Score >= (config.passThreshold || 70),
      };
    },
  };
}
