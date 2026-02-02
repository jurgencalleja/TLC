/**
 * Access Control Documenter Tests
 * TDD: RED phase - Write failing tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAccessControlDoc,
  listUsers,
  listRoles,
  getRolePermissions,
  getSSOMapping,
  getAccessMatrix,
  trackPermissionChange,
  getPermissionHistory,
  exportAsEvidence,
  formatAccessReport,
  detectOrphanedPermissions,
} from './access-control-doc.js';

describe('access-control-doc', () => {
  describe('listUsers', () => {
    it('returns all users with roles', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
        { id: '3', email: 'carol@example.com', name: 'Carol', role: 'qa' },
      ];

      const result = listUsers(users);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: '1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'admin',
      });
      expect(result[1]).toEqual({
        id: '2',
        email: 'bob@example.com',
        name: 'Bob',
        role: 'engineer',
      });
    });

    it('returns empty array for empty users', () => {
      expect(listUsers([])).toEqual([]);
      expect(listUsers(null)).toEqual([]);
      expect(listUsers(undefined)).toEqual([]);
    });

    it('filters out sensitive fields', () => {
      const users = [
        {
          id: '1',
          email: 'alice@example.com',
          name: 'Alice',
          role: 'admin',
          passwordHash: 'secret',
          passwordSalt: 'salt',
        },
      ];

      const result = listUsers(users);

      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0]).not.toHaveProperty('passwordSalt');
    });

    it('sorts users by role then name', () => {
      const users = [
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '3', email: 'carol@example.com', name: 'Carol', role: 'engineer' },
      ];

      const result = listUsers(users);

      expect(result[0].role).toBe('admin');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Carol');
    });
  });

  describe('listRoles', () => {
    it('returns all roles with permissions', () => {
      const result = listRoles();

      expect(result).toHaveProperty('admin');
      expect(result).toHaveProperty('engineer');
      expect(result).toHaveProperty('qa');
      expect(result).toHaveProperty('po');
    });

    it('admin has wildcard permission', () => {
      const result = listRoles();

      expect(result.admin.permissions).toContain('*');
    });

    it('engineer has expected permissions', () => {
      const result = listRoles();

      expect(result.engineer.permissions).toContain('read');
      expect(result.engineer.permissions).toContain('write');
      expect(result.engineer.permissions).toContain('deploy');
      expect(result.engineer.permissions).toContain('claim');
      expect(result.engineer.permissions).toContain('release');
    });

    it('qa has expected permissions', () => {
      const result = listRoles();

      expect(result.qa.permissions).toContain('read');
      expect(result.qa.permissions).toContain('verify');
      expect(result.qa.permissions).toContain('bug');
      expect(result.qa.permissions).toContain('test');
    });

    it('po has expected permissions', () => {
      const result = listRoles();

      expect(result.po.permissions).toContain('read');
      expect(result.po.permissions).toContain('plan');
      expect(result.po.permissions).toContain('verify');
      expect(result.po.permissions).toContain('approve');
    });

    it('includes role descriptions', () => {
      const result = listRoles();

      expect(result.admin).toHaveProperty('description');
      expect(result.engineer).toHaveProperty('description');
    });
  });

  describe('getRolePermissions', () => {
    it('returns permissions for role', () => {
      const result = getRolePermissions('engineer');

      expect(result).toEqual(['read', 'write', 'deploy', 'claim', 'release']);
    });

    it('returns wildcard for admin', () => {
      const result = getRolePermissions('admin');

      expect(result).toEqual(['*']);
    });

    it('returns empty array for unknown role', () => {
      const result = getRolePermissions('unknown');

      expect(result).toEqual([]);
    });

    it('handles null/undefined role', () => {
      expect(getRolePermissions(null)).toEqual([]);
      expect(getRolePermissions(undefined)).toEqual([]);
    });

    it('expands admin wildcard when requested', () => {
      const result = getRolePermissions('admin', { expand: true });

      expect(result).toContain('read');
      expect(result).toContain('write');
      expect(result).toContain('deploy');
      expect(result).toContain('verify');
      expect(result).toContain('plan');
      expect(result).toContain('approve');
    });
  });

  describe('getSSOMapping', () => {
    it('returns IdP group mappings', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: '^admin$', role: 'admin', priority: 1 },
            { pattern: '^dev-.*', role: 'engineer', priority: 2 },
          ],
          defaultRole: 'engineer',
        },
      };

      const result = getSSOMapping(config);

      expect(result.mappings).toHaveLength(2);
      expect(result.defaultRole).toBe('engineer');
    });

    it('returns empty mappings when no SSO config', () => {
      const result = getSSOMapping({});

      expect(result.mappings).toEqual([]);
      expect(result.defaultRole).toBeNull();
    });

    it('includes mapping details', () => {
      const config = {
        sso: {
          roleMappings: [
            {
              pattern: '^admin$',
              role: 'admin',
              priority: 1,
              description: 'Admin group',
            },
          ],
        },
      };

      const result = getSSOMapping(config);

      expect(result.mappings[0]).toHaveProperty('pattern');
      expect(result.mappings[0]).toHaveProperty('role');
      expect(result.mappings[0]).toHaveProperty('priority');
    });

    it('sorts mappings by priority', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: '^qa$', role: 'qa', priority: 3 },
            { pattern: '^admin$', role: 'admin', priority: 1 },
            { pattern: '^dev$', role: 'engineer', priority: 2 },
          ],
        },
      };

      const result = getSSOMapping(config);

      expect(result.mappings[0].role).toBe('admin');
      expect(result.mappings[1].role).toBe('engineer');
      expect(result.mappings[2].role).toBe('qa');
    });
  });

  describe('getAccessMatrix', () => {
    it('generates user/permission matrix', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
      ];

      const result = getAccessMatrix(users);

      expect(result.users).toContain('alice@example.com');
      expect(result.users).toContain('bob@example.com');
      expect(result.permissions).toContain('read');
      expect(result.permissions).toContain('write');
      expect(result.matrix['alice@example.com'].read).toBe(true);
      expect(result.matrix['alice@example.com'].write).toBe(true);
      expect(result.matrix['bob@example.com'].read).toBe(true);
      expect(result.matrix['bob@example.com'].write).toBe(true);
    });

    it('admin has all permissions', () => {
      const users = [
        { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
      ];

      const result = getAccessMatrix(users);

      // Admin should have all permissions due to wildcard
      expect(result.matrix['admin@example.com'].read).toBe(true);
      expect(result.matrix['admin@example.com'].write).toBe(true);
      expect(result.matrix['admin@example.com'].deploy).toBe(true);
      expect(result.matrix['admin@example.com'].verify).toBe(true);
    });

    it('qa has limited permissions', () => {
      const users = [
        { id: '1', email: 'qa@example.com', name: 'QA', role: 'qa' },
      ];

      const result = getAccessMatrix(users);

      expect(result.matrix['qa@example.com'].read).toBe(true);
      expect(result.matrix['qa@example.com'].verify).toBe(true);
      expect(result.matrix['qa@example.com'].write).toBe(false);
      expect(result.matrix['qa@example.com'].deploy).toBe(false);
    });

    it('returns empty matrix for no users', () => {
      const result = getAccessMatrix([]);

      expect(result.users).toEqual([]);
      expect(result.permissions).toBeDefined();
      expect(result.matrix).toEqual({});
    });
  });

  describe('trackPermissionChange', () => {
    it('logs permission changes', () => {
      const store = createPermissionStore();

      const change = trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
        reason: 'Promotion',
      });

      expect(change).toHaveProperty('id');
      expect(change).toHaveProperty('timestamp');
      expect(change.userId).toBe('1');
      expect(change.oldRole).toBe('engineer');
      expect(change.newRole).toBe('admin');
    });

    it('records timestamp automatically', () => {
      const store = createPermissionStore();
      const before = new Date().toISOString();

      const change = trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'qa',
        changedBy: 'admin@example.com',
      });

      const after = new Date().toISOString();

      expect(change.timestamp >= before).toBe(true);
      expect(change.timestamp <= after).toBe(true);
    });

    it('stores change in history', () => {
      const store = createPermissionStore();

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      expect(store.getHistory()).toHaveLength(1);
    });
  });

  describe('getPermissionHistory', () => {
    it('returns change history', () => {
      const store = createPermissionStore();

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      trackPermissionChange(store, {
        userId: '2',
        oldRole: 'qa',
        newRole: 'engineer',
        changedBy: 'admin@example.com',
      });

      const history = getPermissionHistory(store);

      expect(history).toHaveLength(2);
    });

    it('filters by user', () => {
      const store = createPermissionStore();

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      trackPermissionChange(store, {
        userId: '2',
        oldRole: 'qa',
        newRole: 'engineer',
        changedBy: 'admin@example.com',
      });

      const history = getPermissionHistory(store, { userId: '1' });

      expect(history).toHaveLength(1);
      expect(history[0].userId).toBe('1');
    });

    it('filters by date range', () => {
      const store = createPermissionStore();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      const history = getPermissionHistory(store, {
        from: yesterday.toISOString(),
        to: tomorrow.toISOString(),
      });

      expect(history).toHaveLength(1);
    });

    it('returns empty array for empty store', () => {
      const store = createPermissionStore();

      const history = getPermissionHistory(store);

      expect(history).toEqual([]);
    });

    it('returns history in reverse chronological order', () => {
      const store = createPermissionStore();

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'qa',
        changedBy: 'system',
      });

      // Small delay to ensure different timestamps
      trackPermissionChange(store, {
        userId: '2',
        oldRole: 'qa',
        newRole: 'admin',
        changedBy: 'system',
      });

      const history = getPermissionHistory(store);

      expect(history[0].userId).toBe('2'); // Most recent first
    });
  });

  describe('exportAsEvidence', () => {
    it('generates compliance format', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
      ];
      const config = {
        sso: {
          roleMappings: [{ pattern: '^admin$', role: 'admin', priority: 1 }],
        },
      };

      const evidence = exportAsEvidence(users, config, {});

      expect(evidence).toHaveProperty('exportDate');
      expect(evidence).toHaveProperty('users');
      expect(evidence).toHaveProperty('roles');
      expect(evidence).toHaveProperty('ssoMappings');
      expect(evidence).toHaveProperty('accessMatrix');
    });

    it('includes metadata', () => {
      const evidence = exportAsEvidence([], {}, {});

      expect(evidence).toHaveProperty('version');
      expect(evidence).toHaveProperty('exportDate');
      expect(evidence).toHaveProperty('exportedBy');
    });

    it('supports JSON format', () => {
      const evidence = exportAsEvidence([], {}, { format: 'json' });

      expect(typeof evidence).toBe('object');
    });

    it('supports CSV format', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
      ];

      const evidence = exportAsEvidence(users, {}, { format: 'csv' });

      expect(typeof evidence).toBe('string');
      expect(evidence).toContain('email');
      expect(evidence).toContain('alice@example.com');
    });

    it('includes permission history when available', () => {
      const store = createPermissionStore();

      trackPermissionChange(store, {
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      const evidence = exportAsEvidence([], {}, { permissionStore: store });

      expect(evidence).toHaveProperty('permissionHistory');
      expect(evidence.permissionHistory).toHaveLength(1);
    });
  });

  describe('formatAccessReport', () => {
    it('generates readable report', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
      ];

      const report = formatAccessReport(users);

      expect(report).toContain('Access Control Report');
      expect(report).toContain('alice@example.com');
      expect(report).toContain('admin');
    });

    it('includes role summary', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
        { id: '2', email: 'bob@example.com', name: 'Bob', role: 'engineer' },
        { id: '3', email: 'carol@example.com', name: 'Carol', role: 'engineer' },
      ];

      const report = formatAccessReport(users);

      expect(report).toContain('Role Summary');
      expect(report).toContain('admin: 1');
      expect(report).toContain('engineer: 2');
    });

    it('includes permission matrix section', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
      ];

      const report = formatAccessReport(users, { includeMatrix: true });

      expect(report).toContain('Permission Matrix');
    });

    it('includes SSO mappings when config provided', () => {
      const users = [];
      const config = {
        sso: {
          roleMappings: [{ pattern: '^admin$', role: 'admin', priority: 1 }],
        },
      };

      const report = formatAccessReport(users, { config });

      expect(report).toContain('SSO Role Mappings');
    });

    it('handles empty users', () => {
      const report = formatAccessReport([]);

      expect(report).toContain('Access Control Report');
      expect(report).toContain('No users');
    });
  });

  describe('detectOrphanedPermissions', () => {
    it('finds unused permissions', () => {
      const users = [
        { id: '1', email: 'alice@example.com', name: 'Alice', role: 'qa' },
      ];

      const orphaned = detectOrphanedPermissions(users);

      // QA doesn't have write, deploy, claim, release, plan, approve
      expect(orphaned).toContain('write');
      expect(orphaned).toContain('deploy');
    });

    it('returns empty when all permissions used', () => {
      const users = [
        { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
      ];

      const orphaned = detectOrphanedPermissions(users);

      // Admin has wildcard, so all permissions are used
      expect(orphaned).toEqual([]);
    });

    it('handles multiple roles', () => {
      const users = [
        { id: '1', email: 'eng@example.com', name: 'Engineer', role: 'engineer' },
        { id: '2', email: 'qa@example.com', name: 'QA', role: 'qa' },
        { id: '3', email: 'po@example.com', name: 'PO', role: 'po' },
      ];

      const orphaned = detectOrphanedPermissions(users);

      // All roles together should cover most permissions
      // Only 'approve' might be unique to PO
      expect(orphaned).not.toContain('read');
      expect(orphaned).not.toContain('write');
      expect(orphaned).not.toContain('verify');
    });

    it('returns all permissions when no users', () => {
      const orphaned = detectOrphanedPermissions([]);

      expect(orphaned.length).toBeGreaterThan(0);
      expect(orphaned).toContain('read');
      expect(orphaned).toContain('write');
    });
  });

  describe('createAccessControlDoc', () => {
    it('creates documenter instance', () => {
      const doc = createAccessControlDoc();

      expect(doc).toHaveProperty('listUsers');
      expect(doc).toHaveProperty('listRoles');
      expect(doc).toHaveProperty('getRolePermissions');
      expect(doc).toHaveProperty('getSSOMapping');
      expect(doc).toHaveProperty('getAccessMatrix');
      expect(doc).toHaveProperty('trackPermissionChange');
      expect(doc).toHaveProperty('getPermissionHistory');
      expect(doc).toHaveProperty('exportAsEvidence');
      expect(doc).toHaveProperty('formatAccessReport');
      expect(doc).toHaveProperty('detectOrphanedPermissions');
    });

    it('accepts config on creation', () => {
      const config = {
        sso: {
          roleMappings: [{ pattern: '^admin$', role: 'admin', priority: 1 }],
        },
      };

      const doc = createAccessControlDoc({ config });

      const mapping = doc.getSSOMapping();
      expect(mapping.mappings).toHaveLength(1);
    });

    it('maintains internal permission store', () => {
      const doc = createAccessControlDoc();

      doc.trackPermissionChange({
        userId: '1',
        oldRole: 'engineer',
        newRole: 'admin',
        changedBy: 'system',
      });

      const history = doc.getPermissionHistory();
      expect(history).toHaveLength(1);
    });
  });
});

// Helper for tests
function createPermissionStore() {
  const changes = [];

  return {
    add(change) {
      changes.push(change);
    },
    getHistory() {
      return [...changes];
    },
  };
}
