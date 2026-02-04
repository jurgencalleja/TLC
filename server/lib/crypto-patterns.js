/**
 * Crypto Patterns Module
 *
 * Secure cryptography patterns for code generation
 */

const crypto = require('crypto');

/**
 * Create crypto patterns configuration
 * @param {Object} options - Crypto options
 * @returns {Object} Crypto configuration
 */
function createCryptoPatterns(options = {}) {
  return {
    algorithms: options.algorithms || [
      'aes-256-gcm',
      'chacha20-poly1305',
      'aes-256-cbc',
    ],
  };
}

/**
 * Detect hardcoded secrets in code
 * @param {string} code - Code to analyze
 * @returns {Object} Detection result
 */
function detectHardcodedSecrets(code) {
  const secrets = [];

  // Patterns for hardcoded secrets
  const patterns = [
    { regex: /['"]sk_live_[a-zA-Z0-9]+['"]/, type: 'stripe-key' },
    { regex: /['"]sk_test_[a-zA-Z0-9]+['"]/, type: 'stripe-test-key' },
    { regex: /AKIA[0-9A-Z]{16}/, type: 'aws-access-key' },
    { regex: /['"][a-zA-Z0-9/+]{40}['"]/, type: 'aws-secret-key' },
    { regex: /['"]ghp_[a-zA-Z0-9]{36}['"]/, type: 'github-token' },
    { regex: /['"]gho_[a-zA-Z0-9]{36}['"]/, type: 'github-oauth' },
    { regex: /jwt[Ss]ecret\s*=\s*['"][^'"]+['"]/, type: 'jwt-secret' },
    { regex: /password\s*=\s*['"][^'"]+['"]/, type: 'password' },
    { regex: /apiKey\s*=\s*['"][^'"]+['"]/, type: 'api-key' },
    { regex: /secret\s*=\s*['"][^'"]+['"]/, type: 'generic-secret' },
    { regex: /postgres:\/\/[^:]+:[^@]+@/, type: 'database-url' },
    { regex: /mysql:\/\/[^:]+:[^@]+@/, type: 'database-url' },
    { regex: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, type: 'database-url' },
    { regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, type: 'private-key' },
  ];

  // Placeholder patterns to ignore
  const placeholders = [
    /YOUR_[A-Z_]+_HERE/i,
    /<[^>]+>/,
    /\$\{[^}]+\}/,
    /process\.env\./,
    /ENV\[/,
  ];

  for (const { regex, type } of patterns) {
    const matches = code.match(regex);
    if (matches) {
      // Check if it's a placeholder
      const isPlaceholder = placeholders.some((p) => p.test(matches[0]));
      if (!isPlaceholder) {
        secrets.push({ type, match: matches[0] });
      }
    }
  }

  return {
    found: secrets.length > 0,
    secrets,
    suggestion: secrets.length > 0
      ? 'Use environment variables or a secrets manager instead of hardcoding secrets'
      : null,
  };
}

/**
 * Generate secure random value code
 * @param {Object} options - Generation options
 * @returns {Object} Generated code and any warnings
 */
function generateSecureRandom(options = {}) {
  const {
    language = 'javascript',
    length = 32,
    encoding = 'hex',
    type = 'bytes',
    validate = null,
  } = options;

  // Warn against insecure patterns
  if (validate && validate.includes('Math.random')) {
    return {
      warning: 'Math.random() is not cryptographically secure. Use crypto.randomBytes() instead.',
      code: null,
    };
  }

  if (language === 'python') {
    if (type === 'uuid') {
      return `
import uuid

def generate_secure_id():
    return str(uuid.uuid4())`;
    }

    return `
import secrets
import os

def generate_secure_random(length=${length}):
    return secrets.token_hex(length)

# Alternative using os.urandom
def generate_bytes(length=${length}):
    return os.urandom(length).hex()`;
  }

  // JavaScript
  if (type === 'uuid') {
    return `
const crypto = require('crypto');

function generateSecureId() {
  return crypto.randomUUID();
}`;
  }

  return `
const crypto = require('crypto');

function generateSecureRandom(length = ${length}) {
  return crypto.randomBytes(length).toString('${encoding}');
}`;
}

/**
 * Generate TLS configuration
 * @param {Object} options - TLS options
 * @returns {Object} TLS configuration
 */
function generateTlsConfig(options = {}) {
  const {
    platform = 'nodejs',
    ocspStapling = false,
    hsts = true,
  } = options;

  const config = {
    minVersion: 'TLSv1.3',
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384',
    ocspStapling,
    hstsMaxAge: hsts ? 31536000 : 0,
  };

  if (platform === 'nginx') {
    config.code = `
ssl_protocols TLSv1.3;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers on;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`;
  } else {
    config.code = `
const https = require('https');
const tls = require('tls');

const options = {
  minVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem'),
};

const server = https.createServer(options, app);`;
  }

  return config;
}

/**
 * Generate key rotation configuration
 * @param {Object} options - Rotation options
 * @returns {Object} Rotation configuration
 */
function generateKeyRotation(options = {}) {
  const {
    rotationDays = 90,
    maxActiveKeys = 2,
    gracePeriod = 86400000,
    versioned = true,
    deriveKeys = false,
  } = options;

  const schedule = `Every ${rotationDays} days`;

  let code = `
const crypto = require('crypto');

class KeyManager {
  constructor() {
    this.keys = new Map();
    this.currentVersion = 0;
  }

  async generateNewKey() {
    const key = crypto.randomBytes(32);
    this.currentVersion++;
    this.keys.set(this.currentVersion, {
      key,
      createdAt: Date.now(),
      expiresAt: Date.now() + ${rotationDays} * 24 * 60 * 60 * 1000,
    });

    // Remove old keys beyond max active
    while (this.keys.size > ${maxActiveKeys}) {
      const oldest = Math.min(...this.keys.keys());
      this.keys.delete(oldest);
    }

    return this.currentVersion;
  }

  getKey(version) {
    return this.keys.get(version || this.currentVersion);
  }
}`;

  if (deriveKeys) {
    code += `

  deriveKey(masterKey, context) {
    // Use HKDF for key derivation
    return crypto.hkdfSync('sha256', masterKey, '', context, 32);
  }`;
  }

  return {
    schedule,
    rotationDays,
    maxActiveKeys,
    gracePeriod,
    versioned,
    code,
  };
}

/**
 * Generate encryption code
 * @param {Object} options - Encryption options
 * @returns {string} Generated code
 */
function generateEncryptionCode(options = {}) {
  const {
    authenticated = true,
    keyDerivation = 'key',
    envelope = false,
  } = options;

  if (envelope) {
    return `
const crypto = require('crypto');

// Envelope encryption: encrypt data key with master key
async function encryptWithEnvelope(plaintext, masterKey) {
  // Generate random data key
  const dataKey = crypto.randomBytes(32);

  // Encrypt plaintext with data key
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Wrap data key with master key
  const keyIv = crypto.randomBytes(12);
  const keyCipher = crypto.createCipheriv('aes-256-gcm', masterKey, keyIv);
  const wrappedKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
  const keyTag = keyCipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv,
    tag,
    wrappedKey,
    keyIv,
    keyTag,
  };
}`;
  }

  if (keyDerivation === 'password') {
    return `
const crypto = require('crypto');

async function encryptWithPassword(plaintext, password) {
  // Derive key from password using scrypt
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);

  // Encrypt with AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { encrypted, iv, tag, salt };
}`;
  }

  return `
const crypto = require('crypto');

function encrypt(plaintext, key) {
  // Use AES-256-GCM for authenticated encryption
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return { encrypted, iv, tag };
}

function decrypt(encrypted, key, iv, tag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}`;
}

/**
 * Generate secret management code
 * @param {Object} options - Secret management options
 * @returns {string} Generated code
 */
function generateSecretManagement(options = {}) {
  const { method = 'env', cache = false, cacheTtl = 300000, validate = false } = options;

  if (method === 'vault') {
    return `
const Vault = require('node-vault');
${cache ? 'const cache = new Map();' : ''}

const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function getSecret(path) {
  ${cache ? 'if (cache.has(path)) return cache.get(path);' : ''}

  const result = await vault.read(path);
  const secret = result.data.data;

  ${cache ? `cache.set(path, secret);` : ''}

  return secret;
}`;
  }

  if (method === 'aws-secrets') {
    return `
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManager({ region: process.env.AWS_REGION });
${cache ? 'const Cache = require("./cache"); const cache = new Cache({ ttl: ' + cacheTtl + ' });' : ''}

async function getSecret(secretName) {
  ${cache ? 'if (cache.has(secretName)) return cache.get(secretName);' : ''}

  const response = await client.getSecretValue({ SecretId: secretName });
  const secret = JSON.parse(response.SecretString);

  ${cache ? `cache.set(secretName, secret);` : ''}

  return secret;
}`;
  }

  // Environment variables
  return `
${cache ? 'const cache = new Map();' : ''}
${validate ? `
function validateRequiredSecrets() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(\`Missing required environment variable: \${name}\`);
    }
  }
}` : ''}

function getSecret(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(\`Secret not found: \${name}\`);
  }

  return value;
}

module.exports = { getSecret${validate ? ', validateRequiredSecrets' : ''} };`;
}

module.exports = {
  createCryptoPatterns,
  detectHardcodedSecrets,
  generateSecureRandom,
  generateTlsConfig,
  generateKeyRotation,
  generateEncryptionCode,
  generateSecretManagement,
};
