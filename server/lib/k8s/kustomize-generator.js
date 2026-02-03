/**
 * Kustomize Generator
 * Generates Kustomize base and overlay configurations
 */

import jsYaml from 'js-yaml';

/**
 * Generate base kustomization.yaml
 * @param {Object} options - Kustomization options
 * @param {string[]} options.resources - List of resource files
 * @returns {string} kustomization.yaml content
 */
export function generateBaseKustomization(options) {
  const { resources = [], namespace = '', commonLabels = {} } = options;

  let content = `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
`;

  for (const resource of resources) {
    content += `  - ${resource}\n`;
  }

  if (namespace) {
    content += `\nnamespace: ${namespace}\n`;
  }

  if (Object.keys(commonLabels).length > 0) {
    content += `\ncommonLabels:\n`;
    for (const [key, value] of Object.entries(commonLabels)) {
      content += `  ${key}: ${value}\n`;
    }
  }

  return content;
}

/**
 * Generate dev overlay
 * @param {Object} options - Overlay options
 * @returns {string} Dev overlay kustomization.yaml content
 */
export function generateDevOverlay(options) {
  const { namespace = 'dev', replicas = 1 } = options;

  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${namespace}

resources:
  - ../../base

commonLabels:
  environment: dev

replicas:
  - name: app
    count: ${replicas}
`;
}

/**
 * Generate staging overlay
 * @param {Object} options - Overlay options
 * @returns {string} Staging overlay kustomization.yaml content
 */
export function generateStagingOverlay(options) {
  const { namespace = 'staging', replicas = 2 } = options;

  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${namespace}

resources:
  - ../../base

commonLabels:
  environment: staging

replicas:
  - name: app
    count: ${replicas}
`;
}

/**
 * Generate production overlay
 * @param {Object} options - Overlay options
 * @returns {string} Production overlay kustomization.yaml content
 */
export function generateProductionOverlay(options) {
  const { namespace = 'production', replicas = 3 } = options;

  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${namespace}

resources:
  - ../../base

commonLabels:
  environment: production

replicas:
  - name: app
    count: ${replicas}

# Production-specific configurations
configMapGenerator: []

# Resource limits for production
patches: []
`;
}

/**
 * Add a patch to kustomization
 * @param {Object} options - Patch options
 * @param {Object} options.target - Target resource
 * @param {Object} options.patch - Patch content
 * @returns {string} Patch YAML content
 */
export function addPatch(options) {
  const { target, patch } = options;

  const patchDoc = {
    apiVersion: 'apps/v1',
    kind: target.kind,
    metadata: {
      name: target.name,
    },
    ...patch,
  };

  return jsYaml.dump(patchDoc);
}

/**
 * Create a Kustomize generator instance
 * @returns {Object} Kustomize generator with methods
 */
export function createKustomizeGenerator() {
  return {
    generateBase: (options) => generateBaseKustomization(options),
    generateOverlay: (env, options = {}) => {
      switch (env) {
        case 'dev':
          return generateDevOverlay(options);
        case 'staging':
          return generateStagingOverlay(options);
        case 'production':
          return generateProductionOverlay(options);
        default:
          return generateDevOverlay({ ...options, namespace: env });
      }
    },
    addPatch: (options) => addPatch(options),
    validate: (content) => {
      try {
        const doc = jsYaml.load(content);
        if (doc && doc.apiVersion && doc.apiVersion.includes('kustomize.config.k8s.io')) {
          return { valid: true };
        }
        return { valid: false, error: 'Invalid kustomization apiVersion' };
      } catch (e) {
        return { valid: false, error: e.message };
      }
    },
  };
}
