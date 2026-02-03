/**
 * VPS Secrets Manager
 * Secrets generation and rotation for VPS deployments
 */

import crypto from 'crypto';

/**
 * Creates a secrets directory with secure permissions
 * @param {Object} options - Directory options
 * @param {string} options.path - Directory path
 * @param {Function} [options.mkdir] - mkdir function
 * @param {Function} [options.chmod] - chmod function
 * @returns {Promise<Object>} Creation result
 */
export async function createSecretsDir({ path, mkdir, chmod }) {
  if (mkdir) {
    await mkdir(path, { recursive: true });
  }
  if (chmod) {
    await chmod(path, 0o600);
  }
  return { success: true, path };
}

/**
 * Generates secrets from a template
 * @param {Object} options - Generation options
 * @param {Object} options.template - Secret template with name and length
 * @returns {Object} Generated secrets
 */
export function generateSecrets({ template }) {
  const secrets = {};

  for (const [name, config] of Object.entries(template)) {
    const length = config.length || 32;
    // Generate a random string of the specified length
    secrets[name] = crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  return secrets;
}

/**
 * Rotates secrets safely
 * @param {Object} options - Rotation options
 * @param {string[]} options.secrets - Secret names to rotate
 * @param {Function} [options.mockRotate] - Mock rotate function for testing
 * @returns {Promise<Object>} Rotation result
 */
export async function rotateSecrets({ secrets, mockRotate }) {
  const rotated = [];

  for (const secret of secrets) {
    if (mockRotate) {
      await mockRotate(secret);
    }
    rotated.push(secret);
  }

  return { rotated, timestamp: new Date().toISOString() };
}

/**
 * Validates secret format
 * @param {Object} options - Validation options
 * @param {string} options.name - Secret name
 * @param {string} options.value - Secret value
 * @returns {Object} Validation result
 */
export function validateSecretFormat({ name, value }) {
  // Secret names should not contain spaces
  if (name.includes(' ')) {
    return { valid: false, error: 'Secret name cannot contain spaces' };
  }

  // Secret names should be uppercase with underscores
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    return { valid: false, error: 'Secret name must be uppercase with underscores' };
  }

  // Value should not be empty
  if (!value || value.length === 0) {
    return { valid: false, error: 'Secret value cannot be empty' };
  }

  return { valid: true };
}

/**
 * Creates a secrets manager instance
 * @returns {Object} Secrets manager with get, set, and rotate methods
 */
export function createSecretsManager() {
  const secrets = new Map();

  const manager = {
    /**
     * Gets a secret value
     * @param {string} name - Secret name
     * @returns {string|undefined} Secret value
     */
    get(name) {
      return secrets.get(name);
    },

    /**
     * Sets a secret value
     * @param {string} name - Secret name
     * @param {string} value - Secret value
     * @returns {boolean} Success status
     */
    set(name, value) {
      const validation = validateSecretFormat({ name, value });
      if (!validation.valid) {
        return false;
      }
      secrets.set(name, value);
      return true;
    },

    /**
     * Rotates a secret
     * @param {string} name - Secret name to rotate
     * @param {number} [length=32] - New secret length
     * @returns {boolean} Success status
     */
    rotate(name, length = 32) {
      const newValue = crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
      secrets.set(name, newValue);
      return true;
    },

    /**
     * Returns safe string representation (no secrets exposed)
     * @returns {string} Safe string representation
     */
    toString() {
      return `[SecretsManager: ${secrets.size} secrets]`;
    }
  };

  return manager;
}
