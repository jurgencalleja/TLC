/**
 * Container Security Command Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeDockerfile,
  analyzeCompose,
  runSecurityAudit,
  generateSecurityReport,
  fixSecurityIssues,
  createContainerSecurityCommand,
} from './container-security.js';

describe('container-security command', () => {
  describe('analyzeDockerfile', () => {
    it('analyzes Dockerfile for security issues', () => {
      const dockerfile = `
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
`;
      const result = analyzeDockerfile(dockerfile);
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('returns score from 0-100', () => {
      const dockerfile = 'FROM node:20-alpine\nUSER node';
      const result = analyzeDockerfile(dockerfile);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('detects missing USER directive', () => {
      const dockerfile = 'FROM node:20\nCMD ["node"]';
      const result = analyzeDockerfile(dockerfile);
      const userFinding = result.findings.find(f => f.rule.includes('user') || f.cis === '4.1');
      expect(userFinding).toBeDefined();
    });

    it('detects latest tag usage', () => {
      const dockerfile = 'FROM node:latest';
      const result = analyzeDockerfile(dockerfile);
      const latestFinding = result.findings.find(f =>
        f.rule.includes('latest') || f.message.toLowerCase().includes('latest')
      );
      expect(latestFinding).toBeDefined();
    });

    it('detects missing HEALTHCHECK', () => {
      const dockerfile = 'FROM node:20\nUSER node';
      const result = analyzeDockerfile(dockerfile);
      const healthFinding = result.findings.find(f =>
        f.rule.includes('healthcheck') || f.cis === '4.6'
      );
      expect(healthFinding).toBeDefined();
    });
  });

  describe('analyzeCompose', () => {
    it('analyzes docker-compose for security issues', () => {
      const compose = {
        services: {
          app: {
            image: 'node:20',
            privileged: true,
          },
        },
      };
      const result = analyzeCompose(compose);
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('detects privileged containers', () => {
      const compose = {
        services: {
          app: { privileged: true },
        },
      };
      const result = analyzeCompose(compose);
      const privFinding = result.findings.find(f =>
        f.cis === '5.4' || f.message.toLowerCase().includes('privileged')
      );
      expect(privFinding).toBeDefined();
    });

    it('detects missing capability drops', () => {
      const compose = {
        services: {
          app: { image: 'node:20' },
        },
      };
      const result = analyzeCompose(compose);
      const capFinding = result.findings.find(f =>
        f.cis === '5.3' || f.message.toLowerCase().includes('capabilit')
      );
      expect(capFinding).toBeDefined();
    });

    it('detects missing memory limits', () => {
      const compose = {
        services: {
          app: { image: 'node:20', cap_drop: ['ALL'] },
        },
      };
      const result = analyzeCompose(compose);
      const memFinding = result.findings.find(f =>
        f.cis === '5.10' || f.message.toLowerCase().includes('memory')
      );
      expect(memFinding).toBeDefined();
    });

    it('returns overall score', () => {
      const compose = {
        services: {
          app: {
            image: 'node:20',
            cap_drop: ['ALL'],
            security_opt: ['no-new-privileges:true'],
            read_only: true,
            deploy: { resources: { limits: { memory: '512M' } } },
          },
        },
      };
      const result = analyzeCompose(compose);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('runSecurityAudit', () => {
    it('combines Dockerfile and compose analysis', () => {
      const options = {
        dockerfile: 'FROM node:20-alpine\nUSER node\nHEALTHCHECK CMD curl localhost',
        compose: {
          services: {
            app: {
              cap_drop: ['ALL'],
              security_opt: ['no-new-privileges:true'],
              deploy: { resources: { limits: { memory: '512M' } } },
            },
          },
        },
      };
      const result = runSecurityAudit(options);
      expect(result.dockerfile).toBeDefined();
      expect(result.compose).toBeDefined();
      expect(result.overall).toBeDefined();
    });

    it('calculates overall score', () => {
      const options = {
        dockerfile: 'FROM node:20\nUSER node',
        compose: { services: { app: { cap_drop: ['ALL'] } } },
      };
      const result = runSecurityAudit(options);
      expect(result.overall.score).toBeDefined();
      expect(typeof result.overall.score).toBe('number');
    });

    it('categorizes findings by severity', () => {
      const options = {
        dockerfile: 'FROM node:latest',
        compose: { services: { app: { privileged: true } } },
      };
      const result = runSecurityAudit(options);
      expect(result.overall.summary).toBeDefined();
      expect(result.overall.summary.critical).toBeDefined();
      expect(result.overall.summary.high).toBeDefined();
    });
  });

  describe('generateSecurityReport', () => {
    it('generates markdown report', () => {
      const auditResult = runSecurityAudit({
        dockerfile: 'FROM node:20\nUSER node',
        compose: { services: { app: { cap_drop: ['ALL'] } } },
      });
      const report = generateSecurityReport(auditResult, { format: 'markdown' });
      expect(report).toContain('# Container Security Report');
      expect(report).toContain('Score');
    });

    it('generates JSON report', () => {
      const auditResult = runSecurityAudit({
        dockerfile: 'FROM node:20',
        compose: { services: {} },
      });
      const report = generateSecurityReport(auditResult, { format: 'json' });
      const parsed = JSON.parse(report);
      expect(parsed.overall).toBeDefined();
    });

    it('includes remediation steps', () => {
      const auditResult = runSecurityAudit({
        dockerfile: 'FROM node:latest',
        compose: { services: { app: { privileged: true } } },
      });
      const report = generateSecurityReport(auditResult, { format: 'markdown' });
      expect(report.toLowerCase()).toMatch(/remediat|fix|recommend/);
    });
  });

  describe('fixSecurityIssues', () => {
    it('suggests Dockerfile fixes', () => {
      const dockerfile = 'FROM node:latest\nCMD ["node"]';
      const result = fixSecurityIssues({ dockerfile });
      expect(result.dockerfile).toBeDefined();
      expect(result.dockerfile.suggested).toBeDefined();
    });

    it('suggests compose fixes', () => {
      const compose = {
        services: {
          app: { image: 'node:20' },
        },
      };
      const result = fixSecurityIssues({ compose });
      expect(result.compose).toBeDefined();
      expect(result.compose.suggested).toBeDefined();
      // Should add security options
      expect(result.compose.suggested.services.app.cap_drop).toBeDefined();
    });

    it('preserves existing secure settings', () => {
      const compose = {
        services: {
          app: {
            image: 'node:20',
            cap_drop: ['ALL'],
            environment: { NODE_ENV: 'production' },
          },
        },
      };
      const result = fixSecurityIssues({ compose });
      expect(result.compose.suggested.services.app.cap_drop).toContain('ALL');
      expect(result.compose.suggested.services.app.environment.NODE_ENV).toBe('production');
    });
  });

  describe('createContainerSecurityCommand', () => {
    it('creates command handler', () => {
      const command = createContainerSecurityCommand();
      expect(command.name).toBe('container-security');
      expect(command.description).toBeDefined();
      expect(command.execute).toBeDefined();
    });

    it('has audit subcommand', () => {
      const command = createContainerSecurityCommand();
      expect(command.subcommands).toBeDefined();
      expect(command.subcommands.audit).toBeDefined();
    });

    it('has fix subcommand', () => {
      const command = createContainerSecurityCommand();
      expect(command.subcommands.fix).toBeDefined();
    });

    it('has report subcommand', () => {
      const command = createContainerSecurityCommand();
      expect(command.subcommands.report).toBeDefined();
    });
  });
});
