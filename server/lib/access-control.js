/**
 * Access Control Module
 *
 * Authorization patterns for secure code generation
 */

/**
 * Create access control configuration
 * @param {Object} options - Access control options
 * @returns {Object} Access control configuration
 */
function createAccessControl(options = {}) {
  return {
    defaultPolicy: options.defaultPolicy || 'deny',
    policies: options.policies || {},
  };
}

/**
 * Generate default-deny middleware
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateDefaultDeny(options = {}) {
  const { language = 'javascript', framework = 'express', allowList = [] } = options;

  if (framework === 'fastify') {
    return `
fastify.addHook('preHandler', async (request, reply) => {
  const publicPaths = ${JSON.stringify(allowList)};

  if (publicPaths.some(p => request.url.startsWith(p))) {
    return; // Allow public paths
  }

  if (!request.user) {
    reply.code(403).send({ error: 'Forbidden' });
  }
});`;
  }

  // Express
  return `
function defaultDeny(req, res, next) {
  const publicPaths = ${JSON.stringify(allowList)};

  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next(); // Allow public paths
  }

  if (!req.user) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}`;
}

/**
 * Generate object-level authorization
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateObjectLevelAuth(options = {}) {
  const {
    type = 'ownership',
    ownerField = 'userId',
    permissionField = 'canAccess',
    preventIdor = true,
    checkTiming = 'after-fetch',
  } = options;

  if (type === 'permission') {
    return `
async function checkObjectPermission(userId, resource) {
  // Check if user has permission to access this resource
  const hasPermission = await resource.${permissionField}(userId);

  if (!hasPermission) {
    throw new ForbiddenError('Access denied');
  }

  return resource;
}`;
  }

  // Ownership check
  return `
async function checkOwnership(userId, resourceId, Model) {
  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // IDOR prevention: verify user owns this resource
  if (resource.${ownerField} !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return resource;
}`;
}

/**
 * Generate function-level authorization
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateFunctionLevelAuth(options = {}) {
  const {
    type = 'role',
    requiredRole = 'admin',
    requiredPermission = '',
    style = 'middleware',
  } = options;

  if (style === 'decorator') {
    return `
function requireRole(role) {
  return function decorator(target, propertyKey, descriptor) {
    const original = descriptor.value;

    descriptor.value = async function(...args) {
      const user = args[0].user;
      if (!user || user.role !== role) {
        throw new ForbiddenError('Insufficient permissions');
      }
      return original.apply(this, args);
    };

    return descriptor;
  };
}

// Usage: @requireRole('${requiredRole}')`;
  }

  if (style === 'guard') {
    return `
class RoleGuard {
  canActivate(context) {
    const user = context.getUser();
    const requiredRole = '${requiredRole}';

    if (!user || user.role !== requiredRole) {
      return false;
    }

    return true;
  }
}`;
  }

  // Middleware style
  if (type === 'permission') {
    return `
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage: requirePermission('${requiredPermission}')`;
  }

  return `
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage: requireRole('${requiredRole}')`;
}

/**
 * Generate CORS configuration
 * @param {Object} options - CORS options
 * @returns {Object} CORS configuration
 */
function generateCorsConfig(options = {}) {
  const {
    origin = null,
    origins = [],
    credentials = false,
    methods = ['GET', 'POST', 'PUT', 'DELETE'],
    exposeHeaders = [],
    maxAge = 86400,
  } = options;

  let warning = null;
  const errors = [];

  // Check for wildcard origin
  if (origin === '*') {
    warning = 'Wildcard (*) origin is insecure. Specify allowed origins explicitly.';
  }

  // Validate origin format
  for (const o of origins) {
    if (!o.startsWith('http://') && !o.startsWith('https://')) {
      errors.push(`Origin "${o}" missing protocol (http:// or https://)`);
    }
  }

  const code = `
const cors = require('cors');

const corsOptions = {
  origin: ${JSON.stringify(origins.length > 0 ? origins : origin)},
  credentials: ${credentials},
  methods: ${JSON.stringify(methods)},
  exposedHeaders: ${JSON.stringify(exposeHeaders)},
  maxAge: ${maxAge},
};

app.use(cors(corsOptions));`;

  return {
    origins,
    credentials,
    methods,
    exposeHeaders,
    maxAge,
    warning,
    errors: errors.length > 0 ? errors : undefined,
    code,
  };
}

/**
 * Generate RBAC code
 * @param {Object} options - RBAC options
 * @returns {string} Generated code
 */
function generateRbacCode(options = {}) {
  const { roles = {}, language = 'javascript' } = options;

  if (language === 'typescript') {
    return `
type Role = ${Object.keys(roles).map(r => `'${r}'`).join(' | ') || 'string'};
type Permission = string;

interface RoleConfig {
  inherits?: Role[];
  permissions: Permission[];
}

const roles: Record<Role, RoleConfig> = ${JSON.stringify(roles, null, 2)};

function hasPermission(role: Role, permission: Permission): boolean {
  const config = roles[role];
  if (!config) return false;

  // Check wildcard
  if (config.permissions.includes('*')) return true;

  // Check direct permission
  if (config.permissions.includes(permission)) return true;

  // Check inherited roles
  if (config.inherits) {
    return config.inherits.some(r => hasPermission(r, permission));
  }

  return false;
}`;
  }

  return `
const roles = ${JSON.stringify(roles, null, 2)};

function hasPermission(role, permission) {
  const config = roles[role];
  if (!config) return false;

  // Check wildcard
  if (config.permissions.includes('*')) return true;

  // Check direct permission
  if (config.permissions.includes(permission)) return true;

  // Check inherited roles
  if (config.inherits) {
    return config.inherits.some(r => hasPermission(r, permission));
  }

  return false;
}

function can(user, permission) {
  return hasPermission(user.role, permission);
}

module.exports = { roles, hasPermission, can };`;
}

/**
 * Generate ABAC code
 * @param {Object} options - ABAC options
 * @returns {string} Generated code
 */
function generateAbacCode(options = {}) {
  const { policies = [] } = options;

  return `
const policies = ${JSON.stringify(policies, null, 2)};

function evaluateCondition(condition, context) {
  const { user, resource, action } = context;

  // Simple attribute evaluation
  return eval(condition);
}

function canAccess(user, resource, action) {
  for (const policy of policies) {
    if (policy.action && policy.action !== action) continue;
    if (policy.resource && policy.resource !== resource.type) continue;

    const conditions = policy.conditions || [policy.condition];
    const allMatch = conditions.every(c =>
      evaluateCondition(c, { user, resource, action })
    );

    if (allMatch) {
      return policy.effect === 'allow';
    }
  }

  return false; // Default deny
}

module.exports = { policies, canAccess };`;
}

module.exports = {
  createAccessControl,
  generateDefaultDeny,
  generateObjectLevelAuth,
  generateFunctionLevelAuth,
  generateCorsConfig,
  generateRbacCode,
  generateAbacCode,
};
