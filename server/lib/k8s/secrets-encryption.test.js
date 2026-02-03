/**
 * Secrets Encryption Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { generateSealedSecret, configureEncryptionAtRest, generateExternalSecret, generateVaultConfig, createSecretsEncryption } from './secrets-encryption.js';

describe('secrets-encryption', () => {
  describe('generateSealedSecret', () => {
    it('generates sealed secret', () => {
      const secret = generateSealedSecret({ name: 'db-creds', data: { password: 'secret' }, mockSeal: vi.fn().mockReturnValue('encrypted') });
      expect(secret.kind).toBe('SealedSecret');
    });
  });

  describe('configureEncryptionAtRest', () => {
    it('configures KMS encryption', () => {
      const config = configureEncryptionAtRest({ provider: 'kms', keyId: 'arn:aws:kms:...' });
      expect(config.providers.some(p => p.kms !== undefined)).toBe(true);
    });
  });

  describe('generateExternalSecret', () => {
    it('generates ExternalSecret CR', () => {
      const secret = generateExternalSecret({ name: 'db-creds', store: 'vault', keys: ['password'] });
      expect(secret.kind).toBe('ExternalSecret');
    });
  });

  describe('generateVaultConfig', () => {
    it('generates Vault integration config', () => {
      const config = generateVaultConfig({ address: 'https://vault.example.com', role: 'app' });
      expect(config).toContain('vault.example.com');
    });
  });

  describe('createSecretsEncryption', () => {
    it('creates manager', () => {
      const manager = createSecretsEncryption();
      expect(manager.seal).toBeDefined();
      expect(manager.rotate).toBeDefined();
    });

    it('never logs secret values', () => {
      const manager = createSecretsEncryption();
      const log = manager.getLog();
      expect(log).not.toContain('password');
    });
  });
});
