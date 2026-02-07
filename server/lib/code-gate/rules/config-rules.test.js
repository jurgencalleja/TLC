/**
 * Config Rules Tests
 *
 * Detects magic numbers (hardcoded timeouts/thresholds)
 * and hardcoded role strings that should be in config/DB.
 */
import { describe, it, expect } from 'vitest';

const {
  checkMagicNumbers,
  checkHardcodedRoles,
} = require('./config-rules.js');

describe('Config Rules', () => {
  describe('checkMagicNumbers', () => {
    it('detects hardcoded 86400000 (24h in ms)', () => {
      const code = 'const sessionTimeout = 86400000;';
      const findings = checkMagicNumbers('src/auth/session.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('no-magic-numbers');
    });

    it('detects hardcoded 3600000 (1h in ms)', () => {
      const code = 'const resetExpiry = 3600000;';
      const findings = checkMagicNumbers('src/auth/reset.ts', code);
      expect(findings).toHaveLength(1);
    });

    it('allows named constants (const TIMEOUT = 86400000)', () => {
      // Already a named constant at declaration — this is the pattern we want
      const code = 'const SESSION_TIMEOUT = 86400000;';
      const findings = checkMagicNumbers('src/config/constants.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows common safe numbers', () => {
      const code = [
        'const count = 0;',
        'const index = 1;',
        'const percent = 100;',
        'return res.status(200).json(data);',
        'return res.status(404).json({ error: "Not found" });',
        'return res.status(500).json({ error: "Server error" });',
      ].join('\n');
      const findings = checkMagicNumbers('src/api/handler.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'const timeout = 86400000;';
      const findings = checkMagicNumbers('src/auth/session.test.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips config and constants files', () => {
      const code = 'const timeout = 86400000;';
      const findings = checkMagicNumbers('src/config/timeouts.ts', code);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkHardcodedRoles', () => {
    it('detects role === "admin" comparison', () => {
      const code = 'if (user.role === "admin") { allowAccess(); }';
      const findings = checkHardcodedRoles('src/middleware/auth.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('no-hardcoded-roles');
    });

    it('detects role: "manager" in object literal', () => {
      const code = 'const defaultUser = { name: "test", role: "manager" };';
      const findings = checkHardcodedRoles('src/api/users.ts', code);
      expect(findings).toHaveLength(1);
    });

    it('allows role variable references without string', () => {
      const code = 'if (user.role === ROLES.ADMIN) { allowAccess(); }';
      const findings = checkHardcodedRoles('src/middleware/auth.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows RBAC constant definitions', () => {
      // This is WHERE roles are defined — that's fine
      const code = 'const ROLES = { ADMIN: "admin", USER: "user" };';
      const findings = checkHardcodedRoles('src/config/roles.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'if (user.role === "admin") {}';
      const findings = checkHardcodedRoles('src/middleware/auth.test.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips role definition files', () => {
      const code = 'role: "admin"';
      const findings = checkHardcodedRoles('src/permissions/roles.ts', code);
      expect(findings).toHaveLength(0);
    });
  });
});
