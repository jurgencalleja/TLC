/**
 * Resource Quotas and Limits Manager
 */

/**
 * Sets resource requests
 * @param {Object} options - Configuration options
 * @param {string} options.cpu - CPU request (e.g., '100m')
 * @param {string} options.memory - Memory request (e.g., '128Mi')
 * @returns {Object} Resource configuration with requests
 */
export function setResourceRequests({ cpu, memory } = {}) {
  return {
    requests: {
      ...(cpu && { cpu }),
      ...(memory && { memory })
    }
  };
}

/**
 * Sets resource limits
 * @param {Object} options - Configuration options
 * @param {string} options.cpu - CPU limit (e.g., '500m')
 * @param {string} options.memory - Memory limit (e.g., '512Mi')
 * @returns {Object} Resource configuration with limits
 */
export function setResourceLimits({ cpu, memory } = {}) {
  return {
    limits: {
      ...(cpu && { cpu }),
      ...(memory && { memory })
    }
  };
}

/**
 * Generates a Horizontal Pod Autoscaler configuration
 * @param {Object} options - Configuration options
 * @param {string} options.name - Target deployment name
 * @param {number} options.minReplicas - Minimum replicas
 * @param {number} options.maxReplicas - Maximum replicas
 * @param {number} options.targetCpu - Target CPU utilization percentage
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @returns {Object} HorizontalPodAutoscaler resource
 */
export function generateHpa({ name, minReplicas = 1, maxReplicas = 10, targetCpu = 80, namespace = 'default' } = {}) {
  return {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: `${name}-hpa`,
      namespace
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name
      },
      minReplicas,
      maxReplicas,
      metrics: [{
        type: 'Resource',
        resource: {
          name: 'cpu',
          target: {
            type: 'Utilization',
            averageUtilization: targetCpu
          }
        }
      }]
    }
  };
}

/**
 * Generates a Pod Disruption Budget configuration
 * @param {Object} options - Configuration options
 * @param {string} options.name - Target deployment name
 * @param {number} options.minAvailable - Minimum available pods (optional)
 * @param {number} options.maxUnavailable - Maximum unavailable pods (optional)
 * @param {Object} options.selector - Pod selector (default: matches app label)
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @returns {Object} PodDisruptionBudget resource
 */
export function generatePdb({ name, minAvailable, maxUnavailable, selector, namespace = 'default' } = {}) {
  const pdb = {
    apiVersion: 'policy/v1',
    kind: 'PodDisruptionBudget',
    metadata: {
      name: `${name}-pdb`,
      namespace
    },
    spec: {
      selector: selector || {
        matchLabels: {
          app: name
        }
      }
    }
  };

  if (minAvailable !== undefined) {
    pdb.spec.minAvailable = minAvailable;
  } else if (maxUnavailable !== undefined) {
    pdb.spec.maxUnavailable = maxUnavailable;
  }

  return pdb;
}

/**
 * Sets a priority class configuration
 * @param {Object} options - Configuration options
 * @param {string} options.name - Priority class name
 * @param {number} options.value - Priority value
 * @param {boolean} options.globalDefault - Whether this is the global default
 * @param {string} options.description - Description of the priority class
 * @returns {Object} PriorityClass resource
 */
export function setPriorityClass({ name, value, globalDefault = false, description } = {}) {
  return {
    apiVersion: 'scheduling.k8s.io/v1',
    kind: 'PriorityClass',
    metadata: {
      name
    },
    value,
    globalDefault,
    description: description || `Priority class: ${name}`
  };
}

/**
 * Validates resource syntax
 * @param {Object} resources - Resource configuration to validate
 * @returns {Object} Validation result with valid boolean and issues array
 */
function validateResources(resources) {
  const issues = [];
  const cpuPattern = /^\d+m?$/;
  const memoryPattern = /^\d+(Ki|Mi|Gi|Ti|Pi|Ei)?$/;

  if (resources.cpu && !cpuPattern.test(resources.cpu)) {
    issues.push('invalid-cpu-format');
  }

  if (resources.memory && !memoryPattern.test(resources.memory)) {
    issues.push('invalid-memory-format');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Creates a resource manager
 * @returns {Object} Manager with setRequests, setLimits, generateHpa, and validate methods
 */
export function createResourceManager() {
  return {
    setRequests: (options) => setResourceRequests(options),
    setLimits: (options) => setResourceLimits(options),
    generateHpa: (options) => generateHpa(options),
    generatePdb: (options) => generatePdb(options),
    setPriorityClass: (options) => setPriorityClass(options),
    validate: (resources) => validateResources(resources)
  };
}
