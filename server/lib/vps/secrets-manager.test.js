/**
 * VPS Secrets Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createSecretsDir, generateSecrets, rotateSecrets, validateSecretFormat, createSecretsManager } from './secrets-manager.js';

describe('secrets-manager', () => {
  describe('createSecretsDir', () => {
    it('creates directory with 600 permissions', async () => {
      const mockMkdir = vi.fn().mockResolvedValue(true);
      const mockChmod = vi.fn().mockResolvedValue(true);
      await createSecretsDir({ path: '/etc/tlc/secrets', mkdir: mockMkdir, chmod: mockChmod });
      expect(mockChmod).toHaveBeenCalledWith('/etc/tlc/secrets', 0o600);
    });
  });

  describe('generateSecrets', () => {
    it('generates secrets from template', () => {
      const secrets = generateSecrets({ template: { DB_PASSWORD: { length: 32 }, API_KEY: { length: 64 } } });
      expect(secrets.DB_PASSWORD.length).toBe(32);
      expect(secrets.API_KEY.length).toBe(64);
    });
  });

  describe('rotateSecrets', () => {
    it('rotates secrets safely', async () => {
      const result = await rotateSecrets({ secrets: ['DB_PASSWORD'], mockRotate: vi.fn().mockResolvedValue(true) });
      expect(result.rotated).toContain('DB_PASSWORD');
    });
  });

  describe('validateSecretFormat', () => {
    it('validates secret format', () => {
      const result = validateSecretFormat({ name: 'API_KEY', value: 'abc123' });
      expect(result.valid).toBe(true);
    });

    it('rejects secrets with spaces', () => {
      const result = validateSecretFormat({ name: 'API KEY', value: 'abc' });
      expect(result.valid).toBe(false);
    });
  });

  describe('createSecretsManager', () => {
    it('creates manager', () => {
      const manager = createSecretsManager();
      expect(manager.get).toBeDefined();
      expect(manager.set).toBeDefined();
      expect(manager.rotate).toBeDefined();
    });

    it('never exposes secrets in logs', () => {
      const manager = createSecretsManager();
      const output = manager.toString();
      expect(output).not.toContain('password');
    });
  });
});
