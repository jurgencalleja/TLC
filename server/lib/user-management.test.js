/**
 * User Management API Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUserStore,
  generateJWT,
  verifyJWT,
  USER_ROLES,
  hasPermission,
} from './auth-system.js';

describe('User Management', () => {
  let userStore;

  beforeEach(() => {
    userStore = createUserStore();
  });

  describe('createUser with roles', () => {
    it('creates user with default engineer role', async () => {
      const user = await userStore.createUser({
        email: 'dev@test.com',
        password: 'Test1234!',
      });

      expect(user.role).toBe('engineer');
    });

    it('creates admin user', async () => {
      const user = await userStore.createUser({
        email: 'admin@test.com',
        password: 'Admin1234!',
        role: 'admin',
      });

      expect(user.role).toBe('admin');
    });

    it('creates QA user', async () => {
      const user = await userStore.createUser({
        email: 'qa@test.com',
        password: 'Test1234!',
        role: 'qa',
      });

      expect(user.role).toBe('qa');
    });

    it('creates PO user', async () => {
      const user = await userStore.createUser({
        email: 'po@test.com',
        password: 'Test1234!',
        role: 'po',
      });

      expect(user.role).toBe('po');
    });

    it('rejects invalid role', async () => {
      await expect(
        userStore.createUser({
          email: 'test@test.com',
          password: 'Test1234!',
          role: 'superuser',
        })
      ).rejects.toThrow('Invalid role');
    });

    it('skips validation when skipValidation is true', async () => {
      const user = await userStore.createUser(
        {
          email: 'simple@test.com',
          password: 'simple', // Would fail normal validation
        },
        { skipValidation: true }
      );

      expect(user.email).toBe('simple@test.com');
    });
  });

  describe('listUsers', () => {
    it('returns all users', async () => {
      await userStore.createUser({ email: 'a@test.com', password: 'Test1234!' });
      await userStore.createUser({ email: 'b@test.com', password: 'Test1234!' });
      await userStore.createUser({ email: 'c@test.com', password: 'Test1234!' });

      const users = await userStore.listUsers();

      expect(users.length).toBe(3);
      expect(users.map(u => u.email)).toContain('a@test.com');
      expect(users.map(u => u.email)).toContain('b@test.com');
      expect(users.map(u => u.email)).toContain('c@test.com');
    });

    it('does not expose password hashes', async () => {
      await userStore.createUser({ email: 'test@test.com', password: 'Test1234!' });

      const users = await userStore.listUsers();

      expect(users[0].passwordHash).toBeUndefined();
      expect(users[0].passwordSalt).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('updates user name', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
        name: 'Original',
      });

      const updated = await userStore.updateUser(user.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
    });

    it('updates user role', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
        role: 'engineer',
      });

      const updated = await userStore.updateUser(user.id, { role: 'qa' });

      expect(updated.role).toBe('qa');
    });

    it('deactivates user', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
      });

      const updated = await userStore.updateUser(user.id, { active: false });

      expect(updated.active).toBe(false);
    });

    it('does not allow changing password via update', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
      });

      const originalHash = (await userStore.findUserById(user.id)).passwordHash;
      await userStore.updateUser(user.id, { passwordHash: 'hacked' });
      const afterUpdate = await userStore.findUserById(user.id);

      expect(afterUpdate.passwordHash).toBe(originalHash);
    });
  });

  describe('deleteUser', () => {
    it('deletes user', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
      });

      const deleted = await userStore.deleteUser(user.id);
      const found = await userStore.findUserById(user.id);

      expect(deleted).toBe(true);
      expect(found).toBeUndefined();
    });

    it('returns false for non-existent user', async () => {
      const deleted = await userStore.deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('authenticate with deactivated user', () => {
    it('rejects deactivated user', async () => {
      const user = await userStore.createUser({
        email: 'test@test.com',
        password: 'Test1234!',
      });

      await userStore.updateUser(user.id, { active: false });

      const result = await userStore.authenticate('test@test.com', 'Test1234!');

      expect(result).toBeNull();
    });
  });
});

describe('Role Permissions', () => {
  describe('hasPermission', () => {
    it('admin has all permissions', () => {
      const admin = { role: 'admin' };

      expect(hasPermission(admin, 'read')).toBe(true);
      expect(hasPermission(admin, 'write')).toBe(true);
      expect(hasPermission(admin, 'deploy')).toBe(true);
      expect(hasPermission(admin, 'anything')).toBe(true);
    });

    it('engineer has read, write, deploy, claim, release', () => {
      const engineer = { role: 'engineer' };

      expect(hasPermission(engineer, 'read')).toBe(true);
      expect(hasPermission(engineer, 'write')).toBe(true);
      expect(hasPermission(engineer, 'deploy')).toBe(true);
      expect(hasPermission(engineer, 'claim')).toBe(true);
      expect(hasPermission(engineer, 'release')).toBe(true);
      expect(hasPermission(engineer, 'approve')).toBe(false);
    });

    it('qa has read, verify, bug, test', () => {
      const qa = { role: 'qa' };

      expect(hasPermission(qa, 'read')).toBe(true);
      expect(hasPermission(qa, 'verify')).toBe(true);
      expect(hasPermission(qa, 'bug')).toBe(true);
      expect(hasPermission(qa, 'test')).toBe(true);
      expect(hasPermission(qa, 'write')).toBe(false);
      expect(hasPermission(qa, 'deploy')).toBe(false);
    });

    it('po has read, plan, verify, approve', () => {
      const po = { role: 'po' };

      expect(hasPermission(po, 'read')).toBe(true);
      expect(hasPermission(po, 'plan')).toBe(true);
      expect(hasPermission(po, 'verify')).toBe(true);
      expect(hasPermission(po, 'approve')).toBe(true);
      expect(hasPermission(po, 'write')).toBe(false);
      expect(hasPermission(po, 'deploy')).toBe(false);
    });

    it('returns false for null user', () => {
      expect(hasPermission(null, 'read')).toBe(false);
    });

    it('returns false for user without role', () => {
      expect(hasPermission({}, 'read')).toBe(false);
    });
  });
});

describe('JWT with roles', () => {
  const secret = 'test-secret';

  it('includes role in token payload', () => {
    const token = generateJWT(
      { sub: '123', email: 'test@test.com', role: 'qa' },
      secret
    );

    const payload = verifyJWT(token, secret);

    expect(payload.role).toBe('qa');
  });

  it('preserves role through token lifecycle', () => {
    const token = generateJWT(
      { sub: '123', email: 'admin@test.com', role: 'admin', name: 'Admin' },
      secret
    );

    const payload = verifyJWT(token, secret);

    expect(payload.sub).toBe('123');
    expect(payload.email).toBe('admin@test.com');
    expect(payload.role).toBe('admin');
    expect(payload.name).toBe('Admin');
  });
});

describe('USER_ROLES constant', () => {
  it('exports all role names', () => {
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.ENGINEER).toBe('engineer');
    expect(USER_ROLES.QA).toBe('qa');
    expect(USER_ROLES.PO).toBe('po');
  });
});
