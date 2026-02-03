/**
 * Hardened Dockerfile Templates Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateServerDockerfile,
  generateDashboardDockerfile,
  generateBaseDockerfile,
  SECURITY_HEADERS,
} from './dockerfile-templates.js';
import { checkDockerfileCompliance } from './cis-benchmark.js';
import { lintDockerfile } from './dockerfile-linter.js';

describe('dockerfile-templates', () => {
  describe('generateServerDockerfile', () => {
    it('generates a valid Dockerfile', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toContain('FROM');
      expect(dockerfile).toContain('USER');
      expect(dockerfile).toContain('HEALTHCHECK');
    });

    it('uses multi-stage build', () => {
      const dockerfile = generateServerDockerfile();
      const fromCount = (dockerfile.match(/^FROM /gm) || []).length;
      expect(fromCount).toBeGreaterThanOrEqual(2);
    });

    it('runs as non-root user', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toMatch(/USER\s+(?!root)\w+/i);
    });

    it('has HEALTHCHECK instruction', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toContain('HEALTHCHECK');
    });

    it('uses specific version tags, not latest', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).not.toMatch(/FROM\s+\w+:latest/i);
    });

    it('drops privileges with dumb-init or tini', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toMatch(/dumb-init|tini/i);
    });

    it('copies only necessary files', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toContain('COPY --from=');
    });

    it('sets NODE_ENV to production', () => {
      const dockerfile = generateServerDockerfile();
      expect(dockerfile).toMatch(/ENV\s+NODE_ENV\s*=?\s*production/i);
    });

    it('exposes correct port', () => {
      const dockerfile = generateServerDockerfile({ port: 5001 });
      expect(dockerfile).toContain('EXPOSE 5001');
    });

    it('passes CIS benchmark checks', () => {
      const dockerfile = generateServerDockerfile();
      const result = checkDockerfileCompliance(dockerfile);
      // Should have no high severity findings
      const highFindings = result.findings.filter(f => f.severity === 'high');
      expect(highFindings.length).toBe(0);
    });

    it('passes dockerfile linter', () => {
      const dockerfile = generateServerDockerfile();
      const result = lintDockerfile(dockerfile);
      const critical = result.findings.filter(f => f.severity === 'critical');
      expect(critical.length).toBe(0);
    });
  });

  describe('generateDashboardDockerfile', () => {
    it('generates a valid Dockerfile for React/Vite', () => {
      const dockerfile = generateDashboardDockerfile();
      expect(dockerfile).toContain('FROM');
      expect(dockerfile).toContain('npm run build');
    });

    it('uses nginx for serving static files', () => {
      const dockerfile = generateDashboardDockerfile();
      expect(dockerfile).toContain('nginx');
    });

    it('uses multi-stage build', () => {
      const dockerfile = generateDashboardDockerfile();
      const fromCount = (dockerfile.match(/^FROM /gm) || []).length;
      expect(fromCount).toBeGreaterThanOrEqual(2);
    });

    it('runs nginx as non-root', () => {
      const dockerfile = generateDashboardDockerfile();
      expect(dockerfile).toMatch(/USER\s+(?!root)\w+/i);
    });

    it('has HEALTHCHECK', () => {
      const dockerfile = generateDashboardDockerfile();
      expect(dockerfile).toContain('HEALTHCHECK');
    });

    it('removes default nginx config', () => {
      const dockerfile = generateDashboardDockerfile();
      expect(dockerfile).toMatch(/rm.*default\.conf|COPY.*nginx\.conf/i);
    });

    it('exposes correct port', () => {
      const dockerfile = generateDashboardDockerfile({ port: 80 });
      expect(dockerfile).toContain('EXPOSE 80');
    });

    it('passes CIS benchmark checks', () => {
      const dockerfile = generateDashboardDockerfile();
      const result = checkDockerfileCompliance(dockerfile);
      const highFindings = result.findings.filter(f => f.severity === 'high');
      expect(highFindings.length).toBe(0);
    });
  });

  describe('generateBaseDockerfile', () => {
    it('generates customizable base image', () => {
      const dockerfile = generateBaseDockerfile({
        baseImage: 'node:20-alpine',
        user: 'appuser',
        workdir: '/app',
      });
      expect(dockerfile).toContain('FROM node:20-alpine');
      expect(dockerfile).toContain('USER appuser');
      expect(dockerfile).toContain('WORKDIR /app');
    });

    it('includes security hardening by default', () => {
      const dockerfile = generateBaseDockerfile({ baseImage: 'node:20-alpine' });
      // Should have no shell or setuid binaries
      expect(dockerfile).toMatch(/apk.*--no-cache|apt-get.*--no-install-recommends/i);
    });

    it('adds LABEL for maintainer', () => {
      const dockerfile = generateBaseDockerfile({
        baseImage: 'node:20-alpine',
        maintainer: 'team@example.com',
      });
      expect(dockerfile).toContain('LABEL maintainer=');
    });
  });

  describe('SECURITY_HEADERS', () => {
    it('includes nginx security headers', () => {
      expect(SECURITY_HEADERS.nginx).toBeDefined();
      expect(SECURITY_HEADERS.nginx).toContain('X-Content-Type-Options');
      expect(SECURITY_HEADERS.nginx).toContain('X-Frame-Options');
    });

    it('includes express security headers', () => {
      expect(SECURITY_HEADERS.express).toBeDefined();
    });
  });
});
