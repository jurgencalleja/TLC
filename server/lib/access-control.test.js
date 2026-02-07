/**
 * Access Control Tests
 *
 * Authorization patterns for secure code generation
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createAccessControl,
  generateDefaultDeny,
  generateObjectLevelAuth,
  generateFunctionLevelAuth,
  generateCorsConfig,
  generateRbacCode,
  generateAbacCode,
} = require('./access-control.js');

describe('Access Control', () => {
  let accessControl;

  beforeEach(() => {
    accessControl = createAccessControl();
  });

  describe('createAccessControl', () => {
    it('creates access control with default config', () => {
      assert.ok(accessControl);
      assert.ok(accessControl.defaultPolicy);
    });

    it('defaults to deny', () => {
      assert.strictEqual(accessControl.defaultPolicy, 'deny');
    });

    it('accepts custom policies', () => {
      const custom = createAccessControl({
        policies: {
          admin: ['*'],
          user: ['read'],
        },
      });

      assert.ok(custom.policies.admin);
    });
  });

  describe('generateDefaultDeny', () => {
    it('generates middleware with deny default', () => {
      const code = generateDefaultDeny({
        language: 'javascript',
      });

      assert.ok(code.includes('deny') || code.includes('403') || code.includes('Forbidden'));
    });

    it('includes explicit allow list', () => {
      const code = generateDefaultDeny({
        language: 'javascript',
        allowList: ['/public', '/health'],
      });

      assert.ok(code.includes('public') || code.includes('health'));
    });

    it('generates Express middleware', () => {
      const code = generateDefaultDeny({
        language: 'javascript',
        framework: 'express',
      });

      assert.ok(code.includes('req') || code.includes('res') || code.includes('next'));
    });

    it('generates Fastify hook', () => {
      const code = generateDefaultDeny({
        language: 'javascript',
        framework: 'fastify',
      });

      assert.ok(code.includes('request') || code.includes('reply') || code.includes('hook'));
    });
  });

  describe('generateObjectLevelAuth', () => {
    it('generates ownership check', () => {
      const code = generateObjectLevelAuth({
        type: 'ownership',
        ownerField: 'userId',
      });

      assert.ok(code.includes('userId') || code.includes('owner'));
    });

    it('generates permission check', () => {
      const code = generateObjectLevelAuth({
        type: 'permission',
        permissionField: 'canAccess',
      });

      assert.ok(code.includes('permission') || code.includes('canAccess'));
    });

    it('includes IDOR prevention', () => {
      const code = generateObjectLevelAuth({
        type: 'ownership',
        preventIdor: true,
      });

      assert.ok(code.includes('user') && (code.includes('id') || code.includes('Id')));
    });

    it('generates before-fetch check', () => {
      const code = generateObjectLevelAuth({
        checkTiming: 'before-fetch',
      });

      assert.ok(code.length > 0);
    });

    it('generates after-fetch check', () => {
      const code = generateObjectLevelAuth({
        checkTiming: 'after-fetch',
      });

      assert.ok(code.length > 0);
    });
  });

  describe('generateFunctionLevelAuth', () => {
    it('generates role-based check', () => {
      const code = generateFunctionLevelAuth({
        type: 'role',
        requiredRole: 'admin',
      });

      assert.ok(code.includes('admin') || code.includes('role'));
    });

    it('generates permission-based check', () => {
      const code = generateFunctionLevelAuth({
        type: 'permission',
        requiredPermission: 'users:write',
      });

      assert.ok(code.includes('users:write') || code.includes('permission'));
    });

    it('generates decorator syntax', () => {
      const code = generateFunctionLevelAuth({
        style: 'decorator',
        requiredRole: 'admin',
      });

      assert.ok(code.includes('@') || code.includes('decorator'));
    });

    it('generates middleware syntax', () => {
      const code = generateFunctionLevelAuth({
        style: 'middleware',
        requiredRole: 'admin',
      });

      assert.ok(code.includes('middleware') || code.includes('next'));
    });

    it('generates guard syntax', () => {
      const code = generateFunctionLevelAuth({
        style: 'guard',
        requiredRole: 'admin',
      });

      assert.ok(code.includes('guard') || code.includes('canActivate'));
    });
  });

  describe('generateCorsConfig', () => {
    it('rejects wildcard origin', () => {
      const config = generateCorsConfig({
        origin: '*',
      });

      assert.ok(config.warning);
      assert.ok(config.warning.includes('wildcard') || config.warning.includes('*'));
    });

    it('accepts explicit origins', () => {
      const config = generateCorsConfig({
        origins: ['https://example.com', 'https://app.example.com'],
      });

      assert.ok(config.origins.includes('https://example.com'));
    });

    it('validates origin format', () => {
      const config = generateCorsConfig({
        origins: ['example.com'], // Missing protocol
      });

      assert.ok(config.warning || config.errors);
    });

    it('generates credentials config', () => {
      const config = generateCorsConfig({
        credentials: true,
        origins: ['https://example.com'],
      });

      assert.strictEqual(config.credentials, true);
    });

    it('limits exposed headers', () => {
      const config = generateCorsConfig({
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
      });

      assert.ok(config.exposeHeaders);
    });

    it('limits allowed methods', () => {
      const config = generateCorsConfig({
        methods: ['GET', 'POST'],
      });

      assert.ok(!config.methods.includes('DELETE') || config.methods.length <= 5);
    });

    it('sets preflight cache', () => {
      const config = generateCorsConfig({
        maxAge: 86400,
      });

      assert.strictEqual(config.maxAge, 86400);
    });
  });

  describe('generateRbacCode', () => {
    it('generates role hierarchy', () => {
      const code = generateRbacCode({
        roles: {
          admin: { inherits: ['user'], permissions: ['admin:*'] },
          user: { permissions: ['read', 'write'] },
        },
      });

      assert.ok(code.includes('admin') && code.includes('user'));
    });

    it('generates permission check function', () => {
      const code = generateRbacCode({
        roles: {
          user: { permissions: ['read'] },
        },
      });

      assert.ok(code.includes('hasPermission') || code.includes('can') || code.includes('check'));
    });

    it('supports wildcard permissions', () => {
      const code = generateRbacCode({
        roles: {
          admin: { permissions: ['*'] },
        },
      });

      assert.ok(code.includes('*') || code.includes('wildcard'));
    });

    it('generates TypeScript types', () => {
      const code = generateRbacCode({
        language: 'typescript',
        roles: {
          user: { permissions: ['read'] },
        },
      });

      assert.ok(code.includes('type') || code.includes('interface'));
    });
  });

  describe('generateAbacCode', () => {
    it('generates attribute-based policy', () => {
      const code = generateAbacCode({
        policies: [
          {
            effect: 'allow',
            resource: 'document',
            action: 'read',
            condition: 'resource.department === user.department',
          },
        ],
      });

      assert.ok(code.includes('department') || code.includes('attribute'));
    });

    it('generates policy evaluation function', () => {
      const code = generateAbacCode({
        policies: [],
      });

      assert.ok(code.includes('evaluate') || code.includes('check') || code.includes('can'));
    });

    it('supports multiple conditions', () => {
      const code = generateAbacCode({
        policies: [
          {
            effect: 'allow',
            conditions: [
              'resource.owner === user.id',
              'resource.status === "published"',
            ],
          },
        ],
      });

      assert.ok(code.includes('owner') || code.includes('status'));
    });
  });
});
