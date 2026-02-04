/**
 * Crypto Patterns Tests
 *
 * Secure cryptography patterns for code generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createCryptoPatterns,
  detectHardcodedSecrets,
  generateSecureRandom,
  generateTlsConfig,
  generateKeyRotation,
  generateEncryptionCode,
  generateSecretManagement,
} = require('./crypto-patterns.js');

describe('Crypto Patterns', () => {
  let patterns;

  beforeEach(() => {
    patterns = createCryptoPatterns();
  });

  describe('createCryptoPatterns', () => {
    it('creates patterns with default config', () => {
      assert.ok(patterns);
      assert.ok(patterns.algorithms);
    });

    it('includes modern algorithms', () => {
      assert.ok(patterns.algorithms.includes('aes-256-gcm'));
    });

    it('excludes weak algorithms', () => {
      assert.ok(!patterns.algorithms.includes('des'));
      assert.ok(!patterns.algorithms.includes('md5'));
    });
  });

  describe('detectHardcodedSecrets', () => {
    it('detects API keys', () => {
      const code = `
        const apiKey = 'sk_live_abc123def456';
        fetch(url, { headers: { Authorization: apiKey } });
      `;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.found);
      assert.ok(result.secrets.length > 0);
    });

    it('detects AWS keys', () => {
      const code = `
        const accessKey = 'AKIAIOSFODNN7EXAMPLE';
        const secretKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      `;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.found);
    });

    it('detects JWT secrets', () => {
      const code = `
        const jwtSecret = 'super-secret-key-12345';
        jwt.sign(payload, jwtSecret);
      `;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.found);
    });

    it('detects database passwords', () => {
      const code = `
        const dbUrl = 'postgres://user:password123@localhost/db';
      `;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.found);
    });

    it('suggests environment variables', () => {
      const code = `const apiKey = 'abc123';`;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.suggestion);
      assert.ok(result.suggestion.includes('env') || result.suggestion.includes('environment'));
    });

    it('ignores example placeholders', () => {
      const code = `
        const apiKey = 'YOUR_API_KEY_HERE';
        const secret = '<insert-secret>';
      `;

      const result = detectHardcodedSecrets(code);

      assert.strictEqual(result.found, false);
    });

    it('detects private keys', () => {
      const code = `
        const privateKey = '-----BEGIN RSA PRIVATE KEY-----\\nMIIE...';
      `;

      const result = detectHardcodedSecrets(code);

      assert.ok(result.found);
    });
  });

  describe('generateSecureRandom', () => {
    it('uses crypto.randomBytes', () => {
      const code = generateSecureRandom({
        language: 'javascript',
        length: 32,
      });

      assert.ok(code.includes('crypto') && code.includes('random'));
    });

    it('generates hex output', () => {
      const code = generateSecureRandom({
        language: 'javascript',
        encoding: 'hex',
      });

      assert.ok(code.includes('hex'));
    });

    it('generates base64 output', () => {
      const code = generateSecureRandom({
        language: 'javascript',
        encoding: 'base64',
      });

      assert.ok(code.includes('base64'));
    });

    it('generates UUID v4', () => {
      const code = generateSecureRandom({
        type: 'uuid',
      });

      assert.ok(code.includes('uuid') || code.includes('randomUUID'));
    });

    it('warns against Math.random', () => {
      const result = generateSecureRandom({
        validate: 'Math.random()',
      });

      assert.ok(result.warning);
    });

    it('generates Python secrets module', () => {
      const code = generateSecureRandom({
        language: 'python',
      });

      assert.ok(code.includes('secrets') || code.includes('os.urandom'));
    });
  });

  describe('generateTlsConfig', () => {
    it('requires TLS 1.3 minimum', () => {
      const config = generateTlsConfig({});

      assert.ok(config.minVersion === 'TLSv1.3' || config.minVersion === 'TLS1.3');
    });

    it('specifies secure cipher suites', () => {
      const config = generateTlsConfig({});

      assert.ok(config.ciphers);
      assert.ok(config.ciphers.includes('GCM') || config.ciphers.includes('ECDHE'));
    });

    it('enables OCSP stapling', () => {
      const config = generateTlsConfig({
        ocspStapling: true,
      });

      assert.ok(config.ocspStapling);
    });

    it('sets HSTS header', () => {
      const config = generateTlsConfig({
        hsts: true,
      });

      assert.ok(config.hstsMaxAge >= 31536000); // 1 year minimum
    });

    it('generates Node.js TLS options', () => {
      const config = generateTlsConfig({
        platform: 'nodejs',
      });

      assert.ok(config.code.includes('tls') || config.code.includes('https'));
    });

    it('generates Nginx config', () => {
      const config = generateTlsConfig({
        platform: 'nginx',
      });

      assert.ok(config.code.includes('ssl_') || config.code.includes('server'));
    });
  });

  describe('generateKeyRotation', () => {
    it('generates rotation schedule', () => {
      const config = generateKeyRotation({
        rotationDays: 90,
      });

      assert.ok(config.schedule);
      assert.strictEqual(config.rotationDays, 90);
    });

    it('supports multiple active keys', () => {
      const config = generateKeyRotation({
        maxActiveKeys: 2,
      });

      assert.strictEqual(config.maxActiveKeys, 2);
    });

    it('generates graceful transition', () => {
      const config = generateKeyRotation({
        gracePeriod: 86400000, // 24 hours
      });

      assert.ok(config.gracePeriod);
    });

    it('generates key versioning', () => {
      const config = generateKeyRotation({
        versioned: true,
      });

      assert.ok(config.versioned);
    });

    it('generates key derivation', () => {
      const config = generateKeyRotation({
        deriveKeys: true,
      });

      assert.ok(config.code.includes('derive') || config.code.includes('hkdf'));
    });
  });

  describe('generateEncryptionCode', () => {
    it('uses AES-256-GCM', () => {
      const code = generateEncryptionCode({
        language: 'javascript',
      });

      assert.ok(code.includes('aes-256-gcm') || code.includes('AES'));
    });

    it('generates authenticated encryption', () => {
      const code = generateEncryptionCode({
        authenticated: true,
      });

      assert.ok(code.includes('tag') || code.includes('auth') || code.includes('GCM'));
    });

    it('includes IV generation', () => {
      const code = generateEncryptionCode({
        language: 'javascript',
      });

      assert.ok(code.includes('iv') || code.includes('nonce'));
    });

    it('generates key from password', () => {
      const code = generateEncryptionCode({
        keyDerivation: 'password',
      });

      assert.ok(code.includes('pbkdf2') || code.includes('scrypt') || code.includes('argon'));
    });

    it('generates envelope encryption', () => {
      const code = generateEncryptionCode({
        envelope: true,
      });

      assert.ok(code.includes('data key') || code.includes('wrap') || code.includes('envelope'));
    });
  });

  describe('generateSecretManagement', () => {
    it('generates env var pattern', () => {
      const code = generateSecretManagement({
        method: 'env',
      });

      assert.ok(code.includes('process.env') || code.includes('os.environ'));
    });

    it('generates vault integration', () => {
      const code = generateSecretManagement({
        method: 'vault',
      });

      assert.ok(code.includes('vault') || code.includes('Vault'));
    });

    it('generates AWS Secrets Manager', () => {
      const code = generateSecretManagement({
        method: 'aws-secrets',
      });

      assert.ok(code.includes('SecretsManager') || code.includes('aws'));
    });

    it('includes secret caching', () => {
      const code = generateSecretManagement({
        cache: true,
        cacheTtl: 300000,
      });

      assert.ok(code.includes('cache') || code.includes('Cache'));
    });

    it('generates secret validation', () => {
      const code = generateSecretManagement({
        validate: true,
      });

      assert.ok(code.includes('validate') || code.includes('check') || code.includes('required'));
    });
  });
});
