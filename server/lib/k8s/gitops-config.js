/**
 * GitOps Configuration
 * Generates ArgoCD and Flux configurations
 */

import jsYaml from 'js-yaml';

/**
 * Generate ArgoCD Application manifest
 * @param {Object} options - Application options
 * @param {string} options.name - Application name
 * @param {string} options.repo - Git repository URL
 * @param {string} options.path - Path in repository
 * @param {string} [options.cluster] - Target cluster name
 * @returns {Object} ArgoCD Application object
 */
export function generateArgoCdApplication(options) {
  const {
    name,
    repo,
    path,
    cluster = 'in-cluster',
    namespace = 'argocd',
    targetNamespace = 'default',
    project = 'default',
    revision = 'HEAD'
  } = options;

  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      namespace,
    },
    spec: {
      project,
      source: {
        repoURL: repo,
        path,
        targetRevision: revision,
      },
      destination: {
        name: cluster,
        namespace: targetNamespace,
      },
    },
  };
}

/**
 * Generate Flux Kustomization manifest
 * @param {Object} options - Kustomization options
 * @param {string} options.name - Kustomization name
 * @param {string} options.path - Path in repository
 * @returns {Object} Flux Kustomization object
 */
export function generateFluxKustomization(options) {
  const {
    name,
    path,
    namespace = 'flux-system',
    sourceRef = { kind: 'GitRepository', name: 'flux-system' },
    interval = '10m',
    prune = true,
  } = options;

  return {
    apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
    kind: 'Kustomization',
    metadata: {
      name,
      namespace,
    },
    spec: {
      interval,
      path,
      prune,
      sourceRef,
    },
  };
}

/**
 * Configure sync policy for ArgoCD
 * @param {Object} options - Sync policy options
 * @param {boolean} options.automated - Enable automated sync
 * @param {boolean} options.prune - Enable pruning
 * @param {boolean} options.selfHeal - Enable self-healing
 * @returns {Object} Sync policy configuration
 */
export function configureSyncPolicy(options) {
  const { automated = false, prune = false, selfHeal = false } = options;

  if (!automated) {
    return { syncOptions: ['CreateNamespace=true'] };
  }

  return {
    automated: {
      prune,
      selfHeal,
    },
    syncOptions: ['CreateNamespace=true'],
  };
}

/**
 * Configure health checks
 * @param {Object} options - Health check options
 * @param {Array} options.ignoreDifferences - Differences to ignore
 * @returns {Object} Health check configuration
 */
export function configureHealthChecks(options) {
  const { ignoreDifferences = [] } = options;

  return {
    ignoreDifferences,
    health: {
      customHealthChecks: [],
    },
  };
}

/**
 * Configure notifications
 * @param {Object} options - Notification options
 * @param {Object} options.slack - Slack configuration
 * @returns {string} Notification configuration YAML
 */
export function configureNotifications(options) {
  const { slack, email, webhook } = options;

  const config = {
    triggers: [],
    templates: [],
    services: {},
  };

  if (slack) {
    config.services.slack = {
      channel: slack.channel,
    };
    config.triggers.push({
      name: 'on-deployed',
      condition: 'app.status.operationState.phase in ["Succeeded"]',
      template: 'app-deployed',
    });
  }

  if (email) {
    config.services.email = email;
  }

  if (webhook) {
    config.services.webhook = webhook;
  }

  return jsYaml.dump(config);
}

/**
 * Create a GitOps config manager
 * @returns {Object} GitOps config manager with methods
 */
export function createGitopsConfig() {
  return {
    generateArgo: (options) => {
      const app = generateArgoCdApplication({
        ...options,
        repo: options.repo || 'https://github.com/org/repo',
        path: options.path || 'k8s',
      });

      // If cluster is specified, set destination.name
      if (options.cluster) {
        app.spec.destination.name = options.cluster;
      }

      return app;
    },
    generateFlux: (options) => generateFluxKustomization(options),
    configureSyncPolicy,
    configureHealthChecks,
    configureNotifications,
    toYaml: (obj) => jsYaml.dump(obj),
  };
}
