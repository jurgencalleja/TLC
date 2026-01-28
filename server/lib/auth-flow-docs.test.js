import { describe, it, expect } from 'vitest';
import {
  AUTH_PATTERNS,
  detectAuthPatterns,
  extractSecurityRequirements,
  generateSecurityScheme,
  generateAuthDocs,
  formatAuthFlow,
  generateAuthMarkdown,
  createAuthDocsGenerator,
} from './auth-flow-docs.js';

describe('auth-flow-docs', () => {
  describe('AUTH_PATTERNS', () => {
    it('has JWT pattern', () => {
      expect(AUTH_PATTERNS.jwt).toBeDefined();
      expect(AUTH_PATTERNS.jwt.type).toBe('http');
      expect(AUTH_PATTERNS.jwt.scheme).toBe('bearer');
    });

    it('has API key pattern', () => {
      expect(AUTH_PATTERNS.apiKey).toBeDefined();
      expect(AUTH_PATTERNS.apiKey.type).toBe('apiKey');
    });

    it('has basic auth pattern', () => {
      expect(AUTH_PATTERNS.basic).toBeDefined();
      expect(AUTH_PATTERNS.basic.scheme).toBe('basic');
    });

    it('has OAuth2 pattern', () => {
      expect(AUTH_PATTERNS.oauth2).toBeDefined();
      expect(AUTH_PATTERNS.oauth2.type).toBe('oauth2');
    });

    it('has session pattern', () => {
      expect(AUTH_PATTERNS.session).toBeDefined();
      expect(AUTH_PATTERNS.session.in).toBe('cookie');
    });

    it('includes flow steps for each pattern', () => {
      for (const pattern of Object.values(AUTH_PATTERNS)) {
        expect(pattern.flow).toBeDefined();
        expect(pattern.flow.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectAuthPatterns', () => {
    it('detects JWT', () => {
      expect(detectAuthPatterns("import jwt from 'jsonwebtoken'")).toContain('jwt');
      expect(detectAuthPatterns('Bearer token')).toContain('jwt');
    });

    it('detects API key', () => {
      expect(detectAuthPatterns('const apiKey = req.headers["x-api-key"]')).toContain('apiKey');
    });

    it('detects basic auth', () => {
      expect(detectAuthPatterns('basic auth middleware')).toContain('basic');
    });

    it('detects OAuth', () => {
      expect(detectAuthPatterns('OAuth2 flow')).toContain('oauth2');
      expect(detectAuthPatterns('authorization_code grant')).toContain('oauth2');
    });

    it('detects session', () => {
      expect(detectAuthPatterns('session cookie')).toContain('session');
      expect(detectAuthPatterns("require('express-session')")).toContain('session');
    });

    it('returns unique patterns', () => {
      const patterns = detectAuthPatterns('jwt jwt jwt Bearer');
      expect(patterns.filter(p => p === 'jwt').length).toBe(1);
    });

    it('returns empty for no patterns', () => {
      expect(detectAuthPatterns('console.log("hello")')).toEqual([]);
    });
  });

  describe('extractSecurityRequirements', () => {
    it('detects auth requirement', () => {
      const reqs = extractSecurityRequirements({}, 'app.use(authenticate)');
      expect(reqs.requiresAuth).toBe(true);
    });

    it('detects various auth middleware patterns', () => {
      expect(extractSecurityRequirements({}, 'requireAuth()').requiresAuth).toBe(true);
      expect(extractSecurityRequirements({}, 'isAuthenticated').requiresAuth).toBe(true);
      expect(extractSecurityRequirements({}, 'protect(route)').requiresAuth).toBe(true);
      expect(extractSecurityRequirements({}, 'verifyToken').requiresAuth).toBe(true);
    });

    it('extracts roles', () => {
      const content = `
        hasRole('admin')
        requireRole('editor')
        roles = 'viewer'
      `;
      const reqs = extractSecurityRequirements({}, content);

      expect(reqs.roles).toContain('admin');
      expect(reqs.roles).toContain('editor');
      expect(reqs.roles).toContain('viewer');
    });

    it('detects schemes from content', () => {
      const reqs = extractSecurityRequirements({}, 'jwt.verify(token)');
      expect(reqs.schemes).toContain('jwt');
    });

    it('sets requiresAuth when schemes detected', () => {
      const reqs = extractSecurityRequirements({}, 'Bearer token');
      expect(reqs.requiresAuth).toBe(true);
    });
  });

  describe('generateSecurityScheme', () => {
    it('generates JWT scheme', () => {
      const scheme = generateSecurityScheme('jwt');

      expect(scheme.type).toBe('http');
      expect(scheme.scheme).toBe('bearer');
      expect(scheme.bearerFormat).toBe('JWT');
    });

    it('generates API key scheme', () => {
      const scheme = generateSecurityScheme('apiKey');

      expect(scheme.type).toBe('apiKey');
      expect(scheme.in).toBe('header');
    });

    it('generates basic auth scheme', () => {
      const scheme = generateSecurityScheme('basic');

      expect(scheme.type).toBe('http');
      expect(scheme.scheme).toBe('basic');
    });

    it('generates OAuth2 scheme', () => {
      const scheme = generateSecurityScheme('oauth2');

      expect(scheme.type).toBe('oauth2');
      expect(scheme.flows).toBeDefined();
    });

    it('allows custom configuration', () => {
      const scheme = generateSecurityScheme('jwt', {
        description: 'Custom JWT',
        bearerFormat: 'Custom',
      });

      expect(scheme.description).toBe('Custom JWT');
      expect(scheme.bearerFormat).toBe('Custom');
    });

    it('returns null for unknown pattern', () => {
      expect(generateSecurityScheme('unknown')).toBeNull();
    });
  });

  describe('generateAuthDocs', () => {
    it('generates docs for patterns', () => {
      const docs = generateAuthDocs(['jwt', 'apiKey']);

      expect(docs.securitySchemes.bearerAuth).toBeDefined();
      expect(docs.securitySchemes.apiKeyAuth).toBeDefined();
    });

    it('includes flows', () => {
      const docs = generateAuthDocs(['jwt']);

      expect(docs.flows.length).toBeGreaterThan(0);
      expect(docs.flows[0].steps.length).toBeGreaterThan(0);
    });

    it('detects auth endpoints', () => {
      const routes = [
        { method: 'POST', path: '/auth/login' },
        { method: 'POST', path: '/auth/logout' },
        { method: 'POST', path: '/auth/register' },
        { method: 'GET', path: '/auth/me' },
      ];

      const docs = generateAuthDocs([], { routes });

      expect(docs.endpoints.login).toBeDefined();
      expect(docs.endpoints.logout).toBeDefined();
      expect(docs.endpoints.register).toBeDefined();
      expect(docs.endpoints.verify).toBeDefined();
    });

    it('initializes empty endpoints', () => {
      const docs = generateAuthDocs([]);

      expect(docs.endpoints.login).toBeNull();
      expect(docs.endpoints.logout).toBeNull();
    });
  });

  describe('formatAuthFlow', () => {
    it('formats flow as markdown', () => {
      const flow = {
        name: 'JWT Auth',
        steps: ['Step 1', 'Step 2'],
      };

      const formatted = formatAuthFlow(flow);

      expect(formatted).toContain('## JWT Auth');
      expect(formatted).toContain('1. Step 1');
      expect(formatted).toContain('2. Step 2');
    });
  });

  describe('generateAuthMarkdown', () => {
    it('generates markdown documentation', () => {
      const docs = generateAuthDocs(['jwt']);
      const markdown = generateAuthMarkdown(docs);

      expect(markdown).toContain('# Authentication');
      expect(markdown).toContain('## Security Schemes');
      expect(markdown).toContain('bearerAuth');
    });

    it('includes flow steps', () => {
      const docs = generateAuthDocs(['jwt']);
      const markdown = generateAuthMarkdown(docs);

      expect(markdown).toContain('## Authentication Flows');
    });

    it('lists auth endpoints', () => {
      const docs = generateAuthDocs([], {
        routes: [{ method: 'POST', path: '/login' }],
      });
      const markdown = generateAuthMarkdown(docs);

      expect(markdown).toContain('## Auth Endpoints');
      expect(markdown).toContain('POST /login');
    });
  });

  describe('createAuthDocsGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createAuthDocsGenerator();

      expect(generator.detectPatterns).toBeDefined();
      expect(generator.extractRequirements).toBeDefined();
      expect(generator.generateScheme).toBeDefined();
      expect(generator.generateDocs).toBeDefined();
      expect(generator.toMarkdown).toBeDefined();
      expect(generator.formatFlow).toBeDefined();
    });

    it('uses provided options', () => {
      const generator = createAuthDocsGenerator({
        jwt: { description: 'Custom JWT' },
      });

      const docs = generator.generateDocs(['jwt']);
      expect(docs.securitySchemes.bearerAuth.description).toBe('Custom JWT');
    });
  });
});
