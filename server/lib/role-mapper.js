/**
 * Role Mapper
 * Maps IdP roles/groups to TLC roles with regex pattern matching
 */

// Valid TLC roles (from auth-system.js)
const VALID_ROLES = ['admin', 'engineer', 'qa', 'po'];

/**
 * Map IdP groups to TLC role using configured mappings
 * @param {string[]} groups - User's IdP groups/roles
 * @param {Object[]} mappings - Role mapping configurations
 * @param {string} [defaultRole=null] - Default role if no mapping matches
 * @returns {string|null} Mapped TLC role or null if no match and no default
 */
function mapRoles(groups, mappings, defaultRole = null) {
  if (!groups || groups.length === 0 || !mappings || mappings.length === 0) {
    return defaultRole;
  }

  // Sort mappings by priority (lower number = higher priority)
  const sortedMappings = [...mappings].sort((a, b) => a.priority - b.priority);

  // Find all matching mappings
  const matches = [];

  for (const mapping of sortedMappings) {
    const flags = mapping.flags || '';
    let regex;
    try {
      regex = new RegExp(mapping.pattern, flags);
    } catch {
      // Skip invalid regex patterns
      continue;
    }

    for (const group of groups) {
      if (regex.test(group)) {
        matches.push(mapping);
        break; // Only need to match once per mapping
      }
    }
  }

  if (matches.length === 0) {
    return defaultRole;
  }

  // Return the role with highest priority (lowest number)
  return matches[0].role;
}

/**
 * Sync user roles based on IdP groups on login
 * @param {Object} user - User object
 * @param {string[]} groups - User's IdP groups
 * @param {Object[]} mappings - Role mapping configurations
 * @param {Object} options - Sync options
 * @param {Function} options.updateUser - Function to update user
 * @param {string} [options.defaultRole] - Default role if no mapping matches
 * @returns {Promise<Object>} Updated user object
 */
async function syncRoles(user, groups, mappings, options = {}) {
  const { updateUser, defaultRole } = options;

  const mappedRole = mapRoles(groups, mappings, defaultRole);

  // If no mapped role and no default, keep user's current role
  if (!mappedRole) {
    return user;
  }

  // If role is the same, no update needed
  if (user.role === mappedRole) {
    return user;
  }

  // Update user role
  if (updateUser) {
    const updatedUser = await updateUser(user.id, { role: mappedRole });
    return updatedUser;
  }

  return { ...user, role: mappedRole };
}

/**
 * Get role mappings from config
 * @param {Object} config - TLC config object
 * @returns {Object} Role mappings and default role
 */
function getRoleMappings(config) {
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
 * Validate role mappings configuration
 * @param {Object[]} mappings - Role mapping configurations
 * @param {Object} [options] - Validation options
 * @param {string} [options.defaultRole] - Default role to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
function validateMappings(mappings, options = {}) {
  const errors = [];

  if (!mappings || !Array.isArray(mappings)) {
    return { valid: false, errors: ['Mappings must be an array'] };
  }

  const seenPriorities = new Set();

  mappings.forEach((mapping, index) => {
    // Check required fields
    if (!mapping.pattern) {
      errors.push(`Missing required field "pattern" at index ${index}`);
    }
    if (!mapping.role) {
      errors.push(`Missing required field "role" at index ${index}`);
    }
    if (mapping.priority === undefined || mapping.priority === null) {
      errors.push(`Missing required field "priority" at index ${index}`);
    }

    // Validate role name
    if (mapping.role && !VALID_ROLES.includes(mapping.role)) {
      errors.push(
        `Invalid role "${mapping.role}" at index ${index}. Valid roles: ${VALID_ROLES.join(', ')}`
      );
    }

    // Validate regex pattern
    if (mapping.pattern) {
      try {
        new RegExp(mapping.pattern, mapping.flags || '');
      } catch (e) {
        errors.push(
          `Invalid regex pattern "${mapping.pattern}" at index ${index}: ${e.message}`
        );
      }
    }

    // Check for duplicate priorities
    if (mapping.priority !== undefined && mapping.priority !== null) {
      if (seenPriorities.has(mapping.priority)) {
        errors.push(`Duplicate priority ${mapping.priority} at index ${index}`);
      }
      seenPriorities.add(mapping.priority);
    }
  });

  // Validate default role if provided
  if (options.defaultRole && !VALID_ROLES.includes(options.defaultRole)) {
    errors.push(
      `Invalid default role "${options.defaultRole}". Valid roles: ${VALID_ROLES.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a role mapper instance with config
 * @param {Object} config - TLC config object
 * @returns {Object} Role mapper instance
 */
function createRoleMapper(config) {
  const { mappings, defaultRole } = getRoleMappings(config);

  return {
    /**
     * Map groups to a TLC role
     * @param {string[]} groups - User's IdP groups
     * @returns {string|null} Mapped TLC role
     */
    map(groups) {
      return mapRoles(groups, mappings, defaultRole);
    },

    /**
     * Sync user roles based on IdP groups
     * @param {Object} user - User object
     * @param {string[]} groups - User's IdP groups
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Updated user object
     */
    async sync(user, groups, options = {}) {
      return syncRoles(user, groups, mappings, {
        ...options,
        defaultRole,
      });
    },

    /**
     * Validate the current mappings configuration
     * @returns {Object} Validation result
     */
    validate() {
      return validateMappings(mappings, { defaultRole });
    },

    /**
     * Get the current mappings configuration
     * @returns {Object} Mappings and default role
     */
    getMappings() {
      return { mappings, defaultRole };
    },
  };
}

export {
  mapRoles,
  syncRoles,
  getRoleMappings,
  validateMappings,
  createRoleMapper,
  VALID_ROLES,
};
