/**
 * Secret Detector Tests
 *
 * Tests for detecting hardcoded secrets in code.
 */

import { describe, it, expect } from 'vitest';
import {
  detectSecrets,
  scanFile,
  scanDirectory,
  createSecretDetector,
  addCustomPattern,
} from './secret-detector.js';

describe('secret-detector', () => {
  describe('detectSecrets', () => {
    describe('AWS credentials', () => {
      it('detects AWS access key', () => {
        const code = `const accessKey = "AKIAIOSFODNN7EXAMPLE";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('aws_access_key');
        expect(result.findings[0].line).toBe(1);
      });

      it('detects AWS secret key', () => {
        const code = `const secretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('aws_secret_key');
      });

      it('detects AWS credentials in config object', () => {
        const code = `
          const config = {
            accessKeyId: "AKIAIOSFODNN7EXAMPLE",
            secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          };
        `;
        const result = detectSecrets(code);

        expect(result.findings.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('GitHub tokens', () => {
      it('detects GitHub personal access token', () => {
        const code = `const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('github_token');
      });

      it('detects GitHub OAuth token', () => {
        const code = `const token = "gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('github_token');
      });

      it('detects GitHub app token', () => {
        const code = `const token = "ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
      });
    });

    describe('Stripe keys', () => {
      it('detects Stripe secret key', () => {
        const code = `const stripe = require('stripe')('sk_live_FAKE0KEY0FOR0TESTING000');`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('stripe_secret_key');
      });

      it('detects Stripe test key', () => {
        const code = `const key = "sk_test_FAKE0KEY0FOR0TESTING000";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('stripe_test_key');
      });

      it('does not flag Stripe publishable key', () => {
        const code = `const key = "pk_live_FAKE0KEY0FOR0TESTING000";`;
        const result = detectSecrets(code);

        // Publishable keys are meant to be public
        expect(result.findings).toHaveLength(0);
      });
    });

    describe('private keys', () => {
      it('detects RSA private key', () => {
        const code = `
          const key = \`-----BEGIN RSA PRIVATE KEY-----
          MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy...
          -----END RSA PRIVATE KEY-----\`;
        `;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('private_key');
      });

      it('detects EC private key', () => {
        const code = `
          const key = \`-----BEGIN EC PRIVATE KEY-----
          MHQCAQEEIBYq...
          -----END EC PRIVATE KEY-----\`;
        `;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('private_key');
      });

      it('detects generic private key', () => {
        const code = `
          const key = \`-----BEGIN PRIVATE KEY-----
          MIIEvgIBADANBg...
          -----END PRIVATE KEY-----\`;
        `;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
      });
    });

    describe('passwords in code', () => {
      it('detects password assignment', () => {
        const code = `const password = "mySecretPassword123!";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('password');
      });

      it('detects password in object literal', () => {
        const code = `
          const config = {
            username: "admin",
            password: "admin123"
          };
        `;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('password');
      });

      it('detects password with underscore naming', () => {
        const code = `const db_password = "secret123";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
      });
    });

    describe('JWT tokens', () => {
      it('detects JWT token', () => {
        const code = `const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('jwt_token');
      });
    });

    describe('database connection strings', () => {
      it('detects PostgreSQL connection with password', () => {
        const code = `const connString = "postgresql://user:password123@localhost:5432/mydb";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].type).toBe('connection_string');
      });

      it('detects MySQL connection with password', () => {
        const code = `const connString = "mysql://root:secret@localhost/db";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
      });

      it('detects MongoDB connection with password', () => {
        const code = `const uri = "mongodb+srv://user:pass123@cluster.mongodb.net/db";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(1);
      });
    });

    describe('false positive prevention', () => {
      it('does not flag environment variable reference', () => {
        const code = `const password = process.env.DB_PASSWORD;`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(0);
      });

      it('does not flag environment variable in template', () => {
        const code = `const url = \`postgresql://user:\${process.env.PASSWORD}@localhost/db\`;`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(0);
      });

      it('does not flag placeholder values', () => {
        const code = `const key = "YOUR_API_KEY_HERE";`;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(0);
      });

      it('does not flag example/test values', () => {
        const code = `const key = "sk_test_example123";`;
        const result = detectSecrets(code, { ignoreTestValues: true });

        expect(result.findings).toHaveLength(0);
      });

      it('does not flag random strings that look like keys', () => {
        const code = `const id = "abc123def456ghi789jkl012mno345pqr";`;
        const result = detectSecrets(code);

        // Random alphanumeric string should not trigger
        expect(result.findings).toHaveLength(0);
      });

      it('does not flag public keys', () => {
        const code = `
          const key = \`-----BEGIN PUBLIC KEY-----
          MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8...
          -----END PUBLIC KEY-----\`;
        `;
        const result = detectSecrets(code);

        expect(result.findings).toHaveLength(0);
      });
    });
  });

  describe('scanFile', () => {
    it('returns findings with file location', async () => {
      const result = await scanFile('/path/to/file.js', {
        content: `const key = "sk_live_xxxxxxxxxxxx";`,
      });

      expect(result.file).toBe('/path/to/file.js');
      expect(result.findings[0].line).toBe(1);
      expect(result.findings[0].column).toBeGreaterThan(0);
    });

    it('handles multi-line files', async () => {
      const content = `
        const a = 1;
        const b = 2;
        const key = "sk_live_xxxxxxxxxxxx";
        const c = 3;
      `;
      const result = await scanFile('/path/to/file.js', { content });

      expect(result.findings[0].line).toBe(4);
    });
  });

  describe('scanDirectory', () => {
    it('scans multiple files', async () => {
      const files = {
        '/app/config.js': `const key = "sk_live_xxxx";`,
        '/app/db.js': `const pass = "secret123";`,
        '/app/safe.js': `const x = 1;`,
      };

      const result = await scanDirectory('/app', { files });

      expect(result.totalFiles).toBe(3);
      expect(result.filesWithSecrets).toBe(2);
      expect(result.findings).toHaveLength(2);
    });

    it('respects ignore patterns', async () => {
      const files = {
        '/app/config.js': `const key = "sk_live_xxxx";`,
        '/app/node_modules/pkg/index.js': `const key = "sk_live_yyyy";`,
      };

      const result = await scanDirectory('/app', {
        files,
        ignore: ['node_modules/**'],
      });

      expect(result.findings).toHaveLength(1);
    });
  });

  describe('createSecretDetector', () => {
    it('creates detector with custom patterns', () => {
      const detector = createSecretDetector({
        patterns: [
          { name: 'custom_key', pattern: /CUSTOM_[A-Z0-9]{32}/ },
        ],
      });

      const result = detector.detect(`const key = "CUSTOM_ABCD1234EFGH5678IJKL9012MNOP3456";`);

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe('custom_key');
    });

    it('allows disabling built-in patterns', () => {
      const detector = createSecretDetector({
        builtInPatterns: false,
        patterns: [
          { name: 'my_secret', pattern: /MY_SECRET_\w+/ },
        ],
      });

      const result = detector.detect(`const key = "sk_live_xxxx";`);

      // Built-in Stripe pattern disabled
      expect(result.findings).toHaveLength(0);
    });

    it('provides severity levels', () => {
      const result = detectSecrets(`const key = "sk_live_xxxxxxxxxxxx";`);

      expect(result.findings[0].severity).toBe('critical');
    });
  });

  describe('addCustomPattern', () => {
    it('adds pattern to existing detector', () => {
      const detector = createSecretDetector();
      addCustomPattern(detector, {
        name: 'internal_api_key',
        pattern: /INTERNAL_API_[a-z0-9]{24}/,
        severity: 'high',
      });

      const result = detector.detect(`const key = "INTERNAL_API_abc123def456ghi789jkl012";`);

      expect(result.findings).toHaveLength(1);
    });
  });
});
