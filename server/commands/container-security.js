/**
 * Container Security Command
 *
 * CLI command for analyzing and fixing container security issues.
 */

import { lintDockerfile } from '../lib/security/dockerfile-linter.js';
import { checkDockerfileCompliance, checkComposeCompliance, checkRuntimeCompliance, generateComplianceReport } from '../lib/security/cis-benchmark.js';
import { detectSecretsInCompose, detectSecretsInDockerfile } from '../lib/security/secrets-validator.js';
import { SECURITY_DEFAULTS } from '../lib/security/compose-templates.js';

/**
 * Analyze a Dockerfile for security issues
 */
export function analyzeDockerfile(dockerfile) {
  const lintResult = lintDockerfile(dockerfile);
  const cisResult = checkDockerfileCompliance(dockerfile);

  // Combine findings
  const findings = [...lintResult.findings, ...cisResult.findings];

  // Deduplicate by rule/cis
  const seen = new Set();
  const uniqueFindings = findings.filter(f => {
    const key = f.cis || f.rule;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate score (average of both)
  const score = Math.round((lintResult.score + cisResult.score) / 2);

  return {
    findings: uniqueFindings,
    score,
    details: {
      lint: lintResult,
      cis: cisResult,
    },
  };
}

/**
 * Analyze docker-compose for security issues
 */
export function analyzeCompose(compose) {
  const cisResult = checkComposeCompliance(compose);
  const runtimeResult = checkRuntimeCompliance(compose);
  const secretsResult = detectSecretsInCompose(compose);

  // Combine findings
  const findings = [
    ...cisResult.findings,
    ...runtimeResult.findings,
    ...secretsResult.findings,
  ];

  // Deduplicate
  const seen = new Set();
  const uniqueFindings = findings.filter(f => {
    const key = `${f.service || ''}-${f.cis || f.rule}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate weighted score
  const criticalCount = uniqueFindings.filter(f => f.severity === 'critical').length;
  const highCount = uniqueFindings.filter(f => f.severity === 'high').length;
  const mediumCount = uniqueFindings.filter(f => f.severity === 'medium').length;

  const score = Math.max(0, 100 - criticalCount * 25 - highCount * 10 - mediumCount * 5);

  return {
    findings: uniqueFindings,
    score,
    details: {
      cis: cisResult,
      runtime: runtimeResult,
      secrets: secretsResult,
    },
  };
}

/**
 * Run full security audit
 */
export function runSecurityAudit(options = {}) {
  const result = {
    dockerfile: null,
    compose: null,
    overall: {
      score: 0,
      findings: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
  };

  if (options.dockerfile) {
    result.dockerfile = analyzeDockerfile(options.dockerfile);
    result.overall.findings.push(...result.dockerfile.findings.map(f => ({
      ...f,
      source: 'dockerfile',
    })));
  }

  if (options.compose) {
    result.compose = analyzeCompose(options.compose);
    result.overall.findings.push(...result.compose.findings.map(f => ({
      ...f,
      source: 'compose',
    })));
  }

  // Calculate overall score
  const scores = [];
  if (result.dockerfile) scores.push(result.dockerfile.score);
  if (result.compose) scores.push(result.compose.score);
  result.overall.score = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 100;

  // Count by severity
  for (const finding of result.overall.findings) {
    const severity = (finding.severity || 'low').toLowerCase();
    if (result.overall.summary[severity] !== undefined) {
      result.overall.summary[severity]++;
    }
  }

  return result;
}

/**
 * Generate security report
 */
export function generateSecurityReport(auditResult, options = {}) {
  const { format = 'markdown' } = options;

  if (format === 'json') {
    return JSON.stringify(auditResult, null, 2);
  }

  // Markdown format
  const lines = [
    '# Container Security Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Overall Score:** ${auditResult.overall.score}/100`,
    `- **Critical Issues:** ${auditResult.overall.summary.critical}`,
    `- **High Issues:** ${auditResult.overall.summary.high}`,
    `- **Medium Issues:** ${auditResult.overall.summary.medium}`,
    `- **Low Issues:** ${auditResult.overall.summary.low}`,
    '',
  ];

  if (auditResult.dockerfile) {
    lines.push(
      '## Dockerfile Analysis',
      '',
      `Score: ${auditResult.dockerfile.score}/100`,
      '',
    );
    if (auditResult.dockerfile.findings.length > 0) {
      lines.push('### Findings', '');
      for (const f of auditResult.dockerfile.findings) {
        lines.push(`- **${f.severity?.toUpperCase() || 'INFO'}** ${f.cis ? `[CIS ${f.cis}]` : ''} ${f.message}`);
        if (f.fix) lines.push(`  - *Remediation:* ${f.fix}`);
      }
      lines.push('');
    }
  }

  if (auditResult.compose) {
    lines.push(
      '## Compose Analysis',
      '',
      `Score: ${auditResult.compose.score}/100`,
      '',
    );
    if (auditResult.compose.findings.length > 0) {
      lines.push('### Findings', '');
      for (const f of auditResult.compose.findings) {
        const service = f.service ? ` (${f.service})` : '';
        lines.push(`- **${f.severity?.toUpperCase() || 'INFO'}**${service} ${f.cis ? `[CIS ${f.cis}]` : ''} ${f.message}`);
        if (f.fix) lines.push(`  - *Remediation:* ${f.fix}`);
      }
      lines.push('');
    }
  }

  lines.push(
    '## Recommendations',
    '',
    '1. Address all critical and high severity issues before deployment',
    '2. Use multi-stage builds to minimize image size',
    '3. Run containers as non-root users',
    '4. Drop all capabilities and add only what is needed',
    '5. Use read-only filesystems where possible',
    '6. Set resource limits on all containers',
    '7. Use Docker secrets for sensitive data',
    '',
  );

  return lines.join('\n');
}

/**
 * Suggest fixes for security issues
 */
export function fixSecurityIssues(options = {}) {
  const result = {
    dockerfile: null,
    compose: null,
  };

  if (options.dockerfile) {
    const analysis = analyzeDockerfile(options.dockerfile);
    const lines = options.dockerfile.split('\n');
    const suggestedLines = [...lines];

    // Add USER if missing
    const hasUser = lines.some(l => l.trim().toUpperCase().startsWith('USER '));
    if (!hasUser) {
      const cmdIndex = suggestedLines.findIndex(l => l.trim().toUpperCase().startsWith('CMD '));
      if (cmdIndex > 0) {
        suggestedLines.splice(cmdIndex, 0, '', '# Run as non-root user', 'USER node');
      }
    }

    // Add HEALTHCHECK if missing
    const hasHealthcheck = lines.some(l => l.trim().toUpperCase().startsWith('HEALTHCHECK '));
    if (!hasHealthcheck) {
      const cmdIndex = suggestedLines.findIndex(l => l.trim().toUpperCase().startsWith('CMD '));
      if (cmdIndex > 0) {
        suggestedLines.splice(cmdIndex, 0, '', '# Health check', 'HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost/ || exit 1');
      }
    }

    // Replace :latest with specific version
    for (let i = 0; i < suggestedLines.length; i++) {
      if (suggestedLines[i].match(/FROM\s+\w+:latest/i)) {
        suggestedLines[i] = suggestedLines[i].replace(/:latest/i, ':20-alpine');
      }
    }

    result.dockerfile = {
      original: options.dockerfile,
      suggested: suggestedLines.join('\n'),
      changes: analysis.findings.length,
    };
  }

  if (options.compose) {
    const analysis = analyzeCompose(options.compose);
    const suggested = JSON.parse(JSON.stringify(options.compose));

    // Apply security defaults to each service
    for (const [name, service] of Object.entries(suggested.services || {})) {
      // Add cap_drop if missing
      if (!service.cap_drop) {
        service.cap_drop = ['ALL'];
      }

      // Add security_opt if missing
      if (!service.security_opt) {
        service.security_opt = ['no-new-privileges:true'];
      } else if (!service.security_opt.some(o => o.includes('no-new-privileges'))) {
        service.security_opt.push('no-new-privileges:true');
      }

      // Add read_only if missing (except for databases)
      if (service.read_only === undefined && !/db|postgres|mysql|mongo|redis/i.test(name)) {
        service.read_only = true;
      }

      // Add memory limits if missing
      if (!service.deploy?.resources?.limits?.memory && !service.mem_limit) {
        service.deploy = service.deploy || {};
        service.deploy.resources = service.deploy.resources || {};
        service.deploy.resources.limits = service.deploy.resources.limits || {};
        service.deploy.resources.limits.memory = '512M';
      }
    }

    result.compose = {
      original: options.compose,
      suggested,
      changes: analysis.findings.length,
    };
  }

  return result;
}

/**
 * Create the container-security command
 */
export function createContainerSecurityCommand() {
  return {
    name: 'container-security',
    description: 'Analyze and fix container security issues',
    subcommands: {
      audit: {
        description: 'Run security audit on Dockerfile and/or compose file',
        execute: async (args, context) => {
          const options = {};
          if (args.dockerfile) {
            options.dockerfile = await context.readFile(args.dockerfile);
          }
          if (args.compose) {
            const content = await context.readFile(args.compose);
            options.compose = context.parseYaml(content);
          }
          return runSecurityAudit(options);
        },
      },
      fix: {
        description: 'Suggest fixes for security issues',
        execute: async (args, context) => {
          const options = {};
          if (args.dockerfile) {
            options.dockerfile = await context.readFile(args.dockerfile);
          }
          if (args.compose) {
            const content = await context.readFile(args.compose);
            options.compose = context.parseYaml(content);
          }
          return fixSecurityIssues(options);
        },
      },
      report: {
        description: 'Generate security report',
        execute: async (args, context) => {
          const options = {};
          if (args.dockerfile) {
            options.dockerfile = await context.readFile(args.dockerfile);
          }
          if (args.compose) {
            const content = await context.readFile(args.compose);
            options.compose = context.parseYaml(content);
          }
          const auditResult = runSecurityAudit(options);
          return generateSecurityReport(auditResult, { format: args.format || 'markdown' });
        },
      },
    },
    execute: async (args, context) => {
      // Default to audit
      return this.subcommands.audit.execute(args, context);
    },
  };
}
