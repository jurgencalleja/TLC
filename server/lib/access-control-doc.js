/**
 * Access Control Documenter
 * Documents who has access to what for compliance and auditing
 */

// TLC roles and permissions (from auth-system.js)
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

const ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]: 'Full system administrator with all permissions',
  [USER_ROLES.ENGINEER]: 'Developer with read/write, deploy, and task management',
  [USER_ROLES.QA]: 'Quality assurance with testing and verification access',
  [USER_ROLES.PO]: 'Product owner with planning and approval permissions',
};

// All possible permissions (for expansion and orphan detection)
const ALL_PERMISSIONS = [
  'read',
  'write',
  'deploy',
  'claim',
  'release',
  'verify',
  'bug',
  'test',
  'plan',
  'approve',
];

// Role priority for sorting (admin first, then alphabetical)
const ROLE_PRIORITY = {
  [USER_ROLES.ADMIN]: 0,
  [USER_ROLES.ENGINEER]: 1,
  [USER_ROLES.PO]: 2,
  [USER_ROLES.QA]: 3,
};

/**
 * List all users with their roles
 * @param {Object[]} users - Array of user objects
 * @returns {Object[]} Sanitized users with roles, sorted by role then name
 */
function listUsers(users) {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return [];
  }

  // Sanitize and extract relevant fields
  const sanitized = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));

  // Sort by role priority, then by name
  sanitized.sort((a, b) => {
    const rolePriorityA = ROLE_PRIORITY[a.role] ?? 999;
    const rolePriorityB = ROLE_PRIORITY[b.role] ?? 999;

    if (rolePriorityA !== rolePriorityB) {
      return rolePriorityA - rolePriorityB;
    }

    return (a.name || '').localeCompare(b.name || '');
  });

  return sanitized;
}

/**
 * List all roles with their permissions
 * @returns {Object} Roles mapped to their permissions and descriptions
 */
function listRoles() {
  const result = {};

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    result[role] = {
      permissions: [...permissions],
      description: ROLE_DESCRIPTIONS[role] || '',
    };
  }

  return result;
}

/**
 * Get permissions for a specific role
 * @param {string} role - Role name
 * @param {Object} options - Options
 * @param {boolean} options.expand - Expand wildcard to all permissions
 * @returns {string[]} Array of permissions
 */
function getRolePermissions(role, options = {}) {
  if (!role) {
    return [];
  }

  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions) {
    return [];
  }

  // Expand wildcard if requested
  if (options.expand && permissions.includes('*')) {
    return [...ALL_PERMISSIONS];
  }

  return [...permissions];
}

/**
 * Get SSO role mappings from config
 * @param {Object} config - TLC config object
 * @returns {Object} SSO mappings and default role
 */
function getSSOMapping(config) {
  if (!config || !config.sso || !config.sso.roleMappings) {
    return {
      mappings: [],
      defaultRole: null,
    };
  }

  // Sort mappings by priority
  const sortedMappings = [...config.sso.roleMappings].sort(
    (a, b) => a.priority - b.priority
  );

  return {
    mappings: sortedMappings,
    defaultRole: config.sso.defaultRole || null,
  };
}

/**
 * Check if user has a specific permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has the permission
 */
function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];

  return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Generate access matrix showing user/permission relationships
 * @param {Object[]} users - Array of user objects
 * @returns {Object} Access matrix with users, permissions, and matrix
 */
function getAccessMatrix(users) {
  if (!users || !Array.isArray(users)) {
    users = [];
  }

  const userEmails = users.map((u) => u.email);
  const matrix = {};

  for (const user of users) {
    matrix[user.email] = {};

    for (const permission of ALL_PERMISSIONS) {
      matrix[user.email][permission] = hasPermission(user, permission);
    }
  }

  return {
    users: userEmails,
    permissions: ALL_PERMISSIONS,
    matrix,
  };
}

// Sequence counter for stable ordering within same timestamp
let sequenceCounter = 0;

/**
 * Track a permission change
 * @param {Object} store - Permission store
 * @param {Object} change - Change details
 * @returns {Object} Recorded change with ID and timestamp
 */
function trackPermissionChange(store, change) {
  sequenceCounter++;

  const record = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    sequence: sequenceCounter,
    userId: change.userId,
    oldRole: change.oldRole,
    newRole: change.newRole,
    changedBy: change.changedBy,
    reason: change.reason || null,
  };

  store.add(record);

  return record;
}

/**
 * Get permission change history
 * @param {Object} store - Permission store
 * @param {Object} filters - Filter options
 * @returns {Object[]} Array of permission changes
 */
function getPermissionHistory(store, filters = {}) {
  let history = store.getHistory();

  // Filter by userId
  if (filters.userId) {
    history = history.filter((h) => h.userId === filters.userId);
  }

  // Filter by date range
  if (filters.from) {
    const fromDate = new Date(filters.from);
    history = history.filter((h) => new Date(h.timestamp) >= fromDate);
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    history = history.filter((h) => new Date(h.timestamp) <= toDate);
  }

  // Sort by timestamp descending (most recent first), then by sequence for stable ordering
  history.sort((a, b) => {
    const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
    if (timeDiff !== 0) return timeDiff;
    return (b.sequence || 0) - (a.sequence || 0);
  });

  return history;
}

/**
 * Export access control data as compliance evidence
 * @param {Object[]} users - Array of user objects
 * @param {Object} config - TLC config
 * @param {Object} options - Export options
 * @returns {Object|string} Evidence in requested format
 */
