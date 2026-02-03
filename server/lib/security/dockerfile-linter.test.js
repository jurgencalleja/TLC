/**
 * Dockerfile Security Linter Tests
 *
 * Tests for Dockerfile security best practices enforcement.
 */

import { describe, it, expect } from 'vitest';
import {
  lintDockerfile,
  parseDockerfile,
  createDockerfileLinter,
  SEVERITY,
} from './dockerfile-linter.js';

describe('dockerfile-linter', () => {
  describe('parseDockerfile', () => {
    it('parses basic Dockerfile instructions', () => {
      const dockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const parsed = parseDockerfile(dockerfile);

      expect(parsed.instructions).toHaveLength(6);
      expect(parsed.instructions[0]).toEqual({
        instruction: 'FROM',
        arguments: 'node:20-alpine',
        line: 1,
      });
    });

    it('handles multi-line instructions', () => {
      const dockerfile = `
FROM node:20
RUN apt-get update && \\
    apt-get install -y curl && \\
    rm -rf /var/lib/apt/lists/*
      `.trim();

      const parsed = parseDockerfile(dockerfile);

      expect(parsed.instructions).toHaveLength(2);
      expect(parsed.instructions[1].arguments).toContain('apt-get update');
      expect(parsed.instructions[1].arguments).toContain('rm -rf');
    });

    it('ignores comments', () => {
      const dockerfile = `
# This is a comment
FROM node:20
# Another comment
RUN echo hello
      `.trim();

      const parsed = parseDockerfile(dockerfile);

      expect(parsed.instructions).toHaveLength(2);
      expect(parsed.comments).toHaveLength(2);
    });

    it('extracts base image info', () => {
      const dockerfile = `FROM node:20-alpine AS builder`;
      const parsed = parseDockerfile(dockerfile);

      expect(parsed.baseImages).toContain('node:20-alpine');
      expect(parsed.stages).toHaveLength(1);
      expect(parsed.stages[0].name).toBe('builder');
    });

    it('detects multi-stage builds', () => {
      const dockerfile = `
FROM node:20 AS builder
RUN npm run build

FROM node:20-alpine
COPY --from=builder /app/dist ./dist
      `.trim();

      const parsed = parseDockerfile(dockerfile);

      expect(parsed.stages).toHaveLength(2);
      expect(parsed.isMultiStage).toBe(true);
    });
  });

  describe('lintDockerfile - USER directive', () => {
    it('detects missing USER directive', () => {
      const dockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(true);
    });

    it('passes when USER directive present', () => {
      const dockerfile = `
FROM node:20-alpine
WORKDIR /app
RUN adduser -D appuser
USER appuser
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(false);
    });

    it('detects USER root', () => {
      const dockerfile = `
FROM node:20-alpine
USER root
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(true);
    });
  });

  describe('lintDockerfile - base images', () => {
    it('detects latest tag usage', () => {
      const dockerfile = `
FROM node:latest
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-latest-tag')).toBe(true);
    });

    it('detects missing tag (implicit latest)', () => {
      const dockerfile = `
FROM node
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-latest-tag')).toBe(true);
    });

    it('passes with specific tag', () => {
      const dockerfile = `
FROM node:20-alpine
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-latest-tag')).toBe(false);
    });

    it('warns on full base images (prefer alpine)', () => {
      const dockerfile = `
FROM node:20
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'prefer-minimal-base')).toBe(true);
    });

    it('passes with alpine image', () => {
      const dockerfile = `
FROM node:20-alpine
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'prefer-minimal-base')).toBe(false);
    });

    it('passes with distroless image', () => {
      const dockerfile = `
FROM gcr.io/distroless/nodejs20
CMD ["index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'prefer-minimal-base')).toBe(false);
    });
  });

  describe('lintDockerfile - secrets detection', () => {
    it('detects hardcoded password in ENV', () => {
      const dockerfile = `
FROM node:20-alpine
ENV DB_PASSWORD=secret123
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-env')).toBe(true);
    });

    it('detects API key in ARG', () => {
      const dockerfile = `
FROM node:20-alpine
ARG API_KEY=sk_live_12345
RUN echo $API_KEY
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-env')).toBe(true);
    });

    it('passes with placeholder values', () => {
      const dockerfile = `
FROM node:20-alpine
ENV DB_PASSWORD=\${DB_PASSWORD}
ARG API_KEY
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-env')).toBe(false);
    });

    it('detects secrets in RUN commands', () => {
      const dockerfile = `
FROM node:20-alpine
RUN echo "password=secret123" > /app/config
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-run')).toBe(true);
    });
  });

  describe('lintDockerfile - COPY/ADD security', () => {
    it('detects COPY of sensitive files', () => {
      const dockerfile = `
FROM node:20-alpine
COPY .env /app/
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-sensitive-files')).toBe(true);
    });

    it('detects ADD of private keys', () => {
      const dockerfile = `
FROM node:20-alpine
ADD id_rsa /root/.ssh/
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-sensitive-files')).toBe(true);
    });

    it('warns on ADD with URL (prefer COPY)', () => {
      const dockerfile = `
FROM node:20-alpine
ADD https://example.com/file.tar.gz /app/
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'prefer-copy-over-add')).toBe(true);
    });

    it('passes with safe COPY', () => {
      const dockerfile = `
FROM node:20-alpine
COPY package*.json ./
COPY src/ ./src/
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-sensitive-files')).toBe(false);
    });
  });

  describe('lintDockerfile - multi-stage builds', () => {
    it('recommends multi-stage for build dependencies', () => {
      const dockerfile = `
FROM node:20
RUN npm install
RUN npm run build
CMD ["node", "dist/index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'recommend-multi-stage')).toBe(true);
    });

    it('passes with proper multi-stage build', () => {
      const dockerfile = `
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'recommend-multi-stage')).toBe(false);
      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(false);
    });
  });

  describe('lintDockerfile - health checks', () => {
    it('warns on missing HEALTHCHECK', () => {
      const dockerfile = `
FROM node:20-alpine
USER node
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'recommend-healthcheck')).toBe(true);
    });

    it('passes with HEALTHCHECK defined', () => {
      const dockerfile = `
FROM node:20-alpine
USER node
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      expect(result.findings.some(f => f.rule === 'recommend-healthcheck')).toBe(false);
    });
  });

  describe('lintDockerfile - severity levels', () => {
    it('returns critical for secrets', () => {
      const dockerfile = `
FROM node:20-alpine
ENV SECRET_KEY=actual_secret_value
      `.trim();

      const result = lintDockerfile(dockerfile);
      const secretFinding = result.findings.find(f => f.rule === 'no-secrets-in-env');

      expect(secretFinding?.severity).toBe(SEVERITY.CRITICAL);
    });

    it('returns high for missing USER', () => {
      const dockerfile = `
FROM node:20-alpine
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);
      const userFinding = result.findings.find(f => f.rule === 'no-root-user');

      expect(userFinding?.severity).toBe(SEVERITY.HIGH);
    });

    it('returns medium for latest tag', () => {
      const dockerfile = `
FROM node:latest
USER node
      `.trim();

      const result = lintDockerfile(dockerfile);
      const tagFinding = result.findings.find(f => f.rule === 'no-latest-tag');

      expect(tagFinding?.severity).toBe(SEVERITY.MEDIUM);
    });
  });

  describe('createDockerfileLinter', () => {
    it('creates linter with custom rules', () => {
      const linter = createDockerfileLinter({
        rules: {
          'no-root-user': 'error',
          'no-latest-tag': 'warn',
          'recommend-healthcheck': 'off',
        },
      });

      const dockerfile = `
FROM node:latest
CMD ["node", "index.js"]
      `.trim();

      const result = linter.lint(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(true);
      expect(result.findings.some(f => f.rule === 'no-latest-tag')).toBe(true);
      expect(result.findings.some(f => f.rule === 'recommend-healthcheck')).toBe(false);
    });

    it('supports custom patterns', () => {
      const linter = createDockerfileLinter({
        customPatterns: [
          {
            name: 'no-apt-get',
            pattern: /apt-get/,
            message: 'Use apk instead of apt-get for Alpine',
            severity: SEVERITY.MEDIUM,
          },
        ],
      });

      const dockerfile = `
FROM alpine:3.18
RUN apt-get update
      `.trim();

      const result = linter.lint(dockerfile);

      expect(result.findings.some(f => f.rule === 'no-apt-get')).toBe(true);
    });

    it('calculates security score', () => {
      const linter = createDockerfileLinter();

      const secureDockerfile = `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs20
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER nonroot
HEALTHCHECK --interval=30s CMD node healthcheck.js
CMD ["dist/index.js"]
      `.trim();

      const result = linter.lint(secureDockerfile);

      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('generates fix suggestions', () => {
      const dockerfile = `
FROM node:latest
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const result = lintDockerfile(dockerfile);

      const userFinding = result.findings.find(f => f.rule === 'no-root-user');
      expect(userFinding?.fix).toContain('USER');

      const tagFinding = result.findings.find(f => f.rule === 'no-latest-tag');
      expect(tagFinding?.fix).toContain('specific version');
    });
  });
});
