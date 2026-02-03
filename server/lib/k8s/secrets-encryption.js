/**
 * Secrets Encryption at Rest
 */

/**
 * Generates a sealed secret
 * @param {Object} options - Configuration options
 * @param {string} options.name - Secret name
 * @param {Object} options.data - Secret data (key-value pairs)
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @param {Function} options.mockSeal - Mock seal function for testing
 * @returns {Object} SealedSecret resource
 */
export function generateSealedSecret({ name, data = {}, namespace = 'default', mockSeal } = {}) {
  const encryptedData = {};

  for (const [key, value] of Object.entries(data)) {
    if (mockSeal) {
      encryptedData[key] = mockSeal(value);
    } else {
      // In production, this would use kubeseal
      encryptedData[key] = Buffer.from(value).toString('base64');
    }
  }

  return {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      name,
      namespace
    },
    spec: {
      encryptedData
    }
  };
}

/**
 * Configures encryption at rest
 * @param {Object} options - Configuration options
 * @param {string} options.provider - Encryption provider ('kms', 'aescbc', 'secretbox')
 * @param {string} options.keyId - Key ID (for KMS)
 * @returns {Object} Encryption configuration
 */
export function configureEncryptionAtRest({ provider = 'kms', keyId } = {}) {
  const config = {
    kind: 'EncryptionConfiguration',
    apiVersion: 'apiserver.config.k8s.io/v1',
    resources: [{
      resources: ['secrets'],
      providers: []
    }]
  };

  if (provider === 'kms') {
    config.resources[0].providers.push({
      kms: {
        name: 'kms-provider',
        endpoint: 'unix:///var/run/kms-provider.sock',
        cachesize: 1000,
        timeout: '3s'
      }
    });
    if (keyId) {
      config.resources[0].providers[0].kms.keyId = keyId;
    }
  } else if (provider === 'aescbc') {
    config.resources[0].providers.push({
      aescbc: {
        keys: [{
          name: 'key1',
          secret: '<base64-encoded-secret>'
        }]
      }
    });
  }

  // Always add identity provider as fallback for reading unencrypted secrets
  config.resources[0].providers.push({ identity: {} });

  return {
    providers: config.resources[0].providers,
    config
  };
}

/**
 * Generates an ExternalSecret custom resource
 * @param {Object} options - Configuration options
 * @param {string} options.name - Secret name
 * @param {string} options.store - Secret store name
 * @param {Array} options.keys - Keys to fetch from store
 * @param {string} options.namespace - Target namespace (default: 'default')
 * @returns {Object} ExternalSecret resource
 */
export function generateExternalSecret({ name, store, keys = [], namespace = 'default' } = {}) {
  return {
    apiVersion: 'external-secrets.io/v1beta1',
    kind: 'ExternalSecret',
    metadata: {
      name,
      namespace
    },
    spec: {
      refreshInterval: '1h',
      secretStoreRef: {
        name: store,
        kind: 'SecretStore'
      },
      target: {
        name,
        creationPolicy: 'Owner'
      },
      data: keys.map(key => ({
        secretKey: key,
        remoteRef: {
          key: name,
          property: key
        }
      }))
    }
  };
}

/**
 * Generates Vault integration configuration
 * @param {Object} options - Configuration options
 * @param {string} options.address - Vault server address
 * @param {string} options.role - Vault role
 * @param {string} options.authPath - Auth path (default: 'kubernetes')
 * @returns {string} Vault configuration as string
 */
export function generateVaultConfig({ address, role, authPath = 'kubernetes' } = {}) {
  return `
vault:
  address: "${address}"
  auth:
    method: kubernetes
    path: ${authPath}
    role: ${role}
  secrets:
    path: secret/data
`.trim();
}

/**
 * Creates a secrets encryption manager
 * @returns {Object} Manager with seal, rotate, and getLog methods
 */
export function createSecretsEncryption() {
  const log = [];

  return {
    seal: (options) => {
      log.push(`Sealing secret: ${options.name}`);
      return generateSealedSecret(options);
    },
    rotate: (options) => {
      log.push(`Rotating encryption key`);
      return { rotated: true, timestamp: new Date().toISOString() };
    },
    getLog: () => {
      // Never include sensitive data in logs
      return log.join('\n');
    }
  };
}
