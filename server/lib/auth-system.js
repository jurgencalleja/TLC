/**
 * Auth System
 * Basic authentication with users, JWT tokens, and sessions
 */

const crypto = require('crypto');

const USER_ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  QA: 'qa',
  PO: 'po',
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: ['*'],
  [USER_ROLES.ENGINEER]: ['read', 'write', 'deploy', 'claim', 'release'],
  [USER_ROLES.QA]: ['read', 'verify', 'bug', 'test'],
  [USER_ROLES.PO]: ['read', 'plan', 'verify', 'approve'],
};

/**
 * Hash password using PBKDF2
 * @param {string} password - Plain text password
 * @param {string} salt - Optional salt (generated if not provided)
 * @returns {Object} Hash and salt
 */
function hashPassword(password, salt = null) {
  if (!password) {
    throw new Error('Password is required');
  }

  const useSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');

  return {
    hash,
    salt: useSalt,
  };
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {boolean} Whether password matches
 */
function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) {
    return false;
  }

  const result = hashPassword(password, salt);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(result.hash),
      Buffer.from(hash)
    );
  } catch {
    return false;
  }
}

/**
 * Generate random token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate JWT-like token (simplified, not full JWT)
 * @param {Object} payload - Token payload
 * @param {string} secret - Signing secret
 * @param {Object} options - Token options
 * @returns {string} Signed token
 */
function generateJWT(payload, secret, options = {}) {
  const { expiresIn = 86400 } = options; // Default 24 hours

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify and decode JWT-like token
 * @param {string} token - Token to verify
 * @param {string} secret - Signing secret
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyJWT(token, secret) {
  if (!token || !secret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create user object
 * @param {Object} data - User data
 * @returns {Object} User object
 */
function createUser(data = {}) {
  const {
    email,
    password,
    name,
    role = USER_ROLES.ENGINEER,
  } = data;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!Object.values(USER_ROLES).includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const { hash, salt } = hashPassword(password);

  return {
    id: generateToken(16),
    email: email.toLowerCase().trim(),
    name: name || email.split('@')[0],
    passwordHash: hash,
    passwordSalt: salt,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
    active: true,
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
  const result = {
    valid: true,
    errors: [],
  };

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    result.valid = false;
    result.errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain an uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain a lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain a number');
  }

  return result;
}

/**
 * Check if user has permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];

  return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Create session object
 * @param {Object} user - User object
 * @param {Object} options - Session options
 * @returns {Object} Session object
 */
function createSession(user, options = {}) {
  const { expiresIn = 86400000, userAgent, ip } = options;

  return {
    id: generateToken(32),
    userId: user.id,
    token: generateToken(64),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresIn).toISOString(),
    userAgent,
    ip,
    active: true,
  };
}

/**
 * Check if session is valid
 * @param {Object} session - Session object
 * @returns {boolean} Whether session is valid
 */
function isSessionValid(session) {
  if (!session || !session.active) {
    return false;
  }

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Sanitize user object for API response
 * @param {Object} user - User object
 * @returns {Object} Sanitized user
 */
function sanitizeUser(user) {
  if (!user) return null;

  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

/**
 * Create in-memory user store
 * @returns {Object} User store
 */
function createUserStore() {
  const users = new Map();
  const sessions = new Map();

  return {
    // User methods
    async createUser(data) {
      if (!validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      const existing = Array.from(users.values()).find(
        (u) => u.email === data.email.toLowerCase()
      );

      if (existing) {
        throw new Error('Email already registered');
      }

      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const user = createUser(data);
      users.set(user.id, user);
      return sanitizeUser(user);
    },

    async findUserByEmail(email) {
      if (!email) return null;
      return Array.from(users.values()).find(
        (u) => u.email === email.toLowerCase()
      );
    },

    async findUserById(id) {
      return users.get(id);
    },

    async updateUser(id, updates) {
      const user = users.get(id);
      if (!user) return null;

      const updated = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Don't allow changing sensitive fields directly
      updated.id = user.id;
      updated.passwordHash = user.passwordHash;
      updated.passwordSalt = user.passwordSalt;

      users.set(id, updated);
      return sanitizeUser(updated);
    },

    async deleteUser(id) {
      return users.delete(id);
    },

    async listUsers() {
      return Array.from(users.values()).map(sanitizeUser);
    },

    // Auth methods
    async authenticate(email, password) {
      const user = await this.findUserByEmail(email);

      if (!user || !user.active) {
        return null;
      }

      if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
        return null;
      }

      // Update last login
      user.lastLoginAt = new Date().toISOString();
      users.set(user.id, user);

      return sanitizeUser(user);
    },

    async changePassword(userId, oldPassword, newPassword) {
      const user = users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!verifyPassword(oldPassword, user.passwordHash, user.passwordSalt)) {
        throw new Error('Invalid current password');
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      user.updatedAt = new Date().toISOString();

      users.set(userId, user);
      return true;
    },

    // Session methods
    async createSession(user, options = {}) {
      const session = createSession(user, options);
      sessions.set(session.id, session);
      return session;
    },

    async findSession(sessionId) {
      return sessions.get(sessionId);
    },

    async findSessionByToken(token) {
      return Array.from(sessions.values()).find((s) => s.token === token);
    },

    async invalidateSession(sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.active = false;
        sessions.set(sessionId, session);
      }
      return true;
    },

    async invalidateUserSessions(userId) {
      for (const [id, session] of sessions) {
        if (session.userId === userId) {
          session.active = false;
          sessions.set(id, session);
        }
      }
      return true;
    },

    async cleanExpiredSessions() {
      const now = new Date();
      let cleaned = 0;

      for (const [id, session] of sessions) {
        if (new Date(session.expiresAt) < now) {
          sessions.delete(id);
          cleaned++;
        }
      }

      return cleaned;
    },

    // Stats
    getUserCount() {
      return users.size;
    },

    getSessionCount() {
      return sessions.size;
    },
  };
}

/**
 * Create auth middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function createAuthMiddleware(options = {}) {
  const { userStore, jwtSecret, requireAuth = true } = options;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      if (requireAuth) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return next();
    }

    // Handle Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      // Try JWT first
      if (jwtSecret) {
        const payload = verifyJWT(token, jwtSecret);
        if (payload) {
          const user = await userStore.findUserById(payload.sub);
          if (user && user.active) {
            req.user = sanitizeUser(user);
            req.authMethod = 'jwt';
            return next();
          }
        }
      }

      // Try session token
      const session = await userStore.findSessionByToken(token);
      if (session && isSessionValid(session)) {
        const user = await userStore.findUserById(session.userId);
        if (user && user.active) {
          req.user = sanitizeUser(user);
          req.session = session;
          req.authMethod = 'session';
          return next();
        }
      }
    }

    if (requireAuth) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    next();
  };
}

/**
 * Create permission middleware
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}

module.exports = {
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
  createAuthMiddleware,
  requirePermission,
};
