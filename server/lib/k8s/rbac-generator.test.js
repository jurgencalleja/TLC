/**
 * RBAC Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { createServiceAccount, createRole, createRoleBinding, validateRbac, createRbacGenerator } from './rbac-generator.js';

describe('rbac-generator', () => {
  describe('createServiceAccount', () => {
    it('creates minimal service account', () => {
      const sa = createServiceAccount({ name: 'app-sa', namespace: 'default' });
      expect(sa.kind).toBe('ServiceAccount');
      expect(sa.metadata.name).toBe('app-sa');
    });
  });

  describe('createRole', () => {
    it('generates role with least privilege', () => {
      const role = createRole({ name: 'app-role', rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }] });
      expect(role.kind).toBe('Role');
      expect(role.rules[0].verbs).not.toContain('*');
    });

    it('blocks cluster-admin for apps', () => {
      const role = createRole({ name: 'app-role', rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }] });
      expect(role.warnings).toContain('excessive-permissions');
    });
  });

  describe('createRoleBinding', () => {
    it('creates role binding', () => {
      const binding = createRoleBinding({ name: 'app-binding', roleName: 'app-role', serviceAccount: 'app-sa' });
      expect(binding.kind).toBe('RoleBinding');
      expect(binding.roleRef.name).toBe('app-role');
    });

    it('supports namespace-scoped roles', () => {
      const binding = createRoleBinding({ name: 'app-binding', roleName: 'app-role', namespace: 'production' });
      expect(binding.metadata.namespace).toBe('production');
    });
  });

  describe('validateRbac', () => {
    it('validates RBAC syntax', () => {
      const result = validateRbac({ kind: 'Role', metadata: { name: 'test' }, rules: [] });
      expect(result.valid).toBe(true);
    });
  });

  describe('createRbacGenerator', () => {
    it('creates generator', () => {
      const generator = createRbacGenerator();
      expect(generator.serviceAccount).toBeDefined();
      expect(generator.role).toBeDefined();
      expect(generator.binding).toBeDefined();
    });
  });
});
