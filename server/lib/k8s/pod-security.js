/**
 * Pod Security Standards (Baseline, Restricted)
 */

/**
 * Generates a security context based on the specified level
 * @param {Object} options - Configuration options
 * @param {string} options.level - Security level ('restricted', 'baseline', 'privileged')
 * @returns {Object} Security context configuration
 */
export function generateSecurityContext({ level = 'restricted' } = {}) {
  const context = {
    capabilities: {
      drop: ['ALL']
    }
  };

  if (level === 'restricted') {
    context.runAsNonRoot = true;
    context.readOnlyRootFilesystem = true;
    context.allowPrivilegeEscalation = false;
  } else if (level === 'baseline') {
    context.runAsNonRoot = false;
    context.readOnlyRootFilesystem = false;
  }

  return context;
}

/**
 * Enforces Pod Security Standards at namespace level
 * @param {Object} options - Configuration options
 * @param {string} options.namespace - Target namespace
 * @param {string} options.level - Enforcement level (default: 'restricted')
 * @returns {Object} Namespace labels for Pod Security Standards
 */
export function enforceRestricted({ namespace, level = 'restricted' } = {}) {
  return {
    'pod-security.kubernetes.io/enforce': level,
    'pod-security.kubernetes.io/enforce-version': 'latest',
    'pod-security.kubernetes.io/audit': level,
    'pod-security.kubernetes.io/warn': level
  };
}

/**
 * Blocks privileged container settings
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeHostSettings - Whether to include host namespace settings
 * @returns {Object} Security settings that block privileged access
 */
export function blockPrivileged({ includeHostSettings = false } = {}) {
  const settings = {
    privileged: false,
    allowPrivilegeEscalation: false
  };

  if (includeHostSettings) {
    settings.hostNetwork = false;
    settings.hostPID = false;
    settings.hostIPC = false;
  }

  return settings;
}

/**
 * Sets seccomp profile configuration
 * @param {Object} options - Configuration options
 * @param {string} options.type - Seccomp profile type ('RuntimeDefault', 'Localhost', 'Unconfined')
 * @param {string} options.localhostProfile - Path to localhost profile (if type is 'Localhost')
 * @returns {Object} Seccomp profile configuration
 */
export function setSeccomp({ type = 'RuntimeDefault', localhostProfile } = {}) {
  const profile = {
    type
  };

  if (type === 'Localhost' && localhostProfile) {
    profile.localhostProfile = localhostProfile;
  }

  return profile;
}

/**
 * Creates a pod security manager
 * @returns {Object} Pod security manager with generate and validate methods
 */
export function createPodSecurity() {
  return {
    generate: (options) => generateSecurityContext(options),
    validate: (spec) => {
      const issues = [];

      if (spec.privileged === true) {
        issues.push('privileged-container');
      }

      if (spec.runAsNonRoot !== true) {
        issues.push('runs-as-root');
      }

      if (!spec.capabilities?.drop?.includes('ALL')) {
        issues.push('capabilities-not-dropped');
      }

      return {
        valid: issues.length === 0,
        issues
      };
    }
  };
}
