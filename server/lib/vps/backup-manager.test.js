/**
 * Backup Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createDumpScript, encryptBackup, uploadToS3, configureRetention, generateRestoreScript, createBackupManager } from './backup-manager.js';

describe('backup-manager', () => {
  describe('createDumpScript', () => {
    it('generates pg_dump script', () => {
      const script = createDumpScript({ database: 'mydb', format: 'custom' });
      expect(script).toContain('pg_dump');
      expect(script).toContain('mydb');
    });
  });

  describe('encryptBackup', () => {
    it('encrypts with GPG', async () => {
      const result = await encryptBackup({ file: 'backup.sql', recipient: 'admin@example.com', mockGpg: vi.fn().mockResolvedValue(true) });
      expect(result.encrypted).toBe(true);
    });
  });

  describe('uploadToS3', () => {
    it('uploads to S3-compatible storage', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ Location: 's3://bucket/backup.gpg' });
      const result = await uploadToS3({ file: 'backup.gpg', bucket: 'backups', upload: mockUpload });
      expect(result.success).toBe(true);
    });

    it('supports Backblaze B2', async () => {
      const result = await uploadToS3({ file: 'backup.gpg', provider: 'b2', bucket: 'backups', mockUpload: vi.fn().mockResolvedValue({}) });
      expect(result).toBeDefined();
    });
  });

  describe('configureRetention', () => {
    it('sets retention policy', () => {
      const policy = configureRetention({ daily: 7, weekly: 4, monthly: 12 });
      expect(policy.daily).toBe(7);
      expect(policy.weekly).toBe(4);
    });
  });

  describe('generateRestoreScript', () => {
    it('generates restore script', () => {
      const script = generateRestoreScript({ database: 'mydb' });
      expect(script).toContain('pg_restore');
    });
  });

  describe('createBackupManager', () => {
    it('creates manager', () => {
      const manager = createBackupManager();
      expect(manager.backup).toBeDefined();
      expect(manager.restore).toBeDefined();
      expect(manager.list).toBeDefined();
    });
  });
});
