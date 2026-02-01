import { describe, it, expect } from 'vitest';
import {
  USER_ROLES,
  ROLE_PERMISSIONS,
  hashPassword,
  verifyPassword,
  generateToken,
  generateJWT,
  verifyJWT,
  createUser,
  validateEmail,
  validatePassword,
  hasPermission,
  createSession,
  isSessionValid,
  sanitizeUser,
  createUserStore,
} from './auth-system.js';

describe('auth-system', () => {
  describe('USER_ROLES', () => {
    it('defines all roles', () => {
      expect(USER_ROLES.ADMIN).toBe('admin');
      expect(USER_ROLES.ENGINEER).toBe('engineer');
      expect(USER_ROLES.QA).toBe('qa');
      expect(USER_ROLES.PO).toBe('po');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('admin has wildcard permission', () => {
      expect(ROLE_PERMISSIONS[USER_ROLES.ADMIN]).toContain('*');
    });

    it('engineer has write and deploy permissions', () => {
      const perms = ROLE_PERMISSIONS[USER_ROLES.ENGINEER];
      expect(perms).toContain('write');
      expect(perms).toContain('deploy');
      expect(perms).toContain('claim');
    });

    it('qa has verify and bug permissions', () => {
      const perms = ROLE_PERMISSIONS[USER_ROLES.QA];
      expect(perms).toContain('verify');
      expect(perms).toContain('bug');
    });

    it('po has plan and approve permissions', () => {
      const perms = ROLE_PERMISSIONS[USER_ROLES.PO];
      expect(perms).toContain('plan');
      expect(perms).toContain('approve');
    });
  });

  describe('hashPassword', () => {
    it('returns hash and salt', () => {
      const result = hashPassword('password123');

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('uses provided salt', () => {
      const salt = 'test-salt-123';
      const result = hashPassword('password', salt);

      expect(result.salt).toBe(salt);
    });

    it('generates different hashes for different passwords', () => {
      const result1 = hashPassword('password1');
      const result2 = hashPassword('password2');

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('generates same hash with same salt', () => {
      const salt = 'same-salt';
      const result1 = hashPassword('password', salt);
      const result2 = hashPassword('password', salt);

      expect(result1.hash).toBe(result2.hash);
    });

    it('throws for empty password', () => {
      expect(() => hashPassword('')).toThrow();
      expect(() => hashPassword(null)).toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', () => {
      const { hash, salt } = hashPassword('mypassword');
      expect(verifyPassword('mypassword', hash, salt)).toBe(true);
    });

    it('returns false for incorrect password', () => {
      const { hash, salt } = hashPassword('mypassword');
      expect(verifyPassword('wrongpassword', hash, salt)).toBe(false);
    });

    it('returns false for missing inputs', () => {
      expect(verifyPassword(null, 'hash', 'salt')).toBe(false);
      expect(verifyPassword('pass', null, 'salt')).toBe(false);
      expect(verifyPassword('pass', 'hash', null)).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('generates hex token', () => {
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('generates token of specified length', () => {
      const token = generateToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('generates unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateJWT', () => {
    const secret = 'test-secret';

    it('generates token with three parts', () => {
      const token = generateJWT({ sub: '123' }, secret);
      const parts = token.split('.');
      expect(parts.length).toBe(3);
    });

    it('includes payload data', () => {
      const token = generateJWT({ sub: '123', name: 'Test' }, secret);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

      expect(payload.sub).toBe('123');
      expect(payload.name).toBe('Test');
    });

    it('includes iat and exp', () => {
      const token = generateJWT({ sub: '123' }, secret);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('uses custom expiration', () => {
      const token = generateJWT({ sub: '123' }, secret, { expiresIn: 3600 });
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

      expect(payload.exp - payload.iat).toBe(3600);
    });
  });

  describe('verifyJWT', () => {
    const secret = 'test-secret';

    it('verifies valid token', () => {
      const token = generateJWT({ sub: '123' }, secret);
      const payload = verifyJWT(token, secret);

      expect(payload).not.toBeNull();
      expect(payload.sub).toBe('123');
    });

    it('returns null for invalid signature', () => {
      const token = generateJWT({ sub: '123' }, secret);
      const payload = verifyJWT(token, 'wrong-secret');

      expect(payload).toBeNull();
    });

    it('returns null for expired token', () => {
      const token = generateJWT({ sub: '123' }, secret, { expiresIn: -1 });
      const payload = verifyJWT(token, secret);

      expect(payload).toBeNull();
    });

    it('returns null for malformed token', () => {
      expect(verifyJWT('invalid', secret)).toBeNull();
      expect(verifyJWT('a.b', secret)).toBeNull();
      expect(verifyJWT(null, secret)).toBeNull();
    });
  });

  describe('createUser', () => {
    it('creates user with required fields', () => {
      const user = createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordSalt).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('normalizes email', () => {
      const user = createUser({
        email: '  TEST@Example.COM  ',
        password: 'Password123',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('sets default role to engineer', () => {
      const user = createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(user.role).toBe(USER_ROLES.ENGINEER);
    });

    it('uses provided role', () => {
      const user = createUser({
        email: 'test@example.com',
        password: 'Password123',
        role: USER_ROLES.ADMIN,
      });

      expect(user.role).toBe(USER_ROLES.ADMIN);
    });

    it('generates name from email if not provided', () => {
      const user = createUser({
        email: 'john.doe@example.com',
        password: 'Password123',
      });

      expect(user.name).toBe('john.doe');
    });

    it('throws for missing email', () => {
      expect(() => createUser({ password: 'Pass123' })).toThrow();
    });

    it('throws for missing password', () => {
      expect(() => createUser({ email: 'test@example.com' })).toThrow();
    });

    it('throws for invalid role', () => {
      expect(() => createUser({
        email: 'test@example.com',
        password: 'Pass123',
        role: 'invalid',
      })).toThrow();
    });
  });

  describe('validateEmail', () => {
    it('returns true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('returns false for invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('no-at-sign.com')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('returns false for empty/null', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('returns valid for strong password', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('requires minimum 8 characters', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8 characters'))).toBe(true);
    });

    it('requires uppercase letter', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('requires lowercase letter', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('requires number', () => {
      const result = validatePassword('PasswordABC');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('returns multiple errors', () => {
      const result = validatePassword('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('hasPermission', () => {
    it('returns true for admin with any permission', () => {
      const user = { role: USER_ROLES.ADMIN };
      expect(hasPermission(user, 'read')).toBe(true);
      expect(hasPermission(user, 'deploy')).toBe(true);
      expect(hasPermission(user, 'anything')).toBe(true);
    });

    it('returns true for user with specific permission', () => {
      const user = { role: USER_ROLES.ENGINEER };
      expect(hasPermission(user, 'deploy')).toBe(true);
      expect(hasPermission(user, 'claim')).toBe(true);
    });

    it('returns false for user without permission', () => {
      const user = { role: USER_ROLES.QA };
      expect(hasPermission(user, 'deploy')).toBe(false);
      expect(hasPermission(user, 'approve')).toBe(false);
    });

    it('returns false for invalid user', () => {
      expect(hasPermission(null, 'read')).toBe(false);
      expect(hasPermission({}, 'read')).toBe(false);
    });
  });

  describe('createSession', () => {
    const user = { id: 'user123' };

    it('creates session with required fields', () => {
      const session = createSession(user);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.token).toBeDefined();
      expect(session.createdAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.active).toBe(true);
    });

    it('includes optional metadata', () => {
      const session = createSession(user, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      });

      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.ip).toBe('192.168.1.1');
    });

    it('uses custom expiration', () => {
      const session = createSession(user, { expiresIn: 1000 });
      const expiresAt = new Date(session.expiresAt).getTime();
      const createdAt = new Date(session.createdAt).getTime();
      const diff = expiresAt - createdAt;

      // Allow small timing variance (1-2ms) due to execution time
      expect(diff).toBeGreaterThanOrEqual(1000);
      expect(diff).toBeLessThanOrEqual(1010);
    });
  });

  describe('isSessionValid', () => {
    it('returns true for valid session', () => {
      const session = {
        active: true,
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };

      expect(isSessionValid(session)).toBe(true);
    });

    it('returns false for inactive session', () => {
      const session = {
        active: false,
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };

      expect(isSessionValid(session)).toBe(false);
    });

    it('returns false for expired session', () => {
      const session = {
        active: true,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      expect(isSessionValid(session)).toBe(false);
    });

    it('returns false for null session', () => {
      expect(isSessionValid(null)).toBe(false);
    });
  });

  describe('sanitizeUser', () => {
    it('removes password fields', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'secret-hash',
        passwordSalt: 'secret-salt',
        role: USER_ROLES.ENGINEER,
      };

      const safe = sanitizeUser(user);

      expect(safe.id).toBe('123');
      expect(safe.email).toBe('test@example.com');
      expect(safe.passwordHash).toBeUndefined();
      expect(safe.passwordSalt).toBeUndefined();
    });

    it('returns null for null user', () => {
      expect(sanitizeUser(null)).toBeNull();
    });
  });

  describe('createUserStore', () => {
    it('creates store with methods', () => {
      const store = createUserStore();

      expect(store.createUser).toBeDefined();
      expect(store.findUserByEmail).toBeDefined();
      expect(store.findUserById).toBeDefined();
      expect(store.authenticate).toBeDefined();
      expect(store.createSession).toBeDefined();
    });

    it('creates and finds user', async () => {
      const store = createUserStore();

      const user = await store.createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(user.email).toBe('test@example.com');

      const found = await store.findUserByEmail('test@example.com');
      expect(found.email).toBe('test@example.com');
    });

    it('authenticates valid credentials', async () => {
      const store = createUserStore();

      await store.createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      const user = await store.authenticate('test@example.com', 'Password123');
      expect(user).not.toBeNull();
      expect(user.email).toBe('test@example.com');
    });

    it('rejects invalid credentials', async () => {
      const store = createUserStore();

      await store.createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      const user = await store.authenticate('test@example.com', 'WrongPassword');
      expect(user).toBeNull();
    });

    it('prevents duplicate emails', async () => {
      const store = createUserStore();

      await store.createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      await expect(store.createUser({
        email: 'test@example.com',
        password: 'Password456',
      })).rejects.toThrow('already registered');
    });

    it('creates and validates sessions', async () => {
      const store = createUserStore();

      const user = await store.createUser({
        email: 'test@example.com',
        password: 'Password123',
      });

      const fullUser = await store.findUserByEmail('test@example.com');
      const session = await store.createSession(fullUser);

      expect(session.userId).toBe(fullUser.id);

      const found = await store.findSessionByToken(session.token);
      expect(found.id).toBe(session.id);
    });
  });
});
