/**
 * Kubernetes Network Policy Generator
 */

/**
 * Generates a default deny all policy for a namespace
 * @param {Object} options - Configuration options
 * @param {string} options.namespace - Target namespace
 * @param {string} options.name - Policy name (default: 'default-deny-all')
 * @returns {Object} NetworkPolicy resource
 */
export function generateDefaultDeny({ namespace, name = 'default-deny-all' } = {}) {
  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name,
      namespace
    },
    spec: {
      podSelector: {},
      policyTypes: ['Ingress', 'Egress']
    }
  };
}

/**
 * Creates an ingress rule
 * @param {Object} options - Configuration options
 * @param {Array} options.from - Array of ingress sources
 * @param {number} options.port - Port number
 * @param {string} options.protocol - Protocol (default: 'TCP')
 * @returns {Object} Ingress rule
 */
export function createIngressRule({ from, port, protocol = 'TCP' } = {}) {
  const rule = {
    from
  };

  if (port !== undefined) {
    rule.ports = [{
      port,
      protocol
    }];
  }

  return rule;
}

/**
 * Creates an egress rule
 * @param {Object} options - Configuration options
 * @param {Array} options.to - Array of egress destinations
 * @param {number} options.port - Port number
 * @param {string} options.protocol - Protocol (default: 'TCP')
 * @returns {Object} Egress rule
 */
export function createEgressRule({ to, port, protocol = 'TCP' } = {}) {
  const rule = {
    to
  };

  if (port !== undefined) {
    rule.ports = [{
      port,
      protocol
    }];
  }

  return rule;
}

/**
 * Validates a network policy
 * @param {Object} policy - NetworkPolicy resource to validate
 * @returns {Object} Validation result with valid boolean and issues array
 */
export function validatePolicy(policy) {
  const issues = [];

  if (!policy.apiVersion) {
    issues.push('missing-api-version');
  }

  if (policy.kind !== 'NetworkPolicy') {
    issues.push('invalid-kind');
  }

  if (!policy.metadata?.name) {
    issues.push('missing-name');
  }

  if (!policy.spec?.podSelector) {
    issues.push('missing-pod-selector');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Creates a network policy generator
 * @returns {Object} Generator with defaultDeny, allowIngress, and allowEgress methods
 */
export function createNetworkPolicyGenerator() {
  return {
    defaultDeny: (options) => generateDefaultDeny(options),
    allowIngress: (options) => createIngressRule(options),
    allowEgress: (options) => createEgressRule(options),
    validate: (policy) => validatePolicy(policy)
  };
}
