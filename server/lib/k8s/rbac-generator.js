/**
 * RBAC Role and Binding Generator
 */

/**
 * Creates a minimal service account
 * @param {Object} options - Configuration options
 * @param {string} options.name - Service account name
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @returns {Object} ServiceAccount resource
 */
export function createServiceAccount({ name, namespace = 'default' } = {}) {
  return {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name,
      namespace
    },
    automountServiceAccountToken: false
  };
}

/**
 * Creates a role with least privilege
 * @param {Object} options - Configuration options
 * @param {string} options.name - Role name
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @param {Array} options.rules - Array of policy rules
 * @returns {Object} Role resource with optional warnings
 */
export function createRole({ name, namespace = 'default', rules = [] } = {}) {
  const role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name,
      namespace
    },
    rules
  };

  // Check for excessive permissions (wildcard usage)
  const hasWildcardPermissions = rules.some(rule =>
    rule.apiGroups?.includes('*') ||
    rule.resources?.includes('*') ||
    rule.verbs?.includes('*')
  );

  if (hasWildcardPermissions) {
    role.warnings = ['excessive-permissions'];
  }

  return role;
}

/**
 * Creates a role binding
 * @param {Object} options - Configuration options
 * @param {string} options.name - Binding name
 * @param {string} options.roleName - Name of the role to bind
 * @param {string} options.serviceAccount - Service account name (optional)
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @returns {Object} RoleBinding resource
 */
export function createRoleBinding({ name, roleName, serviceAccount, namespace = 'default' } = {}) {
  const binding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name,
      namespace
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: roleName
    },
    subjects: []
  };

  if (serviceAccount) {
    binding.subjects.push({
      kind: 'ServiceAccount',
      name: serviceAccount,
      namespace
    });
  }

  return binding;
}

/**
 * Validates RBAC resource syntax
 * @param {Object} resource - RBAC resource to validate
 * @returns {Object} Validation result with valid boolean and issues array
 */
export function validateRbac(resource) {
  const issues = [];

  if (!resource.kind) {
    issues.push('missing-kind');
  }

  if (!resource.metadata?.name) {
    issues.push('missing-name');
  }

  if (resource.kind === 'Role' || resource.kind === 'ClusterRole') {
    if (!Array.isArray(resource.rules)) {
      issues.push('missing-rules');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Creates an RBAC generator
 * @returns {Object} Generator with serviceAccount, role, and binding methods
 */
export function createRbacGenerator() {
  return {
    serviceAccount: (options) => createServiceAccount(options),
    role: (options) => createRole(options),
    binding: (options) => createRoleBinding(options),
    validate: (resource) => validateRbac(resource)
  };
}
