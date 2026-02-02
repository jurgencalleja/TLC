import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mapRoles,
  syncRoles,
  getRoleMappings,
  validateMappings,
  createRoleMapper,
} from './role-mapper.js';

describe('role-mapper', () => {
  describe('mapRoles', () => {
    it('maps GitHub team to TLC role', () => {
      const mappings = [
        { pattern: '^org:team-admins$', role: 'admin', priority: 1 },
        { pattern: 'org:developers', role: 'engineer', priority: 2 },
      ];

      const result = mapRoles(['org:team-admins'], mappings);

      expect(result).toBe('admin');
    });

    it('maps Google group to TLC role', () => {
      const mappings = [
        { pattern: 'engineering@company.com', role: 'engineer', priority: 1 },
        { pattern: 'qa@company.com', role: 'qa', priority: 2 },
      ];

      const result = mapRoles(['engineering@company.com'], mappings);

      expect(result).toBe('engineer');
    });

    it('maps Azure AD group to TLC role', () => {
      const mappings = [
        { pattern: 'Azure-AD-Admins', role: 'admin', priority: 1 },
        { pattern: 'Azure-AD-Developers', role: 'engineer', priority: 2 },
      ];

      const result = mapRoles(['Azure-AD-Developers'], mappings);

      expect(result).toBe('engineer');
    });

    it('maps SAML group to TLC role', () => {
      const mappings = [
        { pattern: 'CN=ProductOwners,OU=Groups,DC=company,DC=com', role: 'po', priority: 1 },
      ];

      const result = mapRoles(['CN=ProductOwners,OU=Groups,DC=company,DC=com'], mappings);

      expect(result).toBe('po');
    });

    it('uses regex pattern matching', () => {
      const mappings = [
        { pattern: '^admin$', role: 'admin', priority: 1 },
        { pattern: 'developers|engineers', role: 'engineer', priority: 2 },
        { pattern: 'qa-.*', role: 'qa', priority: 3 },
      ];

      expect(mapRoles(['developers'], mappings)).toBe('engineer');
      expect(mapRoles(['engineers'], mappings)).toBe('engineer');
      expect(mapRoles(['qa-team'], mappings)).toBe('qa');
      expect(mapRoles(['qa-leads'], mappings)).toBe('qa');
    });

    it('assigns default role for unmapped users', () => {
      const mappings = [
        { pattern: '^admin$', role: 'admin', priority: 1 },
      ];
      const defaultRole = 'engineer';

      const result = mapRoles(['random-group'], mappings, defaultRole);

      expect(result).toBe('engineer');
    });

    it('respects priority order', () => {
      const mappings = [
        { pattern: 'admin', role: 'admin', priority: 1 },
        { pattern: 'admin-team', role: 'engineer', priority: 2 },
      ];

      // User belongs to both groups, but 'admin' has higher priority (lower number)
      const result = mapRoles(['admin-team', 'admin'], mappings);

      expect(result).toBe('admin');
    });

    it('handles multiple matching groups', () => {
      const mappings = [
        { pattern: 'qa-team', role: 'qa', priority: 3 },
        { pattern: 'developers', role: 'engineer', priority: 2 },
        { pattern: 'admin', role: 'admin', priority: 1 },
      ];

      // User belongs to multiple groups, highest priority wins
      const result = mapRoles(['qa-team', 'developers', 'admin'], mappings);

      expect(result).toBe('admin');
    });

    it('returns null when no match and no default', () => {
      const mappings = [
        { pattern: '^admin$', role: 'admin', priority: 1 },
      ];

      const result = mapRoles(['random-group'], mappings);

      expect(result).toBeNull();
    });

    it('handles empty groups array', () => {
      const mappings = [
        { pattern: '^admin$', role: 'admin', priority: 1 },
      ];

      const result = mapRoles([], mappings, 'engineer');

      expect(result).toBe('engineer');
    });

    it('handles empty mappings array', () => {
      const result = mapRoles(['admin'], [], 'engineer');

      expect(result).toBe('engineer');
    });

    it('handles case-insensitive matching when pattern uses i flag', () => {
      const mappings = [
        { pattern: 'admin', role: 'admin', priority: 1, flags: 'i' },
      ];

      expect(mapRoles(['ADMIN'], mappings)).toBe('admin');
      expect(mapRoles(['Admin'], mappings)).toBe('admin');
    });
  });

  describe('syncRoles', () => {
    it('updates user roles on login', async () => {
      const user = { id: 'user-1', email: 'test@example.com', role: 'engineer' };
      const groups = ['admin-team'];
      const mappings = [
        { pattern: 'admin-team', role: 'admin', priority: 1 },
      ];
      const updateUser = vi.fn().mockResolvedValue({ ...user, role: 'admin' });

      const result = await syncRoles(user, groups, mappings, { updateUser });

      expect(updateUser).toHaveBeenCalledWith(user.id, { role: 'admin' });
      expect(result.role).toBe('admin');
    });

    it('does not update when role unchanged', async () => {
      const user = { id: 'user-1', email: 'test@example.com', role: 'admin' };
      const groups = ['admin-team'];
      const mappings = [
        { pattern: 'admin-team', role: 'admin', priority: 1 },
      ];
      const updateUser = vi.fn();

      const result = await syncRoles(user, groups, mappings, { updateUser });

      expect(updateUser).not.toHaveBeenCalled();
      expect(result.role).toBe('admin');
    });

    it('uses default role when no mapping matches', async () => {
      const user = { id: 'user-1', email: 'test@example.com', role: 'admin' };
      const groups = ['unknown-group'];
      const mappings = [
        { pattern: 'admin-team', role: 'admin', priority: 1 },
      ];
      const updateUser = vi.fn().mockResolvedValue({ ...user, role: 'engineer' });

      const result = await syncRoles(user, groups, mappings, {
        updateUser,
        defaultRole: 'engineer'
      });

      expect(updateUser).toHaveBeenCalledWith(user.id, { role: 'engineer' });
      expect(result.role).toBe('engineer');
    });

    it('returns user unchanged when no mapping and no default', async () => {
      const user = { id: 'user-1', email: 'test@example.com', role: 'engineer' };
      const groups = ['unknown-group'];
      const mappings = [
        { pattern: 'admin-team', role: 'admin', priority: 1 },
      ];
      const updateUser = vi.fn();

      const result = await syncRoles(user, groups, mappings, { updateUser });

      expect(updateUser).not.toHaveBeenCalled();
      expect(result.role).toBe('engineer');
    });
  });

  describe('getRoleMappings', () => {
    it('returns configured mappings', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: '^admin$', role: 'admin', priority: 1 },
            { pattern: 'developers', role: 'engineer', priority: 2 },
          ],
          defaultRole: 'engineer',
        },
      };

      const result = getRoleMappings(config);

      expect(result.mappings).toHaveLength(2);
      expect(result.defaultRole).toBe('engineer');
    });

    it('returns empty array when no sso config', () => {
      const config = {};

      const result = getRoleMappings(config);

      expect(result.mappings).toEqual([]);
      expect(result.defaultRole).toBeNull();
    });

    it('returns empty array when no roleMappings', () => {
      const config = { sso: {} };

      const result = getRoleMappings(config);

      expect(result.mappings).toEqual([]);
      expect(result.defaultRole).toBeNull();
    });

    it('sorts mappings by priority', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: 'qa', role: 'qa', priority: 3 },
            { pattern: 'admin', role: 'admin', priority: 1 },
            { pattern: 'dev', role: 'engineer', priority: 2 },
          ],
        },
      };

      const result = getRoleMappings(config);

      expect(result.mappings[0].role).toBe('admin');
      expect(result.mappings[1].role).toBe('engineer');
      expect(result.mappings[2].role).toBe('qa');
    });
  });

  describe('validateMappings', () => {
    it('detects invalid role names', () => {
      const mappings = [
        { pattern: 'admin', role: 'admin', priority: 1 },
        { pattern: 'dev', role: 'invalid-role', priority: 2 },
      ];

      const result = validateMappings(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid role "invalid-role" at index 1. Valid roles: admin, engineer, qa, po');
    });

    it('detects invalid regex patterns', () => {
      const mappings = [
        { pattern: '[invalid(regex', role: 'admin', priority: 1 },
      ];

      const result = validateMappings(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid regex pattern'))).toBe(true);
    });

    it('detects missing required fields', () => {
      const mappings = [
        { pattern: 'admin', priority: 1 },  // missing role
        { role: 'admin', priority: 1 },      // missing pattern
        { pattern: 'admin', role: 'admin' }, // missing priority
      ];

      const result = validateMappings(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('detects duplicate priorities', () => {
      const mappings = [
        { pattern: 'admin', role: 'admin', priority: 1 },
        { pattern: 'dev', role: 'engineer', priority: 1 },
      ];

      const result = validateMappings(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate priority'))).toBe(true);
    });

    it('passes valid mappings', () => {
      const mappings = [
        { pattern: '^admin$', role: 'admin', priority: 1 },
        { pattern: 'developers|engineers', role: 'engineer', priority: 2 },
        { pattern: 'qa-team', role: 'qa', priority: 3 },
        { pattern: 'product', role: 'po', priority: 4 },
      ];

      const result = validateMappings(mappings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('handles empty mappings array', () => {
      const result = validateMappings([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates defaultRole if provided', () => {
      const mappings = [];
      const options = { defaultRole: 'invalid-role' };

      const result = validateMappings(mappings, options);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid default role'))).toBe(true);
    });

    it('accepts valid defaultRole', () => {
      const mappings = [];
      const options = { defaultRole: 'engineer' };

      const result = validateMappings(mappings, options);

      expect(result.valid).toBe(true);
    });
  });

  describe('createRoleMapper', () => {
    it('creates mapper with config', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: 'admin', role: 'admin', priority: 1 },
          ],
          defaultRole: 'engineer',
        },
      };

      const mapper = createRoleMapper(config);

      expect(mapper.map(['admin'])).toBe('admin');
      expect(mapper.map(['unknown'])).toBe('engineer');
    });

    it('provides validate method', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: 'admin', role: 'admin', priority: 1 },
          ],
        },
      };

      const mapper = createRoleMapper(config);
      const validation = mapper.validate();

      expect(validation.valid).toBe(true);
    });

    it('provides getMappings method', () => {
      const config = {
        sso: {
          roleMappings: [
            { pattern: 'admin', role: 'admin', priority: 1 },
          ],
          defaultRole: 'engineer',
        },
      };

      const mapper = createRoleMapper(config);
      const result = mapper.getMappings();

      expect(result.mappings).toHaveLength(1);
      expect(result.defaultRole).toBe('engineer');
    });
  });
});