function exportAsEvidence(users, config, options = {}) {
  const { format = 'json', permissionStore, exportedBy = 'system' } = options;

  const evidence = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportedBy,
    users: listUsers(users || []),
    roles: listRoles(),
    ssoMappings: getSSOMapping(config || {}),
    accessMatrix: getAccessMatrix(users || []),
  };

  // Include permission history if store provided
  if (permissionStore) {
    evidence.permissionHistory = getPermissionHistory(permissionStore);
  }

  if (format === 'csv') {
    return formatAsCSV(evidence);
  }

  return evidence;
}

/**
 * Format evidence as CSV
 * @param {Object} evidence - Evidence object
 * @returns {string} CSV formatted string
 */
function formatAsCSV(evidence) {
  const lines = [];

  // Header
  lines.push('email,name,role,' + ALL_PERMISSIONS.join(','));

  // User rows
  for (const user of evidence.users) {
    const matrix = evidence.accessMatrix.matrix[user.email] || {};
    const permissions = ALL_PERMISSIONS.map((p) => (matrix[p] ? 'Y' : 'N'));
    lines.push(`${user.email},${user.name},${user.role},${permissions.join(',')}`);
  }

  return lines.join('\n');
}

/**
 * Format access report for human reading
 * @param {Object[]} users - Array of user objects
 * @param {Object} options - Formatting options
 * @returns {string} Formatted report
 */
function formatAccessReport(users, options = {}) {
  const { includeMatrix = false, config = null } = options;

  const lines = [];
  const userList = listUsers(users || []);

  // Header
  lines.push('# Access Control Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // User list
  lines.push('## Users');
  lines.push('');

  if (userList.length === 0) {
    lines.push('No users configured.');
  } else {
    lines.push('| Email | Name | Role |');
    lines.push('|-------|------|------|');

    for (const user of userList) {
      lines.push(`| ${user.email} | ${user.name} | ${user.role} |`);
    }
  }
  lines.push('');

  // Role summary
  lines.push('## Role Summary');
  lines.push('');

  const roleCounts = {};
  for (const user of userList) {
    roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
  }

  for (const [role, count] of Object.entries(roleCounts)) {
    lines.push(`- ${role}: ${count}`);
  }
  lines.push('');

  // Roles and permissions
  lines.push('## Role Permissions');
  lines.push('');

  const roles = listRoles();
  for (const [role, info] of Object.entries(roles)) {
    lines.push(`### ${role}`);
    lines.push(`${info.description}`);
    lines.push(`Permissions: ${info.permissions.join(', ')}`);
    lines.push('');
  }

  // Permission matrix
  if (includeMatrix && userList.length > 0) {
    lines.push('## Permission Matrix');
    lines.push('');

    const matrix = getAccessMatrix(userList);
    const header = ['Email', ...ALL_PERMISSIONS].join(' | ');
    lines.push(`| ${header} |`);
    lines.push('|' + '------|'.repeat(ALL_PERMISSIONS.length + 1));

    for (const email of matrix.users) {
      const perms = ALL_PERMISSIONS.map((p) =>
        matrix.matrix[email][p] ? 'Y' : '-'
      );
      lines.push(`| ${email} | ${perms.join(' | ')} |`);
    }
    lines.push('');
  }

  // SSO mappings
  if (config && config.sso && config.sso.roleMappings) {
    lines.push('## SSO Role Mappings');
    lines.push('');

    const ssoMapping = getSSOMapping(config);

    if (ssoMapping.mappings.length === 0) {
      lines.push('No SSO role mappings configured.');
    } else {
      lines.push('| Pattern | Role | Priority |');
      lines.push('|---------|------|----------|');

      for (const mapping of ssoMapping.mappings) {
        lines.push(
          `| \`${mapping.pattern}\` | ${mapping.role} | ${mapping.priority} |`
        );
      }

      if (ssoMapping.defaultRole) {
        lines.push('');
        lines.push(`Default role: ${ssoMapping.defaultRole}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Detect permissions not assigned to any user
 * @param {Object[]} users - Array of user objects
 * @returns {string[]} Array of orphaned permissions
 */
function detectOrphanedPermissions(users) {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return [...ALL_PERMISSIONS];
  }

  const usedPermissions = new Set();

  for (const user of users) {
    const permissions = ROLE_PERMISSIONS[user.role] || [];

    // Wildcard means all permissions are used
    if (permissions.includes('*')) {
      return [];
    }

    for (const perm of permissions) {
      usedPermissions.add(perm);
    }
  }

  return ALL_PERMISSIONS.filter((p) => !usedPermissions.has(p));
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an access control documenter instance
 * @param {Object} options - Configuration options
 * @returns {Object} Documenter instance
 */
function createAccessControlDoc(options = {}) {
  const { config = {} } = options;
  const permissionStore = createInternalPermissionStore();

  return {
    listUsers(users) {
      return listUsers(users);
    },

    listRoles() {
      return listRoles();
    },

    getRolePermissions(role, opts) {
      return getRolePermissions(role, opts);
    },

    getSSOMapping() {
      return getSSOMapping(config);
    },

    getAccessMatrix(users) {
      return getAccessMatrix(users);
    },

    trackPermissionChange(change) {
      return trackPermissionChange(permissionStore, change);
    },

    getPermissionHistory(filters) {
      return getPermissionHistory(permissionStore, filters);
    },

    exportAsEvidence(users, opts = {}) {
      return exportAsEvidence(users, config, {
        ...opts,
        permissionStore,
      });
    },

    formatAccessReport(users, opts) {
      return formatAccessReport(users, { ...opts, config });
    },

    detectOrphanedPermissions(users) {
      return detectOrphanedPermissions(users);
    },
  };
}

/**
 * Create internal permission store for tracking changes
 * @returns {Object} Permission store
 */
function createInternalPermissionStore() {
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

export {
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
  USER_ROLES,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
};
