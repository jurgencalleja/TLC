/**
 * Secrets Management Validator Tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateSecrets,
  detectSecretsInCompose,
  detectSecretsInDockerfile,
  createSecretsValidator,
} from './secrets-validator.js';

describe('secrets-validator', () => {
  describe('detectSecretsInCompose', () => {
    it('detects hardcoded password in environment', () => {
      const compose = {
        services: { app: { environment: { DB_PASSWORD: 'secret123' } } },
      };
      const result = detectSecretsInCompose(compose);
      expect(result.findings.some(f => f.rule === 'hardcoded-secret')).toBe(true);
    });

    it('passes with variable reference', () => {
      const compose = {
        services: { app: { environment: { DB_PASSWORD: '${DB_PASSWORD}' } } },
      };
      const result = detectSecretsInCompose(compose);
      expect(result.findings.some(f => f.rule === 'hardcoded-secret')).toBe(false);
    });

    it('detects API keys in environment array', () => {
      const compose = {
        services: { app: { environment: ['API_KEY=sk_live_12345'] } },
      };
      const result = detectSecretsInCompose(compose);
      expect(result.findings.some(f => f.rule === 'hardcoded-secret')).toBe(true);
    });

    it('recommends Docker secrets over env vars', () => {
      const compose = {
        services: { app: { environment: { DB_PASSWORD: '${DB_PASSWORD}' } } },
      };
      const result = detectSecretsInCompose(compose);
      expect(result.findings.some(f => f.rule === 'prefer-docker-secrets')).toBe(true);
    });

    it('passes when Docker secrets are used', () => {
      const compose = {
        services: { app: { secrets: ['db_password'] } },
        secrets: { db_password: { file: './secrets/db_password.txt' } },
      };
      const result = detectSecretsInCompose(compose);
      expect(result.findings.some(f => f.rule === 'prefer-docker-secrets')).toBe(false);
    });
  });

  describe('detectSecretsInDockerfile', () => {
    it('detects secrets in ENV', () => {
      const dockerfile = 'FROM node:20\nENV API_KEY=secret123';
      const result = detectSecretsInDockerfile(dockerfile);
      expect(result.findings.some(f => f.rule === 'secret-in-dockerfile')).toBe(true);
    });

    it('detects secrets in ARG', () => {
      const dockerfile = 'FROM node:20\nARG DB_PASSWORD=mypassword';
      const result = detectSecretsInDockerfile(dockerfile);
      expect(result.findings.some(f => f.rule === 'secret-in-dockerfile')).toBe(true);
    });

    it('passes with build arg without default', () => {
      const dockerfile = 'FROM node:20\nARG DB_PASSWORD';
      const result = detectSecretsInDockerfile(dockerfile);
      expect(result.findings.some(f => f.rule === 'secret-in-dockerfile')).toBe(false);
    });

    it('detects COPY of secret files', () => {
      const dockerfile = 'FROM node:20\nCOPY .env /app/';
      const result = detectSecretsInDockerfile(dockerfile);
      expect(result.findings.some(f => f.rule === 'secret-file-copied')).toBe(true);
    });
  });

  describe('validateSecrets', () => {
    it('validates both compose and dockerfile', () => {
      const compose = {
        services: { app: { environment: { SECRET: 'value' } } },
      };
      const dockerfile = 'FROM node:20\nENV TOKEN=abc123';
      const result = validateSecrets({ compose, dockerfile });
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('calculates security score', () => {
      const compose = { services: { app: { secrets: ['pass'] } }, secrets: { pass: {} } };
      const result = validateSecrets({ compose });
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('createSecretsValidator', () => {
    it('supports custom secret patterns', () => {
      const validator = createSecretsValidator({
        patterns: [/CUSTOM_SECRET=\w+/],
      });
      const compose = {
        services: { app: { environment: ['CUSTOM_SECRET=hidden'] } },
      };
      const result = validator.validateCompose(compose);
      expect(result.findings.some(f => f.rule === 'hardcoded-secret')).toBe(true);
    });

    it('generates recommendations', () => {
      const validator = createSecretsValidator();
      const compose = {
        services: { app: { environment: { PASSWORD: 'test' } } },
      };
      const result = validator.validateCompose(compose);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
